import { queryOne } from '../../database/connection';
import { generateFollowupMessage } from '../ai/openai.service';
import { sendBalloonsWithTyping } from '../whatsapp/zapi.service';
import { getBehaviorProfile } from '../behavioral/profile.service';
import { getRecentMemories } from '../memory/vector.service';
import { getRecentMessages } from '../memory/long-term.service';
import {
  getDueFollowups,
  markFollowupSent,
  markFollowupFailed,
  cancelFollowup,
  rescheduleFollowup,
  scheduleFollowup,
} from './followup.service';
import { canSendFollowup, recordFollowupSent } from '../antispam/antispam.service';
import { isBusinessHours } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { Cliente, LeadTemperature } from '../../types';

export async function processDueFollowups(): Promise<void> {
  const due = await getDueFollowups(20);
  if (due.length === 0) return;

  logger.info({ count: due.length }, 'Processando follow-ups agendados');

  for (const followup of due) {
    await processSingleFollowup(followup);
  }
}

async function processSingleFollowup(followup: {
  id: string;
  client_id: string;
  conversation_id: string;
  attempt_number: number;
}): Promise<void> {
  const client = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE id = $1',
    [followup.client_id]
  );

  if (!client) {
    await cancelFollowup(followup.id, 'client_not_found');
    return;
  }

  if (client.opt_out) {
    await cancelFollowup(followup.id, 'opt_out');
    return;
  }

  if (client.followup_paused) {
    await cancelFollowup(followup.id, 'followup_paused');
    return;
  }

  // Attempt 3+ only during business hours
  if (followup.attempt_number >= 3 && !isBusinessHours()) {
    await rescheduleFollowup(followup.id, 60);
    return;
  }

  // Anti-spam check
  const spamCheck = await canSendFollowup(followup.client_id);
  if (!spamCheck.allowed) {
    await rescheduleFollowup(followup.id, 120);
    logger.warn({ clientId: followup.client_id, reason: spamCheck.reason }, 'Follow-up adiado por anti-spam');
    return;
  }

  // Build context and generate message
  const [profile, recentMessages, memories] = await Promise.all([
    getBehaviorProfile(followup.client_id),
    getRecentMessages(followup.conversation_id, 5),
    getRecentMemories(followup.client_id, 3),
  ]);

  let message: string;
  try {
    const result = await generateFollowupMessage({
      client,
      profile,
      recentMessages: recentMessages as any,
      relevantMemories: memories.map(m => m.content),
      attemptNumber: followup.attempt_number,
      leadTemperature: client.lead_temperature as LeadTemperature,
    });
    message = result.message;
  } catch (err) {
    logger.error({ err, followupId: followup.id }, 'Falha ao gerar follow-up');
    await markFollowupFailed(followup.id);
    return;
  }

  // Send via WhatsApp
  try {
    await sendBalloonsWithTyping(client.phone, message);
    await markFollowupSent(followup.id, message);
    await recordFollowupSent(followup.client_id);

    // Schedule next attempt
    const nextAttempt = followup.attempt_number < 8 ? followup.attempt_number + 1 : 8;
    await scheduleFollowup(followup.client_id, followup.conversation_id, nextAttempt);

    logger.info(
      { clientId: followup.client_id, attempt: followup.attempt_number, phone: client.phone },
      'Follow-up enviado com sucesso'
    );
  } catch (err) {
    logger.error({ err, followupId: followup.id }, 'Erro ao enviar follow-up via WhatsApp');
    await markFollowupFailed(followup.id);
  }
}
