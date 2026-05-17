// ─── Enums ────────────────────────────────────────────────────────────────────

export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'anxious'
  | 'irritated'
  | 'undecided'
  | 'excited'
  | 'curious'
  | 'urgent'
  | 'frustrated'
  | 'fearful'
  | 'impulsive'
  | 'sad';

export type IntentType =
  | 'price_inquiry'
  | 'size_inquiry'
  | 'photo_request'
  | 'availability_check'
  | 'general_interest'
  | 'purchase_intent'
  | 'objection'
  | 'returning_client'
  | 'complaint'
  | 'browsing'
  | 'special_occasion'
  | 'urgent_need'
  | 'unknown';

export type BehaviorType =
  | 'quick_responder'
  | 'slow_responder'
  | 'audio_sender'
  | 'image_sender'
  | 'price_focused'
  | 'quality_focused'
  | 'impulse_buyer'
  | 'researcher'
  | 'returning_visitor'
  | 'occasion_shopper';

export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'very_hot';

export type FollowupStatus = 'pending' | 'sent' | 'failed' | 'cancelled' | 'skipped';

export type ConversationStatus = 'active' | 'waiting_followup' | 'opted_out' | 'converted' | 'archived';

export type MessageRole = 'client' | 'amanda';

export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'url';

export type MemoryType = 'interaction' | 'preference' | 'objection' | 'purchase' | 'behavior';

// ─── Z-API Webhook Payload ─────────────────────────────────────────────────────

export interface ZApiWebhookPayload {
  phone: string;
  messageId: string;
  type: string;
  isGroupMsg?: boolean;
  fromMe?: boolean;
  senderName?: string;
  text?: { message: string };
  body?: string;
  message?: string;
  audio?: { audioUrl: string; mimeType?: string };
  image?: { imageUrl: string; caption?: string; mimeType?: string };
  document?: { documentUrl: string; fileName?: string; mimeType?: string };
  [key: string]: unknown;
}

// ─── Database Entities ─────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  phone: string;
  name: string | null;
  preferred_name: string | null;
  opt_out: boolean;
  opt_out_at: Date | null;
  followup_paused: boolean;
  followup_paused_at: Date | null;
  lead_score: number;
  lead_temperature: LeadTemperature;
  emotion_profile: EmotionType;
  dominant_intent: IntentType;
  behavior_tags: BehaviorType[];
  purchase_count: number;
  total_interactions: number;
  preferred_contact_hour: number | null;
  last_seen_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Conversa {
  id: string;
  client_id: string;
  status: ConversationStatus;
  last_message_at: Date | null;
  message_count: number;
  handoff_active: boolean;
  handoff_started_at: Date | null;
  context_summary: string | null;
  created_at: Date;
  updated_at: Date;
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
  intent_detected: IntentType | null;
  tokens_used: number | null;
  created_at: Date;
}

export interface Followup {
  id: string;
  client_id: string;
  conversation_id: string;
  attempt_number: number;
  scheduled_at: Date;
  sent_at: Date | null;
  status: FollowupStatus;
  message_content: string | null;
  cancelled_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LeadScoreEvent {
  id: string;
  client_id: string;
  event_type: string;
  points: number;
  description: string | null;
  created_at: Date;
}

export interface CustomerBehaviorProfile {
  id: string;
  client_id: string;
  emotions_history: EmotionType[];
  intents_history: IntentType[];
  categories_interest: string[];
  products_mentioned: string[];
  objections_raised: string[];
  price_range_interest: string | null;
  interaction_frequency: number;
  avg_response_time_minutes: number | null;
  session_count: number;
  last_analyzed_at: Date | null;
  psychological_profile: string | null;
  updated_at: Date;
}

export interface MemoriaVetorial {
  id: string;
  client_id: string;
  content: string;
  memory_type: MemoryType;
  embedding: number[] | null;
  relevance_score: number;
  created_at: Date;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  memory_type: MemoryType;
  similarity: number;
}

// ─── Behavioral Analysis ────────────────────────────────────────────────────────

export interface BehavioralAnalysis {
  emotion: EmotionType;
  intent: IntentType;
  behaviors: BehaviorType[];
  scoreEvents: string[];
  urgencyLevel: number;
  categories: string[];
  productsDetected: string[];
  objections: string[];
  summary: string;
}

// ─── AI Contexts ───────────────────────────────────────────────────────────────

export interface FollowupContext {
  client: Cliente;
  profile: CustomerBehaviorProfile | null;
  recentMessages: Mensagem[];
  relevantMemories: string[];
  attemptNumber: number;
  leadTemperature: LeadTemperature;
}

export interface FollowupGeneratorResult {
  message: string;
  tokensUsed: number;
}

// ─── Processed Message (internal pipeline) ────────────────────────────────────

export interface ProcessedMessage {
  phone: string;
  clientId: string;
  conversationId: string;
  content: string;
  messageType: MessageType;
  mediaUrl?: string;
  zapiMessageId: string;
  rawPayload: ZApiWebhookPayload;
}
