-- ═══════════════════════════════════════════════════════════
-- Amanda AI — Migration 001: Schema Inicial
-- Executar no Supabase SQL Editor ou psql
-- ═══════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- busca textual

-- ───────────────────────────────────────────────────────────
-- CLIENTES
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone             VARCHAR(20) UNIQUE NOT NULL,
  name              VARCHAR(200),
  preferred_name    VARCHAR(100),
  opt_out           BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out_at        TIMESTAMPTZ,
  emotion_profile   JSONB NOT NULL DEFAULT '{}',
  purchase_count    INTEGER NOT NULL DEFAULT 0,
  last_contact_at   TIMESTAMPTZ,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  notes             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_phone ON clientes(phone);
CREATE INDEX idx_clientes_opt_out ON clientes(opt_out) WHERE opt_out = FALSE;
CREATE INDEX idx_clientes_last_contact ON clientes(last_contact_at DESC NULLS LAST);

-- ───────────────────────────────────────────────────────────
-- CONVERSAS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id             UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'handoff', 'closed', 'opted_out')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handoff_active        BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_started_at    TIMESTAMPTZ,
  handoff_by            VARCHAR(200),
  handoff_keyword       VARCHAR(100),
  reactivate_keyword    VARCHAR(100),
  context_summary       TEXT,
  message_count         INTEGER NOT NULL DEFAULT 0,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversas_client_id ON conversas(client_id);
CREATE INDEX idx_conversas_status ON conversas(status);
CREATE INDEX idx_conversas_last_message ON conversas(last_message_at DESC);
CREATE INDEX idx_conversas_handoff ON conversas(handoff_active) WHERE handoff_active = TRUE;

-- ───────────────────────────────────────────────────────────
-- MENSAGENS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensagens (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id     UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  role                VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content             TEXT NOT NULL,
  message_type        VARCHAR(20) NOT NULL DEFAULT 'text'
                        CHECK (message_type IN ('text','audio','image','document','video','sticker','location')),
  media_url           TEXT,
  zapi_message_id     VARCHAR(100),
  emotion_detected    VARCHAR(20) CHECK (emotion_detected IN ('neutral','happy','anxious','irritated','undecided','excited','sad')),
  tokens_used         INTEGER,
  processing_ms       INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensagens_conversation_id ON mensagens(conversation_id);
CREATE INDEX idx_mensagens_client_id ON mensagens(client_id);
CREATE INDEX idx_mensagens_created_at ON mensagens(created_at DESC);
CREATE INDEX idx_mensagens_zapi_id ON mensagens(zapi_message_id) WHERE zapi_message_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────
-- PRODUTOS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(300) NOT NULL,
  description         TEXT,
  price               DECIMAL(10,2) NOT NULL,
  price_promotional   DECIMAL(10,2),
  category            VARCHAR(100) NOT NULL,
  subcategory         VARCHAR(100),
  sizes               TEXT[] NOT NULL DEFAULT '{}',
  colors              TEXT[] NOT NULL DEFAULT '{}',
  images              TEXT[] NOT NULL DEFAULT '{}',
  stock_quantity      INTEGER NOT NULL DEFAULT 0,
  sku                 VARCHAR(100),
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produtos_category ON produtos(category);
CREATE INDEX idx_produtos_active ON produtos(active) WHERE active = TRUE;
CREATE INDEX idx_produtos_name_trgm ON produtos USING GIN(name gin_trgm_ops);

-- ───────────────────────────────────────────────────────────
-- PEDIDOS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversas(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'cart'
                    CHECK (status IN ('cart','pending','paid','shipped','delivered','cancelled')),
  total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  items           JSONB NOT NULL DEFAULT '[]',
  payment_method  VARCHAR(30),
  pix_key         VARCHAR(200),
  notes           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pedidos_client_id ON pedidos(client_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);

-- ───────────────────────────────────────────────────────────
-- FOLLOW-UPS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversation_id     UUID REFERENCES conversas(id) ON DELETE SET NULL,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  sent_at             TIMESTAMPTZ,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','cancelled','failed')),
  attempt_number      INTEGER NOT NULL DEFAULT 1,
  message_content     TEXT,
  cancelled_reason    VARCHAR(200),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_client_id ON followups(client_id);
CREATE INDEX idx_followups_scheduled ON followups(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_followups_status ON followups(status);

-- ───────────────────────────────────────────────────────────
-- HANDOFFS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoffs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id       UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','resolved')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  started_by            VARCHAR(200),
  resolved_by           VARCHAR(200),
  context_at_handoff    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handoffs_conversation_id ON handoffs(conversation_id);
CREATE INDEX idx_handoffs_status ON handoffs(status) WHERE status = 'active';

-- ───────────────────────────────────────────────────────────
-- ANALYTICS / EVENTOS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversas(id) ON DELETE SET NULL,
  event_type      VARCHAR(100) NOT NULL,
  event_data      JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eventos_event_type ON eventos(event_type);
CREATE INDEX idx_eventos_client_id ON eventos(client_id);
CREATE INDEX idx_eventos_created_at ON eventos(created_at DESC);

-- ───────────────────────────────────────────────────────────
-- MÍDIAS (áudios, imagens, docs enviados)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS midias (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  message_id      UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  media_type      VARCHAR(20) NOT NULL CHECK (media_type IN ('audio','image','document','video')),
  original_url    TEXT NOT NULL,
  storage_path    TEXT,
  public_url      TEXT,
  mime_type       VARCHAR(100),
  file_size       INTEGER,
  transcription   TEXT,
  ai_analysis     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_midias_client_id ON midias(client_id);
CREATE INDEX idx_midias_type ON midias(media_type);

-- ───────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER (reutilizável)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_conversas_updated_at
  BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_followups_updated_at
  BEFORE UPDATE ON followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
