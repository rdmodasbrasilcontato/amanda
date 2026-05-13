import { Router, Request, Response } from 'express';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import multer from 'multer';
import { query, queryOne } from '../database/connection';
import { isAmandaEnabled, setAmandaEnabled } from '../state/global.state';
import { getQRCode } from '../modules/whatsapp/zapi.service';
import { invalidatePromptsCache } from '../modules/ai/prompts.loader';
import { logger } from '../utils/logger';

const router = Router();

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const SRC_PROMPTS_DIR = join(process.cwd(), 'src', 'prompts');
const DIST_PROMPTS_DIR = join(__dirname, '../prompts');

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      (cb as any)(new Error('Apenas PNG ou JPEG'));
    }
  },
});

const PROMPT_FILES = [
  'identity', 'personality', 'emotional', 'sales',
  'anti-spam', 'restrictions', 'memory', 'store-info',
  'followup', 'humanization',
];

// ── Serve dashboard HTML ──
router.get('/', (_req: Request, res: Response) => {
  const htmlPath = join(__dirname, '../dashboard/index.html');
  if (existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(503).send('Dashboard não encontrado. Rode npm run build primeiro.');
  }
});

// ── Status geral ──
router.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const [activeConvs, messagesToday, handoffsActive, tokensToday] = await Promise.all([
      queryOne<{ total: string }>(`SELECT COUNT(*) as total FROM conversas WHERE status = 'active'`),
      queryOne<{ total: string }>(`SELECT COUNT(*) as total FROM mensagens WHERE created_at >= CURRENT_DATE`),
      queryOne<{ total: string }>(`SELECT COUNT(*) as total FROM conversas WHERE handoff_active = TRUE`),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(tokens_used), 0) as total FROM mensagens WHERE created_at >= CURRENT_DATE AND role = 'assistant'`
      ),
    ]);
    res.json({
      amandaEnabled: isAmandaEnabled(),
      activeConversations: parseInt(activeConvs?.total ?? '0'),
      messagesToday: parseInt(messagesToday?.total ?? '0'),
      handoffsActive: parseInt(handoffsActive?.total ?? '0'),
      tokensToday: parseInt(tokensToday?.total ?? '0'),
    });
  } catch (err) {
    logger.error({ err }, 'Dashboard: erro ao buscar status');
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

// ── Toggle Amanda global ──
router.post('/api/toggle', (req: Request, res: Response) => {
  const value = Boolean(req.body.enabled);
  setAmandaEnabled(value);
  res.json({ amandaEnabled: value });
});

// ── Conversas ──
router.get('/api/conversations', async (_req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT
         c.id,
         cl.phone,
         COALESCE(cl.preferred_name, cl.name, cl.phone) as display_name,
         c.status,
         c.handoff_active,
         c.handoff_started_at,
         c.last_message_at,
         c.message_count,
         (SELECT content FROM mensagens WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as ultima_mensagem
       FROM conversas c
       JOIN clientes cl ON cl.id = c.client_id
       WHERE c.status NOT IN ('closed', 'opted_out')
       ORDER BY c.last_message_at DESC NULLS LAST
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'Dashboard: erro ao listar conversas');
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// ── Toggle handoff de conversa ──
router.post('/api/conversations/:id/handoff', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conv = await queryOne<{ handoff_active: boolean }>(
      'SELECT handoff_active FROM conversas WHERE id = $1',
      [id]
    );
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' }) as any;

    const newState = !conv.handoff_active;
    await query(
      `UPDATE conversas
       SET handoff_active = $1,
           handoff_started_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
           handoff_by = CASE WHEN $1 THEN 'dashboard' ELSE NULL END,
           status = CASE WHEN $1 THEN 'handoff' ELSE 'active' END,
           updated_at = NOW()
       WHERE id = $2`,
      [newState, id]
    );
    res.json({ handoff_active: newState });
  } catch (err) {
    logger.error({ err }, 'Dashboard: erro ao toggle handoff');
    res.status(500).json({ error: 'Erro ao toggle handoff' });
  }
});

// ── Stats para gráfico ──
router.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const rows = await query<{ dia: string; total: string }>(
      `SELECT DATE(created_at) as dia, COUNT(*) as total
       FROM mensagens
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY dia ASC`
    );
    res.json(rows.map(r => ({ dia: String(r.dia).substring(0, 10), total: parseInt(r.total) })));
  } catch (err) {
    logger.error({ err }, 'Dashboard: erro ao buscar stats');
    res.status(500).json({ error: 'Erro ao buscar stats' });
  }
});

// ── QR Code ──
router.get('/api/qrcode', async (_req: Request, res: Response) => {
  try {
    const qr = await getQRCode();
    res.json({ qrcode: qr });
  } catch {
    res.json({ qrcode: null });
  }
});

// ── Prompts GET ──
router.get('/api/prompts', (_req: Request, res: Response) => {
  const prompts: Record<string, string> = {};
  for (const name of PROMPT_FILES) {
    const filePath = join(SRC_PROMPTS_DIR, `${name}.txt`);
    try { prompts[name] = readFileSync(filePath, 'utf-8'); } catch { prompts[name] = ''; }
  }
  res.json(prompts);
});

// ── Prompts POST ──
router.post('/api/prompts/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  if (!PROMPT_FILES.includes(name)) {
    return res.status(400).json({ error: 'Prompt inválido' }) as any;
  }
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Conteúdo inválido' }) as any;
  }
  try {
    // Save to src/prompts (source of truth)
    writeFileSync(join(SRC_PROMPTS_DIR, `${name}.txt`), content, 'utf-8');
    // Also save to dist/prompts so changes take effect immediately
    if (existsSync(DIST_PROMPTS_DIR)) {
      writeFileSync(join(DIST_PROMPTS_DIR, `${name}.txt`), content, 'utf-8');
    }
    // Invalidate cache so Amanda uses new content on next message
    invalidatePromptsCache();
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, name }, 'Dashboard: erro ao salvar prompt');
    res.status(500).json({ error: 'Erro ao salvar prompt' });
  }
});

// ── Logo upload ──
router.post('/api/logo', upload.single('logo'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' }) as any;
  const ext = req.file.mimetype === 'image/png' ? '.png' : '.jpg';
  const logoPath = join(UPLOADS_DIR, `logo${ext}`);
  // Remove old logo files with other extensions
  for (const e of ['.png', '.jpg', '.jpeg']) {
    const old = join(UPLOADS_DIR, `logo${e}`);
    if (existsSync(old) && old !== logoPath) {
      try { unlinkSync(old); } catch {}
    }
  }
  writeFileSync(logoPath, req.file.buffer);
  logger.info({ path: logoPath }, 'Dashboard: logo atualizada');
  res.json({ url: `/uploads/logo${ext}?t=${Date.now()}` });
});

// ── Serve logo atual ──
router.get('/api/logo', (_req: Request, res: Response) => {
  for (const ext of ['.png', '.jpg', '.jpeg']) {
    const p = join(UPLOADS_DIR, `logo${ext}`);
    if (existsSync(p)) return res.sendFile(p);
  }
  res.status(404).json({ error: 'Nenhuma logo cadastrada' });
});

export default router;
