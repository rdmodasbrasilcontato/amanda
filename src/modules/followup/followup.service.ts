import { query, queryOne } from '../../database/connection';
import { FOLLOWUP_SCHEDULE } from '../../config';
import { addMinutes, isBusinessHours } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export async function scheduleFollowup(
  clientId: string,
  conversationId: string,
  attemptNumber: number
): Promise<void> {
  const client = await queryOne<{ opt_out: boolean; followup_paused: boolean }>(
    'SELECT opt_out, followup_paused FROM clientes WHERE id = $1',
    [clientId]
  );
  if (!client || client.opt_out || client.followup_paused) return;

  // Max 2 pending followups per client
  const pending = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM followups WHERE client_id = $1 AND status = 'pending'`,
    [clientId]
  );
  if (parseInt(pending?.count ?? '0') >= 2) return;

  // Attempt 9+ loops back to 8 (30-day cycle)
  const resolvedAttempt = attemptNumber > 8 ? 8 : attemptNumber;
  const schedule = FOLLOWUP_SCHEDULE.find(s => s.attempt === resolvedAttempt);
  if (!schedule) return;

  const scheduledAt = addMinutes(new Date(), schedule.delayMinutes);

  await query(
    `INSERT INTO followups (client_id, conversation_id, scheduled_at, attempt_number)
     VALUES ($1, $2, $3, $4)`,
    [clientId, conversationId, scheduledAt, resolvedAttempt]
  );

  logger.info({ clientId, attemptNumber: resolvedAttempt, scheduledAt }, 'Follow-up agendado');
}

export async function cancelPendingFollowups(clientId: string): Promise<void> {
  await query(
    `UPDATE followups
     SET status = 'cancelled', cancelled_reason = 'client_responded', updated_at = NOW()
     WHERE client_id = $1 AND status = 'pending'`,
    [clientId]
  );
}

export async function getDueFollowups(limit = 20) {
  return query<{
    id: string;
    client_id: string;
    conversation_id: string;
    attempt_number: number;
  }>(
    `SELECT id, client_id, conversation_id, attempt_number
     FROM followups
     WHERE status = 'pending' AND scheduled_at <= NOW()
     ORDER BY scheduled_at ASC
     LIMIT $1`,
    [limit]
  );
}

export async function markFollowupSent(followupId: string, message: string): Promise<void> {
  await query(
    `UPDATE followups
     SET status = 'sent', sent_at = NOW(), message_content = $2, updated_at = NOW()
     WHERE id = $1`,
    [followupId, message]
  );
}

export async function markFollowupFailed(followupId: string): Promise<void> {
  await query(
    `UPDATE followups SET status = 'failed', updated_at = NOW() WHERE id = $1`,
    [followupId]
  );
}

export async function cancelFollowup(followupId: string, reason: string): Promise<void> {
  await query(
    `UPDATE followups
     SET status = 'cancelled', cancelled_reason = $2, updated_at = NOW()
     WHERE id = $1`,
    [followupId, reason]
  );
}

export async function rescheduleFollowup(followupId: string, delayMinutes: number): Promise<void> {
  const newTime = addMinutes(new Date(), delayMinutes);
  await query(
    `UPDATE followups SET scheduled_at = $2 WHERE id = $1`,
    [followupId, newTime]
  );
}
