import { ZApiWebhookPayload } from '../../types';
import {
  getOrCreateClient,
  getOrCreateConversation,
  saveMessage,
  updateConversationLastMessage,
  incrementInteractions,
  saveInteractionMemory,
  markClientOptOut,
  pauseFollowupsForClient,
  resumeFollowupsForClient,
} from '../memory/long-term.service';
import { analyzeBehavior } from '../behavioral/analyzer';
import {
  upsertBehaviorProfile,
  updateClientEmotion,
  updateClientIntent,
  updatePreferredContactHour,
} from '../behavioral/profile.service';
import { recordMultipleScoreEvents, recordScoreEvent } from '../behavioral/lead-score.service';
import { detectOptOut } from '../antispam/antispam.service';
import { cancelPendingFollowups, scheduleFollowup } from '../followup/followup.service';
import { processAudioFromUrl } from '../media/audio.service';
import { processImageFromUrl } from '../media/image.service';
import { markMessageAsRead } from './zapi.service';
import { normalizePhone } from '../../utils/helpers';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export async function processIncomingMessage(payload: ZApiWebhookPayload): Promise<void> {
  // Ignore group messages
  if (payload.isGroupMsg) return;
  const phoneRaw = String(payload.phone);
  if (phoneRaw.includes('-group') || phoneRaw.includes('@g.us') || phoneRaw.replace(/\D/g, '').length > 15) return;

  // Ignore our own API-sent messages
  if (payload.fromMe) {
    const fromApi = (payload as any).fromApi === true;
    if (fromApi) return;
    // Staff messages — just ignore (no handoff in silent mode)
    return;
  }

  const phone = normalizePhone(payload.phone);
  const name = payload.senderName || undefined;

  logger.info({ phone, type: payload.type }, '📥 Mensagem recebida');

  // 1. Get or create client
  const client = await getOrCreateClient(phone, name);

  // 2. Opt-out check
  if (client.opt_out) {
    logger.info({ phone }, 'Cliente com opt-out — ignorando');
    return;
  }

  // 3. Extract content
  const anyPayload = payload as any;
  let userContent = '';
  let messageType: 'text' | 'audio' | 'image' | 'document' = 'text';
  let mediaUrl: string | undefined;

  if (anyPayload.audio?.audioUrl) {
    messageType = 'audio';
    mediaUrl = anyPayload.audio.audioUrl;
    userContent = await processAudioFromUrl(anyPayload.audio.audioUrl, anyPayload.audio.mimeType);
  } else if (anyPayload.image?.imageUrl) {
    messageType = 'image';
    mediaUrl = anyPayload.image.imageUrl;
    userContent = await processImageFromUrl(anyPayload.image.imageUrl, anyPayload.image.caption);
  } else if (anyPayload.text?.message) {
    userContent = anyPayload.text.message;
  } else if (typeof anyPayload.body === 'string') {
    userContent = anyPayload.body;
  } else if (typeof anyPayload.message === 'string') {
    userContent = anyPayload.message;
  }

  if (!userContent.trim()) {
    logger.warn({ phone, payloadKeys: Object.keys(anyPayload) }, 'Mensagem sem conteúdo');
    return;
  }

  // 4. Opt-out keyword detection
  if (detectOptOut(userContent)) {
    await markClientOptOut(client.id);
    await cancelPendingFollowups(client.id);
    logger.info({ phone }, 'Cliente optou por sair — opt_out marcado');
    return;
  }

  // 5. Resume followups if client is back
  if (client.followup_paused) {
    await resumeFollowupsForClient(client.id);
  }

  // 6. Get or create conversation
  const conversation = await getOrCreateConversation(client.id);

  // 7. Mark as read
  if (config.ZAPI_AUTO_READ) {
    await markMessageAsRead(phone, payload.messageId);
  }

  // 8. BEHAVIORAL ANALYSIS (silent — no response sent to client)
  const analysis = await analyzeBehavior(userContent, messageType);

  // 9. Update lead score
  const scoreEvents = [...analysis.scoreEvents];
  if (client.total_interactions === 0) scoreEvents.push('first_contact');
  if (client.total_interactions > 0) scoreEvents.push('multiple_interactions');
  await recordMultipleScoreEvents(client.id, scoreEvents);

  // 10. Update behavioral profile
  await upsertBehaviorProfile(client.id, analysis);
  await updateClientEmotion(client.id, analysis.emotion);
  await updateClientIntent(client.id, analysis.intent);
  await updatePreferredContactHour(client.id);

  // 11. Save message to DB
  await saveMessage({
    conversationId: conversation.id,
    clientId: client.id,
    role: 'client',
    content: userContent,
    messageType,
    mediaUrl,
    zapiMessageId: payload.messageId,
    emotionDetected: analysis.emotion,
    intentDetected: analysis.intent,
  });

  // 12. Save to long-term memory
  if (analysis.summary) {
    await saveInteractionMemory(client.id, userContent, analysis.summary);
  }

  // 13. Update counters
  await incrementInteractions(client.id);
  await updateConversationLastMessage(conversation.id);

  // 14. Cancel existing follow-ups and schedule new one (client is now warm)
  await cancelPendingFollowups(client.id);
  await scheduleFollowup(client.id, conversation.id, 1);

  logger.info(
    {
      phone,
      emotion: analysis.emotion,
      intent: analysis.intent,
      scoreEvents,
      urgency: analysis.urgencyLevel,
    },
    '✅ Mensagem analisada e follow-up agendado'
  );
}
