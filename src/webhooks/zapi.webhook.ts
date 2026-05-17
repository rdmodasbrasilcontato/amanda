import { Request, Response } from 'express';
import { ZApiWebhookPayload } from '../types';
import { enqueueMessage } from '../queue/message.queue';
import { logger } from '../utils/logger';

const IGNORED_TYPES = ['DeliveryCallback', 'ReadCallback', 'PresenceCallback', 'SentCallback', 'MessageStatusCallback'];

export async function handleZApiWebhook(req: Request, res: Response): Promise<void> {
  // Respond immediately so Z-API doesn't retry
  res.status(200).json({ received: true });

  const payload = req.body as ZApiWebhookPayload;

  if (!payload?.phone || !payload?.messageId) return;

  // Ignore own API messages
  if (payload.fromMe) {
    const fromApi = (payload as any).fromApi === true;
    if (fromApi) return;
    // fromMe=true but not from API = staff typing on phone — ignore in silent mode
    return;
  }

  // Ignore groups
  const phoneRaw = String(payload.phone);
  if (
    payload.isGroupMsg === true ||
    phoneRaw.includes('-group') ||
    phoneRaw.includes('@g.us') ||
    phoneRaw.replace(/\D/g, '').length > 15
  ) return;

  // Ignore status events
  if (IGNORED_TYPES.includes(payload.type)) return;

  logger.info({ phone: payload.phone, type: payload.type, messageId: payload.messageId }, '📨 Webhook recebido');

  await enqueueMessage(payload);
}
