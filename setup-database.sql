-- ════════════════════════════════════════════════════════════════
-- Amanda AI — Setup Database Consolidado
-- Execute UMA VEZ no Supabase SQL Editor
-- Aplica todas as correções de schema necessárias para o bot funcionar
-- ════════════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Colunas extras em FOLLOWUPS ─────────────────────────────────
ALTER TABLE followups ADD COLUMN IF NOT EXISTS contexto_utilizado JSONB DEFAULT '{}';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS cancelado_por      TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS tentativas         INTEGER DEFAULT 0;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS mensagem_gerada    TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS atualizado_em      TIMESTAMPTZ DEFAULT NOW();

-- ── followup_logs (anti-spam por dia) ───────────────────────────
CREATE TABLE IF NOT EXISTS followup_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id   UUID REFERENCES followups(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem      TEXT,
  status        TEXT DEFAULT 'enviado',
  erro          TEXT,
  zapi_id       VARCHAR(200),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_logs_cliente_id ON followup_logs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_followup_logs_criado_em  ON followup_logs(criado_em);

-- ── customer_behavior_profile ───────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_behavior_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  horarios_ativo        JSONB DEFAULT '{}'::jsonb,
  horario_preferido     TEXT,
  categorias_interesse  TEXT[] DEFAULT '{}',
  produtos_citados      TEXT[] DEFAULT '{}',
  ocasioes_mencionadas  TEXT[] DEFAULT '{}',
  cores_preferidas      TEXT[] DEFAULT '{}',
  intensidade_emocional NUMERIC(4,3) DEFAULT 0.5,
  probabilidade_compra  NUMERIC(4,3) DEFAULT 0,
  nivel_urgencia        TEXT DEFAULT 'baixa',
  total_interacoes      INTEGER DEFAULT 0,
  total_followups       INTEGER DEFAULT 0,
  lead_score            INTEGER DEFAULT 0,
  ticket_medio          NUMERIC(10,2) DEFAULT 0,
  frequencia_compra     INTEGER DEFAULT 0,
  score_engajamento     INTEGER DEFAULT 0,
  score_emocional       INTEGER DEFAULT 0,
  comportamento_dominante TEXT,
  categoria_favorita    TEXT,
  intencao_dominante    TEXT,
  perfil_psicologico    TEXT,
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavior_cliente ON customer_behavior_profile(cliente_id);

-- ── Verificação rápida (diagnóstico) ────────────────────────────
DO $$
DECLARE
  c_count INTEGER;
  f_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO c_count FROM clientes;
  SELECT COUNT(*) INTO f_count FROM followups;
  RAISE NOTICE '✅ Setup completo. Clientes: %. Followups: %.', c_count, f_count;
END $$;
