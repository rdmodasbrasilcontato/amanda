import { Router } from 'express';
import { handleZApiWebhook } from '../webhooks/zapi.webhook';
import { webhookRateLimit } from '../security/rate-limiter';

const router = Router();

router.post('/zapi', webhookRateLimit, handleZApiWebhook);

router.get('/zapi/health', (_req, res) => {
  res.json({ status: 'ok', service: 'zapi-webhook', timestamp: new Date().toISOString() });
});

export default router;
