import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AIContext, AIResponse, EmotionType } from '../../types';
import { loadAllPrompts } from './prompts.loader';
import { retryWithBackoff } from '../../utils/helpers';

const client = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
  maxRetries: 2,
});

export async function generateAmandaResponse(context: AIContext): Promise<AIResponse> {
  const prompts = await loadAllPrompts();
  const systemPrompt = buildSystemPrompt(prompts as unknown as Record<string, unknown>, context);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Adicionar memórias relevantes como contexto
  if (context.relevantMemories.length > 0) {
    const memorySummary = context.relevantMemories
      .map((m, i) => `[Memória ${i + 1}]: ${m}`)
      .join('\n');
    messages.push({
      role: 'system',
      content: `MEMÓRIAS RELEVANTES DESTA CLIENTE:\n${memorySummary}`,
    });
  }

  // Histórico de mensagens recentes (short-term memory)
  for (const msg of context.shortTermMemory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  try {
    const response = await retryWithBackoff(
      () =>
        client.chat.completions.create({
          model: config.OPENAI_MODEL,
          messages,
          max_tokens: config.OPENAI_MAX_TOKENS,
          temperature: config.OPENAI_TEMPERATURE,
          presence_penalty: 0.6,
          frequency_penalty: 0.4,
        }),
      2,
      1000
    );

    const content = response.choices[0]?.message?.content ?? '';
    const tokensUsed = response.usage?.total_tokens ?? 0;

    const detectedEmotion = detectEmotionFromContext(context);
    const shouldTriggerHandoff = checkHandoffTrigger(content, context);
    const suggestedFollowup = checkFollowupSuggestion(context);

    logger.info({ tokensUsed, model: config.OPENAI_MODEL }, 'Amanda response gerada');

    return { content, tokensUsed, detectedEmotion, shouldTriggerHandoff, suggestedFollowup };
  } catch (err) {
    logger.warn({ err }, 'Falha no modelo principal, tentando fallback');
    return generateFallbackResponse(messages, context);
  }
}

async function generateFallbackResponse(
  messages: OpenAI.ChatCompletionMessageParam[],
  context: AIContext
): Promise<AIResponse> {
  const response = await client.chat.completions.create({
    model: config.OPENAI_FALLBACK_MODEL,
    messages,
    max_tokens: config.OPENAI_MAX_TOKENS,
    temperature: config.OPENAI_TEMPERATURE,
  });

  return {
    content: response.choices[0]?.message?.content ?? 'Oi! Pode repetir?',
    tokensUsed: response.usage?.total_tokens ?? 0,
    detectedEmotion: 'neutral',
    shouldTriggerHandoff: false,
    suggestedFollowup: false,
  };
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0]?.embedding ?? [];
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'mp3';
  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

  const response = await client.audio.transcriptions.create({
    file,
    model: config.OPENAI_WHISPER_MODEL,
    language: 'pt',
    response_format: 'text',
  });

  return typeof response === 'string' ? response : (response as { text: string }).text;
}

export async function analyzeImage(
  imageUrl: string,
  prompt: string = 'Descreva esta peça de roupa detalhadamente: estilo, cor, tipo de peça, ocasião adequada.'
): Promise<string> {
  const response = await client.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content ?? '';
}

export async function generateAudioResponse(text: string): Promise<Buffer> {
  const response = await client.audio.speech.create({
    model: config.OPENAI_TTS_MODEL,
    voice: config.OPENAI_TTS_VOICE as 'nova',
    input: text,
    response_format: 'mp3',
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function detectEmotion(message: string): Promise<EmotionType> {
  const response = await client.chat.completions.create({
    model: config.OPENAI_FALLBACK_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Analise a emoção principal desta mensagem. Responda APENAS com uma palavra: neutral, happy, anxious, irritated, undecided, excited, sad',
      },
      { role: 'user', content: message },
    ],
    max_tokens: 10,
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content?.trim().toLowerCase() ?? 'neutral';
  const valid: EmotionType[] = ['neutral', 'happy', 'anxious', 'irritated', 'undecided', 'excited', 'sad'];
  return valid.includes(raw as EmotionType) ? (raw as EmotionType) : 'neutral';
}

function buildSystemPrompt(
  prompts: Record<string, unknown>,
  context: AIContext
): string {
  const parts = [
    prompts.identity,
    prompts.personality,
    prompts.emotional,
    prompts.humanization,
    prompts.restrictions,
    prompts.storeInfo,
    prompts.memory,
    prompts.sales,
    prompts.antiSpam,
  ];

  const clientSection = `
CONTEXTO DA CLIENTE:
- Nome: ${context.clientName || 'não identificada'}
- Emoção detectada: ${context.detectedEmotion}
- Status da conversa: ${context.conversationStatus}
${context.longTermSummary ? `- Resumo do histórico: ${context.longTermSummary}` : ''}
${context.productContext ? `- Produtos consultados: ${context.productContext}` : ''}

FORMATO DE SAÍDA — OBRIGATÓRIO:
Responda APENAS com a próxima mensagem da Amanda, picotada em 2 ou 3 balões.
Separe cada balão por UMA LINHA EM BRANCO (\\n\\n). Sem rótulos, sem numeração, sem "Balão 1:".
Cada balão: no máximo 2 frases curtas. No máximo 1 emoji por balão.
Use apenas estes emojis: ❤️ 🥰 ✨ 💕 😍 💖 🌸 🤍 👗 🛍️.
Nunca responda em um único parágrafo longo.
`;

  return [...parts, clientSection].join('\n\n---\n\n');
}

function detectEmotionFromContext(context: AIContext): EmotionType {
  return context.detectedEmotion;
}

function checkHandoffTrigger(content: string, context: AIContext): boolean {
  const handoffPhrases = ['transferir', 'humano', 'atendente', 'não consigo ajudar', 'fora do meu conhecimento'];
  return handoffPhrases.some(phrase => content.toLowerCase().includes(phrase));
}

function checkFollowupSuggestion(context: AIContext): boolean {
  return context.conversationStatus === 'active';
}
