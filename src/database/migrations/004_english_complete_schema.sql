-- ═══════════════════════════════════════════════════════════════════
-- Amanda AI — Migration 004: Schema completo em inglês
-- Alinhado com os services TypeScript (English column names)
-- ⚠️  DROPa as tabelas das migrations 001/002/003 (PT-BR) e recria.
--     Execute em ambiente novo. Se houver dados, faça backup antes.
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Drop PT-BR tables criadas em 003 (se existirem) ──
DROP TABLE IF EXISTS
  fila_processamento, followup_logs, emocao_analise,
  pagamentos_pix, imagens_recebidas, audios_recebidos, documentos_recebidos,
  campanhas, embeddings, memoria_longa, memoria_curta,
  carrinhos, opt_out, spam_risk, blacklist,
  usuarios_dashboard, configuracoes,
  midias, followups, handoffs, pedidos, mensagens, conversas,
  memoria_vetorial, produtos, categorias, clientes
CASCADE;

-- ── Trigger genérico para updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════
-- CLIENTES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE clientes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone             VARCHAR(20) UNIQUE NOT NULL,
  name              VARCHAR(200),
  preferred_name    VARCHAR(100),
  email             VARCHAR(200),
  instagram         VARCHAR(100),
  city              VARCHAR(100),
  state             VARCHAR(50),
  country           VARCHAR(50) DEFAULT 'Brasil',
  birth_date        DATE,
  gender            VARCHAR(20),
  purchase_count    INTEGER NOT NULL DEFAULT 0,
  total_spent       DECIMAL(12,2) NOT NULL DEFAULT 0,
  avg_ticket        DECIMAL(10,2) NOT NULL DEFAULT 0,
  favorite_category VARCHAR(100),
  preferences       JSONB NOT NULL DEFAULT '{}',
  notes             TEXT,
  emotion_profile   JSONB NOT NULL DEFAULT '{}',
  recurring_emotion VARCHAR(30),
  engagement_level  VARCHAR(20) NOT NULL DEFAULT 'cold'
                      CHECK (engagement_level IN ('cold','warm','hot','vip')),
  lead_temperature  FLOAT NOT NULL DEFAULT 0,
  client_status     VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (client_status IN ('active','inactive','blocked','vip')),
  tags              TEXT[] NOT NULL DEFAULT '{}',
  opt_out           BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out_at        TIMESTAMPTZ,
  blocked           BOOLEAN NOT NULL DEFAULT FALSE,
  human_took_over   BOOLEAN NOT NULL DEFAULT FALSE,
  ai_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_contact_at   TIMESTAMPTZ,
  last_purchase_at  TIMESTAMPTZ,
  client_since      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_phone ON clientes(phone);
CREATE INDEX idx_clientes_opt_out ON clientes(opt_out) WHERE opt_out = FALSE;
CREATE INDEX idx_clientes_last_contact ON clientes(last_contact_at DESC NULLS LAST);

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- CONVERSAS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE conversas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  channel             VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','closed','handoff','opt_out','blocked')),
  context_summary     TEXT,
  last_message        TEXT,
  last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_ai_reply_at    TIMESTAMPTZ,
  last_human_reply_at TIMESTAMPTZ,
  message_count       INTEGER NOT NULL DEFAULT 0,
  detected_emotion    VARCHAR(30),
  lead_score          FLOAT NOT NULL DEFAULT 0,
  funnel_stage        VARCHAR(30) NOT NULL DEFAULT 'top'
                        CHECK (funnel_stage IN ('top','middle','bottom','client','repurchase')),
  handoff_active      BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_started_at  TIMESTAMPTZ,
  handoff_by          VARCHAR(200),
  followup_active     BOOLEAN NOT NULL DEFAULT FALSE,
  origin              VARCHAR(50),
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversas_client ON conversas(client_id);
CREATE INDEX idx_conversas_status ON conversas(status);
CREATE INDEX idx_conversas_last_message ON conversas(last_message_at DESC);
CREATE INDEX idx_conversas_handoff ON conversas(handoff_active) WHERE handoff_active = TRUE;

CREATE TRIGGER trg_conversas_updated_at
  BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- MENSAGENS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE mensagens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL
                      CHECK (role IN ('user','assistant','system','human')),
  content           TEXT NOT NULL,
  message_type      VARCHAR(20) NOT NULL DEFAULT 'text'
                      CHECK (message_type IN ('text','image','audio','video','document','sticker','location')),
  media_url         TEXT,
  zapi_message_id   VARCHAR(100),
  emotion_detected  VARCHAR(30),
  intent_detected   VARCHAR(100),
  sentiment_score   FLOAT,
  spam_score        FLOAT DEFAULT 0,
  tokens_used       INTEGER,
  model_used        VARCHAR(50),
  response_time_ms  INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensagens_conversation ON mensagens(conversation_id);
CREATE INDEX idx_mensagens_client ON mensagens(client_id);
CREATE INDEX idx_mensagens_created ON mensagens(created_at DESC);
CREATE INDEX idx_mensagens_role ON mensagens(role);
CREATE INDEX idx_mensagens_zapi ON mensagens(zapi_message_id) WHERE zapi_message_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- HANDOFFS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE handoffs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id     UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','resolved','expired')),
  started_by          VARCHAR(100),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_at_handoff  TEXT,
  resolved_at         TIMESTAMPTZ,
  resolved_by         VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handoffs_conversation ON handoffs(conversation_id);
CREATE INDEX idx_handoffs_status ON handoffs(status);

CREATE TRIGGER trg_handoffs_updated_at
  BEFORE UPDATE ON handoffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- FOLLOWUPS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE followups (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversation_id   UUID REFERENCES conversas(id) ON DELETE SET NULL,
  attempt_number    INTEGER NOT NULL DEFAULT 1,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  sent_at           TIMESTAMPTZ,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','sent','cancelled','failed')),
  message_content   TEXT,
  cancelled_reason  VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_client ON followups(client_id);
CREATE INDEX idx_followups_status_scheduled ON followups(status, scheduled_at);

CREATE TRIGGER trg_followups_updated_at
  BEFORE UPDATE ON followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- MEMORIA_VETORIAL
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE memoria_vetorial (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  content            TEXT NOT NULL,
  embedding          vector(1536),
  memory_type        VARCHAR(30) NOT NULL DEFAULT 'interaction'
                       CHECK (memory_type IN ('interaction','preference','emotion','purchase','behavior','objection','style','size','history')),
  importance         FLOAT NOT NULL DEFAULT 1.0,
  source_message_id  UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  last_used_at       TIMESTAMPTZ,
  use_count          INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memoria_vetorial_client ON memoria_vetorial(client_id);
CREATE INDEX idx_memoria_vetorial_type ON memoria_vetorial(memory_type);
CREATE INDEX idx_memoria_vetorial_embedding
  ON memoria_vetorial USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ═══════════════════════════════════════════════════════════════════
-- PRODUTOS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE produtos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             VARCHAR(100) UNIQUE,
  name            VARCHAR(300) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  brand           VARCHAR(100),
  collection      VARCHAR(100),
  style           VARCHAR(100),
  fabric          VARCHAR(100),
  color           VARCHAR(50),
  sizes           TEXT[] NOT NULL DEFAULT '{}',
  colors          TEXT[] NOT NULL DEFAULT '{}',
  occasion        TEXT[] NOT NULL DEFAULT '{}',
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  promo_price     DECIMAL(10,2),
  cost            DECIMAL(10,2),
  stock_quantity  INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  featured        BOOLEAN NOT NULL DEFAULT FALSE,
  is_new          BOOLEAN NOT NULL DEFAULT FALSE,
  product_url     TEXT,
  main_image_url  TEXT,
  images          TEXT[] NOT NULL DEFAULT '{}',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  keywords        TEXT,
  embedding       vector(1536),
  sales_score     FLOAT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produtos_active ON produtos(active) WHERE active = TRUE;
CREATE INDEX idx_produtos_featured ON produtos(featured) WHERE featured = TRUE;
CREATE INDEX idx_produtos_name_trgm ON produtos USING GIN(name gin_trgm_ops);
CREATE INDEX idx_produtos_embedding
  ON produtos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- PEDIDOS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE pedidos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversas(id) ON DELETE SET NULL,
  order_number  VARCHAR(50) UNIQUE NOT NULL DEFAULT 'ORD-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','cancelled','shipped','delivered')),
  items         JSONB NOT NULL DEFAULT '[]',
  subtotal      DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping      DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(30),
  tracking_code VARCHAR(100),
  notes         TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pedidos_client ON pedidos(client_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- MIDIAS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE midias (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  message_id    VARCHAR(100),
  media_type    VARCHAR(20) NOT NULL
                  CHECK (media_type IN ('audio','image','document','video')),
  original_url  TEXT,
  storage_path  TEXT,
  public_url    TEXT,
  mime_type     VARCHAR(50),
  transcription TEXT,
  ai_analysis   TEXT,
  ocr_text      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_midias_client ON midias(client_id);
CREATE INDEX idx_midias_message ON midias(message_id);

-- ═══════════════════════════════════════════════════════════════════
-- FUNÇÕES DE BUSCA SEMÂNTICA
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION buscar_memoria_cliente(
  p_client_id     UUID,
  p_query_embedding vector(1536),
  p_limit         INT DEFAULT 5,
  p_threshold     FLOAT DEFAULT 0.72
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  memory_type VARCHAR,
  similarity  FLOAT,
  created_at  TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    1 - (m.embedding <=> p_query_embedding) AS similarity,
    m.created_at
  FROM memoria_vetorial m
  WHERE m.client_id = p_client_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION buscar_produtos_semantico(
  p_query_embedding vector(1536),
  p_limit           INT DEFAULT 5,
  p_threshold       FLOAT DEFAULT 0.68
)
RETURNS TABLE (
  id              UUID,
  name            VARCHAR,
  description     TEXT,
  price           DECIMAL,
  sizes           TEXT[],
  main_image_url  TEXT,
  similarity      FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.sizes,
    p.main_image_url,
    1 - (p.embedding <=> p_query_embedding) AS similarity
  FROM produtos p
  WHERE p.active = TRUE
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY p.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
