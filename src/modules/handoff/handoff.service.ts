import { query, queryOne } from '../../database/connection';
import { ZApiWebhookPayload } from '../../types';
import { logger } from '../../utils/logger';

// Palavras-chave de controle do agente (digitadas pelo staff no WhatsApp)
// "Oii"   → desliga Amanda (handoff humano ativado)
// "Até mais" → liga Amanda de volta
const PAUSE_KEYWORDS = ['oii'];
const RESUME_KEYWORDS = ['ate mais', 'até mais'];

// Tempo máximo de pausa automática: 2 horas
const HANDOFF_TIMEOUT_MS = 2 * 60 * 60 * 1000;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function matchesKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);
  return keywords.some(kw => {
    const nkw = normalize(kw);
    // Match exato ou como primeira "palavra" da mensagem
    return normalized === nkw || normalized.startsWith(nkw + ' ') || normalized.startsWith(nkw + '\n');
  });
}

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

  const messageText = payload.text?.message ?? '';

  // Mensagem do staff (fromMe sem ser da própria API)
  if (payload.fromMe) {
    // RESUME tem prioridade sobre PAUSE (caso ambos batam)
    if (matchesKeyword(messageText, RESUME_KEYWORDS)) {
      await deactivateHandoff(conversationId, 'human_resume');
      logger.info({ conversationId, phone }, 'Amanda RELIGADA pelo staff (palavra-chave "Até mais")');
      return true;
    }

    if (matchesKeyword(messageText, PAUSE_KEYWORDS)) {
      await activateHandoff(conversationId, clientId, 'staff_keyword_oii');
      logger.info({ conversationId, phone }, 'Amanda DESLIGADA pelo staff (palavra-chave "Oii")');
      return true;
    }

    // Qualquer outra mensagem do staff: se já está em handoff, refresca o timer
    if (conversation.handoff_active) {
      await query(
        'UPDATE conversas SET handoff_started_at = NOW() WHERE id = $1',
        [conversationId]
      );
      return true;
    }

    // Staff falando sem palavra-chave e sem handoff ativo: ativa handoff
    // (humano entrou na conversa → pausa Amanda por 2h)
    await activateHandoff(conversationId, clientId, 'staff_message');
    logger.info(
      { conversationId, phone },
      'Amanda DESLIGADA automaticamente — humano entrou na conversa'
    );
    return true;
  }

  // Mensagem do cliente — verificar se handoff está ativo
  if (conversation.handoff_active) {
    const startedAt = conversation.handoff_started_at;
    if (startedAt) {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      if (elapsed > HANDOFF_TIMEOUT_MS) {
        await deactivateHandoff(conversationId, 'auto_timeout');
        logger.info({ conversationId }, 'Handoff expirado (2h) — Amanda reativada automaticamente');
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
      [conversationId, clientId, activatedBy]
    );
  }
}

async function deactivateHandoff(conversationId: string, resolvedBy: string): Promise<void> {
  await query(
    `UPDATE conversas
     SET status = 'active', handoff_active = FALSE, handoff_started_at = NULL,
         handoff_by = NULL, updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );

  await query(
    `UPDATE handoffs
     SET status = 'resolved', resolved_at = NOW(), resolved_by = $2
     WHERE conversation_id = $1 AND status = 'active'`,
    [conversationId, resolvedBy]
  );
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
