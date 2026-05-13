import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

const STATE_FILE = join(process.cwd(), '.amanda-state');

let amandaEnabled = true;

try {
  if (existsSync(STATE_FILE)) {
    const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    amandaEnabled = data.enabled !== false;
    logger.info({ amandaEnabled }, 'Estado global carregado');
  }
} catch {
  // use default
}

export function isAmandaEnabled(): boolean {
  return amandaEnabled;
}

export function setAmandaEnabled(value: boolean): void {
  amandaEnabled = value;
  try { writeFileSync(STATE_FILE, JSON.stringify({ enabled: value })); } catch {}
  logger.info(`Amanda ${value ? 'LIGADA' : 'DESLIGADA'} globalmente pelo dashboard`);
}
