import cron from 'node-cron';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

// Reativar handoffs que ficaram sem resposta humana por mais de 1 hora
export function startHandoffTimeoutJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const expired = await query<{ id: string }>(
        `SELECT id FROM conversas
         WHERE handoff_active = TRUE
           AND handoff_started_at < NOW() - INTERVAL '1 hour'`
      );

      for (const conv of expired) {
        await query(
          `UPDATE conversas
           SET status = 'active', handoff_active = FALSE,
               handoff_started_at = NULL, handoff_by = NULL, updated_at = NOW()
           WHERE id = $1`,
          [conv.id]
        );

        await query(
          `UPDATE handoffs
           SET status = 'resolved', resolved_at = NOW(), resolved_by = 'auto_timeout'
           WHERE conversation_id = $1 AND status = 'active'`,
          [conv.id]
        );

        logger.info({ conversationId: conv.id }, 'Handoff expirado — Amanda reativada');
      }
    } catch (err) {
      logger.error({ err }, 'Erro no job de handoff timeout');
    }
  });

  logger.info('Job de handoff timeout iniciado (a cada 15 minutos)');
}
