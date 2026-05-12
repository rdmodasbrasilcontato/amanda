// ════════════════════════════════════════════════════════
// Amanda AI — Types (aligned with English schema)
// ════════════════════════════════════════════════════════

export type EngagementLevel    = 'cold' | 'warm' | 'hot' | 'vip';
export type ClientStatus       = 'active' | 'inactive' | 'blocked' | 'vip';
export type EmotionType        = 'neutral' | 'happy' | 'anxious' | 'irritated' | 'undecided' | 'excited' | 'sad';
export type MessageRole        = 'user' | 'assistant' | 'system' | 'human';
export type MessageType        = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location';
export type ConversationStatus = 'active' | 'closed' | 'handoff' | 'opt_out' | 'blocked';
export type FunnelStage        = 'top' | 'middle' | 'bottom' | 'client' | 'repurchase';
export type FollowupStatus     = 'pending' | 'sent' | 'cancelled' | 'failed';
export type HandoffStatus      = 'active' | 'resolved' | 'expired';
export type OrderStatus        = 'pending' | 'paid' | 'cancelled' | 'shipped' | 'delivered';
export type MemoryType         = 'interaction' | 'preference' | 'emotion' | 'purchase' | 'behavior' | 'objection' | 'style' | 'size' | 'history';

// ──────────────────────────────────────────────────────
// CLIENTE
// ──────────────────────────────────────────────────────
export interface Cliente {
  id: string;
  phone: string;
  name: string | null;
  preferred_name: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  country: string;
  birth_date: Date | null;
  gender: string | null;
  purchase_count: number;
  total_spent: number;
  avg_ticket: number;
  favorite_category: string | null;
  preferences: Record<string, unknown>;
  notes: string | null;
  emotion_profile: Record<string, number>;
  recurring_emotion: string | null;
  engagement_level: EngagementLevel;
  lead_temperature: number;
  client_status: ClientStatus;
  tags: string[];
  opt_out: boolean;
  opt_out_at: Date | null;
  blocked: boolean;
  human_took_over: boolean;
  ai_active: boolean;
  last_contact_at: Date | null;
  last_purchase_at: Date | null;
  client_since: Date;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// CONVERSA
// ──────────────────────────────────────────────────────
export interface Conversa {
  id: string;
  client_id: string;
  channel: string;
  status: ConversationStatus;
  context_summary: string | null;
  last_message: string | null;
  last_message_at: Date;
  last_ai_reply_at: Date | null;
  last_human_reply_at: Date | null;
  message_count: number;
  detected_emotion: string | null;
  lead_score: number;
  funnel_stage: FunnelStage;
  handoff_active: boolean;
  handoff_started_at: Date | null;
  handoff_by: string | null;
  followup_active: boolean;
  origin: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// MENSAGEM
// ──────────────────────────────────────────────────────
export interface Mensagem {
  id: string;
  conversation_id: string;
  client_id: string;
  role: MessageRole;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  zapi_message_id: string | null;
  emotion_detected: EmotionType | null;
  intent_detected: string | null;
  sentiment_score: number | null;
  spam_score: number;
  tokens_used: number | null;
  model_used: string | null;
  response_time_ms: number | null;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// HANDOFF / FOLLOWUP
// ──────────────────────────────────────────────────────
export interface Handoff {
  id: string;
  conversation_id: string;
  client_id: string;
  status: HandoffStatus;
  started_by: string | null;
  started_at: Date;
  context_at_handoff: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
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
  status: FollowupStatus;
  message_content: string | null;
  cancelled_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// MEMÓRIA VETORIAL
// ──────────────────────────────────────────────────────
export interface MemoriaVetorial {
  id: string;
  client_id: string;
  content: string;
  embedding: number[] | null;
  memory_type: MemoryType;
  importance: number;
  source_message_id: string | null;
  last_used_at: Date | null;
  use_count: number;
  created_at: Date;
}

// ──────────────────────────────────────────────────────
// PRODUTO / PEDIDO
// ──────────────────────────────────────────────────────
export interface Produto {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  promo_price: number | null;
  stock_quantity: number;
  sizes: string[];
  colors: string[];
  images: string[];
  main_image_url: string | null;
  active: boolean;
  featured: boolean;
  embedding: number[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface ItemPedido {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

export interface Pedido {
  id: string;
  client_id: string;
  conversation_id: string | null;
  order_number: string;
  status: OrderStatus;
  items: ItemPedido[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  payment_method: string | null;
  tracking_code: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ──────────────────────────────────────────────────────
// WEBHOOK Z-API
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

export interface ProcessedMessage {
  clientId: string;
  conversationId: string;
  content: string;
  messageType: MessageType;
  mediaUrl?: string;
  zapiMessageId: string;
  emotion: EmotionType;
}

// ──────────────────────────────────────────────────────
// CONTEXTO DA IA
// ──────────────────────────────────────────────────────
export interface AIContext {
  clientName: string;
  shortTermMemory: Mensagem[];
  longTermSummary: string;
  relevantMemories: string[];
  detectedEmotion: EmotionType;
  conversationStatus: ConversationStatus;
  productContext?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  detectedEmotion: EmotionType;
  shouldTriggerHandoff: boolean;
  suggestedFollowup: boolean;
}

// ──────────────────────────────────────────────────────
// BUSCA SEMÂNTICA
// ──────────────────────────────────────────────────────
export interface VectorSearchResult {
  id: string;
  content: string;
  memory_type: MemoryType;
  similarity: number;
  created_at: Date;
}

export interface ProdutoSearchResult {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sizes: string[];
  main_image_url: string | null;
  similarity: number;
}
