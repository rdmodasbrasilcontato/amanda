// ════════════════════════════════════════════════════════
// Amanda AI — Types completos (30 tabelas)
// ════════════════════════════════════════════════════════

export type NivelEngajamento = 'frio' | 'morno' | 'quente' | 'vip';
export type StatusCliente    = 'ativo' | 'inativo' | 'bloqueado' | 'vip';
export type Emocao           = 'feliz' | 'triste' | 'ansiosa' | 'irritada' | 'indecisa' | 'empolgada' | 'insegura' | 'neutra';
export type DirecaoMensagem  = 'entrada' | 'saida';
export type OrigemMensagem   = 'ia' | 'humano' | 'cliente' | 'sistema';
export type TipoMensagem     = 'texto' | 'imagem' | 'audio' | 'video' | 'pdf' | 'url' | 'sticker' | 'localizacao';
export type StatusConversa   = 'ativa' | 'encerrada' | 'handoff' | 'opt_out' | 'bloqueada';
export type EtapaFunil       = 'topo' | 'meio' | 'fundo' | 'cliente' | 'recompra';
export type StatusFollowup   = 'pendente' | 'enviado' | 'cancelado' | 'falhou';
export type EtapaFollowup    = '20_min' | '3_horas' | '8_horas' | '1_dia' | '3_dias' | '7_dias' | '15_dias' | '30_dias';
export type TipoFollowup     = 'abandono' | 'reativacao' | 'pos_venda' | 'engajamento' | 'carrinho';
export type StatusHandoff    = 'ativo' | 'resolvido' | 'expirado';
export type StatusPedido     = 'pendente' | 'pago' | 'cancelado' | 'enviado' | 'entregue';
export type StatusPix        = 'pendente' | 'pago' | 'expirado' | 'cancelado';
export type TipoMemoria      = 'preferencia' | 'emocao' | 'compra' | 'comportamento' | 'objecao' | 'estilo' | 'tamanho' | 'historico';
export type NivelAcesso      = 'admin' | 'gerente' | 'operador' | 'visualizador';
export type TipoLog          = 'info' | 'warn' | 'error' | 'debug';
export type TipoCampanha     = 'engajamento' | 'promocao' | 'reativacao' | 'lancamento' | 'pos_venda';
export type ReferenciaEmbedding = 'produto' | 'mensagem' | 'memoria' | 'cliente';

// ──────────────────────────────────────────────────────
// 1. CLIENTES
// ──────────────────────────────────────────────────────
export interface Cliente {
  id: string;
  nome: string | null;
  telefone: string;
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
  observacoes: string | null;
  emocao_recorrente: string | null;
  nivel_engajamento: NivelEngajamento;
  temperatura_lead: number;
  status_cliente: StatusCliente;
  opt_out: boolean;
  opt_out_at: Date | null;
  bloqueado: boolean;
  humano_assumiu: boolean;
  ia_ativa: boolean;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 2. CONVERSAS
// ──────────────────────────────────────────────────────
export interface Conversa {
  id: string;
  cliente_id: string;
  canal: string;
  status: StatusConversa;
  contexto_resumido: string | null;
  ultima_mensagem: string | null;
  ultima_resposta_ia: Date | null;
  ultima_resposta_humano: Date | null;
  ultima_interacao: Date;
  quantidade_mensagens: number;
  emocao_detectada: string | null;
  lead_score: number;
  etapa_funil: EtapaFunil;
  handoff_ativo: boolean;
  handoff_iniciado_em: Date | null;
  handoff_por: string | null;
  followup_ativo: boolean;
  origem: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 3. MENSAGENS
// ──────────────────────────────────────────────────────
export interface Mensagem {
  id: string;
  conversa_id: string;
  cliente_id: string;
  tipo: TipoMensagem;
  mensagem: string | null;
  mensagem_original: string | null;
  mensagem_processada: string | null;
  direcao: DirecaoMensagem;
  origem: OrigemMensagem;
  emocao_detectada: Emocao | null;
  intencao_detectada: string | null;
  sentimento_score: number | null;
  spam_score: number;
  embedding_id: string | null;
  arquivo_url: string | null;
  media_url: string | null;
  transcricao_audio: string | null;
  ocr_texto: string | null;
  descricao_imagem: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  modelo_usado: string | null;
  tempo_resposta: number | null;
  zapi_message_id: string | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 4. MEMORIA_CURTA
// ──────────────────────────────────────────────────────
export interface MemoriaCurta {
  id: string;
  cliente_id: string;
  conversa_id: string;
  mensagem_id: string | null;
  conteudo: string;
  contexto: string | null;
  relevancia: number;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 5. MEMORIA_LONGA
// ──────────────────────────────────────────────────────
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
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 6. EMBEDDINGS
// ──────────────────────────────────────────────────────
export interface Embedding {
  id: string;
  referencia_tipo: ReferenciaEmbedding;
  referencia_id: string;
  conteudo_original: string;
  embedding: number[];
  modelo_embedding: string;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 7. PRODUTOS
// ──────────────────────────────────────────────────────
export interface Produto {
  id: string;
  sku: string | null;
  nome: string;
  slug: string | null;
  descricao_curta: string | null;
  descricao_completa: string | null;
  descricao_imagem_detalhada: string | null;
  categoria_id: string | null;
  marca: string | null;
  colecao: string | null;
  estilo: string | null;
  tecido: string | null;
  cor: string | null;
  cores_secundarias: string[];
  estampa: string | null;
  modelagem: string | null;
  ocasiao: string[];
  tamanhos: string[];
  medidas: Record<string, unknown>;
  preco: number;
  preco_promocional: number | null;
  custo: number | null;
  estoque: number;
  ativo: boolean;
  destaque: boolean;
  novidade: boolean;
  peso: number | null;
  url_produto: string | null;
  url_imagem_principal: string | null;
  galeria_imagens: string[];
  tags: string[];
  palavras_chave: string | null;
  embedding: number[] | null;
  score_vendas: number;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 8. CATEGORIAS
// ──────────────────────────────────────────────────────
export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  imagem: string | null;
  categoria_pai: string | null;
  ativa: boolean;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 9. PEDIDOS
// ──────────────────────────────────────────────────────
export interface Pedido {
  id: string;
  cliente_id: string;
  conversa_id: string | null;
  numero_pedido: string;
  status: StatusPedido;
  itens: ItemPedido[];
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  forma_pagamento: string | null;
  codigo_pix: string | null;
  qr_code_pix: string | null;
  link_pagamento: string | null;
  rastreamento: string | null;
  transportadora: string | null;
  observacoes: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ItemPedido {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  tamanho: string | null;
  cor: string | null;
}

// ──────────────────────────────────────────────────────
// 10. CARRINHOS
// ──────────────────────────────────────────────────────
export interface Carrinho {
  id: string;
  cliente_id: string;
  produtos: ItemPedido[];
  valor_total: number;
  abandonado: boolean;
  ultima_interacao: Date;
  followup_enviado: boolean;
  followup_enviado_em: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 11. FOLLOWUPS
// ──────────────────────────────────────────────────────
export interface Followup {
  id: string;
  cliente_id: string;
  conversa_id: string | null;
  tipo: TipoFollowup;
  etapa: EtapaFollowup;
  mensagem: string | null;
  mensagem_gerada: string | null;
  status: StatusFollowup;
  respondido: boolean;
  opt_out: boolean;
  agendado_para: Date;
  enviado_em: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 12. FOLLOWUP_LOGS
// ──────────────────────────────────────────────────────
export interface FollowupLog {
  id: string;
  followup_id: string;
  cliente_id: string;
  mensagem: string | null;
  status: string;
  erro: string | null;
  tempo_envio: number | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 13. HANDOFFS
// ──────────────────────────────────────────────────────
export interface Handoff {
  id: string;
  cliente_id: string;
  conversa_id: string;
  motivo: string | null;
  assumido_por: string | null;
  ia_pausada: boolean;
  reativar_em: Date | null;
  palavra_desativacao: string | null;
  palavra_ativacao: string | null;
  contexto_handoff: string | null;
  status: StatusHandoff;
  resolvido_em: Date | null;
  resolvido_por: string | null;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 14. EMOCAO_ANALISE
// ──────────────────────────────────────────────────────
export interface EmocaoAnalise {
  id: string;
  cliente_id: string;
  mensagem_id: string | null;
  emocao: Emocao;
  intensidade: number;
  contexto: string | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 15-16-17. MÍDIAS
// ──────────────────────────────────────────────────────
export interface ImagemRecebida {
  id: string;
  cliente_id: string;
  mensagem_id: string | null;
  imagem_url: string;
  storage_path: string | null;
  descricao_ia: string | null;
  ocr_texto: string | null;
  produto_match: string | null;
  similaridade: number | null;
  embedding: number[] | null;
  created_at: Date;
}

export interface AudioRecebido {
  id: string;
  cliente_id: string;
  mensagem_id: string | null;
  audio_url: string;
  storage_path: string | null;
  transcricao: string | null;
  emocao_detectada: string | null;
  duracao: number | null;
  mime_type: string | null;
  created_at: Date;
}

export interface DocumentoRecebido {
  id: string;
  cliente_id: string;
  mensagem_id: string | null;
  arquivo_url: string;
  storage_path: string | null;
  tipo_documento: string | null;
  nome_arquivo: string | null;
  texto_extraido: string | null;
  resumo: string | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 18. PAGAMENTOS_PIX
// ──────────────────────────────────────────────────────
export interface PagamentoPix {
  id: string;
  pedido_id: string | null;
  cliente_id: string;
  valor: number;
  codigo_pix: string;
  qr_code: string | null;
  status: StatusPix;
  expira_em: Date | null;
  pago_em: Date | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// 19. CAMPANHAS
// ──────────────────────────────────────────────────────
export interface Campanha {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoCampanha;
  status: string;
  mensagem_template: string;
  segmento: Record<string, unknown>;
  agendada_para: Date | null;
  total_enviados: number;
  total_respondidos: number;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// 20. FILA_PROCESSAMENTO
// ──────────────────────────────────────────────────────
export interface FilaProcessamento {
  id: string;
  tipo_evento: string;
  payload: Record<string, unknown>;
  status: string;
  tentativas: number;
  erro: string | null;
  processar_em: Date;
  processado_em: Date | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// PAYLOAD WEBHOOK Z-API
// ──────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────
// CONTEXTO DA IA
// ──────────────────────────────────────────────────────
export interface AIContext {
  nomeCliente: string;
  memoriaRecente: Mensagem[];
  resumoLongoPrazo: string;
  memoriasRelevantes: string[];
  emocaoDetectada: Emocao;
  statusConversa: StatusConversa;
  etapaFunil: EtapaFunil;
  nivelEngajamento: NivelEngajamento;
  contextoProdutos?: string;
}

export interface AIResponse {
  conteudo: string;
  tokensUsados: number;
  emocaoDetectada: Emocao;
  deveAtivarHandoff: boolean;
  sugerirFollowup: boolean;
}

export interface VectorSearchResult {
  id: string;
  conteudo: string;
  tipo_memoria: string;
  similaridade: number;
  created_at: Date;
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
