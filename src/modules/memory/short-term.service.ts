import { query } from '../../database/connection';
import { Mensagem } from '../../types';
import { redisGet, redisSet } from '../../cache/redis.client';
import { logger } from '../../utils/logger';

const SHORT_TERM_LIMIT = 30;

export async function getShortTermMemory(conversationId: string): Promise<Mensagem[]> {
  const cacheKey = `stm:${conversationId}`;

  const cached = await redisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached) as Mensagem[];
  }

  const rows = await query<Mensagem>(
    `SELECT * FROM mensagens
     WHERE conversation_id = $1
       AND role IN ('user', 'assistant')
     ORDER BY created_at DESC
     LIMIT $2`,
    [conversationId, SHORT_TERM_LIMIT]
  );

  const messages = rows.reverse();

  await redisSet(cacheKey, JSON.stringify(messages), 3600);
  return messages;
}

export async function addMessageToShortTerm(
  conversationId: string,
  message: Mensagem
): Promise<void> {
  const cacheKey = `stm:${conversationId}`;
  const cached = await redisGet(cacheKey);
  const messages: Mensagem[] = cached ? JSON.parse(cached) : [];

  messages.push(message);
  if (messages.length > SHORT_TERM_LIMIT) {
    messages.shift();
  }

  await redisSet(cacheKey, JSON.stringify(messages), 3600);
}

export async function clearShortTermCache(conversationId: string): Promise<void> {
  await redisSet(`stm:${conversationId}`, JSON.stringify([]), 1);
}
