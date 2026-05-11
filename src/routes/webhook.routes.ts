import { Router } from 'express';
import { handleZApiWebhook } from '../webhooks/zapi.webhook';
import { webhookRateLimit } from '../security/rate-limiter';

const router = Router();

// Z-API webhook principal — sem verificação de token para compatibilidade com Z-API
// A Z-API não suporta headers personalizados no webhook de entrada
router.post('/zapi', webhookRateLimit, handleZApiWebhook);

// Rota de teste do webhook
router.get('/zapi/health', (_req, res) => {
  res.json({ status: 'ok', service: 'zapi-webhook' });
});

export default router;
