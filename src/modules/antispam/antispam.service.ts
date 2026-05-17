import { query, queryOne } from '../../database/connection';
import { getRedisClient } from '../../cache/redis.client';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { OPT_OUT_KEYWORDS } from '../../config';
import { normalizeTextForMatch } from '../../utils/helpers';

export function detectOptOut(text: string): boolean {
  const normalized = normalizeTextForMatch(text);
  const words = normalized.split(/\s+/);
  for (const kw of OPT_OUT_KEYWORDS) {
    const normKw = normalizeTextForMatch(kw);
    if (words.includes(normKw)) return true;
    // Also match if the entire message is just the keyword
    if (normalized === normKw) return true;
  }
  return false;
}

export async function canSendFollowup(clientId: string): Promise<{ allowed: boolean; reason?: string }> {
  const redis = getRedisClient();

  // Check daily limit via Redis
  if (redis) {
    const dailyKey = `antispam:daily:${clientId}:${new Date().toISOString().slice(0, 10)}`;
    const count = await redis.get(dailyKey);
    if (count && parseInt(count) >= config.ANTISPAM_DAILY_LIMIT) {
      return { allowed: false, reason: 'daily_limit' };
    }
  }

  // Check minimum cooldown via DB (last sent followup timestamp)
  const lastSent = await queryOne<{ sent_at: Date }>(
    `SELECT sent_at FROM followups
     WHERE client_id = $1 AND status = 'sent'
     ORDER BY sent_at DESC LIMIT 1`,
    [clientId]
  );

  if (lastSent?.sent_at) {
    const cooldownMs = config.ANTISPAM_MIN_COOLDOWN_HOURS * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(lastSent.sent_at).getTime();
    if (elapsed < cooldownMs) {
      return { allowed: false, reason: 'cooldown' };
    }
  }

  return { allowed: true };
}

export async function recordFollowupSent(clientId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  const dailyKey = `antispam:daily:${clientId}:${new Date().toISOString().slice(0, 10)}`;
  await redis.incr(dailyKey);
  await redis.expire(dailyKey, 86400);
}

export async function isDeduplicatedMessage(messageId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  const key = `dedup:msg:${messageId}`;
  const exists = await redis.exists(key);
  if (exists) return true;
  await redis.set(key, '1', 'EX', 300); // 5 min TTL
  return false;
}

export async function logAntiSpamAction(
  clientId: string,
  action: string,
  reason?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO anti_spam_log (client_id, action, reason) VALUES ($1, $2, $3)`,
      [clientId, action, reason ?? null]
    );
  } catch {
    // non-critical
  }
}
