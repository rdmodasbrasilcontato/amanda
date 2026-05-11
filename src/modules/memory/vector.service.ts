import { query, queryOne } from '../../database/connection';
import { generateEmbedding } from '../ai/openai.service';
import { MemoriaVetorial, VectorSearchResult } from '../../types';
import { logger } from '../../utils/logger';

export async function saveMemory(
  clientId: string,
  content: string,
  memoryType: MemoriaVetorial['memory_type'],
  sourceMessageId?: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    const vectorStr = `[${embedding.join(',')}]`;

    await query(
      `INSERT INTO memoria_vetorial
         (client_id, content, embedding, memory_type, source_message_id)
       VALUES ($1, $2, $3::vector, $4, $5)`,
      [clientId, content, vectorStr, memoryType, sourceMessageId ?? null]
    );

    logger.debug({ clientId, memoryType }, 'Memória vetorial salva');
  } catch (err) {
    logger.error({ err, clientId }, 'Erro ao salvar memória vetorial');
  }
}

export async function searchRelevantMemories(
  clientId: string,
  query_text: string,
  limit = 5,
  threshold = 0.72
): Promise<VectorSearchResult[]> {
  try {
    const embedding = await generateEmbedding(query_text);
    const vectorStr = `[${embedding.join(',')}]`;

    const rows = await query<VectorSearchResult>(
      `SELECT * FROM buscar_memoria_cliente($1, $2::vector, $3, $4)`,
      [clientId, vectorStr, limit, threshold]
    );

    return rows;
  } catch (err) {
    logger.error({ err, clientId }, 'Erro na busca vetorial de memória');
    return [];
  }
}

export async function searchProducts(
  queryText: string,
  limit = 5,
  threshold = 0.68
): Promise<Record<string, unknown>[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    return await query(
      `SELECT * FROM buscar_produtos_semantico($1::vector, $2, $3)`,
      [vectorStr, limit, threshold]
    );
  } catch (err) {
    logger.error({ err }, 'Erro na busca semântica de produtos');
    return [];
  }
}

export async function updateProductEmbedding(productId: string): Promise<void> {
  const product = await queryOne<{ name: string; description: string; category: string }>(
    'SELECT name, description, category FROM produtos WHERE id = $1',
    [productId]
  );
  if (!product) return;

  const text = `${product.name}. ${product.description ?? ''}. Categoria: ${product.category}`;
  const embedding = await generateEmbedding(text);
  const vectorStr = `[${embedding.join(',')}]`;

  await query('UPDATE produtos SET embedding = $1::vector WHERE id = $2', [vectorStr, productId]);
}
