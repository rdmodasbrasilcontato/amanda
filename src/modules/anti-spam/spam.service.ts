import { redisGet, redisSet, redisIncr } from '../../cache/redis.client';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';
import { config } from '../../config';

const OPT_OUT_PATTERNS = [
  /^n[aã]o$/i,
  /^nao$/i,
  /^parar?$/i,
  /^sair$/i,
  /^cancelar$/i,
  /n[aã]o quero/i,
  /me tira da lista/i,
  /para de me mandar/i,
  /n[aã]o quero (mais )?receber/i,
  /remove (meu|me do)/i,
  /descadastrar/i,
  /stop$/i,
];

export function detectOptOut(message: string): boolean {
  const clean = message.trim();
  return OPT_OUT_PATTERNS.some(pattern => pattern.test(clean));
}

export async function isClientCooldown(phone: string): Promise<boolean> {
  const key = `cooldown:${phone}`;
  const val = await redisGet(key);
  return val !== null;
}

export async function setClientCooldown(phone: string, seconds = 8): Promise<void> {
  await redisSet(`cooldown:${phone}`, '1', seconds);
}

export async function incrementDailyMessageCount(phone: string): Promise<number> {
  const key = `daily_msgs:${phone}:${new Date().toISOString().slice(0, 10)}`;
  return redisIncr(key, 86400);
}

export async function isDailyLimitReached(phone: string, limit = 10): Promise<boolean> {
  const key = `daily_msgs:${phone}:${new Date().toISOString().slice(0, 10)}`;
  const val = await redisGet(key);
  return val !== null && parseInt(val) >= limit;
}

export async function isDeduplicatedMessage(messageId: string): Promise<boolean> {
  const key = `msg_dedup:${messageId}`;
  const exists = await redisGet(key);
  if (exists) return true;
  await redisSet(key, '1', 300);
  return false;
}

export async function getSpamRiskScore(clientId: string): Promise<number> {
  const recentCount = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM mensagens
     WHERE client_id = $1 AND role = 'assistant' AND created_at > NOW() - INTERVAL '1 hour'`,
    [clientId]
  );

  const count = parseInt(recentCount[0]?.count ?? '0');

  if (count > 20) return 0.9;
  if (count > 10) return 0.6;
  if (count > 5) return 0.3;
  return 0;
}

export function randomizeDelay(baseMs: number, variancePercent = 0.3): number {
  const variance = baseMs * variancePercent;
  return baseMs + (Math.random() * variance * 2 - variance);
}
