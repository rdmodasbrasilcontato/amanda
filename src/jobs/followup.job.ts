import cron from 'node-cron';
import { processDueFollowups } from '../modules/followup/followup.processor';
import { logger } from '../utils/logger';

export function startFollowupJob(): void {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      await processDueFollowups();
    } catch (err) {
      logger.error({ err }, 'Erro no job de follow-up');
    }
  });

  logger.info('✅ Job de follow-up iniciado (a cada 2 minutos)');
}
