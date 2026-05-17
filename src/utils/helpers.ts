import { config } from '../config';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function normalizePhone(phone: string): string {
  const beforeDash = phone.split('-')[0] ?? phone;
  const digits = beforeDash.replace(/\D/g, '');
  return digits.slice(0, 13);
}

export function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function isBusinessHours(): boolean {
  const tz = config.TIMEZONE;
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const hour = local.getHours();
  const day = local.getDay();
  return day >= 1 && day <= 6 && hour >= config.BUSINESS_HOURS_START && hour < config.BUSINESS_HOURS_END;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
  throw lastError;
}

export function normalizeTextForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function splitIntoBalloons(raw: string): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts.slice(0, 3) : [raw.trim()];
}
