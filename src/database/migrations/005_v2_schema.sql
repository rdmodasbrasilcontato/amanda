-- Amanda AI v2 — Schema completo
-- Rodar após 001_initial_schema.sql

-- ─── Extensões ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── Enum types ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE lead_temperature_enum AS ENUM ('cold','warm','hot','very_hot');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emotion_enum AS ENUM (
    'neutral','happy','anxious','irritated','undecided',
    'excited','curious','urgent','frustrated','fearful','impulsive','sad'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE intent_enum AS ENUM (
    'price_inquiry','size_inquiry','photo_request','availability_check',
    'general_interest','purchase_intent','objection','returning_client',
    'complaint','browsing','special_occasion','urgent_need','unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── clientes (v2 — adiciona campos comportamentais) ──────────────────────────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS lead_score              INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_temperature        TEXT        NOT NULL DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS emotion_profile         TEXT        NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS dominant_intent         TEXT        NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS behavior_tags           TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_interactions      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_contact_hour  INTEGER,
  ADD COLUMN IF NOT EXISTS last_seen_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_paused         BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS followup_paused_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opt_out_at              TIMESTAMPTZ;

-- ─── conversas (v2) ───────────────────────────────────────────────────────────
ALTER TABLE conversas
  ADD COLUMN IF NOT EXISTS context_summary TEXT;

-- ─── mensagens (v2 — adiciona intent) ────────────────────────────────────────
ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS intent_detected TEXT;

-- ─── lead_score_events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_score_events (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL,
  points       INTEGER     NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_score_events_client ON lead_score_events(client_id, created_at DESC);

-- ─── customer_behavior_profile ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_behavior_profile (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                 UUID        NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  emotions_history          TEXT[]      NOT NULL DEFAULT '{}',
  intents_history           TEXT[]      NOT NULL DEFAULT '{}',
  categories_interest       TEXT[]      NOT NULL DEFAULT '{}',
  products_mentioned        TEXT[]      NOT NULL DEFAULT '{}',
  objections_raised         TEXT[]      NOT NULL DEFAULT '{}',
  price_range_interest      TEXT,
  interaction_frequency     INTEGER     NOT NULL DEFAULT 0,
  avg_response_time_minutes FLOAT,
  session_count             INTEGER     NOT NULL DEFAULT 0,
  last_analyzed_at          TIMESTAMPTZ,
  psychological_profile     TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── memoria_vetorial (v2 — usa pgvector) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS memoria_vetorial (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  content          TEXT        NOT NULL,
  memory_type      TEXT        NOT NULL DEFAULT 'interaction',
  embedding        vector(1536),
  relevance_score  FLOAT       NOT NULL DEFAULT 1.0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memoria_vetorial_client ON memoria_vetorial(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memoria_vetorial_embedding ON memoria_vetorial
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── followups (v2 — tabela completa, cria se não existir) ───────────────────
CREATE TABLE IF NOT EXISTS followups (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversation_id   UUID        NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  attempt_number    INTEGER     NOT NULL DEFAULT 1,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  sent_at           TIMESTAMPTZ,
  status            TEXT        NOT NULL DEFAULT 'pending',
  message_content   TEXT,
  cancelled_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_followups_pending ON followups(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_followups_client  ON followups(client_id, status);

-- ─── analytics_events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID        REFERENCES clientes(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_client ON analytics_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type   ON analytics_events(event_type, created_at DESC);

-- ─── anti_spam_log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_spam_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_antispam_client ON anti_spam_log(client_id, created_at DESC);
