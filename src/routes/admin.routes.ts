import { Router, Request, Response } from 'express';
import { requireAdminKey, adminRateLimit } from '../security/rate-limiter';
import { query, queryOne } from '../database/connection';
import { getInstanceStatus, getQRCode } from '../modules/whatsapp/zapi.service';
import { getActiveHandoffs } from '../modules/handoff/handoff.service';
import { processDueFollowups } from '../modules/followup/followup.service';
import { updateProductEmbedding } from '../modules/memory/vector.service';
import { invalidatePromptsCache } from '../modules/ai/prompts.loader';
import { checkDatabaseConnection } from '../database/connection';
import { logger } from '../utils/logger';

const router = Router();

router.use(adminRateLimit, requireAdminKey);

// ── Status ──
router.get('/status', async (_req: Request, res: Response) => {
  const [dbOk, waStatus] = await Promise.all([
    checkDatabaseConnection(),
    getInstanceStatus(),
  ]);

  res.json({
    status: 'online',
    database: dbOk,
    whatsapp: waStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── WhatsApp QR Code ──
router.get('/qrcode', async (_req: Request, res: Response) => {
  const qr = await getQRCode();
  res.json({ qrcode: qr });
});

// ── Clientes ──
router.get('/clientes', async (req: Request, res: Response) => {
  const page = parseInt(req.query['page'] as string ?? '1');
  const limit = parseInt(req.query['limit'] as string ?? '20');
  const offset = (page - 1) * limit;

  const clients = await query(
    'SELECT * FROM clientes ORDER BY last_contact_at DESC NULLS LAST LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({ data: clients, page, limit });
});

router.get('/clientes/:id', async (req: Request, res: Response) => {
  const client = await queryOne('SELECT * FROM clientes WHERE id = $1', [req.params['id']]);
  if (!client) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }
  res.json(client);
});

// ── Conversas ──
router.get('/conversas', async (req: Request, res: Response) => {
  const clientId = req.query['client_id'];
  const status = req.query['status'];

  let sql = 'SELECT * FROM conversas WHERE 1=1';
  const params: unknown[] = [];

  if (clientId) {
    params.push(clientId);
    sql += ` AND client_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  sql += ' ORDER BY last_message_at DESC LIMIT 50';

  const conversations = await query(sql, params);
  res.json({ data: conversations });
});

// ── Mensagens ──
router.get('/mensagens/:conversationId', async (req: Request, res: Response) => {
  const messages = await query(
    'SELECT * FROM mensagens WHERE conversation_id = $1 ORDER BY created_at ASC',
    [req.params['conversationId']]
  );
  res.json({ data: messages });
});

// ── Handoffs ──
router.get('/handoffs/active', async (_req: Request, res: Response) => {
  const handoffs = await getActiveHandoffs();
  res.json({ data: handoffs });
});

// ── Follow-ups ──
router.get('/followups', async (req: Request, res: Response) => {
  const status = req.query['status'] ?? 'pending';
  const followups = await query(
    'SELECT * FROM followups WHERE status = $1 ORDER BY scheduled_at ASC LIMIT 50',
    [status]
  );
  res.json({ data: followups });
});

router.post('/followups/process', async (_req: Request, res: Response) => {
  await processDueFollowups();
  res.json({ message: 'Follow-ups processados' });
});

// ── Produtos ──
router.get('/produtos', async (_req: Request, res: Response) => {
  const products = await query('SELECT * FROM produtos WHERE active = TRUE ORDER BY name');
  res.json({ data: products });
});

router.post('/produtos', async (req: Request, res: Response) => {
  const { name, description, price, category, sizes, colors, images, sku } = req.body;
  const [product] = await query(
    `INSERT INTO produtos (name, description, price, category, sizes, colors, images, sku)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [name, description, price, category, sizes ?? [], colors ?? [], images ?? [], sku ?? null]
  );
  await updateProductEmbedding((product as { id: string }).id);
  res.status(201).json(product);
});

router.put('/produtos/:id', async (req: Request, res: Response) => {
  const { name, description, price, category, sizes, colors, images, stock_quantity, active } = req.body;
  const [updated] = await query(
    `UPDATE produtos SET name=$1, description=$2, price=$3, category=$4, sizes=$5, colors=$6,
     images=$7, stock_quantity=$8, active=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
    [name, description, price, category, sizes, colors, images, stock_quantity, active, req.params['id']]
  );
  if (updated) await updateProductEmbedding(req.params['id']!);
  res.json(updated);
});

// ── Analytics ──
router.get('/analytics/overview', async (_req: Request, res: Response) => {
  const [clients, conversations, messages, followups] = await Promise.all([
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM clientes'),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM conversas WHERE status = $1', ['active']),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM mensagens WHERE created_at > NOW() - INTERVAL \'24 hours\''),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM followups WHERE status = $1', ['pending']),
  ]);

  res.json({
    totalClients: parseInt(clients?.count ?? '0'),
    activeConversations: parseInt(conversations?.count ?? '0'),
    messagesLast24h: parseInt(messages?.count ?? '0'),
    pendingFollowups: parseInt(followups?.count ?? '0'),
  });
});

// ── Configurações ──
router.post('/prompts/reload', (_req: Request, res: Response) => {
  invalidatePromptsCache();
  res.json({ message: 'Cache de prompts invalidado' });
});

export default router;
