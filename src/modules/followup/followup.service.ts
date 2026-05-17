import { query, queryOne } from '../../database/connection';
import { sendTextWithTyping } from '../whatsapp/zapi.service';
import { generateAmandaResponse } from '../ai/openai.service';
import { getOrCreateClient } from '../memory/long-term.service';
import { isBusinessHours, addHours, addDays, pickRandom } from '../../utils/helpers';
import { detectOptOut } from '../anti-spam/spam.service';
import { markClientOptOut } from '../memory/long-term.service';
import { getFollowupSchedule } from '../../state/followup.config';
import { logger } from '../../utils/logger';
import { config } from '../../config';

// Schedule agora vem de src/state/followup.config.ts (configurável pelo dashboard)

const FOLLOWUP_MESSAGES = [
  'Ei! Vi que você estava olhando algumas peças... ficou com alguma dúvida? 😊',
  'Oi! Tô aqui se quiser continuar vendo as opções 💛',
  'Oiii! Lembrei de você agora rs Ainda tô por aqui se precisar!',
  'Passando pra ver se ficou alguma dúvida sobre o que conversamos 😊',
  'Ei, a {peça} que você viu ainda tá disponível! Quer mais infos? ✨',
  'Oi linda! Chegaram novidades por aqui... quer dar uma olhada? 🛍️',
  'Oi! A gente recebeu peças novas essa semana. Posso te mostrar? 💕',
];

const OPT_OUT_SUFFIX = '\n\nSe não quiser mais receber mensagens, é só responder NÃO 💛';

export async function scheduleFollowup(
  clientId: string,
  conversationId: string,
  attemptNumber: number
): Promise<void> {
  const client = await queryOne<{ opt_out: boolean; phone: string; followup_paused?: boolean }>(
    'SELECT opt_out, phone FROM clientes WHERE id = $1',
    [clientId]
  );

  if (!client || client.opt_out || client.followup_paused) return;

  const pendingCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM followups
     WHERE client_id = $1 AND status = 'pending'`,
    [clientId]
  );

  if (parseInt(pendingCount?.count ?? '0') >= 3) return;

  const schedule = getFollowupSchedule().find(s => s.attempt === attemptNumber);
  if (!schedule) return;

  const scheduledAt = addHours(new Date(), schedule.delayHours);

  await query(
    `INSERT INTO followups (client_id, conversation_id, scheduled_at, attempt_number)
     VALUES ($1, $2, $3, $4)`,
    [clientId, conversationId, scheduledAt, attemptNumber]
  );

  logger.info({ clientId, attemptNumber, scheduledAt }, 'Follow-up agendado');
}

export async function cancelPendingFollowups(clientId: string): Promise<void> {
  await query(
    `UPDATE followups
     SET status = 'cancelled', cancelled_reason = 'cliente_respondeu', updated_at = NOW()
     WHERE client_id = $1 AND status = 'pending'`,
    [clientId]
  );
}

export async function processDueFollowups(): Promise<void> {
  const due = await query<{
    id: string;
    client_id: string;
    conversation_id: string;
    attempt_number: number;
  }>(
    `SELECT id, client_id, conversation_id, attempt_number
     FROM followups
     WHERE status = 'pending' AND scheduled_at <= NOW()
     ORDER BY scheduled_at ASC
     LIMIT 20`
  );

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
  const client = await queryOne<{ opt_out: boolean; phone: string; name: string | null; followup_paused?: boolean }>(
    'SELECT opt_out, phone, name FROM clientes WHERE id = $1',
    [followup.client_id]
  );

  if (!client || client.opt_out) {
    await cancelFollowup(followup.id, 'opt_out');
    return;
  }

  if (client.followup_paused) {
    await cancelFollowup(followup.id, 'followup_paused');
    return;
  }

  // Attempt 3 só em horário comercial
  if (followup.attempt_number === 3 && !isBusinessHours()) {
    const rescheduled = addHours(new Date(), 2);
    await query(
      'UPDATE followups SET scheduled_at = $1 WHERE id = $2',
      [rescheduled, followup.id]
    );
    return;
  }

  const messageText = pickRandom(FOLLOWUP_MESSAGES) + OPT_OUT_SUFFIX;
  const finalMessage = messageText.replace('{peça}', 'peça que você viu');

  try {
    await sendTextWithTyping(client.phone, finalMessage);

    await query(
      `UPDATE followups
       SET status = 'sent', sent_at = NOW(), message_content = $1, updated_at = NOW()
       WHERE id = $2`,
      [finalMessage, followup.id]
    );

    // Agendar próximo follow-up se não for o último
    if (followup.attempt_number < 8) {
      await scheduleFollowup(
        followup.client_id,
        followup.conversation_id,
        followup.attempt_number + 1
      );
    } else {
      // Loop de 30 dias
      await scheduleFollowup(followup.client_id, followup.conversation_id, 8);
    }

    logger.info(
      { clientId: followup.client_id, attempt: followup.attempt_number },
      'Follow-up enviado'
    );
  } catch (err) {
    await query(
      `UPDATE followups SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [followup.id]
    );
    logger.error({ err, followupId: followup.id }, 'Erro ao enviar follow-up');
  }
}

async function cancelFollowup(followupId: string, reason: string): Promise<void> {
  await query(
    `UPDATE followups
     SET status = 'cancelled', cancelled_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    [reason, followupId]
  );
}
