import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_FALLBACK_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(800),
  OPENAI_TEMPERATURE: z.coerce.number().default(0.75),
  OPENAI_TIMEOUT_MS: z.coerce.number().default(45000),

  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.coerce.boolean().default(true),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().default(10),

  // Z-API
  ZAPI_INSTANCE_ID: z.string().min(1),
  ZAPI_TOKEN: z.string().min(1),
  ZAPI_CLIENT_TOKEN: z.string().min(1),
  ZAPI_BASE_URL: z.string().default('https://api.z-api.io'),
  ZAPI_AUTO_READ: z.coerce.boolean().default(true),
  ZAPI_TYPING_DELAY_MS: z.coerce.number().default(1500),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_TTL_SESSION_SECONDS: z.coerce.number().default(86400),
  REDIS_DEBOUNCE_MS: z.coerce.number().default(8000),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('Amanda AI'),
  APP_VERSION: z.string().default('2.0.0'),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TIMEZONE: z.string().default('America/Sao_Paulo'),
  ADMIN_API_KEY: z.string().default('change_me_in_production'),

  // Business
  BUSINESS_NAME: z.string().default('RD Modas Brasil'),
  BUSINESS_PHONE: z.string().optional(),
  BUSINESS_HOURS_START: z.coerce.number().default(8),
  BUSINESS_HOURS_END: z.coerce.number().default(20),

  // Follow-up timing (hours)
  FOLLOWUP_DELAY_1_MIN: z.coerce.number().default(20),   // 20 minutes (stored as minutes)
  FOLLOWUP_DELAY_2_HRS: z.coerce.number().default(3),
  FOLLOWUP_DELAY_3_HRS: z.coerce.number().default(8),
  FOLLOWUP_DELAY_4_HRS: z.coerce.number().default(24),
  FOLLOWUP_DELAY_5_HRS: z.coerce.number().default(72),
  FOLLOWUP_DELAY_6_HRS: z.coerce.number().default(168),
  FOLLOWUP_DELAY_7_HRS: z.coerce.number().default(360),
  FOLLOWUP_DELAY_8_HRS: z.coerce.number().default(720),

  // Anti-spam
  ANTISPAM_DAILY_LIMIT: z.coerce.number().default(3),
  ANTISPAM_MIN_COOLDOWN_HOURS: z.coerce.number().default(4),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === 'production';

export const FOLLOWUP_SCHEDULE = [
  { attempt: 1, delayMinutes: config.FOLLOWUP_DELAY_1_MIN },
  { attempt: 2, delayMinutes: config.FOLLOWUP_DELAY_2_HRS * 60 },
  { attempt: 3, delayMinutes: config.FOLLOWUP_DELAY_3_HRS * 60 },
  { attempt: 4, delayMinutes: config.FOLLOWUP_DELAY_4_HRS * 60 },
  { attempt: 5, delayMinutes: config.FOLLOWUP_DELAY_5_HRS * 60 },
  { attempt: 6, delayMinutes: config.FOLLOWUP_DELAY_6_HRS * 60 },
  { attempt: 7, delayMinutes: config.FOLLOWUP_DELAY_7_HRS * 60 },
  { attempt: 8, delayMinutes: config.FOLLOWUP_DELAY_8_HRS * 60 },
];

export const OPT_OUT_KEYWORDS = ['não', 'nao', 'parar', 'para', 'sair', 'cancelar', 'stop', 'chega'];
