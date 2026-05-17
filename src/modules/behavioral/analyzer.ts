import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  BehavioralAnalysis,
  EmotionType,
  IntentType,
  BehaviorType,
} from '../../types';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
});

const ANALYSIS_PROMPT = `Você é um sistema de análise comportamental para uma loja de roupas femininas (RD Modas Brasil).

Analise a mensagem do cliente e retorne um JSON com:
{
  "emotion": "neutral|happy|anxious|irritated|undecided|excited|curious|urgent|frustrated|fearful|impulsive|sad",
  "intent": "price_inquiry|size_inquiry|photo_request|availability_check|general_interest|purchase_intent|objection|returning_client|complaint|browsing|special_occasion|urgent_need|unknown",
  "behaviors": ["quick_responder"|"audio_sender"|"image_sender"|"price_focused"|"quality_focused"|"impulse_buyer"|"researcher"|"occasion_shopper"],
  "scoreEvents": ["price_inquiry"|"size_inquiry"|"photo_request"|"availability_check"|"special_occasion"|"purchase_intent"|"urgency"|"audio_sent"|"image_sent"],
  "urgencyLevel": 0-10,
  "categories": ["vestido","calça","blusa","saia","conjunto","moda_praia","festa","casual","etc"],
  "productsDetected": ["nomes de produtos mencionados"],
  "objections": ["caro","tamanho","entrega","qualidade","etc"],
  "summary": "resumo em 1 frase do interesse do cliente"
}

Responda APENAS com JSON válido, sem markdown.`;

export async function analyzeBehavior(
  messageContent: string,
  messageType: string,
  clientHistory?: string
): Promise<BehavioralAnalysis> {
  try {
    const userMessage = clientHistory
      ? `Histórico recente: ${clientHistory}\n\nMensagem atual: ${messageContent}`
      : messageContent;

    const response = await openai.chat.completions.create({
      model: config.OPENAI_FALLBACK_MODEL,
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    const behaviors: BehaviorType[] = Array.isArray(parsed.behaviors) ? parsed.behaviors : [];
    if (messageType === 'audio') behaviors.push('audio_sender');
    if (messageType === 'image') behaviors.push('image_sender');

    return {
      emotion: (parsed.emotion as EmotionType) ?? 'neutral',
      intent: (parsed.intent as IntentType) ?? 'unknown',
      behaviors: [...new Set(behaviors)],
      scoreEvents: Array.isArray(parsed.scoreEvents) ? parsed.scoreEvents : [],
      urgencyLevel: Number(parsed.urgencyLevel) || 0,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      productsDetected: Array.isArray(parsed.productsDetected) ? parsed.productsDetected : [],
      objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      summary: parsed.summary ?? '',
    };
  } catch (err) {
    logger.warn({ err }, 'Falha na análise comportamental — usando defaults');
    return buildDefaultAnalysis(messageType);
  }
}

function buildDefaultAnalysis(messageType: string): BehavioralAnalysis {
  const behaviors: BehaviorType[] = [];
  if (messageType === 'audio') behaviors.push('audio_sender');
  if (messageType === 'image') behaviors.push('image_sender');
  return {
    emotion: 'neutral',
    intent: 'unknown',
    behaviors,
    scoreEvents: messageType === 'audio' ? ['audio_sent'] : messageType === 'image' ? ['image_sent'] : [],
    urgencyLevel: 0,
    categories: [],
    productsDetected: [],
    objections: [],
    summary: '',
  };
}
