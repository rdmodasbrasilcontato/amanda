import cron from 'node-cron';
import { processDueFollowups } from '../modules/followup/followup.service';
import { logger } from '../utils/logger';

export function startFollowupJob(): void {
  // Processar follow-ups a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Executando job de follow-up');
    try {
      await processDueFollowups();
    } catch (err) {
      logger.error({ err }, 'Erro no job de follow-up');
    }
  });

  logger.info('Job de follow-up iniciado (a cada 5 minutos)');
}
