import { ZApiWebhookPayload } from '../types';
import { processIncomingMessage } from '../modules/whatsapp/message.processor';
import { isDeduplicatedMessage } from '../modules/antispam/antispam.service';
import { normalizePhone } from '../utils/helpers';
import { config } from '../config';
import { logger } from '../utils/logger';

const debounceTimers = new Map<string, NodeJS.Timeout>();
const pendingMessages = new Map<string, ZApiWebhookPayload[]>();

export async function enqueueMessage(payload: ZApiWebhookPayload): Promise<void> {
  if (await isDeduplicatedMessage(payload.messageId)) {
    logger.debug({ messageId: payload.messageId }, 'Mensagem duplicada ignorada');
    return;
  }

  const phone = normalizePhone(payload.phone);
  const existing = pendingMessages.get(phone) ?? [];
  existing.push(payload);
  pendingMessages.set(phone, existing);

  const timer = debounceTimers.get(phone);
  if (timer) clearTimeout(timer);

  debounceTimers.set(
    phone,
    setTimeout(async () => {
      const messages = pendingMessages.get(phone) ?? [];
      pendingMessages.delete(phone);
      debounceTimers.delete(phone);
      if (messages.length === 0) return;

      const merged = messages.length > 1 ? mergeMessages(messages) : messages[0]!;
      await safeProcess(merged);
    }, config.REDIS_DEBOUNCE_MS)
  );
}

function mergeMessages(messages: ZApiWebhookPayload[]): ZApiWebhookPayload {
  const media = messages.find(m => {
    const p = m as any;
    return p.audio?.audioUrl || p.image?.imageUrl || p.document?.documentUrl;
  });
  if (media) return media;

  const texts = messages
    .map(m => {
      const p = m as any;
      return p.text?.message ?? p.body ?? p.message ?? '';
    })
    .filter(Boolean)
    .join(' ');

  return { ...messages[messages.length - 1]!, text: { message: texts } };
}

async function safeProcess(payload: ZApiWebhookPayload): Promise<void> {
  try {
    await processIncomingMessage(payload);
  } catch (err) {
    logger.error({ err, phone: payload.phone }, 'Erro ao processar mensagem');
  }
}
