import { query, queryOne } from '../../database/connection';
import { ZApiWebhookPayload } from '../../types';
import { handoffKeywords, config } from '../../config';
import { logger } from '../../utils/logger';
import { sendTextWithTyping } from '../whatsapp/zapi.service';

const REACTIVATE_KEYWORDS = ['liberar', 'voltar', 'ia', 'retomar', 'amanda'];

export async function checkAndHandleHandoff(
  conversationId: string,
  clientId: string,
  phone: string,
  payload: ZApiWebhookPayload
): Promise<boolean> {
  const conversation = await queryOne<{
    id: string;
    handoff_active: boolean;
    handoff_started_at: Date | null;
  }>(
    'SELECT id, handoff_active, handoff_started_at FROM conversas WHERE id = $1',
    [conversationId]
  );

  if (!conversation) return false;

  const messageText = payload.text?.message?.toLowerCase() ?? '';

  // Checar se mensagem é de humano ativando handoff
  if (payload.fromMe) {
    if (handoffKeywords.some(kw => messageText.includes(kw))) {
      await activateHandoff(conversationId, clientId, messageText);
      return true;
    }

    if (REACTIVATE_KEYWORDS.some(kw => messageText.includes(kw))) {
      await deactivateHandoff(conversationId);
      return true;
    }

    if (conversation.handoff_active) {
      await query(
        'UPDATE conversas SET handoff_started_at = NOW() WHERE id = $1',
        [conversationId]
      );
      return true;
    }
  }

  // Se handoff ativo, verificar reativação automática por timeout (1 hora)
  if (conversation.handoff_active) {
    const startedAt = conversation.handoff_started_at;
    if (startedAt) {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      const oneHour = 60 * 60 * 1000;

      if (elapsed > oneHour) {
        await deactivateHandoff(conversationId);
        logger.info({ conversationId }, 'Handoff reativado automaticamente por timeout');
        return false;
      }
    }
    return true;
  }

  return false;
}

async function activateHandoff(
  conversationId: string,
  clientId: string,
  activatedBy: string
): Promise<void> {
  await query(
    `UPDATE conversas
     SET status = 'handoff', handoff_active = TRUE, handoff_started_at = NOW(),
         handoff_by = $1, updated_at = NOW()
     WHERE id = $2`,
    [activatedBy, conversationId]
  );

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM handoffs WHERE conversation_id = $1 AND status = 'active'`,
    [conversationId]
  );

  if (!existing) {
    await query(
      `INSERT INTO handoffs (conversation_id, client_id, started_by)
       VALUES ($1, $2, $3)`,
      [conversationId, clientId, 'human_agent']
    );
  }

  logger.info({ conversationId }, 'Handoff humano ativado');
}

async function deactivateHandoff(conversationId: string): Promise<void> {
  await query(
    `UPDATE conversas
     SET status = 'active', handoff_active = FALSE, handoff_started_at = NULL,
         handoff_by = NULL, updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );

  await query(
    `UPDATE handoffs
     SET status = 'resolved', resolved_at = NOW(), resolved_by = 'auto_timeout'
     WHERE conversation_id = $1 AND status = 'active'`,
    [conversationId]
  );

  logger.info({ conversationId }, 'Handoff encerrado — Amanda reativada');
}

export async function getActiveHandoffs(): Promise<Record<string, unknown>[]> {
  return query(
    `SELECT h.*, c.phone, cl.name
     FROM handoffs h
     JOIN conversas c ON c.id = h.conversation_id
     JOIN clientes cl ON cl.id = h.client_id
     WHERE h.status = 'active'
     ORDER BY h.started_at DESC`
  );
}
