// ════════════════════════════════════════════════════════
// Amanda AI — Short-Term Memory (contexto da conversa)
// ════════════════════════════════════════════════════════

import { query } from '../../database/connection';
import { Mensagem } from '../../types';
import { redisGet, redisSet } from '../../cache/redis.client';

const SHORT_TERM_LIMIT = 20;

export async function getShortTermMemory(conversaId: string): Promise<Mensagem[]> {
  const cacheKey = `stm:${conversaId}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached) as Mensagem[];
  }

  const rows = await query<Mensagem>(
    `SELECT * FROM mensagens
     WHERE conversa_id = $1
       AND direcao IN ('entrada', 'saida')
     ORDER BY criado_em DESC
     LIMIT $2`,
    [conversaId, SHORT_TERM_LIMIT]
  );

  const mensagens = rows.reverse();
  await redisSet(cacheKey, JSON.stringify(mensagens), 3600);
  return mensagens;
}

export async function addMessageToShortTerm(conversaId: string, mensagem: Mensagem): Promise<void> {
  const cacheKey = `stm:${conversaId}`;
  const cached = await redisGet(cacheKey);
  const mensagens: Mensagem[] = cached ? JSON.parse(cached) : [];

  mensagens.push(mensagem);
  if (mensagens.length > SHORT_TERM_LIMIT) mensagens.shift();

  await redisSet(cacheKey, JSON.stringify(mensagens), 3600);
}

export async function clearShortTermCache(conversaId: string): Promise<void> {
  await redisSet(`stm:${conversaId}`, JSON.stringify([]), 1);
}
