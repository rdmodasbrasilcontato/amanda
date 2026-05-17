import { redisGet, redisSet, redisIncr } from '../../cache/redis.client';
import { query } from '../../database/connection';
import { getOptOutKeywords } from '../../state/followup.config';
import { logger } from '../../utils/logger';
import { config } from '../../config';

// Padrões fixos (frases compostas — não editáveis pelo dashboard)
const BASE_PHRASE_PATTERNS = [
  /n[aã]o quero/i,
  /me tira da lista/i,
  /para de me mandar/i,
  /n[aã]o quero (mais )?receber/i,
  /remove (meu|me do)/i,
  /descadastrar/i,
];

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function detectOptOut(message: string): boolean {
  const clean = message.trim();
  const cleanNorm = normalize(clean);

  // 1. Match exato com as palavras configuráveis no dashboard
  const userKeywords = getOptOutKeywords();
  if (userKeywords.some(k => normalize(k) === cleanNorm)) return true;

  // 2. Frases compostas (fixas)
  if (BASE_PHRASE_PATTERNS.some(p => p.test(clean))) return true;

  return false;
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
