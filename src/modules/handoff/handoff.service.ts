// ════════════════════════════════════════════════════════
// Amanda AI — Handoff Service
// Gerencia transição humano ↔ IA
// ════════════════════════════════════════════════════════

import { query, queryOne } from '../../database/connection';
import { ZApiWebhookPayload } from '../../types';
import { handoffKeywords } from '../../config';
import { logger } from '../../utils/logger';

const REATIVAR_KEYWORDS = ['liberar', 'voltar', 'ia', 'retomar', 'amanda'];

export async function checkAndHandleHandoff(
  conversaId: string,
  clienteId: string,
  telefone: string,
  payload: ZApiWebhookPayload
): Promise<boolean> {
  const conversa = await queryOne<{
    id: string;
    handoff_ativo: boolean;
    handoff_iniciado_em: Date | null;
  }>(
    'SELECT id, handoff_ativo, handoff_iniciado_em FROM conversas WHERE id = $1',
    [conversaId]
  );

  if (!conversa) return false;

  const texto = (payload.text?.message ?? '').toLowerCase();

  // Mensagem do agente humano ativando/desativando handoff
  if (payload.fromMe) {
    if (handoffKeywords.some(kw => texto.includes(kw))) {
      await ativarHandoff(conversaId, clienteId, texto);
      return true;
    }
    if (REATIVAR_KEYWORDS.some(kw => texto.includes(kw))) {
      await desativarHandoff(conversaId);
      return true;
    }
    if (conversa.handoff_ativo) {
      await query(
        'UPDATE conversas SET handoff_iniciado_em = NOW() WHERE id = $1',
        [conversaId]
      );
      return true;
    }
  }

  // Handoff ativo: verificar timeout automático (1 hora)
  if (conversa.handoff_ativo && conversa.handoff_iniciado_em) {
    const elapsed = Date.now() - new Date(conversa.handoff_iniciado_em).getTime();
    if (elapsed > 60 * 60 * 1000) {
      await desativarHandoff(conversaId);
      logger.info({ conversaId }, 'Handoff reativado automaticamente por timeout');
      return false;
    }
    return true;
  }

  return false;
}

async function ativarHandoff(conversaId: string, clienteId: string, ativadoPor: string): Promise<void> {
  await query(
    `UPDATE conversas
     SET status = 'handoff', handoff_ativo = TRUE,
         handoff_iniciado_em = NOW(), handoff_por = $1, atualizado_em = NOW()
     WHERE id = $2`,
    [ativadoPor, conversaId]
  );

  const existente = await queryOne<{ id: string }>(
    `SELECT id FROM handoffs WHERE conversa_id = $1 AND status = 'ativo'`,
    [conversaId]
  );

  if (!existente) {
    await query(
      `INSERT INTO handoffs (cliente_id, conversa_id, assumido_por, status)
       VALUES ($1, $2, 'agente_humano', 'ativo')`,
      [clienteId, conversaId]
    );
  }

  logger.info({ conversaId }, 'Handoff humano ativado');
}

async function desativarHandoff(conversaId: string): Promise<void> {
  await query(
    `UPDATE conversas
     SET status = 'ativa', handoff_ativo = FALSE,
         handoff_iniciado_em = NULL, handoff_por = NULL, atualizado_em = NOW()
     WHERE id = $1`,
    [conversaId]
  );

  await query(
    `UPDATE handoffs
     SET status = 'resolvido', resolvido_em = NOW(), resolvido_por = 'auto_timeout'
     WHERE conversa_id = $1 AND status = 'ativo'`,
    [conversaId]
  );

  logger.info({ conversaId }, 'Handoff encerrado — Amanda silenciosa reativada');
}

export async function getActiveHandoffs(): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT h.*, c.telefone, cl.nome
     FROM handoffs h
     JOIN conversas c ON c.id = h.conversa_id
     JOIN clientes cl ON cl.id = h.cliente_id
     WHERE h.status = 'ativo'
     ORDER BY h.criado_em DESC`
  );
}
