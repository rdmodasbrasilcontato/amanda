// ════════════════════════════════════════════════════════
// Amanda AI — Events Service
// Registro de eventos comportamentais
// ════════════════════════════════════════════════════════

import { query } from '../../database/connection';
import { AnaliseComportamental } from '../../types';
import { logger } from '../../utils/logger';

// ── Registrar evento comportamental ──────────────────────
export async function registrarEvento(
  clienteId: string,
  tipoEvento: string,
  dados: Record<string, unknown> = {},
  conversaId?: string,
  mensagemId?: string,
  pontosScore = 0
): Promise<void> {
  try {
    await query(
      `INSERT INTO eventos
         (cliente_id, conversa_id, mensagem_id, tipo_evento, dados, pontos_score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        clienteId,
        conversaId ?? null,
        mensagemId ?? null,
        tipoEvento,
        JSON.stringify(dados),
        pontosScore,
      ]
    );
  } catch (err) {
    logger.error({ err, clienteId, tipoEvento }, 'Erro ao registrar evento');
  }
}

// ── Registrar análise completa como eventos ───────────────
export async function registrarEventosDaAnalise(
  clienteId: string,
  analise: AnaliseComportamental,
  conversaId?: string,
  mensagemId?: string
): Promise<void> {
  const { query: q } = await import('../../database/connection');

  // Evento principal: mensagem analisada
  await registrarEvento(
    clienteId,
    'mensagem_analisada',
    {
      emocao: analise.emocao,
      intencao: analise.intencao_principal,
      temperatura_sugerida: analise.temperatura_sugerida,
      probabilidade_compra: analise.probabilidade_compra,
    },
    conversaId,
    mensagemId
  );

  // Eventos por comportamento detectado
  for (const comportamento of analise.comportamentos_detectados) {
    await registrarEvento(
      clienteId,
      comportamento,
      { fonte: 'analise_comportamental' },
      conversaId,
      mensagemId
    );
  }

  // Eventos especiais
  if (analise.urgencia_detectada) {
    await registrarEvento(
      clienteId,
      'urgencia_detectada',
      { nivel: analise.nivel_urgencia },
      conversaId,
      mensagemId
    );
  }

  if (analise.ocasiao_especial) {
    await registrarEvento(
      clienteId,
      'ocasiao_especial_mencionada',
      { ocasiao: analise.ocasiao_especial },
      conversaId,
      mensagemId
    );
  }

  if (analise.emocao === 'impulso_compra') {
    await registrarEvento(
      clienteId,
      'impulso_compra_detectado',
      { intensidade: analise.intensidade_emocional },
      conversaId,
      mensagemId
    );
  }

  // Produtos e categorias mencionados
  if (analise.produtos_mencionados.length > 0) {
    await registrarEvento(
      clienteId,
      'produtos_mencionados',
      { produtos: analise.produtos_mencionados },
      conversaId,
      mensagemId
    );
  }

  if (analise.categorias_mencionadas.length > 0) {
    await registrarEvento(
      clienteId,
      'categorias_mencionadas',
      { categorias: analise.categorias_mencionadas },
      conversaId,
      mensagemId
    );
  }

  // Salvar análise emocional no histórico
  try {
    await q(
      `INSERT INTO emocao_analise
         (cliente_id, mensagem_id, emocao, intensidade, confianca, contexto)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        clienteId,
        mensagemId ?? null,
        analise.emocao,
        analise.intensidade_emocional,
        analise.confianca_emocional,
        analise.resumo_comportamental,
      ]
    );
  } catch (err) {
    logger.error({ err, clienteId }, 'Erro ao salvar emocao_analise');
  }
}

// ── Buscar histórico de eventos do cliente ───────────────
export async function buscarEventos(
  clienteId: string,
  limite = 20
): Promise<Array<{ tipo_evento: string; dados: Record<string, unknown>; criado_em: Date }>> {
  return query<{ tipo_evento: string; dados: Record<string, unknown>; criado_em: Date }>(
    `SELECT tipo_evento, dados, criado_em
     FROM eventos
     WHERE cliente_id = $1
     ORDER BY criado_em DESC
     LIMIT $2`,
    [clienteId, limite]
  );
}
