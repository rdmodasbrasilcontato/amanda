import { v4 as uuidv4 } from 'uuid';
import { ZApiWebhookPayload, ProcessedMessage, AIContext, Mensagem, ConversationStatus } from '../../types';
import { getOrCreateClient, updateClientLastContact, updateClientEmotion, saveInteractionAsMemory, markClientOptOut } from '../memory/long-term.service';
import { getShortTermMemory, addMessageToShortTerm } from '../memory/short-term.service';
import { searchRelevantMemories } from '../memory/vector.service';
import { generateAmandaResponse, detectEmotion } from '../ai/openai.service';
import { sendTextWithTyping, sendBalloonsWithTyping, sendAudioMessage, markMessageAsRead } from './zapi.service';
import { generateAudioResponse } from '../ai/openai.service';
import { processAudioMessage, processImageMessage, processDocumentMessage } from './media.handler';
import { query, queryOne } from '../../database/connection';
import { cancelPendingFollowups, scheduleFollowup } from '../followup/followup.service';
import { checkAndHandleHandoff } from '../handoff/handoff.service';
import { detectOptOut } from '../anti-spam/spam.service';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { extractFirstName, normalizePhone } from '../../utils/helpers';

export async function processIncomingMessage(payload: ZApiWebhookPayload): Promise<void> {
  if (payload.fromMe || payload.isGroupMsg) return;

  const phoneRaw = String(payload.phone);
  if (
    phoneRaw.includes('-group') ||
    phoneRaw.includes('@g.us') ||
    phoneRaw.replace(/\D/g, '').length > 15
  ) {
    return;
  }

  const phone = normalizePhone(payload.phone);
  const name = payload.senderName || undefined;

  logger.info({ phone, type: payload.type }, 'Mensagem recebida');

  // 1. Obter ou criar cliente
  const client = await getOrCreateClient(phone, name);

  // Verificar opt-out
  if (client.opt_out) {
    logger.info({ phone }, 'Cliente com opt-out — ignorando mensagem');
    return;
  }

  // 2. Obter ou criar conversa ativa
  const conversation = await getOrCreateConversation(client.id);

  // 3. Verificar handoff ativo
  const handoffBlocked = await checkAndHandleHandoff(
    conversation.id,
    client.id,
    phone,
    payload
  );
  if (handoffBlocked) return;

  // 4. Processar conteúdo da mensagem baseado no tipo
  let userContent = '';
  let mediaUrl: string | undefined;

  switch (payload.type) {
    case 'ReceivedCallback':
    case 'text':
      userContent = payload.text?.message ?? '';
      break;

    case 'audio':
      if (payload.audio?.audioUrl) {
        userContent = await processAudioMessage(payload.audio.audioUrl, client.id, payload.messageId);
        mediaUrl = payload.audio.audioUrl;
      }
      break;

    case 'image':
      if (payload.image?.imageUrl) {
        userContent = await processImageMessage(
          payload.image.imageUrl,
          payload.image.caption ?? '',
          client.id,
          payload.messageId
        );
        mediaUrl = payload.image.imageUrl;
      }
      break;

    case 'document':
      if (payload.document?.documentUrl) {
        userContent = await processDocumentMessage(
          payload.document.documentUrl,
          payload.document.fileName ?? 'documento',
          client.id,
          payload.messageId
        );
        mediaUrl = payload.document.documentUrl;
      }
      break;

    default:
      userContent = '[mensagem recebida]';
  }

  if (!userContent.trim()) return;

  // 5. Verificar opt-out explícito na mensagem
  if (detectOptOut(userContent)) {
    await markClientOptOut(client.id);
    await cancelPendingFollowups(client.id);
    await sendTextWithTyping(
      phone,
      'Tudo bem! Não vou mais te enviar mensagens 💛 Se um dia quiser ver nossos produtos, é só me chamar!'
    );
    return;
  }

  // 6. Detectar emoção
  const emotion = await detectEmotion(userContent);
  await updateClientEmotion(client.id, emotion);

  // 7. Salvar mensagem do usuário no banco
  const userMessage = await saveMessage({
    conversationId: conversation.id,
    clientId: client.id,
    role: 'user',
    content: userContent,
    messageType: payload.type === 'audio' ? 'audio' : payload.type === 'image' ? 'image' : 'text',
    mediaUrl,
    zapiMessageId: payload.messageId,
    emotionDetected: emotion,
  });

  // 8. Marcar como lida
  if (config.ZAPI_AUTO_READ) {
    await markMessageAsRead(phone, payload.messageId);
  }

  // 9. Cancelar follow-ups pendentes (cliente respondeu)
  await cancelPendingFollowups(client.id);

  // 10. Buscar memória curta e longa
  const shortTermMemory = await getShortTermMemory(conversation.id);
  const relevantMemories = await searchRelevantMemories(client.id, userContent);
  const longTermSummary = await getClientSummaryForContext(client);

  // 11. Construir contexto da IA
  const aiContext: AIContext = {
    clientName: extractFirstName(client.preferred_name || client.name || ''),
    shortTermMemory,
    longTermSummary,
    relevantMemories: relevantMemories.map(m => m.content),
    detectedEmotion: emotion,
    conversationStatus: conversation.status as ConversationStatus,
  };

  // 12. Gerar resposta da Amanda
  const aiResponse = await generateAmandaResponse(aiContext);

  // 13. Salvar mensagem da Amanda
  const amandaMessage = await saveMessage({
    conversationId: conversation.id,
    clientId: client.id,
    role: 'assistant',
    content: aiResponse.content,
    messageType: 'text',
    emotionDetected: aiResponse.detectedEmotion,
    tokensUsed: aiResponse.tokensUsed,
  });

  // 14. Atualizar memória de curto prazo
  await addMessageToShortTerm(conversation.id, userMessage);
  await addMessageToShortTerm(conversation.id, amandaMessage);

  // 15. Enviar resposta (texto ou áudio)
  const shouldSendAudio =
    Math.random() < config.AMANDA_AUDIO_REPLY_PROBABILITY &&
    payload.type === 'audio';

  if (shouldSendAudio) {
    const audioBuffer = await generateAudioResponse(aiResponse.content);
    await sendAudioMessage(phone, audioBuffer);
  } else {
    await sendBalloonsWithTyping(phone, aiResponse.content);
  }

  // 16. Salvar interação na memória longa
  await saveInteractionAsMemory(client.id, userContent, aiResponse.content);

  // 17. Atualizar última interação
  await updateClientLastContact(client.id);
  await updateConversationLastMessage(conversation.id);

  // 18. Handoff automático se necessário
  if (aiResponse.shouldTriggerHandoff) {
    await triggerHandoffFlow(conversation.id, client.id, aiContext.longTermSummary);
  }

  // 19. Agendar follow-up se aplicável
  if (aiResponse.suggestedFollowup) {
    await scheduleFollowup(client.id, conversation.id, 1);
  }

  logger.info({ phone, tokensUsed: aiResponse.tokensUsed }, 'Mensagem processada com sucesso');
}

async function getOrCreateConversation(
  clientId: string
): Promise<{ id: string; status: string; handoff_active: boolean }> {
  const existing = await queryOne<{ id: string; status: string; handoff_active: boolean }>(
    `SELECT id, status, handoff_active FROM conversas
     WHERE client_id = $1 AND status = 'active'
     ORDER BY last_message_at DESC
     LIMIT 1`,
    [clientId]
  );

  if (existing) return existing;

  const [created] = await query<{ id: string; status: string; handoff_active: boolean }>(
    `INSERT INTO conversas (client_id) VALUES ($1) RETURNING id, status, handoff_active`,
    [clientId]
  );

  return created!;
}

async function saveMessage(params: {
  conversationId: string;
  clientId: string;
  role: string;
  content: string;
  messageType: string;
  mediaUrl?: string;
  zapiMessageId?: string;
  emotionDetected?: string;
  tokensUsed?: number;
}): Promise<Mensagem> {
  const [msg] = await query<Mensagem>(
    `INSERT INTO mensagens
       (id, conversation_id, client_id, role, content, message_type, media_url, zapi_message_id, emotion_detected, tokens_used)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      uuidv4(),
      params.conversationId,
      params.clientId,
      params.role,
      params.content,
      params.messageType,
      params.mediaUrl ?? null,
      params.zapiMessageId ?? null,
      params.emotionDetected ?? null,
      params.tokensUsed ?? null,
    ]
  );
  return msg!;
}

async function updateConversationLastMessage(conversationId: string): Promise<void> {
  await query(
    `UPDATE conversas
     SET last_message_at = NOW(), message_count = message_count + 1, updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );
}

async function getClientSummaryForContext(client: {
  id: string;
  purchase_count: number;
  name: string | null;
}): Promise<string> {
  if (client.purchase_count === 0) return '';
  return `Cliente com ${client.purchase_count} compra(s) anterior(es).`;
}

async function triggerHandoffFlow(
  conversationId: string,
  clientId: string,
  contextSummary: string
): Promise<void> {
  await query(
    `UPDATE conversas
     SET status = 'handoff', handoff_active = TRUE, handoff_started_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );

  await query(
    `INSERT INTO handoffs (conversation_id, client_id, context_at_handoff)
     VALUES ($1, $2, $3)`,
    [conversationId, clientId, contextSummary]
  );

  logger.info({ conversationId }, 'Handoff ativado');
}
