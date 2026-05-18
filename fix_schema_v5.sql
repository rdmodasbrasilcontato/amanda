-- ════════════════════════════════════════════════════════
-- Amanda AI — Fix schema v5
-- Cria tabelas faltantes: followup_logs, customer_behavior_profile, handoffs
-- Rodar no Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- ── followup_logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followup_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id   UUID REFERENCES followups(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem      TEXT,
  status        TEXT DEFAULT 'enviado',
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_logs_cliente_id
  ON followup_logs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_followup_logs_criado_em
  ON followup_logs(criado_em);

-- ── customer_behavior_profile ────────────────────────────
CREATE TABLE IF NOT EXISTS customer_behavior_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  horarios_ativo        JSONB DEFAULT '{}'::jsonb,
  horario_preferido     TEXT,
  categorias_interesse  TEXT[] DEFAULT '{}',
  produtos_citados      TEXT[] DEFAULT '{}',
  ocasioes_mencionadas  TEXT[] DEFAULT '{}',
  tamanhos_citados      TEXT[] DEFAULT '{}',
  cores_preferidas      TEXT[] DEFAULT '{}',
  objecoes_recorrentes  TEXT[] DEFAULT '{}',
  faixa_preco_interesse JSONB DEFAULT '{}'::jsonb,
  envia_audios          BOOLEAN DEFAULT FALSE,
  envia_imagens         BOOLEAN DEFAULT FALSE,
  pede_fotos            BOOLEAN DEFAULT FALSE,
  pergunta_tamanho      BOOLEAN DEFAULT FALSE,
  pergunta_preco        BOOLEAN DEFAULT FALSE,
  menciona_urgencia     BOOLEAN DEFAULT FALSE,
  menciona_ocasioes     BOOLEAN DEFAULT FALSE,
  intensidade_emocional NUMERIC(4,3) DEFAULT 0.5,
  probabilidade_compra  NUMERIC(4,3) DEFAULT 0,
  nivel_urgencia        TEXT DEFAULT 'baixa',
  total_interacoes      INTEGER DEFAULT 0,
  total_followups       INTEGER DEFAULT 0,
  perfil_psicologico    TEXT,
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_behavior_profile_cliente_id
  ON customer_behavior_profile(cliente_id);

-- ── handoffs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoffs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id   UUID REFERENCES conversas(id) ON DELETE SET NULL,
  assumido_por  TEXT DEFAULT 'agente_humano',
  status        TEXT DEFAULT 'ativo',
  resolvido_em  TIMESTAMPTZ,
  resolvido_por TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_conversa_id
  ON handoffs(conversa_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status
  ON handoffs(status);

SELECT 'Schema v5 aplicado com sucesso!' AS resultado;
