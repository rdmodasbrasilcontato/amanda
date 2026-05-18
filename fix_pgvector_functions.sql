-- ════════════════════════════════════════════════════════
-- Amanda AI — Funções pgvector para busca semântica
-- Rodar este SQL no Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- Garantir extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Função: buscar memórias semânticas de um cliente ─────
DROP FUNCTION IF EXISTS buscar_memoria_cliente(UUID, vector, INTEGER, FLOAT);
CREATE OR REPLACE FUNCTION buscar_memoria_cliente(
  p_cliente_id UUID,
  p_query_embedding vector(1536),
  p_limite INTEGER DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.72
)
RETURNS TABLE (
  id UUID,
  tipo_memoria TEXT,
  conteudo TEXT,
  similaridade FLOAT,
  criado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.tipo_memoria::TEXT,
    m.conteudo,
    (1 - (m.embedding <=> p_query_embedding))::FLOAT AS similaridade,
    m.criado_em
  FROM memoria_longa m
  WHERE m.cliente_id = p_cliente_id
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> p_query_embedding)) >= p_threshold
  ORDER BY m.embedding <=> p_query_embedding ASC
  LIMIT p_limite;
END;
$$;

-- ── Função: buscar produtos semanticamente ───────────────
DROP FUNCTION IF EXISTS buscar_produtos_semantico(vector, INTEGER, FLOAT);
CREATE OR REPLACE FUNCTION buscar_produtos_semantico(
  p_query_embedding vector(1536),
  p_limite INTEGER DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  descricao_curta TEXT,
  preco NUMERIC,
  similaridade FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nome::TEXT,
    p.descricao_curta::TEXT,
    p.preco,
    (1 - (p.embedding <=> p_query_embedding))::FLOAT AS similaridade
  FROM produtos p
  WHERE p.ativo = TRUE
    AND p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> p_query_embedding)) >= p_threshold
  ORDER BY p.embedding <=> p_query_embedding ASC
  LIMIT p_limite;
END;
$$;

-- ── Índices vetoriais para performance ───────────────────
CREATE INDEX IF NOT EXISTS idx_memoria_longa_embedding
  ON memoria_longa USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_produtos_embedding
  ON produtos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ════════════════════════════════════════════════════════
-- ✅ Funções pgvector instaladas
-- ════════════════════════════════════════════════════════
