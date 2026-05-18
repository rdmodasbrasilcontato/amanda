// ════════════════════════════════════════════════════════
// Amanda AI — Behavioral Analysis Service
// Análise silenciosa de comportamento, emoção e intenção
// ════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { config } from '../../config';
import { AnaliseComportamental, EventoLeadScore, Emocao, TemperaturaLead } from '../../types';
import { logger } from '../../utils/logger';
import { retryWithBackoff } from '../../utils/helpers';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
  maxRetries: 2,
});

// ── Prompt de análise comportamental silenciosa ──────────
const PROMPT_ANALISE_COMPORTAMENTAL = `Você é um motor de análise comportamental silencioso da Amanda AI.

Sua função é analisar mensagens de clientes de uma loja de moda feminina e extrair dados comportamentais ricos.
Você NÃO gera respostas para o cliente. Você APENAS analisa e classifica.

EMOÇÕES POSSÍVEIS:
- inseguranca: cliente hesitante, com dúvidas, buscando confirmação
- ansiedade: cliente preocupada, apressada, angustiada
- felicidade: cliente animada, satisfeita, positiva
- irritacao: cliente frustrada, impaciente, insatisfeita
- indecisao: cliente oscilante, sem direção clara
- empolgacao: cliente entusiasmada, muito interessada
- curiosidade: cliente explorando, fazendo perguntas gerais
- urgencia: cliente com prazo, precisando rápido
- receio: cliente com medo de errar, desconfiante
- frustracao: cliente desapontada, com experiência ruim
- impulso_compra: cliente claramente querendo comprar agora
- neutra: mensagem sem carga emocional clara

COMPORTAMENTOS DE LEAD SCORE (detectar quais se aplicam):
- perguntou_preco: perguntou valor, preço, quanto custa
- perguntou_tamanho: perguntou tamanho, numeração, medidas
- pediu_fotos: pediu mais fotos, detalhes visuais
- clicou_link: mencionou ter visitado link ou site
- voltou_outro_dia: retornou de interação anterior
- respondeu_rapido: respondeu em menos de 2 minutos
- mandou_audio: enviou mensagem de áudio
- ocasiao_especial: mencionou casamento, formatura, aniversário, festa, evento
- perguntou_disponibilidade: perguntou se tem em estoque
- demonstrou_inseguranca: expressou dúvida, incerteza, medo de errar
- intencao_compra: expressou claramente querer comprar
- visualizou_categorias: mencionou múltiplas categorias ou peças
- permaneceu_ativo: continuou a conversa por tempo prolongado
- interagiu_mais_de_uma_vez: segunda ou mais interação do cliente
- mandou_imagem: enviou imagem
- mencionou_urgencia: precisar hoje, amanhã, urgente, rápido
- retornou_apos_followup: respondeu um follow-up anterior

Retorne APENAS um JSON válido neste formato exato:
{
  "emocao": "string",
  "intensidade_emocional": 0.0-1.0,
  "confianca_emocional": 0.0-1.0,
  "intencao_principal": "string descrevendo a intenção principal",
  "comportamentos_detectados": ["lista", "de", "eventos"],
  "produtos_mencionados": ["produto1", "produto2"],
  "categorias_mencionadas": ["categoria1"],
  "ocasiao_especial": "string ou null",
  "urgencia_detectada": true/false,
  "nivel_urgencia": "baixa|media|alta|critica",
  "objecoes_detectadas": ["objecao1"],
  "tamanhos_citados": ["P", "M"],
  "cores_citadas": ["azul"],
  "preco_mencionado": null ou número,
  "resumo_comportamental": "resumo em 1-2 frases do comportamento",
  "perfil_atualizado": "atualização do perfil psicológico em 1 frase",
  "temperatura_sugerida": "frio|morno|quente|muito_quente",
  "probabilidade_compra": 0.0-1.0,
  "proximo_passo_recomendado": "string com recomendação de follow-up"
}`;

// ── Analisar mensagem de texto ───────────────────────────
export async function analisarMensagem(
  conteudo: string,
  contextoCliente: string = '',
  historicoRecente: string = ''
): Promise<AnaliseComportamental> {
  const userPrompt = `
CONTEXTO DO CLIENTE:
${contextoCliente || 'Nenhum histórico anterior'}

HISTÓRICO RECENTE:
${historicoRecente || 'Primeira interação'}

MENSAGEM DO CLIENTE PARA ANALISAR:
"${conteudo}"

Analise esta mensagem e retorne APENAS o JSON.`.trim();

  try {
    const response = await retryWithBackoff(
      () => openai.chat.completions.create({
        model: config.OPENAI_FALLBACK_MODEL,
        messages: [
          { role: 'system', content: PROMPT_ANALISE_COMPORTAMENTAL },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      2,
      1000
    );

    const raw = response.choices[0]?.message?.content ?? '{}';
    const analise = JSON.parse(raw) as AnaliseComportamental;

    logger.debug({
      emocao: analise.emocao,
      intencao: analise.intencao_principal,
      comportamentos: analise.comportamentos_detectados,
    }, 'Análise comportamental concluída');

    return sanitizarAnalise(analise);
  } catch (err) {
    logger.error({ err }, 'Erro na análise comportamental — usando fallback');
    return analiseFallback(conteudo);
  }
}

// ── Análise de imagem com contexto comportamental ────────
export async function analisarImagem(imageUrl: string): Promise<{
  descricao: string;
  categorias: string[];
  estilo: string;
  ocasiao: string[];
  cores: string[];
  produtos_similares: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise esta imagem de roupa e retorne APENAS um JSON com:
{
  "descricao": "descrição detalhada da peça",
  "categorias": ["categoria principal"],
  "estilo": "casual|social|festa|esportivo|work|praia|noite",
  "ocasiao": ["ocasiões adequadas"],
  "cores": ["cores presentes"],
  "produtos_similares": ["termos de busca para produtos similares"]
}`,
            },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw);
  } catch (err) {
    logger.error({ err }, 'Erro na análise de imagem');
    return {
      descricao: '[imagem recebida]',
      categorias: [],
      estilo: '',
      ocasiao: [],
      cores: [],
      produtos_similares: [],
    };
  }
}

// ── Detectar opt-out ─────────────────────────────────────
const OPT_OUT_PATTERNS = [
  /^n[aã]o$/i,
  /^nao$/i,
  /^parar?$/i,
  /^sair$/i,
  /^cancelar$/i,
  /^stop$/i,
  /n[aã]o quero/i,
  /me tira da lista/i,
  /para de me mandar/i,
  /n[aã]o quero (mais )?receber/i,
  /remove (meu|me do)/i,
  /descadastrar/i,
];

export function detectarOptOut(mensagem: string): boolean {
  const clean = mensagem.trim();
  return OPT_OUT_PATTERNS.some(p => p.test(clean));
}

// ── Detectar se é resposta a follow-up ──────────────────
export async function isRespostaAFollowup(clienteId: string): Promise<boolean> {
  const { queryOne } = await import('../../database/connection');
  const followupRecente = await queryOne<{ id: string }>(
    `SELECT id FROM followups
     WHERE cliente_id = $1
       AND status = 'enviado'
       AND enviado_em > NOW() - INTERVAL '48 hours'
     ORDER BY enviado_em DESC
     LIMIT 1`,
    [clienteId]
  );
  return followupRecente !== null;
}

// ── Detectar velocidade de resposta ──────────────────────
export async function isRespostaRapida(clienteId: string): Promise<boolean> {
  const { queryOne } = await import('../../database/connection');
  const ultimaMensagemIA = await queryOne<{ criado_em: Date }>(
    `SELECT criado_em FROM mensagens
     WHERE cliente_id = $1 AND direcao = 'saida'
     ORDER BY criado_em DESC LIMIT 1`,
    [clienteId]
  );

  if (!ultimaMensagemIA) return false;

  const diffMs = Date.now() - new Date(ultimaMensagemIA.criado_em).getTime();
  return diffMs < 2 * 60 * 1000; // menos de 2 minutos
}

// ── Detectar retorno de outro dia ────────────────────────
export async function isRetornoOutroDia(clienteId: string): Promise<boolean> {
  const { queryOne } = await import('../../database/connection');
  const ultimaInteracao = await queryOne<{ ultima_interacao: Date | null }>(
    'SELECT ultima_interacao FROM clientes WHERE id = $1',
    [clienteId]
  );

  if (!ultimaInteracao?.ultima_interacao) return false;

  const diffMs = Date.now() - new Date(ultimaInteracao.ultima_interacao).getTime();
  return diffMs > 20 * 60 * 60 * 1000; // mais de 20 horas
}

// ── Sanitizar resultado ──────────────────────────────────
function sanitizarAnalise(analise: Partial<AnaliseComportamental>): AnaliseComportamental {
  const emocoesValidas: Emocao[] = [
    'inseguranca', 'ansiedade', 'felicidade', 'irritacao', 'indecisao',
    'empolgacao', 'curiosidade', 'urgencia', 'receio', 'frustracao',
    'impulso_compra', 'neutra',
  ];

  const temperaturasValidas: TemperaturaLead[] = ['frio', 'morno', 'quente', 'muito_quente'];

  const emocaoValida = emocoesValidas.includes(analise.emocao as Emocao)
    ? (analise.emocao as Emocao)
    : 'neutra';

  const temperaturaValida = temperaturasValidas.includes(analise.temperatura_sugerida as TemperaturaLead)
    ? (analise.temperatura_sugerida as TemperaturaLead)
    : 'frio';

  return {
    emocao:                      emocaoValida,
    intensidade_emocional:       Number(analise.intensidade_emocional ?? 0.5),
    confianca_emocional:         Number(analise.confianca_emocional ?? 0.5),
    intencao_principal:          analise.intencao_principal ?? 'exploração',
    comportamentos_detectados:   Array.isArray(analise.comportamentos_detectados)
                                   ? analise.comportamentos_detectados as EventoLeadScore[]
                                   : [],
    produtos_mencionados:        Array.isArray(analise.produtos_mencionados)
                                   ? analise.produtos_mencionados
                                   : [],
    categorias_mencionadas:      Array.isArray(analise.categorias_mencionadas)
                                   ? analise.categorias_mencionadas
                                   : [],
    ocasiao_especial:            analise.ocasiao_especial ?? null,
    urgencia_detectada:          Boolean(analise.urgencia_detectada),
    nivel_urgencia:              analise.nivel_urgencia ?? 'baixa',
    objecoes_detectadas:         Array.isArray(analise.objecoes_detectadas)
                                   ? analise.objecoes_detectadas
                                   : [],
    tamanhos_citados:            Array.isArray(analise.tamanhos_citados)
                                   ? analise.tamanhos_citados
                                   : [],
    cores_citadas:               Array.isArray(analise.cores_citadas)
                                   ? analise.cores_citadas
                                   : [],
    preco_mencionado:            analise.preco_mencionado ?? null,
    resumo_comportamental:       analise.resumo_comportamental ?? '',
    perfil_atualizado:           analise.perfil_atualizado ?? '',
    temperatura_sugerida:        temperaturaValida,
    probabilidade_compra:        Number(analise.probabilidade_compra ?? 0),
    proximo_passo_recomendado:   analise.proximo_passo_recomendado ?? '',
  };
}

function analiseFallback(conteudo: string): AnaliseComportamental {
  const lower = conteudo.toLowerCase();

  let emocao: Emocao = 'neutra';
  if (/urgente|r[aá]pido|preciso|hoje|amanhã/.test(lower)) emocao = 'urgencia';
  else if (/adorei|amei|perfeito|incrível|lindo/.test(lower)) emocao = 'empolgacao';
  else if (/não sei|talvez|pensando|será/.test(lower)) emocao = 'indecisao';

  const comportamentos: EventoLeadScore[] = [];
  if (/pre[çc]o|quanto|valor|custa/.test(lower)) comportamentos.push('perguntou_preco');
  if (/tamanho|numera[çc]ão|medida/.test(lower)) comportamentos.push('perguntou_tamanho');
  if (/foto|imagem|mais opç/.test(lower)) comportamentos.push('pediu_fotos');
  if (/comprar|quero|vou levar/.test(lower)) comportamentos.push('intencao_compra');
  if (/urgente|r[aá]pido|hoje/.test(lower)) comportamentos.push('mencionou_urgencia');

  return {
    emocao,
    intensidade_emocional: 0.5,
    confianca_emocional: 0.3,
    intencao_principal: 'exploração de produtos',
    comportamentos_detectados: comportamentos,
    produtos_mencionados: [],
    categorias_mencionadas: [],
    ocasiao_especial: null,
    urgencia_detectada: emocao === 'urgencia',
    nivel_urgencia: 'baixa',
    objecoes_detectadas: [],
    tamanhos_citados: [],
    cores_citadas: [],
    preco_mencionado: null,
    resumo_comportamental: 'Cliente enviou mensagem — análise por fallback',
    perfil_atualizado: 'Perfil em construção',
    temperatura_sugerida: comportamentos.includes('intencao_compra') ? 'quente' : 'frio',
    probabilidade_compra: comportamentos.includes('intencao_compra') ? 0.6 : 0.1,
    proximo_passo_recomendado: 'Enviar follow-up contextual em 20 minutos',
  };
}
