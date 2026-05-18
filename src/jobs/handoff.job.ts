import cron from 'node-cron';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

export function startHandoffTimeoutJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const expirados = await query<{ id: string }>(
        `SELECT id FROM conversas
         WHERE handoff_ativo = TRUE
           AND handoff_iniciado_em < NOW() - INTERVAL '1 hour'`
      );

      for (const conv of expirados) {
        await query(
          `UPDATE conversas
           SET status = 'ativa', handoff_ativo = FALSE,
               handoff_iniciado_em = NULL, handoff_por = NULL, atualizado_em = NOW()
           WHERE id = $1`,
          [conv.id]
        );

        await query(
          `UPDATE handoffs
           SET status = 'resolvido', resolvido_em = NOW(), resolvido_por = 'auto_timeout'
           WHERE conversa_id = $1 AND status = 'ativo'`,
          [conv.id]
        );

        logger.info({ conversaId: conv.id }, 'Handoff expirado — Amanda silenciosa reativada');
      }
    } catch (err) {
      logger.error({ err }, 'Erro no job de handoff timeout');
    }
  });

  logger.info('Job de handoff timeout iniciado (a cada 15 minutos)');
}
