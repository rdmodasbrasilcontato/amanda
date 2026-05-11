-- ═══════════════════════════════════════════════════════════
-- Amanda AI — Migration 002: pgvector + Memória Semântica
-- Requer: CREATE EXTENSION vector; (ativar no Supabase)
-- ═══════════════════════════════════════════════════════════

-- Ativar pgvector (executar como superuser no Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- ───────────────────────────────────────────────────────────
-- MEMÓRIA VETORIAL (embeddings de longo prazo por cliente)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memoria_vetorial (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  embedding       vector(1536),   -- text-embedding-3-small = 1536 dims
  memory_type     VARCHAR(30) NOT NULL DEFAULT 'interaction'
                    CHECK (memory_type IN ('preference','purchase','emotion','interaction','product_interest')),
  relevance_score FLOAT NOT NULL DEFAULT 1.0,
  source_message_id UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice IVFFlat para busca vetorial aproximada eficiente
-- Ajustar lists para sqrt(num_registros) em produção
CREATE INDEX IF NOT EXISTS idx_memoria_vetorial_embedding
  ON memoria_vetorial
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_memoria_vetorial_client_id ON memoria_vetorial(client_id);
CREATE INDEX idx_memoria_vetorial_type ON memoria_vetorial(memory_type);

CREATE TRIGGER trg_memoria_vetorial_updated_at
  BEFORE UPDATE ON memoria_vetorial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ───────────────────────────────────────────────────────────
-- EMBEDDINGS DE PRODUTOS (busca semântica no catálogo)
-- ───────────────────────────────────────────────────────────
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_produtos_embedding
  ON produtos
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ───────────────────────────────────────────────────────────
-- FUNÇÃO: Busca semântica na memória do cliente
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION buscar_memoria_cliente(
  p_client_id    UUID,
  p_embedding    vector(1536),
  p_limit        INT DEFAULT 5,
  p_threshold    FLOAT DEFAULT 0.75
)
RETURNS TABLE (
  id             UUID,
  content        TEXT,
  memory_type    VARCHAR,
  similarity     FLOAT,
  created_at     TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.id,
    mv.content,
    mv.memory_type,
    1 - (mv.embedding <=> p_embedding) AS similarity,
    mv.created_at
  FROM memoria_vetorial mv
  WHERE
    mv.client_id = p_client_id
    AND mv.embedding IS NOT NULL
    AND 1 - (mv.embedding <=> p_embedding) >= p_threshold
  ORDER BY mv.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────
-- FUNÇÃO: Busca semântica de produtos
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION buscar_produtos_semantico(
  p_embedding    vector(1536),
  p_limit        INT DEFAULT 5,
  p_threshold    FLOAT DEFAULT 0.70
)
RETURNS TABLE (
  id             UUID,
  name           VARCHAR,
  description    TEXT,
  price          DECIMAL,
  category       VARCHAR,
  sizes          TEXT[],
  colors         TEXT[],
  images         TEXT[],
  similarity     FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.sizes,
    p.colors,
    p.images,
    1 - (p.embedding <=> p_embedding) AS similarity
  FROM produtos p
  WHERE
    p.active = TRUE
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> p_embedding) >= p_threshold
  ORDER BY p.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
