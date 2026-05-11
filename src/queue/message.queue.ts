import { ZApiWebhookPayload } from '../types';
import { processIncomingMessage } from '../modules/whatsapp/message.processor';
import { isDeduplicatedMessage } from '../modules/anti-spam/spam.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { normalizePhone } from '../utils/helpers';

// Debounce map — agrupa mensagens rápidas do mesmo cliente
const debounceTimers = new Map<string, NodeJS.Timeout>();
const pendingMessages = new Map<string, ZApiWebhookPayload[]>();

export async function enqueueMessage(payload: ZApiWebhookPayload): Promise<void> {
  // Deduplicação por messageId
  if (await isDeduplicatedMessage(payload.messageId)) {
    logger.debug({ messageId: payload.messageId }, 'Mensagem duplicada ignorada');
    return;
  }

  const phone = normalizePhone(payload.phone);
  const key = `${phone}`;

  // Acumular mensagens no debounce window
  const existing = pendingMessages.get(key) ?? [];
  existing.push(payload);
  pendingMessages.set(key, existing);

  // Reset timer
  const existing_timer = debounceTimers.get(key);
  if (existing_timer) clearTimeout(existing_timer);

  const timer = setTimeout(async () => {
    const messages = pendingMessages.get(key) ?? [];
    pendingMessages.delete(key);
    debounceTimers.delete(key);

    if (messages.length === 0) return;

    // Se múltiplas mensagens, combinar textos
    if (messages.length > 1) {
      const combined = combineMessages(messages);
      await safeProcess(combined);
    } else {
      await safeProcess(messages[0]!);
    }
  }, config.AMANDA_DEBOUNCE_MS);

  debounceTimers.set(key, timer);
  logger.debug({ phone, pendingCount: existing.length }, 'Mensagem enfileirada no debounce');
}

function combineMessages(messages: ZApiWebhookPayload[]): ZApiWebhookPayload {
  const texts = messages
    .filter(m => m.type === 'text' || m.type === 'ReceivedCallback')
    .map(m => m.text?.message ?? '')
    .filter(Boolean)
    .join(' ');

  const base = messages[messages.length - 1]!;

  // Se há mídia, usar último payload com mídia como base
  const mediaMsg = messages.find(m => m.type === 'audio' || m.type === 'image' || m.type === 'document');

  if (mediaMsg) return mediaMsg;

  return {
    ...base,
    text: { message: texts },
  };
}

async function safeProcess(payload: ZApiWebhookPayload): Promise<void> {
  try {
    await processIncomingMessage(payload);
  } catch (err) {
    logger.error({ err, phone: payload.phone }, 'Erro ao processar mensagem');
  }
}
