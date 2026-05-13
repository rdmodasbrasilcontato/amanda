import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Prompts {
  identity: string;
  personality: string;
  emotional: string;
  sales: string;
  antiSpam: string;
  restrictions: string;
  memory: string;
  storeInfo: string;
  followup: string;
  humanization: string;
}

let cachedPrompts: Prompts | null = null;

function resolvePromptsDir(): string {
  // When running from dist/, __dirname is dist/modules/ai — look for dist/prompts first
  const distPrompts = join(__dirname, '../../prompts');
  if (existsSync(distPrompts)) return distPrompts;

  // Fallback: running in dev (ts-node) or dist/prompts wasn't copied — use src/prompts
  const srcPrompts = join(process.cwd(), 'src', 'prompts');
  if (existsSync(srcPrompts)) return srcPrompts;

  // Last resort: relative to project root
  return join(__dirname, '../../../src/prompts');
}

export function loadAllPrompts(): Prompts {
  if (cachedPrompts) return cachedPrompts;

  const promptsDir = resolvePromptsDir();

  const load = (file: string): string => {
    try {
      return readFileSync(join(promptsDir, file), 'utf-8');
    } catch {
      return '';
    }
  };

  cachedPrompts = {
    identity: load('identity.txt'),
    personality: load('personality.txt'),
    emotional: load('emotional.txt'),
    sales: load('sales.txt'),
    antiSpam: load('anti-spam.txt'),
    restrictions: load('restrictions.txt'),
    memory: load('memory.txt'),
    storeInfo: load('store-info.txt'),
    followup: load('followup.txt'),
    humanization: load('humanization.txt'),
  };

  return cachedPrompts;
}

export function invalidatePromptsCache(): void {
  cachedPrompts = null;
}
