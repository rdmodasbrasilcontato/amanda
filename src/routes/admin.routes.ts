// ════════════════════════════════════════════════════════
// Amanda AI — Admin Routes
// Painel de controle do sistema silencioso
// ════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { requireAdminKey, adminRateLimit } from '../security/rate-limiter';
import { query, queryOne, checkDatabaseConnection } from '../database/connection';
import { getInstanceStatus, getQRCode } from '../modules/whatsapp/zapi.service';
import { getActiveHandoffs } from '../modules/handoff/handoff.service';
import { processDueFollowups, cancelarFollowupsPendentes } from '../modules/followup/followup.service';
import { updateProductEmbedding } from '../modules/memory/vector.service';
import { rankingLeadsMaisQuentes, buscarScore } from '../modules/leadScore/leadScore.service';
import { invalidatePromptsCache } from '../modules/ai/prompts.loader';
import { logger } from '../utils/logger';

const router = Router();
router.use(adminRateLimit, requireAdminKey);

// ── Status do sistema ────────────────────────────────────
router.get('/status', async (_req: Request, res: Response) => {
  const [dbOk, waStatus] = await Promise.all([
    checkDatabaseConnection(),
    getInstanceStatus(),
  ]);

  const stats = await queryOne<{
    total_clientes: string;
    leads_quentes: string;
    followups_pendentes: string;
    handoffs_ativos: string;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM clientes WHERE opt_out = FALSE)::text AS total_clientes,
      (SELECT COUNT(*) FROM clientes WHERE temperatura_lead >= 51 AND opt_out = FALSE)::text AS leads_quentes,
      (SELECT COUNT(*) FROM followups WHERE status = 'pendente')::text AS followups_pendentes,
      (SELECT COUNT(*) FROM handoffs WHERE status = 'ativo')::text AS handoffs_ativos
  `);

  res.json({
    status: 'online',
    mode: 'silent_behavioral_ai',
    database: dbOk,
    whatsapp: waStatus,
    stats,
    timestamp: new Date().toISOString(),
  });
});

// ── WhatsApp ─────────────────────────────────────────────
router.get('/qrcode', async (_req: Request, res: Response) => {
  const qr = await getQRCode();
  res.json({ qrcode: qr });
});

// ── Clientes ─────────────────────────────────────────────
router.get('/clientes', async (req: Request, res: Response) => {
  const page   = parseInt(req.query['page'] as string ?? '1');
  const limit  = parseInt(req.query['limit'] as string ?? '20');
  const offset = (page - 1) * limit;

  const clientes = await query(
    `SELECT id, nome, telefone, nivel_engajamento, temperatura_lead,
            ultima_interacao, etapa_funil, opt_out, emocao_recorrente
     FROM clientes
     ORDER BY ultima_interacao DESC NULLS LAST
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json({ data: clientes, page, limit });
});

router.get('/clientes/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const cliente = await queryOne('SELECT * FROM clientes WHERE id = $1', [id]);
  if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }
  res.json(cliente);
});

router.get('/clientes/:id/score', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const dados = await buscarScore(id);
  res.json(dados);
});

router.get('/clientes/:id/perfil', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const perfil = await queryOne(
    'SELECT * FROM customer_behavior_profile WHERE cliente_id = $1',
    [id]
  );
  if (!perfil) { res.status(404).json({ error: 'Perfil não encontrado' }); return; }
  res.json(perfil);
});

router.get('/clientes/:id/eventos', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const eventos = await query(
    `SELECT tipo_evento, dados, pontos_score, criado_em
     FROM eventos WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT 50`,
    [id]
  );
  res.json({ data: eventos });
});

router.get('/clientes/:id/emocoes', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const emocoes = await query(
    `SELECT emocao, intensidade, confianca, contexto, criado_em
     FROM emocao_analise WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT 30`,
    [id]
  );
  res.json({ data: emocoes });
});

// ── Lead Score ranking ───────────────────────────────────
router.get('/leads/ranking', async (_req: Request, res: Response) => {
  const ranking = await rankingLeadsMaisQuentes(30);
  res.json({ data: ranking });
});

// ── Conversas ────────────────────────────────────────────
router.get('/conversas', async (req: Request, res: Response) => {
  const clienteId = req.query['cliente_id'];
  const status    = req.query['status'];

  let sql = 'SELECT * FROM conversas WHERE 1=1';
  const params: unknown[] = [];

  if (clienteId) { params.push(clienteId); sql += ` AND cliente_id = $${params.length}`; }
  if (status)    { params.push(status);    sql += ` AND status = $${params.length}`; }

  sql += ' ORDER BY ultima_mensagem_em DESC NULLS LAST LIMIT 50';

  const conversas = await query(sql, params);
  res.json({ data: conversas });
});

router.get('/mensagens/:conversaId', async (req: Request, res: Response) => {
  const id = req.params['conversaId'] as string;
  const mensagens = await query(
    `SELECT * FROM mensagens WHERE conversa_id = $1 ORDER BY criado_em ASC`,
    [id]
  );
  res.json({ data: mensagens });
});

// ── Handoffs ─────────────────────────────────────────────
router.get('/handoffs/active', async (_req: Request, res: Response) => {
  const handoffs = await getActiveHandoffs();
  res.json({ data: handoffs });
});

// ── Follow-ups ───────────────────────────────────────────
router.get('/followups', async (req: Request, res: Response) => {
  const status = req.query['status'] ?? 'pendente';
  const followups = await query(
    `SELECT f.*, c.telefone, c.nome
     FROM followups f
     JOIN clientes c ON c.id = f.cliente_id
     WHERE f.status = $1
     ORDER BY f.agendado_para ASC
     LIMIT 50`,
    [status]
  );
  res.json({ data: followups });
});

router.post('/followups/process', async (_req: Request, res: Response) => {
  await processDueFollowups();
  res.json({ message: 'Follow-ups processados' });
});

router.delete('/followups/cliente/:clienteId', async (req: Request, res: Response) => {
  const id = req.params['clienteId'] as string;
  await cancelarFollowupsPendentes(id, 'admin_cancelou');
  res.json({ message: 'Follow-ups cancelados' });
});

// ── Produtos ─────────────────────────────────────────────
router.get('/produtos', async (_req: Request, res: Response) => {
  const produtos = await query('SELECT * FROM produtos WHERE ativo = TRUE ORDER BY nome');
  res.json({ data: produtos });
});

router.post('/produtos', async (req: Request, res: Response) => {
  const { nome, descricao_curta, preco, categoria_id, tamanhos, cores_secundarias, url_imagem_principal } = req.body;
  const [produto] = await query(
    `INSERT INTO produtos (nome, descricao_curta, preco, categoria_id, tamanhos, cores_secundarias, url_imagem_principal)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [nome, descricao_curta, preco, categoria_id ?? null, tamanhos ?? [], cores_secundarias ?? [], url_imagem_principal ?? null]
  );
  if (produto) {
    await updateProductEmbedding((produto as { id: string }).id).catch(() => null);
  }
  res.status(201).json(produto);
});

router.put('/produtos/:id', async (req: Request, res: Response) => {
  const pid = req.params['id'] as string;
  const { nome, descricao_curta, preco, tamanhos, estoque, ativo } = req.body;
  const [atualizado] = await query(
    `UPDATE produtos SET nome=$1, descricao_curta=$2, preco=$3,
     tamanhos=$4, estoque=$5, ativo=$6, atualizado_em=NOW()
     WHERE id=$7 RETURNING *`,
    [nome, descricao_curta, preco, tamanhos, estoque, ativo, pid]
  );
  if (atualizado) await updateProductEmbedding(pid).catch(() => null);
  res.json(atualizado);
});

// ── Analytics ────────────────────────────────────────────
router.get('/analytics/overview', async (_req: Request, res: Response) => {
  const [clientes, conversas, mensagens, followups, leadsQuentes] = await Promise.all([
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM clientes WHERE opt_out = FALSE'),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM conversas WHERE status = $1', ['ativa']),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM mensagens WHERE criado_em > NOW() - INTERVAL \'24 hours\' AND direcao = \'entrada\''),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM followups WHERE status = $1', ['pendente']),
    queryOne<{ count: string }>('SELECT COUNT(*) as count FROM clientes WHERE temperatura_lead >= 51 AND opt_out = FALSE'),
  ]);

  res.json({
    totalClientes:         parseInt(clientes?.count ?? '0'),
    conversasAtivas:       parseInt(conversas?.count ?? '0'),
    mensagens24h:          parseInt(mensagens?.count ?? '0'),
    followupsPendentes:    parseInt(followups?.count ?? '0'),
    leadsQuentes:          parseInt(leadsQuentes?.count ?? '0'),
  });
});

router.get('/analytics/emocoes', async (_req: Request, res: Response) => {
  const emocoes = await query(
    `SELECT emocao, COUNT(*) as total, AVG(intensidade) as intensidade_media
     FROM emocao_analise
     WHERE criado_em > NOW() - INTERVAL '7 days'
     GROUP BY emocao
     ORDER BY total DESC`
  );
  res.json({ data: emocoes });
});

router.get('/analytics/score-distribuicao', async (_req: Request, res: Response) => {
  const dist = await query(`
    SELECT
      CASE
        WHEN temperatura_lead = 0     THEN 'frio (0)'
        WHEN temperatura_lead <= 20   THEN 'frio (1-20)'
        WHEN temperatura_lead <= 50   THEN 'morno (21-50)'
        WHEN temperatura_lead <= 80   THEN 'quente (51-80)'
        ELSE 'muito_quente (81+)'
      END AS faixa,
      COUNT(*) AS total
    FROM clientes
    WHERE opt_out = FALSE
    GROUP BY faixa
    ORDER BY total DESC
  `);
  res.json({ data: dist });
});

// ── Configurações ─────────────────────────────────────────
router.post('/prompts/reload', (_req: Request, res: Response) => {
  invalidatePromptsCache();
  res.json({ message: 'Cache de prompts invalidado' });
});

export default router;
