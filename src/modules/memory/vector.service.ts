import { query } from '../../database/connection';
import { generateEmbedding } from '../ai/openai.service';
import { VectorSearchResult } from '../../types';
import { logger } from '../../utils/logger';

export async function searchRelevantMemories(
  clientId: string,
  queryText: string,
  limit = 5
): Promise<VectorSearchResult[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const embeddingStr = JSON.stringify(embedding);

    const results = await query<VectorSearchResult & { similarity: number }>(
      `SELECT id, content, memory_type,
              1 - (embedding <=> $2::vector) AS similarity
       FROM memoria_vetorial
       WHERE client_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      [clientId, embeddingStr, limit]
    );

    return results.filter(r => r.similarity > 0.6);
  } catch (err) {
    logger.warn({ err }, 'Busca vetorial falhou — retornando sem memórias');
    return [];
  }
}

export async function getRecentMemories(clientId: string, limit = 5): Promise<VectorSearchResult[]> {
  return query<VectorSearchResult>(
    `SELECT id, content, memory_type, 1.0 as similarity
     FROM memoria_vetorial
     WHERE client_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [clientId, limit]
  );
}
