import { config } from '../config';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.startsWith('55') && digits.length >= 12) {
    const local = digits.slice(2);
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return phone;
}

export function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function isBusinessHours(): boolean {
  const now = new Date();
  const tz = config.TIMEZONE;
  const brtNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const hour = brtNow.getHours();
  const day = brtNow.getDay();
  return day >= 1 && day <= 6 && hour >= 9 && hour < 20;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE = new Set(['password', 'token', 'key', 'secret', 'authorization']);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      SENSITIVE.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v]
    )
  );
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

export function generateTypingDelay(messageLength: number): number {
  const base = config.AMANDA_TYPING_MIN_MS;
  const max = config.AMANDA_TYPING_MAX_MS;
  const perChar = 30;
  const calculated = base + Math.min(messageLength * perChar, max - base);
  return randomBetween(calculated * 0.8, calculated);
}
