import 'dotenv/config';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { checkDatabaseConnection } from './database/connection';
import { getRedisClient } from './cache/redis.client';
import { startFollowupJob } from './jobs/followup.job';
import { startHandoffTimeoutJob } from './jobs/handoff.job';
import { ensureFollowupColumns } from './state/followup.config';

async function bootstrap(): Promise<void> {
  logger.info(`🚀 Iniciando ${config.APP_NAME} v${config.APP_VERSION}...`);

  // Checar banco de dados
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.error('❌ Não foi possível conectar ao banco de dados. Encerrando.');
    process.exit(1);
  }
  logger.info('✅ PostgreSQL conectado');

  // Inicializar Redis (opcional)
  const redis = getRedisClient();
  if (redis) {
    logger.info('✅ Redis conectado');
  } else {
    logger.warn('⚠️  Redis não configurado — debounce e cache em memória');
  }

  // Garantir colunas de follow-up (idempotente)
  await ensureFollowupColumns();

  // Iniciar jobs
  startFollowupJob();
  startHandoffTimeoutJob();
  logger.info('✅ Jobs de background iniciados');

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
