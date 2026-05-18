// ════════════════════════════════════════════════════════
// Amanda AI — Types completos (Silent Behavioral AI)
// ════════════════════════════════════════════════════════

// ── Enums / Union Types ──────────────────────────────────
export type NivelEngajamento   = 'frio' | 'morno' | 'quente' | 'muito_quente' | 'vip';
export type StatusCliente      = 'ativo' | 'inativo' | 'bloqueado' | 'vip';
export type EtapaFunil         = 'topo' | 'meio' | 'fundo' | 'cliente' | 'recompra';
export type Emocao             =
  | 'inseguranca' | 'ansiedade' | 'felicidade' | 'irritacao' | 'indecisao'
  | 'empolgacao' | 'curiosidade' | 'urgencia' | 'receio' | 'frustracao'
  | 'impulso_compra' | 'neutra';
export type DirecaoMensagem    = 'entrada' | 'saida';
export type OrigemMensagem     = 'cliente' | 'ia' | 'humano' | 'sistema';
export type TipoMensagem       = 'texto' | 'imagem' | 'audio' | 'video' | 'pdf' | 'url' | 'sticker' | 'localizacao';
export type StatusConversa     = 'ativa' | 'encerrada' | 'handoff' | 'opt_out' | 'bloqueada';
export type EtapaFollowup      = '20_min' | '3_horas' | '8_horas' | '1_dia' | '3_dias' | '7_dias' | '15_dias' | '30_dias';
export type TipoFollowup       = 'reativacao' | 'abandono' | 'pos_venda' | 'engajamento' | 'carrinho' | 'loop_mensal';
export type StatusFollowup     = 'pendente' | 'enviado' | 'cancelado' | 'falhou' | 'pausado';
export type StatusHandoff      = 'ativo' | 'resolvido' | 'expirado';
export type TipoMemoria        = 'preferencia' | 'emocao' | 'compra' | 'comportamento' | 'objecao' | 'estilo' | 'tamanho' | 'historico' | 'interacao' | 'perfil';
export type TemperaturaLead    = 'frio' | 'morno' | 'quente' | 'muito_quente';

// Eventos de lead score
export type EventoLeadScore =
  | 'perguntou_preco'
  | 'perguntou_tamanho'
  | 'pediu_fotos'
  | 'clicou_link'
  | 'voltou_outro_dia'
  | 'respondeu_rapido'
  | 'mandou_audio'
  | 'ocasiao_especial'
  | 'perguntou_disponibilidade'
  | 'demonstrou_inseguranca'
  | 'intencao_compra'
  | 'visualizou_categorias'
  | 'permaneceu_ativo'
  | 'interagiu_mais_de_uma_vez'
  | 'mandou_imagem'
  | 'mencionou_urgencia'
  | 'retornou_apos_followup';

// ── Entidades de Banco ───────────────────────────────────

export interface Cliente {
  id: string;
  telefone: string;
  nome: string | null;
  nome_preferido: string | null;
  email: string | null;
  instagram: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string;
  data_nascimento: Date | null;
  genero: string | null;
  cliente_desde: Date;
  ultima_interacao: Date | null;
  ultima_compra: Date | null;
  total_pedidos: number;
  valor_total_gasto: number;
  ticket_medio: number;
  categoria_favorita: string | null;
  preferencias: Record<string, unknown>;
  produtos_citados: string[];
  objecoes: string[];
  estilo_detectado: string | null;
  tamanho_habitual: string | null;
  emocao_recorrente: string | null;
  perfil_emocional: Record<string, number>;
  perfil_psicologico: string | null;
  nivel_engajamento: NivelEngajamento;
  temperatura_lead: number;
  etapa_funil: EtapaFunil;
  horario_preferido: string | null;
  padrao_interacao: string | null;
  frequencia_media: string | null;
  status: StatusCliente;
  opt_out: boolean;
  opt_out_em: Date | null;
  bloqueado: boolean;
  humano_assumiu: boolean;
  ia_ativa: boolean;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Conversa {
  id: string;
  cliente_id: string;
  canal: string;
  status: StatusConversa;
  contexto_resumido: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_em: Date | null;
  quantidade_mensagens: number;
  emocao_detectada: string | null;
  lead_score: number;
  etapa_funil: EtapaFunil;
  intencao_principal: string | null;
  handoff_ativo: boolean;
  handoff_iniciado_em: Date | null;
  handoff_por: string | null;
  followup_ativo: boolean;
  proximo_followup_em: Date | null;
  tentativa_followup: number;
  origem: string | null;
  metadata: Record<string, unknown>;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  cliente_id: string;
  tipo: TipoMensagem;
  conteudo: string | null;
  conteudo_original: string | null;
  conteudo_processado: string | null;
  direcao: DirecaoMensagem;
  origem: OrigemMensagem;
  emocao_detectada: Emocao | null;
  intencao_detectada: string | null;
  comportamentos: string[];
  sentimento_score: number | null;
  spam_score: number;
  pontos_score: number;
  arquivo_url: string | null;
  transcricao_audio: string | null;
  descricao_imagem: string | null;
  texto_extraido: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  modelo_usado: string | null;
  tempo_processamento: number | null;
  zapi_message_id: string | null;
  criado_em: Date;
}

export interface LeadScore {
  id: string;
  cliente_id: string;
  mensagem_id: string | null;
  evento: EventoLeadScore;
  pontos_adicionados: number;
  score_resultante: number;
  temperatura: TemperaturaLead;
  criado_em: Date;
}

export interface CustomerBehaviorProfile {
  id: string;
  cliente_id: string;
  perfil_psicologico: string | null;
  estilo_comunicacao: string | null;
  nivel_confianca: string | null;
  perfil_decisao: string | null;
  horario_preferido: string | null;
  horarios_ativo: Record<string, number>;
  tempo_resposta_medio: number | null;
  frequencia_interacao: string | null;
  padrao_mensagens: string | null;
  categorias_interesse: string[];
  produtos_citados: string[];
  ocasioes_mencionadas: string[];
  estilos_preferidos: string[];
  tamanhos_citados: string[];
  cores_preferidas: string[];
  faixa_preco_interesse: Record<string, number>;
  objecoes_recorrentes: string[];
  barreiras_compra: string[];
  sensibilidade_preco: string | null;
  envia_audios: boolean;
  envia_imagens: boolean;
  responde_rapido: boolean;
  volta_sem_comprar: boolean;
  pede_fotos: boolean;
  pergunta_tamanho: boolean;
  pergunta_preco: boolean;
  menciona_urgencia: boolean;
  menciona_ocasioes: boolean;
  ticket_provavel: number | null;
  probabilidade_compra: number | null;
  nivel_urgencia: string | null;
  intensidade_emocional: number | null;
  recorrencia: string | null;
  total_interacoes: number;
  total_followups: number;
  followups_respondidos: number;
  atualizado_em: Date;
}

export interface Evento {
  id: string;
  cliente_id: string;
  conversa_id: string | null;
  mensagem_id: string | null;
  tipo_evento: string;
  dados: Record<string, unknown>;
  pontos_score: number;
  criado_em: Date;
}

export interface EmocaoAnalise {
  id: string;
  cliente_id: string;
  mensagem_id: string | null;
  emocao: Emocao;
  intensidade: number;
  confianca: number;
  contexto: string | null;
  criado_em: Date;
}

export interface MemoriaLonga {
  id: string;
  cliente_id: string;
  tipo_memoria: TipoMemoria;
  conteudo: string;
  resumo: string | null;
  embedding: number[] | null;
  importancia: number;
  ultima_utilizacao: Date | null;
  frequencia: number;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Followup {
  id: string;
  cliente_id: string;
  conversa_id: string | null;
  tipo: TipoFollowup;
  etapa: EtapaFollowup;
  mensagem_gerada: string | null;
  contexto_utilizado: Record<string, unknown>;
  status: StatusFollowup;
  motivo_cancelamento: string | null;
  opt_out: boolean;
  agendado_para: Date;
  enviado_em: Date | null;
  tentativas: number;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Handoff {
  id: string;
  cliente_id: string;
  conversa_id: string;
  motivo: string | null;
  assumido_por: string | null;
  ia_pausada: boolean;
  reativar_em: Date | null;
  contexto_handoff: string | null;
  status: StatusHandoff;
  resolvido_em: Date | null;
  resolvido_por: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

export interface Produto {
  id: string;
  sku: string | null;
  nome: string;
  slug: string | null;
  descricao_curta: string | null;
  descricao_imagem_detalhada: string | null;
  categoria_id: string | null;
  marca: string | null;
  colecao: string | null;
  estilo: string | null;
  cor: string | null;
  tamanhos: string[];
  ocasiao: string[];
  preco: number;
  preco_promocional: number | null;
  estoque: number;
  ativo: boolean;
  url_imagem_principal: string | null;
  galeria_imagens: string[];
  embedding: number[] | null;
  criado_em: Date;
  atualizado_em: Date;
}

// ── Payload Webhook Z-API ────────────────────────────────
export interface ZApiWebhookPayload {
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number;
  status: string;
  chatName: string;
  senderPhoto: string | null;
  senderName: string;
  participantPhone: string | null;
  photo: string | null;
  broadcast: boolean;
  type: string;
  text?: { message: string };
  image?: { imageUrl: string; caption: string; mimeType: string };
  audio?: { audioUrl: string; mimeType: string; seconds?: number };
  document?: { documentUrl: string; mimeType: string; fileName: string };
  isGroupMsg: boolean;
  waitingMessage: boolean;
}

// ── Análise Comportamental (retorno da IA) ───────────────
export interface AnaliseComportamental {
  emocao: Emocao;
  intensidade_emocional: number;
  confianca_emocional: number;
  intencao_principal: string;
  comportamentos_detectados: EventoLeadScore[];
  produtos_mencionados: string[];
  categorias_mencionadas: string[];
  ocasiao_especial: string | null;
  urgencia_detectada: boolean;
  nivel_urgencia: 'baixa' | 'media' | 'alta' | 'critica';
  objecoes_detectadas: string[];
  tamanhos_citados: string[];
  cores_citadas: string[];
  preco_mencionado: number | null;
  resumo_comportamental: string;
  perfil_atualizado: string;
  temperatura_sugerida: TemperaturaLead;
  probabilidade_compra: number;
  proximo_passo_recomendado: string;
}

// ── Contexto para Geração de Follow-up ──────────────────
export interface ContextoFollowup {
  cliente: {
    nome: string;
    telefone: string;
    temperatura_lead: number;
    nivel_engajamento: NivelEngajamento;
    emocao_recorrente: string | null;
    etapa_funil: EtapaFunil;
    horario_preferido: string | null;
  };
  perfil: Partial<CustomerBehaviorProfile>;
  ultimaMensagem: string | null;
  ultimaInteracao: Date | null;
  memorias: string[];
  produtos_relacionados: string[];
  etapa_followup: EtapaFollowup;
  tentativa_numero: number;
  historico_followups: number;
}

// ── Vector Search ────────────────────────────────────────
export interface VectorSearchResult {
  id: string;
  tipo_memoria: string;
  conteudo: string;
  similaridade: number;
  criado_em: Date;
}

export interface ProdutoSearchResult {
  id: string;
  nome: string;
  descricao_curta: string | null;
  descricao_imagem_detalhada: string | null;
  preco: number;
  tamanhos: string[];
  url_imagem_principal: string | null;
  similaridade: number;
}

// ── Resultado de análise de IA (legado) ─────────────────
// Mantido apenas para compatibilidade com prompts.loader
export type EmotionType = Emocao;

export interface AIContext {
  clientName: string;
  shortTermMemory: Array<{ role: string; content: string }>;
  longTermSummary: string;
  relevantMemories: string[];
  detectedEmotion: Emocao;
  conversationStatus: StatusConversa;
  productContext?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  detectedEmotion: Emocao;
  shouldTriggerHandoff: boolean;
  suggestedFollowup: boolean;
}

// ── Tipos internos de processamento ─────────────────────
export interface ProcessedMessage {
  clientId: string;
  conversaId: string;
  conteudo: string;
  tipo: TipoMensagem;
  zapiMessageId: string;
}

export interface ConversationStatus {
  id: string;
  status: StatusConversa;
  handoff_ativo: boolean;
}

// ── Tipos adicionais de tabelas ─────────────────────────
export interface MemoriaVetorial {
  id: string;
  client_id: string;
  content: string;
  memory_type: TipoMemoria;
  embedding: number[] | null;
  source_message_id: string | null;
  criado_em: Date;
}
