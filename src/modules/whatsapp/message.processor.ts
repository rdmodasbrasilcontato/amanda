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
  if (payload.isGroupMsg) return;

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

  // Mensagens do staff (fromMe + não enviadas pela própria API/Amanda):
  // tratar apenas para toggle de handoff (palavra-chave Oii / Até mais)
  // e refresh do timestamp se handoff já estiver ativo. Nunca responder.
  if (payload.fromMe) {
    const fromApi = (payload as any).fromApi === true;
    if (fromApi) return; // mensagem enviada pela própria Amanda via Z-API
    await handleStaffMessage(phone, name, payload);
    return;
  }

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

  // 4. Processar conteúdo da mensagem baseado no payload
  // Z-API envia TUDO como type="ReceivedCallback"; o tipo real é descoberto
  // pelos campos preenchidos no payload (audio, image, document, text).
  let userContent = '';
  let mediaUrl: string | undefined;
  let messageKind: 'text' | 'audio' | 'image' | 'document' = 'text';

  const anyPayload = payload as any;

  if (anyPayload.audio?.audioUrl) {
    messageKind = 'audio';
    mediaUrl = anyPayload.audio.audioUrl;
    userContent = await processAudioMessage(anyPayload.audio.audioUrl, client.id, payload.messageId);
  } else if (anyPayload.image?.imageUrl) {
    messageKind = 'image';
    mediaUrl = anyPayload.image.imageUrl;
    userContent = await processImageMessage(
      anyPayload.image.imageUrl,
      anyPayload.image.caption ?? '',
      client.id,
      payload.messageId
    );
  } else if (anyPayload.document?.documentUrl) {
    messageKind = 'document';
    mediaUrl = anyPayload.document.documentUrl;
    userContent = await processDocumentMessage(
      anyPayload.document.documentUrl,
      anyPayload.document.fileName ?? 'documento',
      client.id,
      payload.messageId
    );
  } else if (anyPayload.text?.message) {
    messageKind = 'text';
    userContent = anyPayload.text.message;
  } else if (typeof anyPayload.body === 'string') {
    messageKind = 'text';
    userContent = anyPayload.body;
  } else if (typeof anyPayload.message === 'string') {
    messageKind = 'text';
    userContent = anyPayload.message;
  }

  if (!userContent.trim()) {
    logger.warn(
      { phone, type: payload.type, messageId: payload.messageId, payloadKeys: Object.keys(anyPayload) },
      'Mensagem sem conteúdo extraível — payload desconhecido'
    );
    return;
  }

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
    messageType: messageKind,
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
    messageKind === 'audio';

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

async function handleStaffMessage(
  phone: string,
  name: string | undefined,
  payload: ZApiWebhookPayload
): Promise<void> {
  try {
    const client = await getOrCreateClient(phone, name);
    const conversation = await getOrCreateConversation(client.id);
    await checkAndHandleHandoff(conversation.id, client.id, phone, payload);
    logger.info(
      { phone, text: payload.text?.message },
      'Mensagem do staff processada (handoff toggle)'
    );
  } catch (err) {
    logger.error({ err, phone }, 'Erro ao processar mensagem do staff');
  }
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
