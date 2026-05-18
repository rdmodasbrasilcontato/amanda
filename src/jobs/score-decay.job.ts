import cron from 'node-cron';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

// Decay de score para leads inativos:
// - Cliente sem interação há mais de 7 dias: -5 pontos
// - Cliente sem interação há mais de 15 dias: -10 pontos
// - Cliente sem interação há mais de 30 dias: -20 pontos
// Executa 1x por dia às 04:00 (horário de baixo tráfego)
export function startScoreDecayJob(): void {
  cron.schedule('0 4 * * *', async () => {
    logger.info('Executando job de decay de lead score');
    try {
      const result = await query<{ id: string }>(
        `UPDATE clientes
         SET temperatura_lead = GREATEST(0,
               temperatura_lead - CASE
                 WHEN ultima_interacao < NOW() - INTERVAL '30 days' THEN 20
                 WHEN ultima_interacao < NOW() - INTERVAL '15 days' THEN 10
                 WHEN ultima_interacao < NOW() - INTERVAL '7 days'  THEN 5
                 ELSE 0
               END
             ),
             nivel_engajamento = CASE
               WHEN GREATEST(0, temperatura_lead - CASE
                 WHEN ultima_interacao < NOW() - INTERVAL '30 days' THEN 20
                 WHEN ultima_interacao < NOW() - INTERVAL '15 days' THEN 10
                 WHEN ultima_interacao < NOW() - INTERVAL '7 days'  THEN 5
                 ELSE 0
               END) >= 81 THEN 'muito_quente'
               WHEN GREATEST(0, temperatura_lead - CASE
                 WHEN ultima_interacao < NOW() - INTERVAL '30 days' THEN 20
                 WHEN ultima_interacao < NOW() - INTERVAL '15 days' THEN 10
                 WHEN ultima_interacao < NOW() - INTERVAL '7 days'  THEN 5
                 ELSE 0
               END) >= 51 THEN 'quente'
               WHEN GREATEST(0, temperatura_lead - CASE
                 WHEN ultima_interacao < NOW() - INTERVAL '30 days' THEN 20
                 WHEN ultima_interacao < NOW() - INTERVAL '15 days' THEN 10
                 WHEN ultima_interacao < NOW() - INTERVAL '7 days'  THEN 5
                 ELSE 0
               END) >= 21 THEN 'morno'
               ELSE 'frio'
             END
         WHERE ultima_interacao < NOW() - INTERVAL '7 days'
           AND temperatura_lead > 0
           AND opt_out = FALSE
         RETURNING id`
      );
      logger.info({ clientesAfetados: result.length }, 'Decay de score concluído');
    } catch (err) {
      logger.error({ err }, 'Erro no job de decay de score');
    }
  });

  logger.info('Job de decay de score iniciado (diário às 04:00)');
}
