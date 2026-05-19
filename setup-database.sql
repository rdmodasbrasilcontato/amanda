-- ════════════════════════════════════════════════════════════════
-- Amanda AI — Setup Database Consolidado
-- Execute UMA VEZ no Supabase SQL Editor
-- Aplica todas as correções de schema necessárias para o bot funcionar
-- ════════════════════════════════════════════════════════════════

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

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

-- ── emocao_analise (se não existir) ─────────────────────────────
CREATE TABLE IF NOT EXISTS emocao_analise (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id    UUID REFERENCES conversas(id) ON DELETE CASCADE,
  mensagem_id    UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  emocao         TEXT NOT NULL,
  intensidade    NUMERIC(4,3) DEFAULT 0.5,
  confianca      NUMERIC(4,3) DEFAULT 0.8,
  contexto       TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emocao_cliente_id ON emocao_analise(cliente_id);
CREATE INDEX IF NOT EXISTS idx_emocao_criado_em  ON emocao_analise(criado_em);

-- ── eventos (se não existir) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id    UUID REFERENCES conversas(id) ON DELETE SET NULL,
  mensagem_id    UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  tipo_evento    TEXT NOT NULL,
  dados          JSONB DEFAULT '{}',
  pontos_score   INTEGER DEFAULT 0,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_cliente_id ON eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo       ON eventos(tipo_evento);

-- ── lead_scores (se não existir) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  score            INTEGER DEFAULT 0,
  temperatura_lead INTEGER DEFAULT 0,
  ultima_pontuacao TIMESTAMPTZ,
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_cliente ON lead_scores(cliente_id);

-- ── handoffs (se não existir) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoffs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id    UUID REFERENCES conversas(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','expirado')),
  iniciado_por   TEXT,
  palavra_chave  TEXT,
  reativacao     TEXT,
  iniciado_em    TIMESTAMPTZ DEFAULT NOW(),
  encerrado_em   TIMESTAMPTZ,
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_cliente_id ON handoffs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status     ON handoffs(status) WHERE status = 'ativo';

-- ── memoria_curta (se não existir) ───────────────────────────────
CREATE TABLE IF NOT EXISTS memoria_curta (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  mensagem_id  UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  conteudo     TEXT NOT NULL,
  direcao      TEXT DEFAULT 'entrada' CHECK (direcao IN ('entrada','saida')),
  emocao       TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memoria_curta_conversa ON memoria_curta(conversa_id);
CREATE INDEX IF NOT EXISTS idx_memoria_curta_criado   ON memoria_curta(criado_em DESC);

-- ── memoria_longa (se não existir) ───────────────────────────────
CREATE TABLE IF NOT EXISTS memoria_longa (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_memoria   TEXT NOT NULL DEFAULT 'interacao',
  conteudo       TEXT NOT NULL,
  embedding      vector(1536),
  relevancia     NUMERIC(4,3) DEFAULT 1.0,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memoria_longa_cliente ON memoria_longa(cliente_id);

-- Função busca vetorial (recria se necessário)
CREATE OR REPLACE FUNCTION buscar_memoria_cliente(
  p_cliente_id   UUID,
  p_embedding    vector(1536),
  p_limite       INTEGER DEFAULT 5,
  p_threshold    FLOAT DEFAULT 0.72
)
RETURNS TABLE (
  id           UUID,
  tipo_memoria TEXT,
  conteudo     TEXT,
  similaridade FLOAT,
  criado_em    TIMESTAMPTZ
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    tipo_memoria::TEXT,
    conteudo,
    1 - (embedding <=> p_embedding) AS similaridade,
    criado_em
  FROM memoria_longa
  WHERE cliente_id = p_cliente_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> p_embedding) >= p_threshold
  ORDER BY embedding <=> p_embedding
  LIMIT p_limite;
$$;

-- ── Verificação rápida (diagnóstico) ────────────────────────────
DO $$
DECLARE
  c_count INTEGER;
  f_count INTEGER;
  fl_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO c_count FROM clientes;
  SELECT COUNT(*) INTO f_count FROM followups;
  SELECT COUNT(*) INTO fl_count FROM followup_logs;
  RAISE NOTICE '✅ Setup completo. Clientes: %. Followups: %. Logs: %.', c_count, f_count, fl_count;
END $$;
