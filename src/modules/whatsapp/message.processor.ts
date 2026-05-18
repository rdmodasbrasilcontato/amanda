// ════════════════════════════════════════════════════════
// Amanda AI — Silent Message Processor
//
// MODO TOTALMENTE SILENCIOSO:
// Amanda NUNCA responde mensagens recebidas.
// Amanda APENAS observa, analisa, memoriza e agenda.
// ════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';
import { ZApiWebhookPayload, Mensagem, TipoMensagem, EtapaFollowup } from '../../types';
import { query, queryOne } from '../../database/connection';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { normalizePhone, extractFirstName } from '../../utils/helpers';

// Serviços de análise
import { analisarMensagem, analisarImagem, detectarOptOut,
         isRespostaAFollowup, isRespostaRapida, isRetornoOutroDia } from '../behavioral/behavioral.service';
import { atualizarPerfil } from '../behavioral/profile.service';
import { pontuarEventos, extrairEventosDoComportamento } from '../leadScore/leadScore.service';
import { registrarEventosDaAnalise } from '../events/events.service';

// Serviços de memória
import { getOrCreateClient, updateClientLastContact, markClientOptOut,
         salvarInteracaoMemoria } from '../memory/long-term.service';
import { getShortTermMemory, addMessageToShortTerm, clearShortTermCache } from '../memory/short-term.service';
import { searchRelevantMemories, saveMemory } from '../memory/vector.service';

// Serviços de follow-up e handoff
import { agendarFollowup, cancelarFollowupsPendentes } from '../followup/followup.service';
import { checkAndHandleHandoff } from '../handoff/handoff.service';

// Mídia
import { processAudioMessage, processImageMessage, processDocumentMessage } from './media.handler';
import { markMessageAsRead } from './zapi.service';

// Anti-spam
import { isDeduplicatedMessage } from '../anti-spam/spam.service';

// ─────────────────────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL — processa mensagem recebida silenciosamente
// ─────────────────────────────────────────────────────────────────────────────
export async function processIncomingMessage(payload: ZApiWebhookPayload): Promise<void> {
  // Ignorar mensagens do próprio sistema, grupos e status
  if (payload.fromMe || payload.isGroupMsg) return;

  // Ignorar grupos/broadcasts (phone com hífen = ID de grupo no Z-API)
  if (!payload.phone || payload.phone.includes('-') || payload.phone.includes('@')) return;

  const telefone = normalizePhone(payload.phone);
  if (!telefone || telefone.length > 20) return; // ignorar IDs inválidos

  const nome = payload.senderName || undefined;

  logger.info({ telefone, tipo: payload.type, messageId: payload.messageId }, '📩 Mensagem recebida');

  // ── 1. Marcar como lida (só visual, não é resposta) ──
  if (config.ZAPI_AUTO_READ) {
    await markMessageAsRead(telefone, payload.messageId).catch(() => null);
  }

  // ── 2. Obter ou criar cliente ─────────────────────────
  const cliente = await getOrCreateClient(telefone, nome);

  // ── 3. Verificar opt-out ──────────────────────────────
  if (cliente.opt_out) {
    logger.info({ telefone }, 'Cliente com opt-out — ignorando silenciosamente');
    return;
  }

  // ── 4. Obter ou criar conversa ativa ──────────────────
  const conversa = await obterOuCriarConversa(cliente.id);

  // ── 5. Verificar handoff ativo ────────────────────────
  const handoffBloqueado = await checkAndHandleHandoff(
    conversa.id, cliente.id, telefone, payload
  );
  if (handoffBloqueado) {
    logger.debug({ telefone }, 'Handoff ativo — Amanda não interfere');
    return;
  }

  // ── 6. Processar conteúdo da mensagem ────────────────
  let conteudo     = '';
  let conteudoProc = '';
  let tipoMsg: TipoMensagem = 'texto';

  switch (payload.type) {
    case 'ReceivedCallback':
    case 'text':
      conteudo  = payload.text?.message ?? '';
      tipoMsg   = 'texto';
      break;

    case 'audio':
      if (payload.audio?.audioUrl) {
        const transcricao = await processAudioMessage(
          payload.audio.audioUrl, cliente.id, payload.messageId
        );
        conteudo     = transcricao;
        conteudoProc = transcricao;
        tipoMsg      = 'audio';
      }
      break;

    case 'image':
      if (payload.image?.imageUrl) {
        const analiseImg = await analisarImagem(payload.image.imageUrl);
        const caption    = payload.image.caption ?? '';
        conteudoProc = analiseImg.descricao;
        conteudo     = [caption, analiseImg.descricao].filter(Boolean).join('. ');
        tipoMsg      = 'imagem';

        await processImageMessage(
          payload.image.imageUrl, caption, cliente.id, payload.messageId
        );
      }
      break;

    case 'document':
      if (payload.document?.documentUrl) {
        const texto  = await processDocumentMessage(
          payload.document.documentUrl, payload.document.fileName ?? 'doc', cliente.id, payload.messageId
        );
        conteudo = texto;
        tipoMsg  = 'pdf';
      }
      break;

    default:
      conteudo = `[${payload.type} recebido]`;
  }

  if (!conteudo.trim()) {
    logger.debug({ telefone, tipo: payload.type }, 'Conteúdo vazio — ignorando');
    return;
  }

  // ── 7. Verificar opt-out na mensagem ──────────────────
  if (detectarOptOut(conteudo)) {
    logger.info({ telefone }, 'Opt-out detectado na mensagem');
    await markClientOptOut(cliente.id);
    await cancelarFollowupsPendentes(cliente.id, 'opt_out');
    return; // Amanda não responde nada — silêncio total após opt-out
  }

  // ── 8. Buscar contexto histórico ──────────────────────
  const [memoriasCurtas, memoriasRelevantes, isFollowupResponse, isRapido, isOutroDia] =
    await Promise.all([
      getShortTermMemory(conversa.id),
      searchRelevantMemories(cliente.id, conteudo, 3),
      isRespostaAFollowup(cliente.id),
      isRespostaRapida(cliente.id),
      isRetornoOutroDia(cliente.id),
    ]);

  // Construir contexto para análise
  const contextoCliente = `
Nome: ${extractFirstName(cliente.nome_preferido ?? cliente.nome ?? '')}
Temperatura do lead: ${cliente.temperatura_lead}
Nível: ${cliente.nivel_engajamento}
Emoção recorrente: ${cliente.emocao_recorrente ?? 'não identificada'}
Perfil psicológico: ${cliente.perfil_psicologico ?? 'em construção'}
Produtos citados: ${(cliente.produtos_citados ?? []).join(', ') || 'nenhum'}
Objeções: ${(cliente.objecoes ?? []).join(', ') || 'nenhuma'}
`.trim();

  const historicoRecente = memoriasCurtas
    .slice(-4)
    .map(m => `${m.direcao === 'entrada' ? 'Cliente' : 'Follow-up'}: ${m.conteudo}`)
    .join('\n');

  // ── 9. ANÁLISE COMPORTAMENTAL (núcleo silencioso) ─────
  const analise = await analisarMensagem(conteudo, contextoCliente, historicoRecente);

  // ── 10. Salvar mensagem no banco ──────────────────────
  const mensagem = await salvarMensagem({
    id:             uuidv4(),
    conversaId:     conversa.id,
    clienteId:      cliente.id,
    tipo:           tipoMsg,
    conteudo,
    conteudoProcessado: conteudoProc || conteudo,
    emocaoDetectada:    analise.emocao,
    intencaoDetectada:  analise.intencao_principal,
    comportamentos:     analise.comportamentos_detectados,
    sentimentoScore:    analise.intensidade_emocional,
    zapiMessageId:      payload.messageId,
  });

  // ── 11. Eventos de velocidade e padrão ───────────────
  const eventosExtras = extrairEventosDoComportamento(
    analise.comportamentos_detectados,
    tipoMsg,
    isFollowupResponse
  );
  if (isRapido)   eventosExtras.push('respondeu_rapido');
  if (isOutroDia) eventosExtras.push('voltou_outro_dia');

  // Verificar se já interagiu antes
  const totalInteracoes = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM mensagens WHERE cliente_id = $1 AND direcao = $2',
    [cliente.id, 'entrada']
  );
  if (parseInt(totalInteracoes?.count ?? '0') > 1) {
    eventosExtras.push('interagiu_mais_de_uma_vez');
  }

  // Detectar `permaneceu_ativo`: 3+ mensagens nos últimos 10 minutos
  const recentes = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM mensagens
     WHERE cliente_id = $1 AND direcao = 'entrada'
       AND criado_em > NOW() - INTERVAL '10 minutes'`,
    [cliente.id]
  );
  if (parseInt(recentes?.count ?? '0') >= 3) {
    eventosExtras.push('permaneceu_ativo');
  }

  // ── 12. PONTUAR LEAD SCORE ────────────────────────────
  const { score_resultante, temperatura } = await pontuarEventos(
    cliente.id,
    eventosExtras,
    mensagem.id
  );

  logger.info({
    telefone,
    score: score_resultante,
    temperatura,
    emocao: analise.emocao,
    comportamentos: eventosExtras.length,
  }, '📊 Lead score atualizado');

  // ── 13. REGISTRAR EVENTOS ─────────────────────────────
  await registrarEventosDaAnalise(cliente.id, analise, conversa.id, mensagem.id);

  // ── 14. ATUALIZAR PERFIL COMPORTAMENTAL ───────────────
  await atualizarPerfil(cliente.id, analise, tipoMsg, new Date());

  // ── 15. SALVAR MEMÓRIA ────────────────────────────────
  // Memória curta (contexto da conversa)
  await addMessageToShortTerm(conversa.id, mensagem);

  // Memória longa (semântica com embeddings)
  await salvarMemoriasSemanticas(cliente.id, conteudo, analise);

  // Salvar interação na memória longa
  await salvarInteracaoMemoria(cliente.id, conteudo, analise.resumo_comportamental);

  // ── 16. ATUALIZAR CONVERSA ────────────────────────────
  await atualizarConversa(conversa.id, conteudo, analise, score_resultante);

  // ── 17. ATUALIZAR ÚLTIMA INTERAÇÃO DO CLIENTE ─────────
  await updateClientLastContact(cliente.id);

  // ── 18. CANCELAR FOLLOW-UPS ATIVOS E REAGENDAR ────────
  await cancelarFollowupsPendentes(cliente.id, 'cliente_respondeu');

  // Determinar etapa do follow-up baseada no lead score e emoção
  const etapaFollowup = determinarEtapaFollowup(analise, isFollowupResponse);
  await agendarFollowup(cliente.id, conversa.id, etapaFollowup, analise);

  logger.info(
    { telefone, score: score_resultante, temperatura, etapaFollowup },
    '✅ Processamento silencioso concluído — follow-up agendado'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function obterOuCriarConversa(clienteId: string): Promise<{ id: string; status: string }> {
  const existing = await queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM conversas
     WHERE cliente_id = $1 AND status = 'ativa'
     ORDER BY ultima_mensagem_em DESC NULLS LAST
     LIMIT 1`,
    [clienteId]
  );

  if (existing) return existing;

  const [criada] = await query<{ id: string; status: string }>(
    `INSERT INTO conversas (cliente_id) VALUES ($1) RETURNING id, status`,
    [clienteId]
  );

  logger.debug({ clienteId }, 'Nova conversa criada');
  return criada!;
}

async function salvarMensagem(params: {
  id: string;
  conversaId: string;
  clienteId: string;
  tipo: TipoMensagem;
  conteudo: string;
  conteudoProcessado?: string;
  emocaoDetectada?: string;
  intencaoDetectada?: string;
  comportamentos?: string[];
  sentimentoScore?: number;
  zapiMessageId?: string;
}): Promise<Mensagem> {
  const [msg] = await query<Mensagem>(
    `INSERT INTO mensagens
       (id, conversa_id, cliente_id, tipo, conteudo, conteudo_processado,
        direcao, origem, emocao_detectada, intencao_detectada, comportamentos,
        sentimento_score, zapi_message_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'entrada', 'cliente', $7, $8, $9, $10, $11)
     ON CONFLICT (zapi_message_id) DO NOTHING
     RETURNING *`,
    [
      params.id,
      params.conversaId,
      params.clienteId,
      params.tipo,
      params.conteudo,
      params.conteudoProcessado ?? params.conteudo,
      params.emocaoDetectada ?? null,
      params.intencaoDetectada ?? null,
      params.comportamentos ?? [],
      params.sentimentoScore ?? null,
      params.zapiMessageId ?? null,
    ]
  );

  return msg!;
}

async function atualizarConversa(
  conversaId: string,
  ultimaMensagem: string,
  analise: { emocao: string; intencao_principal: string },
  leadScore: number
): Promise<void> {
  await query(
    `UPDATE conversas SET
       ultima_mensagem      = $1,
       ultima_mensagem_em   = NOW(),
       quantidade_mensagens = quantidade_mensagens + 1,
       emocao_detectada     = $2,
       intencao_principal   = $3,
       lead_score           = $4,
       atualizado_em        = NOW()
     WHERE id = $5`,
    [
      ultimaMensagem.slice(0, 500),
      analise.emocao,
      analise.intencao_principal,
      leadScore,
      conversaId,
    ]
  );
}

async function salvarMemoriasSemanticas(
  clienteId: string,
  conteudo: string,
  analise: { emocao: string; objecoes_detectadas: string[]; produtos_mencionados: string[]; tamanhos_citados: string[] }
): Promise<void> {
  const memorias: Array<{ conteudo: string; tipo: string }> = [];

  // Memória da interação
  memorias.push({ conteudo, tipo: 'interacao' });

  // Objeções
  for (const objecao of analise.objecoes_detectadas) {
    memorias.push({ conteudo: `Objeção: ${objecao}`, tipo: 'objecao' });
  }

  // Tamanhos
  if (analise.tamanhos_citados.length > 0) {
    memorias.push({
      conteudo: `Tamanhos de interesse: ${analise.tamanhos_citados.join(', ')}`,
      tipo: 'tamanho',
    });
  }

  // Emoção significativa
  if (analise.emocao !== 'neutra') {
    memorias.push({
      conteudo: `Estado emocional: ${analise.emocao}`,
      tipo: 'emocao',
    });
  }

  // Salvar em background (não bloquear o fluxo principal)
  for (const mem of memorias) {
    saveMemory(clienteId, mem.conteudo, mem.tipo as any).catch(() => null);
  }
}

function determinarEtapaFollowup(
  analise: { emocao: string; urgencia_detectada: boolean; probabilidade_compra: number },
  isFollowupResponse: boolean
): EtapaFollowup {
  // Se respondeu follow-up, já está engajado — follow-up mais próximo
  if (isFollowupResponse) return '20_min';

  // Alta probabilidade de compra ou urgência → follow-up rápido
  if (analise.probabilidade_compra > 0.7 || analise.urgencia_detectada) return '20_min';

  // Emoção de impulso de compra → muito rápido
  if (analise.emocao === 'impulso_compra') return '20_min';

  // Empolgação → rápido
  if (analise.emocao === 'empolgacao') return '3_horas';

  // Indecisão/insegurança → dar tempo para pensar
  if (analise.emocao === 'indecisao' || analise.emocao === 'inseguranca') return '8_horas';

  // Padrão
  return '20_min';
}
