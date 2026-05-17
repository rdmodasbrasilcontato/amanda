import { Router, Request, Response } from 'express';
import { requireAdminKey, adminRateLimit } from '../security/rate-limiter';
import { query, queryOne, checkDatabaseConnection } from '../database/connection';
import { getInstanceStatus, getQRCode } from '../modules/whatsapp/zapi.service';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

router.use(adminRateLimit);
router.use(requireAdminKey);

// GET /admin/status
router.get('/status', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseConnection();
  const zapiStatus = await getInstanceStatus();

  const [clientCount] = await query<{ count: string }>('SELECT COUNT(*) as count FROM clientes');
  const [followupCount] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM followups WHERE status = 'pending'`
  );
  const [hotLeads] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM clientes WHERE lead_temperature IN ('hot','very_hot') AND opt_out = FALSE`
  );

  res.json({
    app: config.APP_NAME,
    version: config.APP_VERSION,
    database: dbOk ? 'connected' : 'disconnected',
    whatsapp: zapiStatus,
    stats: {
      totalClients: parseInt(clientCount?.count ?? '0'),
      pendingFollowups: parseInt(followupCount?.count ?? '0'),
      hotLeads: parseInt(hotLeads?.count ?? '0'),
    },
  });
});

// GET /admin/qrcode
router.get('/qrcode', async (_req: Request, res: Response) => {
  const qr = await getQRCode();
  res.json({ qrCode: qr });
});

// GET /admin/clients
router.get('/clients', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const temperature = req.query.temperature as string;

  let sql = `SELECT id, phone, name, lead_score, lead_temperature, emotion_profile, dominant_intent,
                    total_interactions, opt_out, followup_paused, last_seen_at, created_at
             FROM clientes`;
  const params: unknown[] = [];

  if (temperature) {
    sql += ` WHERE lead_temperature = $${params.length + 1}`;
    params.push(temperature);
  }

  sql += ` ORDER BY lead_score DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const clients = await query(sql, params);
  res.json({ clients, limit, offset });
});

// GET /admin/clients/:id
router.get('/clients/:id', async (req: Request, res: Response) => {
  const client = await queryOne('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
  if (!client) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }

  const profile = await queryOne('SELECT * FROM customer_behavior_profile WHERE client_id = $1', [req.params.id]);
  const events = await query(
    'SELECT * FROM lead_score_events WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.params.id]
  );
  const followups = await query(
    'SELECT * FROM followups WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10',
    [req.params.id]
  );

  res.json({ client, profile, scoreEvents: events, followups });
});

// GET /admin/followups
router.get('/followups', async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'pending';
  const followups = await query(
    `SELECT f.*, c.phone, c.name FROM followups f
     JOIN clientes c ON c.id = f.client_id
     WHERE f.status = $1 ORDER BY f.scheduled_at ASC LIMIT 50`,
    [status]
  );
  res.json({ followups });
});

// POST /admin/clients/:id/opt-out
router.post('/clients/:id/opt-out', async (req: Request, res: Response) => {
  await query(
    'UPDATE clientes SET opt_out = TRUE, opt_out_at = NOW(), updated_at = NOW() WHERE id = $1',
    [req.params.id]
  );
  await query(
    `UPDATE followups SET status = 'cancelled', cancelled_reason = 'opt_out', updated_at = NOW()
     WHERE client_id = $1 AND status = 'pending'`,
    [req.params.id]
  );
  res.json({ success: true });
});

// POST /admin/clients/:id/pause-followup
router.post('/clients/:id/pause-followup', async (req: Request, res: Response) => {
  await query(
    'UPDATE clientes SET followup_paused = TRUE, followup_paused_at = NOW(), updated_at = NOW() WHERE id = $1',
    [req.params.id]
  );
  res.json({ success: true });
});

// GET /admin/analytics
router.get('/analytics', async (_req: Request, res: Response) => {
  const [byTemperature] = [
    await query(
      `SELECT lead_temperature, COUNT(*) as count FROM clientes WHERE opt_out = FALSE GROUP BY lead_temperature`
    ),
  ];
  const sentLast7 = await query<{ date: string; count: string }>(
    `SELECT DATE(sent_at) as date, COUNT(*) as count
     FROM followups WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '7 days'
     GROUP BY DATE(sent_at) ORDER BY date`
  );

  res.json({ leadsByTemperature: byTemperature, followupsSentLast7Days: sentLast7 });
});

export default router;
