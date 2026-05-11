export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'video' | 'sticker' | 'location';
export type ConversationStatus = 'active' | 'handoff' | 'closed' | 'opted_out';
export type FollowupStatus = 'pending' | 'sent' | 'cancelled' | 'failed';
export type HandoffStatus = 'active' | 'resolved';
export type EmotionType = 'neutral' | 'happy' | 'anxious' | 'irritated' | 'undecided' | 'excited' | 'sad';

export interface Cliente {
  id: string;
  phone: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
  opt_out: boolean;
  opt_out_at: Date | null;
  preferred_name: string | null;
  emotion_profile: Record<string, number>;
  purchase_count: number;
  last_contact_at: Date | null;
  tags: string[];
  notes: string | null;
}

export interface Conversa {
  id: string;
  client_id: string;
  status: ConversationStatus;
  started_at: Date;
  last_message_at: Date;
  handoff_active: boolean;
  handoff_started_at: Date | null;
  handoff_by: string | null;
  reactivate_keyword: string | null;
  context_summary: string | null;
  message_count: number;
}

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
  created_at: Date;
  tokens_used: number | null;
}

export interface Produto {
  id: string;
  name: string;
  description: string;
  price: number;
  price_promotional: number | null;
  category: string;
  subcategory: string | null;
  sizes: string[];
  colors: string[];
  images: string[];
  stock_quantity: number;
  sku: string | null;
  active: boolean;
  embedding: number[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface Followup {
  id: string;
  client_id: string;
  conversation_id: string;
  scheduled_at: Date;
  sent_at: Date | null;
  status: FollowupStatus;
  attempt_number: number;
  message_content: string | null;
  cancelled_reason: string | null;
  created_at: Date;
}

export interface Handoff {
  id: string;
  conversation_id: string;
  client_id: string;
  status: HandoffStatus;
  started_at: Date;
  resolved_at: Date | null;
  started_by: string | null;
  resolved_by: string | null;
  context_at_handoff: string | null;
}

export interface MemoriaVetorial {
  id: string;
  client_id: string;
  content: string;
  embedding: number[];
  memory_type: 'preference' | 'purchase' | 'emotion' | 'interaction' | 'product_interest';
  relevance_score: number;
  created_at: Date;
}

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
  audio?: { audioUrl: string; mimeType: string };
  document?: { documentUrl: string; mimeType: string; fileName: string };
  isGroupMsg: boolean;
  waitingMessage: boolean;
}

export interface ProcessedMessage {
  clientPhone: string;
  clientName: string;
  messageId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  timestamp: Date;
}

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

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  memory_type: string;
}
