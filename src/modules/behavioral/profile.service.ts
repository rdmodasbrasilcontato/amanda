// ════════════════════════════════════════════════════════
// Amanda AI — Behavioral Profile Builder
// Constrói e atualiza perfil psicológico/comportamental
// ════════════════════════════════════════════════════════

import { query, queryOne } from '../../database/connection';
import { AnaliseComportamental, CustomerBehaviorProfile, EtapaFunil } from '../../types';
import { logger } from '../../utils/logger';

// ── Obter ou criar perfil comportamental ─────────────────
export async function obterOuCriarPerfil(clienteId: string): Promise<CustomerBehaviorProfile> {
  const existing = await queryOne<CustomerBehaviorProfile>(
    'SELECT * FROM customer_behavior_profile WHERE cliente_id = $1',
    [clienteId]
  );

  if (existing) return existing;

  const [created] = await query<CustomerBehaviorProfile>(
    `INSERT INTO customer_behavior_profile (cliente_id)
     VALUES ($1) RETURNING *`,
    [clienteId]
  );

  logger.debug({ clienteId }, 'Perfil comportamental criado');
  return created!;
}

// ── Atualizar perfil com análise da IA ───────────────────
export async function atualizarPerfil(
  clienteId: string,
  analise: AnaliseComportamental,
  tipoMensagem: string,
  horarioMensagem: Date
): Promise<void> {
  const perfil = await obterOuCriarPerfil(clienteId);

  // Atualizar horários ativos
  const hora = horarioMensagem.getHours().toString();
  const horariosAtivo = (perfil.horarios_ativo as Record<string, number>) ?? {};
  horariosAtivo[hora] = (horariosAtivo[hora] ?? 0) + 1;

  // Calcular horário preferido (hora com mais interações)
  const horarioPreferido = calcularHorarioPreferido(horariosAtivo);

  // Mesclar arrays sem duplicatas
  const categoriasInteresse = mergeUnique(
    perfil.categorias_interesse ?? [],
    analise.categorias_mencionadas
  );

  const produtosCitados = mergeUnique(
    perfil.produtos_citados ?? [],
    analise.produtos_mencionados
  );

  const ocasioesMencionadas = analise.ocasiao_especial
    ? mergeUnique(perfil.ocasioes_mencionadas ?? [], [analise.ocasiao_especial])
    : (perfil.ocasioes_mencionadas ?? []);

  const tamanhosCitados = mergeUnique(
    perfil.tamanhos_citados ?? [],
    analise.tamanhos_citados
  );

  const coresPreferidas = mergeUnique(
    perfil.cores_preferidas ?? [],
    analise.cores_citadas
  );

  const objecoesRecorrentes = mergeUnique(
    perfil.objecoes_recorrentes ?? [],
    analise.objecoes_detectadas
  );

  // Faixa de preço de interesse
  const faixaPreco = (perfil.faixa_preco_interesse as Record<string, number>) ?? {};
  if (analise.preco_mencionado) {
    const faixa = calcularFaixaPreco(analise.preco_mencionado);
    faixaPreco[faixa] = (faixaPreco[faixa] ?? 0) + 1;
  }

  // Sinais comportamentais acumulativos (uma vez TRUE, fica TRUE)
  const enviaAudios   = perfil.envia_audios   || tipoMensagem === 'audio';
  const enviaImagens  = perfil.envia_imagens  || tipoMensagem === 'imagem' || tipoMensagem === 'image';
  const pedeFotos     = perfil.pede_fotos     || analise.comportamentos_detectados.includes('pediu_fotos');
  const perguntaTamanho = perfil.pergunta_tamanho || analise.comportamentos_detectados.includes('perguntou_tamanho');
  const perguntaPreco   = perfil.pergunta_preco   || analise.comportamentos_detectados.includes('perguntou_preco');
  const mencionaUrgencia = perfil.menciona_urgencia || analise.urgencia_detectada;
  const mencionaOcasioes = perfil.menciona_ocasioes || !!analise.ocasiao_especial;

  // Intensidade emocional: média ponderada
  const intensidadeAtual = perfil.intensidade_emocional ?? 0.5;
  const intensidadeNova = (intensidadeAtual * 0.7) + (analise.intensidade_emocional * 0.3);

  // Probabilidade de compra: média ponderada
  const probAtual = perfil.probabilidade_compra ?? 0;
  const probNova = (probAtual * 0.6) + (analise.probabilidade_compra * 0.4);

  await query(
    `UPDATE customer_behavior_profile SET
       horarios_ativo         = $1::jsonb,
       horario_preferido      = $2,
       categorias_interesse   = $3,
       produtos_citados       = $4,
       ocasioes_mencionadas   = $5,
       tamanhos_citados       = $6,
       cores_preferidas       = $7,
       objecoes_recorrentes   = $8,
       faixa_preco_interesse  = $9::jsonb,
       envia_audios           = $10,
       envia_imagens          = $11,
       pede_fotos             = $12,
       pergunta_tamanho       = $13,
       pergunta_preco         = $14,
       menciona_urgencia      = $15,
       menciona_ocasioes      = $16,
       intensidade_emocional  = $17,
       probabilidade_compra   = $18,
       nivel_urgencia         = $19,
       total_interacoes       = total_interacoes + 1,
       atualizado_em          = NOW()
     WHERE cliente_id = $20`,
    [
      JSON.stringify(horariosAtivo),
      horarioPreferido,
      categoriasInteresse,
      produtosCitados,
      ocasioesMencionadas,
      tamanhosCitados,
      coresPreferidas,
      objecoesRecorrentes,
      JSON.stringify(faixaPreco),
      enviaAudios,
      enviaImagens,
      pedeFotos,
      perguntaTamanho,
      perguntaPreco,
      mencionaUrgencia,
      mencionaOcasioes,
      intensidadeNova,
      probNova,
      analise.nivel_urgencia,
      clienteId,
    ]
  );

  // Atualizar perfil psicológico, horário preferido e etapa do funil no cliente
  const novaEtapaFunil = await calcularEtapaFunil(clienteId, analise);

  await query(
    `UPDATE clientes
     SET perfil_psicologico = COALESCE($1, perfil_psicologico),
         emocao_recorrente  = $2,
         horario_preferido  = $3,
         etapa_funil        = $4,
         atualizado_em      = NOW()
     WHERE id = $5`,
    [
      analise.perfil_atualizado || null,
      analise.emocao,
      horarioPreferido,
      novaEtapaFunil,
      clienteId,
    ]
  );

  logger.debug({ clienteId, etapaFunil: novaEtapaFunil, horarioPreferido }, 'Perfil comportamental atualizado');
}

// ── Calcular etapa do funil baseado em score, intenção e histórico ──
export async function calcularEtapaFunil(
  clienteId: string,
  analise: AnaliseComportamental
): Promise<EtapaFunil> {
  const cliente = await queryOne<{
    temperatura_lead: number;
    ultima_compra: Date | null;
    total_pedidos: number;
    etapa_funil: EtapaFunil;
  }>(
    'SELECT temperatura_lead, ultima_compra, total_pedidos, etapa_funil FROM clientes WHERE id = $1',
    [clienteId]
  );

  if (!cliente) return 'topo';

  // Já comprou antes
  if (cliente.ultima_compra && cliente.total_pedidos > 0) {
    // Cliente voltando a engajar com intenção → recompra
    if (analise.comportamentos_detectados.includes('intencao_compra') ||
        analise.probabilidade_compra >= 0.6) {
      return 'recompra';
    }
    return 'cliente';
  }

  // Intenção clara de compra ou urgência alta → fundo de funil
  if (analise.comportamentos_detectados.includes('intencao_compra') ||
      analise.probabilidade_compra >= 0.7 ||
      analise.nivel_urgencia === 'critica' ||
      cliente.temperatura_lead >= 51) {
    return 'fundo';
  }

  // Demonstrou interesse concreto (preço, tamanho, foto, disponibilidade) → meio
  const sinaisInteresse: string[] = [
    'perguntou_preco', 'perguntou_tamanho', 'pediu_fotos',
    'perguntou_disponibilidade', 'visualizou_categorias',
  ];
  const temInteresse = analise.comportamentos_detectados.some(c => sinaisInteresse.includes(c));

  if (temInteresse || cliente.temperatura_lead >= 21) {
    return 'meio';
  }

  return 'topo';
}

// ── Construir contexto de perfil para o follow-up ────────
export async function construirContextoPerfil(clienteId: string): Promise<string> {
  const perfil = await queryOne<CustomerBehaviorProfile>(
    'SELECT * FROM customer_behavior_profile WHERE cliente_id = $1',
    [clienteId]
  );

  if (!perfil) return '';

  const partes: string[] = [];

  if (perfil.categorias_interesse?.length)
    partes.push(`Interessa-se por: ${perfil.categorias_interesse.join(', ')}`);

  if (perfil.produtos_citados?.length)
    partes.push(`Mencionou produtos: ${perfil.produtos_citados.slice(0, 3).join(', ')}`);

  if (perfil.tamanhos_citados?.length)
    partes.push(`Tamanhos citados: ${perfil.tamanhos_citados.join(', ')}`);

  if (perfil.ocasioes_mencionadas?.length)
    partes.push(`Ocasiões: ${perfil.ocasioes_mencionadas.join(', ')}`);

  if (perfil.objecoes_recorrentes?.length)
    partes.push(`Objeções: ${perfil.objecoes_recorrentes.join(', ')}`);

  if (perfil.horario_preferido)
    partes.push(`Horário preferido: ${perfil.horario_preferido}`);

  if (perfil.perfil_psicologico)
    partes.push(`Perfil: ${perfil.perfil_psicologico}`);

  return partes.join(' | ');
}

// ── Helpers ──────────────────────────────────────────────
function mergeUnique(existente: string[], novo: string[]): string[] {
  const set = new Set([...existente, ...novo.filter(Boolean)]);
  return Array.from(set).slice(0, 50); // máximo 50 itens
}

function calcularHorarioPreferido(horarios: Record<string, number>): string {
  if (!horarios || Object.keys(horarios).length === 0) return 'indefinido';

  const sorted = Object.entries(horarios).sort((a, b) => b[1] - a[1]);
  const horaTop = parseInt(sorted[0]![0]);

  if (horaTop >= 6 && horaTop < 12)  return 'manhã';
  if (horaTop >= 12 && horaTop < 18) return 'tarde';
  if (horaTop >= 18 && horaTop < 22) return 'noite';
  return 'madrugada';
}

function calcularFaixaPreco(preco: number): string {
  if (preco < 100)  return 'ate_100';
  if (preco < 200)  return '100_200';
  if (preco < 500)  return '200_500';
  if (preco < 1000) return '500_1000';
  return 'acima_1000';
}
