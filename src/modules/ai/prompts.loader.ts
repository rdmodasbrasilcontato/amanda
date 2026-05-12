import { readFileSync } from 'fs';
import { join } from 'path';

interface Prompts {
  [key: string]: string;
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

export function loadAllPrompts(): Prompts {
  if (cachedPrompts) return cachedPrompts;

  const promptsDir = join(__dirname, '../../prompts');

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
