import { redisGet, redisSet, redisDel } from '../../cache/redis.client';
import { config } from '../../config';
import { Mensagem } from '../../types';

const MAX_MESSAGES = 10;

function key(conversationId: string) {
  return `stm:${conversationId}`;
}

export async function getShortTermMemory(conversationId: string): Promise<Mensagem[]> {
  const data = await redisGet(key(conversationId));
  if (!data) return [];
  try { return JSON.parse(data) as Mensagem[]; } catch { return []; }
}

export async function addMessageToShortTerm(conversationId: string, message: Mensagem): Promise<void> {
  const existing = await getShortTermMemory(conversationId);
  const updated = [...existing, message].slice(-MAX_MESSAGES);
  await redisSet(key(conversationId), JSON.stringify(updated), config.REDIS_TTL_SESSION_SECONDS);
}

export async function clearShortTermMemory(conversationId: string): Promise<void> {
  await redisDel(key(conversationId));
}
