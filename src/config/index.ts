import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_FALLBACK_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  OPENAI_TTS_MODEL: z.string().default('tts-1'),
  OPENAI_TTS_VOICE: z.string().default('nova'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(1024),
  OPENAI_TEMPERATURE: z.coerce.number().default(0.7),
  OPENAI_TIMEOUT_MS: z.coerce.number().default(45000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_STORAGE_BUCKET_AUDIO: z.string().default('amanda-audios'),
  SUPABASE_STORAGE_BUCKET_IMAGES: z.string().default('amanda-imagens'),
  SUPABASE_STORAGE_BUCKET_DOCS: z.string().default('amanda-docs'),

  // Database
  DATABASE_URL: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DATABASE_POOL_URL: z.string().optional(),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().default(10),
  DATABASE_SSL: z.coerce.boolean().default(true),

  // Z-API
  ZAPI_INSTANCE_ID: z.string().min(1),
  ZAPI_TOKEN: z.string().min(1),
  ZAPI_CLIENT_TOKEN: z.string().min(1),
  ZAPI_BASE_URL: z.string().url(),
  ZAPI_WEBHOOK_VERIFY_TOKEN: z.string().default('amanda_webhook_secret'),
  ZAPI_AUTO_READ: z.coerce.boolean().default(true),
  ZAPI_TYPING_DELAY_MS: z.coerce.number().default(1500),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_TLS: z.coerce.boolean().default(false),
  REDIS_TTL_SESSION_SECONDS: z.coerce.number().default(86400),
  REDIS_TTL_DEBOUNCE_SECONDS: z.coerce.number().default(8),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('Amanda AI'),
  APP_VERSION: z.string().default('1.0.0'),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TIMEZONE: z.string().default('America/Sao_Paulo'),

  // Business
  BUSINESS_NAME: z.string().default('RD Modas Brasil'),
  BUSINESS_PHONE: z.string().optional(),
  BUSINESS_INSTAGRAM: z.string().default('https://www.instagram.com/rdmodasbrasil/'),
  BUSINESS_WEBSITE: z.string().default('https://rdmodasbrasil.com.br'),
  BUSINESS_GOOGLE_MAPS: z.string().optional(),

  // Amanda persona
  AMANDA_PERSONA_VERSION: z.string().default('v8'),
  AMANDA_DEBOUNCE_MS: z.coerce.number().default(8000),
  AMANDA_TYPING_MIN_MS: z.coerce.number().default(1200),
  AMANDA_TYPING_MAX_MS: z.coerce.number().default(3800),
  AMANDA_AUDIO_REPLY_PROBABILITY: z.coerce.number().default(0.15),
  AMANDA_FOLLOWUP_HOURS_1: z.coerce.number().default(2),
  AMANDA_FOLLOWUP_HOURS_2: z.coerce.number().default(24),
  AMANDA_FOLLOWUP_HOURS_3: z.coerce.number().default(72),
  AMANDA_HANDOFF_KEYWORDS: z.string().default('humano,atendente,vendedor,gerente'),

  // Security
  JWT_SECRET: z.string().default('change_me_in_production'),
  ADMIN_API_KEY: z.string().default('change_me_in_production'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),
  ENCRYPTION_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('production'),
  LOG_TRANSPORT: z.string().default('stdout'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';

export const handoffKeywords = config.AMANDA_HANDOFF_KEYWORDS
  .split(',')
  .map(k => k.trim().toLowerCase());
