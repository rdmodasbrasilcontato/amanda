// ════════════════════════════════════════════════════════
// Amanda AI — Types (inglês = runtime, português = legado)
// ════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────
// ENUMS / UNION TYPES
// ──────────────────────────────────────────────────────

// Emoções usadas pelo código
export type EmotionType =
  | 'neutral' | 'happy' | 'anxious' | 'irritated'
  | 'undecided' | 'excited' | 'sad';

// Status de conversa — valor real no banco (inglês, migration 001)
export type ConversationStatus = 'active' | 'handoff' | 'closed' | 'opted_out';

// Tipos legados (português) ainda exportados para compatibilidade
export type NivelEngajamento  = 'frio' | 'morno' | 'quente' | 'vip';
export type StatusCliente     = 'ativo' | 'inativo' | 'bloqueado' | 'vip';
export type Emocao            = 'feliz' | 'triste' | 'ansiosa' | 'irritada' | 'indecisa' | 'empolgada' | 'insegura' | 'neutra';
export type DirecaoMensagem   = 'entrada' | 'saida';
export type OrigemMensagem    = 'ia' | 'humano' | 'cliente' | 'sistema';
export type TipoMensagem      = 'texto' | 'imagem' | 'audio' | 'video' | 'pdf' | 'url' | 'sticker' | 'localizacao';
export type StatusConversa    = 'ativa' | 'encerrada' | 'handoff' | 'opt_out' | 'bloqueada';
export type EtapaFunil        = 'topo' | 'meio' | 'fundo' | 'cliente' | 'recompra';
export type StatusFollowup    = 'pendente' | 'enviado' | 'cancelado' | 'falhou';
export type EtapaFollowup     = '20_min' | '3_horas' | '8_horas' | '1_dia' | '3_dias' | '7_dias' | '15_dias' | '30_dias';
export type TipoFollowup      = 'abandono' | 'reativacao' | 'pos_venda' | 'engajamento' | 'carrinho';
export type StatusHandoff     = 'ativo' | 'resolvido' | 'expirado';
export type StatusPedido      = 'pendente' | 'pago' | 'cancelado' | 'enviado' | 'entregue';
export type StatusPix         = 'pendente' | 'pago' | 'expirado' | 'cancelado';
export type TipoMemoria       = 'preferencia' | 'emocao' | 'compra' | 'comportamento' | 'objecao' | 'estilo' | 'tamanho' | 'historico';
export type NivelAcesso       = 'admin' | 'gerente' | 'operador' | 'visualizador';
export type TipoLog           = 'info' | 'warn' | 'error' | 'debug';
export type TipoCampanha      = 'engajamento' | 'promocao' | 'reativacao' | 'lancamento' | 'pos_venda';
export type ReferenciaEmbedding = 'produto' | 'mensagem' | 'memoria' | 'cliente';

// ──────────────────────────────────────────────────────
// CLIENTE — schema inglês (migration 001, banco real)
// ──────────────────────────────────────────────────────
export interface Cliente {
  id: string;
  phone: string;
  name: string | null;
  preferred_name: string | null;
  opt_out: boolean;
  opt_out_at: Date | null;
  emotion_profile: Record<string, number>;
  purchase_count: number;
  last_contact_at: Date | null;
  tags: string[];
  notes: string | null;
  metadata: Record<string, unknown>;
  followup_paused: boolean;
  followup_paused_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// CONVERSA — schema inglês (migration 001, banco real)
// ──────────────────────────────────────────────────────
export interface Conversa {
  id: string;
  client_id: string;
  status: ConversationStatus;
  started_at: Date;
  last_message_at: Date;
  handoff_active: boolean;
  handoff_started_at: Date | null;
  handoff_by: string | null;
  handoff_keyword: string | null;
  reactivate_keyword: string | null;
  context_summary: string | null;
  message_count: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// MENSAGEM — schema inglês (migration 001, banco real)
// ──────────────────────────────────────────────────────
export interface Mensagem {
  id: string;
  conversation_id: string;
  client_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: 'text' | 'audio' | 'image' | 'document' | 'video' | 'sticker' | 'location';
  media_url: string | null;
  zapi_message_id: string | null;
  emotion_detected: EmotionType | null;
  tokens_used: number | null;
  processing_ms: number | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// MEMÓRIA VETORIAL — schema inglês (banco real)
// ──────────────────────────────────────────────────────
export interface MemoriaVetorial {
  id: string;
  client_id: string;
  content: string;
  embedding: number[];
  memory_type: 'preference' | 'purchase' | 'behavior' | 'objection' | 'style' | 'summary';
  source_message_id: string | null;
  created_at: Date;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  memory_type: string;
  similaridade: number;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// AI CONTEXT & RESPONSE
// ──────────────────────────────────────────────────────
export interface AIContext {
  clientName: string;
  shortTermMemory: Pick<Mensagem, 'role' | 'content'>[];
  relevantMemories: string[];
  detectedEmotion: EmotionType;
  conversationStatus: ConversationStatus;
  longTermSummary?: string;
  productContext?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  detectedEmotion: EmotionType;
  shouldTriggerHandoff: boolean;
  suggestedFollowup: boolean;
}

// Alias legado usado em alguns lugares
export type ProcessedMessage = AIResponse;

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
// OUTROS (mantidos para compatibilidade)
// ──────────────────────────────────────────────────────
export interface Produto {
  id: string;
  sku: string | null;
  nome: string;
  descricao_curta: string | null;
  descricao_imagem_detalhada: string | null;
  preco: number;
  preco_promocional: number | null;
  tamanhos: string[];
  cores_secundarias: string[];
  galeria_imagens: string[];
  tags: string[];
  estoque: number;
  ativo: boolean;
  url_imagem_principal: string | null;
  embedding: number[] | null;
  score_vendas: number;
  created_at: Date;
  updated_at: Date;
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

export interface ItemPedido {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  tamanho: string | null;
  cor: string | null;
}

export interface Handoff {
  id: string;
  client_id: string;
  conversation_id: string;
  reason: string | null;
  assumed_by: string | null;
  status: 'active' | 'resolved' | 'expired';
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Followup {
  id: string;
  client_id: string;
  conversation_id: string | null;
  attempt_number: number;
  scheduled_at: Date;
  sent_at: Date | null;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  message_content: string | null;
  cancelled_reason: string | null;
  created_at: Date;
  updated_at: Date;
}
