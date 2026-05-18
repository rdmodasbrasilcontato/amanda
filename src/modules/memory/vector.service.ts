// ════════════════════════════════════════════════════════
// Amanda AI — Vector Memory Service (pgvector)
// ════════════════════════════════════════════════════════

import { query, queryOne } from '../../database/connection';
import { generateEmbedding } from '../ai/openai.service';
import { VectorSearchResult } from '../../types';
import { logger } from '../../utils/logger';

export async function saveMemory(
  clienteId: string,
  conteudo: string,
  tipoMemoria: string,
  _mensagemId?: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(conteudo);
    const vectorStr = `[${embedding.join(',')}]`;

    await query(
      `INSERT INTO memoria_longa
         (cliente_id, tipo_memoria, conteudo, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
      [clienteId, tipoMemoria, conteudo, vectorStr]
    );
  } catch (err) {
    logger.error({ err, clienteId }, 'Erro ao salvar memória vetorial');
  }
}

export async function searchRelevantMemories(
  clienteId: string,
  queryText: string,
  limite = 5,
  threshold = 0.72
): Promise<VectorSearchResult[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    return await query<VectorSearchResult>(
      `SELECT * FROM buscar_memoria_cliente($1, $2::vector, $3, $4)`,
      [clienteId, vectorStr, limite, threshold]
    );
  } catch (err) {
    logger.error({ err, clienteId }, 'Erro na busca vetorial');
    return [];
  }
}

export async function searchProducts(
  queryText: string,
  limite = 5,
  threshold = 0.65
): Promise<Record<string, unknown>[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    return await query(
      `SELECT * FROM buscar_produtos_semantico($1::vector, $2, $3)`,
      [vectorStr, limite, threshold]
    );
  } catch (err) {
    logger.error({ err }, 'Erro na busca semântica de produtos');
    return [];
  }
}

export async function updateProductEmbedding(produtoId: string): Promise<void> {
  const produto = await queryOne<{ nome: string; descricao_curta: string | null }>(
    'SELECT nome, descricao_curta FROM produtos WHERE id = $1',
    [produtoId]
  );
  if (!produto) return;

  const texto = `${produto.nome}. ${produto.descricao_curta ?? ''}`;
  const embedding = await generateEmbedding(texto);
  const vectorStr = `[${embedding.join(',')}]`;

  await query(
    'UPDATE produtos SET embedding = $1::vector WHERE id = $2',
    [vectorStr, produtoId]
  );
}
