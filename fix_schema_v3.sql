-- ════════════════════════════════════════════════════════
-- Amanda AI — Fix schema v3
-- Corrige: memoria_longa colunas faltantes + UNIQUE em mensagens
-- Rodar no Supabase SQL Editor
-- ════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

-- ── memoria_longa: garantir colunas usadas pelo código ───
ALTER TABLE memoria_longa ADD COLUMN IF NOT EXISTS tipo_memoria TEXT DEFAULT 'interacao';
ALTER TABLE memoria_longa ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE memoria_longa ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

-- Caso a tabela antiga use "tipo", copiar para "tipo_memoria"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memoria_longa' AND column_name = 'tipo'
  ) THEN
    UPDATE memoria_longa SET tipo_memoria = COALESCE(tipo_memoria, tipo) WHERE tipo_memoria IS NULL;
  END IF;
END $$;

-- ── mensagens: garantir UNIQUE em zapi_message_id ────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'mensagens'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'mensagens_zapi_message_id_key'
  ) THEN
    -- Remover duplicatas antes de criar UNIQUE
    DELETE FROM mensagens m1
    USING mensagens m2
    WHERE m1.ctid < m2.ctid
      AND m1.zapi_message_id = m2.zapi_message_id
      AND m1.zapi_message_id IS NOT NULL;

    ALTER TABLE mensagens
      ADD CONSTRAINT mensagens_zapi_message_id_key UNIQUE (zapi_message_id);
  END IF;
END $$;

-- ── Recriar funções pgvector (agora com colunas corretas) ─
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

-- ── Produtos: garantir coluna embedding ──────────────────
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS embedding vector(1536);

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

-- ── Índices vetoriais ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_memoria_longa_embedding
  ON memoria_longa USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_produtos_embedding
  ON produtos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

SELECT 'Schema v3 aplicado com sucesso!' AS resultado;
