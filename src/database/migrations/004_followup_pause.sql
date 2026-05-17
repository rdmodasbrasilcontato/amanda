-- ═══════════════════════════════════════════════════════════
-- Amanda AI — Migration 004: Pause Follow-up por cliente
-- ═══════════════════════════════════════════════════════════

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS followup_paused    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS followup_paused_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clientes_followup_paused
  ON clientes(followup_paused) WHERE followup_paused = TRUE;
