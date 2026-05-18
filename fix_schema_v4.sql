-- ════════════════════════════════════════════════════════
-- Amanda AI — Fix schema v4
-- Adiciona colunas faltantes em eventos e emocao_analise
-- Rodar no Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- ── eventos: adicionar mensagem_id ───────────────────────
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS mensagem_id UUID;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS dados JSONB DEFAULT '{}'::jsonb;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS pontos_score INTEGER DEFAULT 0;

-- ── emocao_analise: adicionar confianca ──────────────────
ALTER TABLE emocao_analise ADD COLUMN IF NOT EXISTS confianca NUMERIC(3,2) DEFAULT 0.5;
ALTER TABLE emocao_analise ADD COLUMN IF NOT EXISTS contexto TEXT;
ALTER TABLE emocao_analise ADD COLUMN IF NOT EXISTS mensagem_id UUID;
ALTER TABLE emocao_analise ADD COLUMN IF NOT EXISTS intensidade NUMERIC(3,2) DEFAULT 0.5;

SELECT 'Schema v4 aplicado com sucesso!' AS resultado;
