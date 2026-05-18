// ════════════════════════════════════════════════════════
// Amanda AI — Follow-up Service (IA-Powered)
// Mensagens geradas por IA com contexto comportamental completo
// ════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { query, queryOne } from '../../database/connection';
import { sendTextWithTyping } from '../whatsapp/zapi.service';
import { searchRelevantMemories } from '../memory/vector.service';
import { construirContextoPerfil } from '../behavioral/profile.service';
import { calcularTemperatura } from '../leadScore/leadScore.service';
import { isBusinessHours, addMinutes, addHours, addDays, pickRandom } from '../../utils/helpers';
import { detectarOptOut } from '../behavioral/behavioral.service';
import { markClientOptOut } from '../memory/long-term.service';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import {
  EtapaFollowup, StatusFollowup, AnaliseComportamental,
  Cliente, ContextoFollowup, TemperaturaLead
} from '../../types';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
  maxRetries: 2,
});

// ── Sequência de follow-ups ───────────────────────────────
const SEQUENCIA_FOLLOWUP: EtapaFollowup[] = [
  '20_min', '3_horas', '8_horas', '1_dia', '3_dias', '7_dias', '15_dias', '30_dias'
];

function proximaEtapa(etapaAtual: EtapaFollowup): EtapaFollowup {
  const idx = SEQUENCIA_FOLLOWUP.indexOf(etapaAtual);
  if (idx === -1 || idx >= SEQUENCIA_FOLLOWUP.length - 1) return '30_dias'; // loop infinito
  return SEQUENCIA_FOLLOWUP[idx + 1]!;
}

function calcularDelayMs(etapa: EtapaFollowup): number {
  const mapa: Record<EtapaFollowup, number> = {
    '20_min':  20 * 60 * 1000,
    '3_horas': 3 * 60 * 60 * 1000,
    '8_horas': 8 * 60 * 60 * 1000,
    '1_dia':   24 * 60 * 60 * 1000,
    '3_dias':  3 * 24 * 60 * 60 * 1000,
    '7_dias':  7 * 24 * 60 * 60 * 1000,
    '15_dias': 15 * 24 * 60 * 60 * 1000,
    '30_dias': 30 * 24 * 60 * 60 * 1000,
  };
  return mapa[etapa] ?? mapa['30_dias'];
}

// Randomizar horário ±20% para humanizar
function randomizarTimestamp(base: Date): Date {
  const variance = calcularDelayMs('20_min') * 0.3;
  const offset = (Math.random() * variance * 2) - variance;
  return new Date(base.getTime() + offset);
}

// ── Agendar follow-up ─────────────────────────────────────
export async function agendarFollowup(
  clienteId: string,
  conversaId: string,
  etapa: EtapaFollowup,
  analise?: Partial<AnaliseComportamental>
): Promise<void> {
  const cliente = await queryOne<{ opt_out: boolean; telefone: string }>(
    'SELECT opt_out, telefone FROM clientes WHERE id = $1',
    [clienteId]
  );

  if (!cliente || cliente.opt_out) return;

  // Não agendar se já há muitos pendentes
  const pendentes = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM followups
     WHERE cliente_id = $1 AND status = 'pendente'`,
    [clienteId]
  );
  if (parseInt(pendentes?.count ?? '0') >= 2) return;

  const delayMs   = calcularDelayMs(etapa);
  const base      = new Date(Date.now() + delayMs);
  const agendadoPara = randomizarTimestamp(base);

  const contextoBehavioral = analise ? {
    emocao:               analise.emocao,
    intencao:             analise.intencao_principal,
    produtos_mencionados: analise.produtos_mencionados,
    categorias:           analise.categorias_mencionadas,
    ocasiao:              analise.ocasiao_especial,
    urgencia:             analise.urgencia_detectada,
    probabilidade_compra: analise.probabilidade_compra,
    proximo_passo:        analise.proximo_passo_recomendado,
  } : {};

  await query(
    `INSERT INTO followups
       (cliente_id, conversa_id, tipo, etapa, contexto_utilizado, agendado_para)
     VALUES ($1, $2, 'reativacao', $3, $4, $5)`,
    [
      clienteId,
      conversaId,
      etapa,
      JSON.stringify(contextoBehavioral),
      agendadoPara,
    ]
  );

  logger.info({ clienteId, etapa, agendadoPara }, '⏰ Follow-up agendado');
}

// ── Cancelar follow-ups pendentes ────────────────────────
export async function cancelarFollowupsPendentes(
  clienteId: string,
  motivo: string = 'cancelado'
): Promise<void> {
  await query(
    `UPDATE followups
     SET status = 'cancelado', cancelado_por = $1, atualizado_em = NOW()
     WHERE cliente_id = $2 AND status = 'pendente'`,
    [motivo, clienteId]
  );
}

// ── Processar follow-ups vencidos (job a cada 5 min) ─────
export async function processDueFollowups(): Promise<void> {
  const vencidos = await query<{
    id: string;
    cliente_id: string;
    conversa_id: string | null;
    etapa: EtapaFollowup;
    contexto_utilizado: Record<string, unknown>;
  }>(
    `SELECT id, cliente_id, conversa_id, etapa, contexto_utilizado
     FROM followups
     WHERE status = 'pendente'
       AND agendado_para <= NOW()
     ORDER BY agendado_para ASC
     LIMIT 10`
  );

  logger.debug({ total: vencidos.length }, 'Follow-ups vencidos para processar');

  for (const followup of vencidos) {
    await processarFollowup(followup).catch(err =>
      logger.error({ err, followupId: followup.id }, 'Erro ao processar follow-up')
    );
  }
}

async function processarFollowup(followup: {
  id: string;
  cliente_id: string;
  conversa_id: string | null;
  etapa: EtapaFollowup;
  contexto_utilizado: Record<string, unknown>;
}): Promise<void> {
  const cliente = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE id = $1',
    [followup.cliente_id]
  );

  if (!cliente || cliente.opt_out || cliente.bloqueado) {
    await marcarFollowup(followup.id, 'cancelado', 'cliente_inelegivel');
    return;
  }

  // Attempt '8_horas' só em horário comercial
  if (followup.etapa === '8_horas' && !isBusinessHours()) {
    const reagendado = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await query(
      'UPDATE followups SET agendado_para = $1 WHERE id = $2',
      [reagendado, followup.id]
    );
    return;
  }

  // Verificar anti-spam: máximo de mensagens hoje
  const hoje = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM followup_logs
     WHERE cliente_id = $1 AND criado_em > CURRENT_DATE`,
    [followup.cliente_id]
  );
  if (parseInt(hoje?.count ?? '0') >= 3) {
    await marcarFollowup(followup.id, 'cancelado', 'limite_diario');
    return;
  }

  // ── Gerar mensagem contextual com IA ─────────────────
  const mensagemGerada = await gerarMensagemFollowup(cliente, followup);

  if (!mensagemGerada) {
    await marcarFollowup(followup.id, 'falhou', 'geracao_falhou');
    return;
  }

  // ── Enviar via Z-API ──────────────────────────────────
  try {
    await sendTextWithTyping(cliente.telefone, mensagemGerada);

    await marcarFollowup(followup.id, 'enviado', undefined, mensagemGerada);

    // ── Log de envio ──────────────────────────────────
    await query(
      `INSERT INTO followup_logs (followup_id, cliente_id, mensagem, status)
       VALUES ($1, $2, $3, 'enviado')`,
      [followup.id, followup.cliente_id, mensagemGerada]
    );

    // ── Atualizar perfil ──────────────────────────────
    await query(
      `UPDATE customer_behavior_profile
       SET total_followups = total_followups + 1, atualizado_em = NOW()
       WHERE cliente_id = $1`,
      [followup.cliente_id]
    );

    // ── Agendar próximo follow-up (loop infinito) ─────
    const proximaEt = proximaEtapa(followup.etapa);
    await agendarFollowup(followup.cliente_id, followup.conversa_id ?? '', proximaEt);

    logger.info(
      { clienteId: followup.cliente_id, etapa: followup.etapa },
      '📤 Follow-up enviado'
    );
  } catch (err) {
    await marcarFollowup(followup.id, 'falhou', 'erro_envio');
    logger.error({ err, followupId: followup.id }, 'Erro ao enviar follow-up via Z-API');
  }
}

// ── Gerador de mensagem com IA e contexto completo ────────
async function gerarMensagemFollowup(
  cliente: Cliente,
  followup: { etapa: EtapaFollowup; contexto_utilizado: Record<string, unknown> }
): Promise<string | null> {
  try {
    const nome = extractFirstName(cliente.nome_preferido ?? cliente.nome ?? '');
    const temperatura = calcularTemperatura(cliente.temperatura_lead);

    // Buscar memórias relevantes
    const memorias = await searchRelevantMemories(cliente.id, 'compras moda roupas interesse', 3);
    const contextoPerfil = await construirContextoPerfil(cliente.id);

    // Contexto do follow-up anterior
    const ctx = followup.contexto_utilizado ?? {};

    const contextoPrompt = `
CLIENTE:
- Nome: ${nome || 'cliente'}
- Temperatura do lead: ${cliente.temperatura_lead} (${temperatura})
- Nível de engajamento: ${cliente.nivel_engajamento}
- Emoção recorrente: ${cliente.emocao_recorrente ?? 'indefinida'}
- Etapa no funil: ${cliente.etapa_funil}
- Horário preferido: ${cliente.horario_preferido ?? 'não identificado'}

PERFIL COMPORTAMENTAL:
${contextoPerfil || 'Em construção'}

CONTEXTO DA ÚLTIMA CONVERSA:
- Emoção na última interação: ${ctx['emocao'] ?? 'não identificada'}
- Intenção: ${ctx['intencao'] ?? 'não identificada'}
- Produtos mencionados: ${(ctx['produtos_mencionados'] as string[] | undefined)?.join(', ') || 'nenhum'}
- Categorias: ${(ctx['categorias'] as string[] | undefined)?.join(', ') || 'nenhuma'}
- Ocasião especial: ${ctx['ocasiao'] ?? 'nenhuma'}
- Urgência: ${ctx['urgencia'] ? 'SIM' : 'não'}
- Próximo passo recomendado: ${ctx['proximo_passo'] ?? 'reativar com contexto natural'}

MEMÓRIAS RELEVANTES:
${memorias.map(m => `- ${m.conteudo}`).join('\n') || 'Nenhuma memória anterior'}

ETAPA DO FOLLOW-UP: ${followup.etapa}
`.trim();

    const systemPrompt = `Você gera mensagens de follow-up humanizadas para uma assistente de relacionamento chamada Amanda, de uma loja de moda feminina chamada RD Modas Brasil.

REGRAS ABSOLUTAS:
- A mensagem NÃO pode parecer automação ou chatbot
- A mensagem DEVE parecer que foi escrita manualmente por uma pessoa real
- A mensagem DEVE referenciar algo específico da conversa ou perfil
- Máximo 2-3 frases curtas (estilo WhatsApp)
- Máximo 1 emoji por mensagem
- Tom: caloroso, genuíno, sem pressão
- SEMPRE termine com: "Se não quiser mais receber mensagens, é só responder NÃO 💛"
- NUNCA mencione que é automação, IA, sistema ou bot
- NUNCA use saudações genéricas como "Olá!" repetido
- NUNCA use listas ou bullet points
- Varie completamente o estilo — nunca repita o mesmo padrão

EXEMPLOS DE QUALIDADE:
- "Ei! Lembrei que você tava olhando alguns looks... ainda tá pensando? 😊 Se não quiser mais receber mensagens, é só responder NÃO 💛"
- "Oi [nome]! A peça que você perguntou ainda tá aqui te esperando rs Se não quiser mais receber mensagens, é só responder NÃO 💛"
- "Passando rapidinho porque aquele vestido que você olhou realmente é lindo... e ainda tá disponível. Se não quiser mais receber mensagens, é só responder NÃO 💛"

Gere APENAS a mensagem, sem explicações ou prefixos.`;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_FALLBACK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: contextoPrompt },
      ],
      max_tokens: 200,
      temperature: 0.85,
    });

    const mensagem = response.choices[0]?.message?.content?.trim() ?? null;

    // Garantir que o opt-out está incluído
    if (mensagem && !mensagem.includes('NÃO')) {
      return `${mensagem}\n\nSe não quiser mais receber mensagens, é só responder NÃO 💛`;
    }

    return mensagem;
  } catch (err) {
    logger.error({ err }, 'Erro ao gerar mensagem de follow-up com IA — usando fallback');
    return gerarMensagemFallback(cliente.nome_preferido ?? cliente.nome);
  }
}

function gerarMensagemFallback(nome: string | null): string {
  const saudacoes = [
    `Ei! Ainda tô por aqui se quiser continuar vendo as opções 😊`,
    `Oi${nome ? ` ${nome.split(' ')[0]}` : ''}! Passando pra ver se ficou alguma dúvida`,
    `Tô aqui se precisar de ajuda com as peças que você viu!`,
    `Oi! Lembrei de você agora — ainda pensando naquelas peças? ✨`,
  ];
  return `${pickRandom(saudacoes)}\n\nSe não quiser mais receber mensagens, é só responder NÃO 💛`;
}

// ── Helpers internos ──────────────────────────────────────
async function marcarFollowup(
  id: string,
  status: StatusFollowup,
  motivo?: string,
  mensagem?: string
): Promise<void> {
  await query(
    `UPDATE followups SET
       status               = $1,
       cancelado_por        = COALESCE($2, cancelado_por),
       mensagem_gerada      = COALESCE($3, mensagem_gerada),
       enviado_em           = CASE WHEN $1 = 'enviado' THEN NOW() ELSE enviado_em END,
       tentativas           = tentativas + 1,
       atualizado_em        = NOW()
     WHERE id = $4`,
    [status, motivo ?? null, mensagem ?? null, id]
  );
}

function extractFirstName(fullName: string | null): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? '';
}
