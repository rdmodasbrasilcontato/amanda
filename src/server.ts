import 'dotenv/config';
process.env.TZ = 'America/Sao_Paulo';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { checkDatabaseConnection } from './database/connection';
import { getRedisClient } from './cache/redis.client';
import { startFollowupJob } from './jobs/followup.job';
import { startHandoffTimeoutJob } from './jobs/handoff.job';
import { startScoreDecayJob } from './jobs/score-decay.job';

async function bootstrap(): Promise<void> {
  logger.info(`🚀 Iniciando ${config.APP_NAME} v${config.APP_VERSION}...`);

  // Checar banco com retry — Supabase pode demorar a aceitar conexões
  let dbOk = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    dbOk = await checkDatabaseConnection();
    if (dbOk) break;
    const wait = attempt * 3000;
    logger.warn(`⚠️  Banco indisponível (tentativa ${attempt}/5) — aguardando ${wait}ms`);
    await new Promise(r => setTimeout(r, wait));
  }
  if (!dbOk) {
    logger.error('❌ Não foi possível conectar ao banco após 5 tentativas. Servidor subirá assim mesmo (sem follow-up até banco voltar)');
  } else {
    logger.info('✅ PostgreSQL conectado');
  }

  // Inicializar Redis (opcional)
  try {
    const redis = getRedisClient();
    if (redis) {
      logger.info('✅ Redis conectado');
    } else {
      logger.warn('⚠️  Redis não configurado — debounce e cache em memória');
    }
  } catch (err) {
    logger.warn({ err }, '⚠️  Falha ao inicializar Redis — seguindo sem cache');
  }

  // Iniciar jobs (só se banco ok — senão dão erro infinito)
  if (dbOk) {
    try { startFollowupJob();        } catch (err) { logger.error({ err }, 'Erro ao iniciar followup job'); }
    try { startHandoffTimeoutJob();  } catch (err) { logger.error({ err }, 'Erro ao iniciar handoff job'); }
    try { startScoreDecayJob();      } catch (err) { logger.error({ err }, 'Erro ao iniciar score decay job'); }
    logger.info('✅ Jobs de background iniciados');
  } else {
    logger.warn('⏸️  Jobs de background NÃO iniciados (banco offline)');
  }

  // Iniciar servidor
  const server = app.listen(config.PORT, () => {
    logger.info(`✅ Amanda AI escutando na porta ${config.PORT}`);
    logger.info(`   Webhook: POST /webhook/zapi`);
    logger.info(`   Admin:   GET  /admin/status`);
    logger.info(`   Health:  GET  /health`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info({ signal }, 'Sinal de encerramento recebido');
    server.close(() => {
      logger.info('Servidor encerrado graciosamente');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught Exception');
    process.exit(1);
  });
}

bootstrap().catch(err => {
  console.error('Falha ao iniciar Amanda AI:', err);
  process.exit(1);
});
