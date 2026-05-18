// ════════════════════════════════════════════════════════
// Amanda AI — Lead Score Engine
// Pontuação comportamental automática
// ════════════════════════════════════════════════════════

import { query, queryOne } from '../../database/connection';
import { EventoLeadScore, TemperaturaLead } from '../../types';
import { logger } from '../../utils/logger';

// ── Tabela de pontos por evento ──────────────────────────
const PONTOS_POR_EVENTO: Record<EventoLeadScore, number> = {
  perguntou_preco:            15,
  perguntou_tamanho:          20,
  pediu_fotos:                25,
  clicou_link:                25,
  voltou_outro_dia:           30,
  respondeu_rapido:           15,
  mandou_audio:               10,
  ocasiao_especial:           20,
  perguntou_disponibilidade:  15,
  demonstrou_inseguranca:      8,
  intencao_compra:            30,
  visualizou_categorias:      15,
  permaneceu_ativo:           10,
  interagiu_mais_de_uma_vez:  20,
  mandou_imagem:              15,
  mencionou_urgencia:         25,
  retornou_apos_followup:     35,
};

// ── Classificação de temperatura ────────────────────────
export function calcularTemperatura(score: number): TemperaturaLead {
  if (score >= 81)  return 'muito_quente';
  if (score >= 51)  return 'quente';
  if (score >= 21)  return 'morno';
  return 'frio';
}

export function calcularNivelEngajamento(score: number): string {
  if (score >= 100) return 'muito_quente';
  if (score >= 51)  return 'quente';
  if (score >= 21)  return 'morno';
  return 'frio';
}

// ── Pontuar evento ────────────────────────────────────────
export async function pontuar(
  clienteId: string,
  evento: EventoLeadScore,
  mensagemId?: string
): Promise<{ score_resultante: number; temperatura: TemperaturaLead }> {
  const pontos = PONTOS_POR_EVENTO[evento] ?? 0;
  if (pontos === 0) return { score_resultante: 0, temperatura: 'frio' };

  const atual = await queryOne<{ temperatura_lead: number }>(
    'SELECT temperatura_lead FROM clientes WHERE id = $1',
    [clienteId]
  );

  const scoreAtual = atual?.temperatura_lead ?? 0;
  const scoreNovo  = Math.min(scoreAtual + pontos, 200);
  const temperatura = calcularTemperatura(scoreNovo);
  const nivelEngajamento = calcularNivelEngajamento(scoreNovo);

  // Atualizar score do cliente
  await query(
    `UPDATE clientes
     SET temperatura_lead = $1,
         nivel_engajamento = $2,
         atualizado_em = NOW()
     WHERE id = $3`,
    [scoreNovo, nivelEngajamento, clienteId]
  );

  // Registrar no histórico (nomes de colunas conforme a tabela real)
  await query(
    `INSERT INTO lead_scores
       (cliente_id, mensagem_id, tipo_evento, pontos, score_resultante)
     VALUES ($1, $2, $3, $4, $5)`,
    [clienteId, mensagemId ?? null, evento, pontos, scoreNovo]
  );

  logger.debug({ clienteId, evento, pontos, scoreNovo, temperatura }, 'Lead score atualizado');

  return { score_resultante: scoreNovo, temperatura };
}

// ── Pontuar múltiplos eventos de uma vez ─────────────────
export async function pontuarEventos(
  clienteId: string,
  eventos: EventoLeadScore[],
  mensagemId?: string
): Promise<{ score_resultante: number; temperatura: TemperaturaLead }> {
  const eventosSemDuplicata = [...new Set(eventos)];
  let ultimo = { score_resultante: 0, temperatura: 'frio' as TemperaturaLead };

  for (const evento of eventosSemDuplicata) {
    ultimo = await pontuar(clienteId, evento, mensagemId);
  }

  return ultimo;
}

// ── Buscar score atual ────────────────────────────────────
export async function buscarScore(clienteId: string): Promise<{
  score: number;
  temperatura: TemperaturaLead;
  historico: Array<{ evento: string; pontos: number; criado_em: Date }>;
}> {
  const cliente = await queryOne<{ temperatura_lead: number }>(
    'SELECT temperatura_lead FROM clientes WHERE id = $1',
    [clienteId]
  );

  const score = cliente?.temperatura_lead ?? 0;
  const temperatura = calcularTemperatura(score);

  const historico = await query<{ tipo_evento: string; pontos: number; criado_em: Date }>(
    `SELECT tipo_evento, pontos, criado_em
     FROM lead_scores
     WHERE cliente_id = $1
     ORDER BY criado_em DESC
     LIMIT 20`,
    [clienteId]
  );

  return {
    score,
    temperatura,
    historico: historico.map(h => ({
      evento: h.tipo_evento,
      pontos: h.pontos,
      criado_em: h.criado_em,
    })),
  };
}

// ── Detectar eventos a partir de análise comportamental ──
export function extrairEventosDoComportamento(
  comportamentos: EventoLeadScore[],
  tipoMensagem: string,
  isRetornoAposFollowup: boolean
): EventoLeadScore[] {
  const eventos: EventoLeadScore[] = [...comportamentos];

  if (tipoMensagem === 'audio') {
    if (!eventos.includes('mandou_audio')) eventos.push('mandou_audio');
  }

  if (tipoMensagem === 'imagem' || tipoMensagem === 'image') {
    if (!eventos.includes('mandou_imagem')) eventos.push('mandou_imagem');
  }

  if (isRetornoAposFollowup) {
    if (!eventos.includes('retornou_apos_followup')) eventos.push('retornou_apos_followup');
  }

  return eventos;
}

// ── Clientes mais quentes (ranking) ─────────────────────
export async function rankingLeadsMaisQuentes(limite = 20): Promise<Array<{
  id: string;
  nome: string | null;
  telefone: string;
  temperatura_lead: number;
  temperatura: TemperaturaLead;
  nivel_engajamento: string;
  ultima_interacao: Date | null;
}>> {
  const rows = await query<{
    id: string;
    nome: string | null;
    telefone: string;
    temperatura_lead: number;
    nivel_engajamento: string;
    ultima_interacao: Date | null;
  }>(
    `SELECT id, nome, telefone, temperatura_lead, nivel_engajamento, ultima_interacao
     FROM clientes
     WHERE opt_out = FALSE AND bloqueado = FALSE
     ORDER BY temperatura_lead DESC, ultima_interacao DESC NULLS LAST
     LIMIT $1`,
    [limite]
  );

  return rows.map(r => ({
    ...r,
    temperatura: calcularTemperatura(r.temperatura_lead),
  }));
}
