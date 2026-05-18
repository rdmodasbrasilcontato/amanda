-- ════════════════════════════════════════════════════════
-- Amanda AI — Fix schema v5 step2
-- Corrige customer_behavior_profile para o schema que o código espera
-- Rodar no Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- ── 1. Adicionar colunas faltantes ───────────────────────
ALTER TABLE customer_behavior_profile
  ADD COLUMN IF NOT EXISTS horario_preferido     TEXT,
  ADD COLUMN IF NOT EXISTS ocasioes_mencionadas  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cores_preferidas      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faixa_preco_interesse JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS envia_audios          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pede_fotos            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pergunta_tamanho      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pergunta_preco        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS menciona_urgencia     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS menciona_ocasioes     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS intensidade_emocional NUMERIC(4,3) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS probabilidade_compra  NUMERIC(4,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel_urgencia        TEXT DEFAULT 'baixa',
  ADD COLUMN IF NOT EXISTS total_followups       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfil_psicologico    TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em         TIMESTAMPTZ DEFAULT NOW();

-- ── 2. Copiar usa_audio → envia_audios ───────────────────
UPDATE customer_behavior_profile
SET envia_audios = COALESCE(usa_audio, FALSE)
WHERE envia_audios = FALSE AND usa_audio = TRUE;

-- ── 3. Sincronizar atualizado_em com ultima_atualizacao ──
UPDATE customer_behavior_profile
SET atualizado_em = COALESCE(ultima_atualizacao, criado_em, NOW())
WHERE atualizado_em IS NULL OR atualizado_em = NOW() - INTERVAL '1 second';

-- ── 4. Corrigir horarios_ativo: text[] → JSONB ───────────
-- (perde dado antigo mas formato era incompatível com o código)
ALTER TABLE customer_behavior_profile DROP COLUMN IF EXISTS horarios_ativo;
ALTER TABLE customer_behavior_profile
  ADD COLUMN IF NOT EXISTS horarios_ativo JSONB DEFAULT '{}'::jsonb;

-- ── 5. Adicionar FK cliente_id → clientes ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customer_behavior_profile'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'customer_behavior_profile_cliente_id_fkey'
  ) THEN
    ALTER TABLE customer_behavior_profile
      ADD CONSTRAINT customer_behavior_profile_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 6. Garantir índice em cliente_id ─────────────────────
CREATE INDEX IF NOT EXISTS idx_customer_behavior_profile_cliente_id
  ON customer_behavior_profile(cliente_id);

SELECT 'Schema v5 step2 aplicado com sucesso!' AS resultado;
