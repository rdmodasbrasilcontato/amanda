import { Request, Response } from 'express';
import { ZApiWebhookPayload } from '../types';
import { enqueueMessage } from '../queue/message.queue';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function handleZApiWebhook(req: Request, res: Response): Promise<void> {
  // Responder imediatamente para Z-API não reenviar
  res.status(200).json({ received: true });

  const payload = req.body as ZApiWebhookPayload;

  // Ignorar eventos que não são mensagens recebidas
  if (!payload || !payload.phone || !payload.messageId) {
    return;
  }

  // Ignorar mensagens do próprio bot
  if (payload.fromMe) {
    logger.debug({ type: payload.type }, 'Ignorando mensagem própria');
    return;
  }

  // Ignorar grupos — Z-API nem sempre seta isGroupMsg, então também detectamos
  // pelo formato do phone: IDs de grupo têm "-group" ou são longos demais (>15 dígitos)
  const phoneRaw = String(payload.phone);
  const isGroup =
    payload.isGroupMsg === true ||
    phoneRaw.includes('-group') ||
    phoneRaw.includes('@g.us') ||
    phoneRaw.replace(/\D/g, '').length > 15;
  if (isGroup) {
    logger.debug({ phone: payload.phone }, 'Ignorando mensagem de grupo');
    return;
  }

  // Ignorar eventos de status (delivered, read, etc.)
  const ignoredTypes = ['DeliveryCallback', 'ReadCallback', 'PresenceCallback', 'SentCallback'];
  if (ignoredTypes.includes(payload.type)) {
    return;
  }

  logger.info(
    { phone: payload.phone, type: payload.type, messageId: payload.messageId },
    'Webhook Z-API recebido'
  );

  await enqueueMessage(payload);
}

export function verifyZApiToken(req: Request, res: Response, next: () => void): void {
  const token = req.headers['x-webhook-token'] ?? req.query.token;
  if (token !== config.ZAPI_WEBHOOK_VERIFY_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
