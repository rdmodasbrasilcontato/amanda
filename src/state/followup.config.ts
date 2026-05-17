import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pool } from '../database/connection';
import { logger } from '../utils/logger';

const CONFIG_FILE = join(process.cwd(), '.amanda-followup-config.json');

export interface FollowupAttempt {
  attempt: number;
  delayHours: number;
}

export interface FollowupConfig {
  schedule: FollowupAttempt[];
  optOutKeywords: string[];
}

const DEFAULT_CONFIG: FollowupConfig = {
  schedule: [
    { attempt: 1, delayHours: 0.33 },
    { attempt: 2, delayHours: 3 },
    { attempt: 3, delayHours: 8 },
    { attempt: 4, delayHours: 24 },
    { attempt: 5, delayHours: 72 },
    { attempt: 6, delayHours: 168 },
    { attempt: 7, delayHours: 360 },
    { attempt: 8, delayHours: 720 },
  ],
  optOutKeywords: ['NÃO', 'NAO', 'PARAR', 'PARA', 'SAIR', 'CANCELAR', 'STOP'],
};

let runtimeConfig: FollowupConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

try {
  if (existsSync(CONFIG_FILE)) {
    const data = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    if (Array.isArray(data.schedule)) runtimeConfig.schedule = data.schedule;
    if (Array.isArray(data.optOutKeywords)) runtimeConfig.optOutKeywords = data.optOutKeywords;
    logger.info('Configuração de follow-up carregada do disco');
  }
} catch {
  // use defaults
}

export function getFollowupConfig(): FollowupConfig {
  return runtimeConfig;
}

export function getFollowupSchedule(): FollowupAttempt[] {
  return runtimeConfig.schedule;
}

export function getOptOutKeywords(): string[] {
  return runtimeConfig.optOutKeywords;
}

export function setFollowupConfig(next: Partial<FollowupConfig>): FollowupConfig {
  if (next.schedule && Array.isArray(next.schedule)) {
    runtimeConfig.schedule = next.schedule
      .map(s => ({ attempt: Number(s.attempt), delayHours: Number(s.delayHours) }))
      .filter(s => Number.isFinite(s.attempt) && Number.isFinite(s.delayHours) && s.delayHours >= 0);
  }
  if (next.optOutKeywords && Array.isArray(next.optOutKeywords)) {
    runtimeConfig.optOutKeywords = next.optOutKeywords
      .map(k => String(k).trim())
      .filter(Boolean);
  }
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(runtimeConfig, null, 2));
    logger.info({ config: runtimeConfig }, 'Configuração de follow-up salva');
  } catch (err) {
    logger.error({ err }, 'Erro ao persistir config de follow-up');
  }
  return runtimeConfig;
}

export async function ensureFollowupColumns(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS followup_paused    BOOLEAN     NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS followup_paused_at TIMESTAMPTZ
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_followup_paused
        ON clientes(followup_paused) WHERE followup_paused = TRUE
    `);
    logger.info('✅ Colunas followup_paused garantidas em clientes');
  } catch (err) {
    logger.error({ err }, 'Erro ao garantir colunas de followup_paused');
  }
}

export async function pauseFollowupForClient(clientId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE clientes SET followup_paused = TRUE, followup_paused_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [clientId]
    );
  } catch {
    // coluna ainda não existe — ignorar silenciosamente
  }
}

export async function resumeFollowupForClient(clientId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE clientes SET followup_paused = FALSE, followup_paused_at = NULL, updated_at = NOW()
       WHERE id = $1 AND followup_paused = TRUE`,
      [clientId]
    );
  } catch {
    // coluna ainda não existe — ignorar silenciosamente
  }
}
