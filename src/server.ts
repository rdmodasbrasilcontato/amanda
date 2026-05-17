import 'dotenv/config';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { checkDatabaseConnection, pool } from './database/connection';
import { getRedisClient } from './cache/redis.client';
import { startFollowupJob } from './jobs/followup.job';
import { registerWebhook } from './modules/whatsapp/zapi.service';

async function runMigrations(): Promise<void> {
  try {
    // Enable pgvector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector').catch(() => {
      logger.warn('pgvector extension not available — vector search disabled');
    });

    // Add v2 columns idempotently
    await pool.query(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS lead_score              INTEGER     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS lead_temperature        TEXT        NOT NULL DEFAULT 'cold',
        ADD COLUMN IF NOT EXISTS emotion_profile         TEXT        NOT NULL DEFAULT 'neutral',
        ADD COLUMN IF NOT EXISTS dominant_intent         TEXT        NOT NULL DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS behavior_tags           TEXT[]      NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS total_interactions      INTEGER     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS preferred_contact_hour  INTEGER,
        ADD COLUMN IF NOT EXISTS last_seen_at            TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS followup_paused         BOOLEAN     NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS followup_paused_at      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS opt_out_at              TIMESTAMPTZ
    `);

    await pool.query(`ALTER TABLE conversas ADD COLUMN IF NOT EXISTS context_summary TEXT`);
    await pool.query(`ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS intent_detected TEXT`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_score_events (
        id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id   UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        event_type  TEXT        NOT NULL,
        points      INTEGER     NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lse_client ON lead_score_events(client_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_behavior_profile (
        id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id                 UUID        NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
        emotions_history          TEXT[]      NOT NULL DEFAULT '{}',
        intents_history           TEXT[]      NOT NULL DEFAULT '{}',
        categories_interest       TEXT[]      NOT NULL DEFAULT '{}',
        products_mentioned        TEXT[]      NOT NULL DEFAULT '{}',
        objections_raised         TEXT[]      NOT NULL DEFAULT '{}',
        price_range_interest      TEXT,
        interaction_frequency     INTEGER     NOT NULL DEFAULT 0,
        avg_response_time_minutes FLOAT,
        session_count             INTEGER     NOT NULL DEFAULT 0,
        last_analyzed_at          TIMESTAMPTZ,
        psychological_profile     TEXT,
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memoria_vetorial (
        id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id       UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        content         TEXT        NOT NULL,
        memory_type     TEXT        NOT NULL DEFAULT 'interaction',
        embedding       vector(1536),
        relevance_score FLOAT       NOT NULL DEFAULT 1.0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(() => {
      // If pgvector not available, create without vector column
      return pool.query(`
        CREATE TABLE IF NOT EXISTS memoria_vetorial (
          id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
          client_id       UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          content         TEXT        NOT NULL,
          memory_type     TEXT        NOT NULL DEFAULT 'interaction',
          relevance_score FLOAT       NOT NULL DEFAULT 1.0,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS followups (
        id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id        UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        conversation_id  UUID        NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
        attempt_number   INTEGER     NOT NULL DEFAULT 1,
        scheduled_at     TIMESTAMPTZ NOT NULL,
        sent_at          TIMESTAMPTZ,
        status           TEXT        NOT NULL DEFAULT 'pending',
        message_content  TEXT,
        cancelled_reason TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_followups_pending ON followups(scheduled_at) WHERE status = 'pending'`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS anti_spam_log (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id  UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        action     TEXT        NOT NULL,
        reason     TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id  UUID        REFERENCES clientes(id) ON DELETE SET NULL,
        event_type TEXT        NOT NULL,
        payload    JSONB       NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    logger.info('✅ Schema v2 verificado/aplicado');
  } catch (err) {
    logger.error({ err }, 'Erro ao aplicar migrations v2');
    throw err;
  }
}

async function bootstrap(): Promise<void> {
  logger.info(`🚀 Iniciando Amanda AI v2 — Silent Behavioral Intelligence`);

  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.error('❌ PostgreSQL indisponível. Encerrando.');
    process.exit(1);
  }
  logger.info('✅ PostgreSQL conectado');

  await runMigrations();

  const redis = getRedisClient();
  if (redis) {
    logger.info('✅ Redis conectado');
  } else {
    logger.warn('⚠️  Redis não configurado — deduplicação e debounce em memória local');
  }

  if (config.WEBHOOK_BASE_URL) {
    await registerWebhook(config.WEBHOOK_BASE_URL);
  } else {
    logger.warn('⚠️  WEBHOOK_BASE_URL não definida — configure o webhook manualmente no painel Z-API');
  }

  startFollowupJob();

  const server = app.listen(config.PORT, () => {
    logger.info(`✅ Amanda AI v2 escutando na porta ${config.PORT}`);
    logger.info(`   Webhook: POST /webhook/zapi`);
    logger.info(`   Admin:   GET  /admin/status  (x-admin-key: ${config.ADMIN_API_KEY.slice(0, 8)}...)`);
    logger.info(`   Health:  GET  /health`);
    logger.info(`   Modo: SILENCIOSO — apenas observa, analisa e agenda follow-ups`);
  });

  const gracefulShutdown = (signal: string) => {
    logger.info({ signal }, 'Encerrando...');
    server.close(() => {
      logger.info('Servidor encerrado');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'Unhandled Rejection'));
  process.on('uncaughtException', (err) => { logger.error({ err }, 'Uncaught Exception'); process.exit(1); });
}

bootstrap().catch(err => {
  console.error('Falha ao iniciar Amanda AI v2:', err);
  process.exit(1);
});
