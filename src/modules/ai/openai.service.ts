import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { FollowupContext, FollowupGeneratorResult } from '../../types';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
  maxRetries: 2,
});

// ─── Embedding ─────────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0]?.embedding ?? [];
}

// ─── Audio Transcription ───────────────────────────────────────────────────────

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'mp3';
  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });
  const response = await openai.audio.transcriptions.create({
    file,
    model: config.OPENAI_WHISPER_MODEL,
    language: 'pt',
    response_format: 'text',
  });
  return typeof response === 'string' ? response : (response as any).text;
}

// ─── Image Analysis ────────────────────────────────────────────────────────────

export async function analyzeClothingImage(imageUrl: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Descreva esta peça de roupa detalhadamente: tipo de peça, cor, estilo, tecido (se visível), ocasião ideal, público-alvo. Seja específica e objetiva.',
          },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 400,
  });
  return response.choices[0]?.message?.content ?? '';
}

// ─── Follow-up Generator ───────────────────────────────────────────────────────

const SYSTEM_PROMPT_FOLLOWUP = `Você é Amanda, consultora de moda da RD Modas Brasil. Você está enviando uma mensagem de acompanhamento para uma cliente que demonstrou interesse anteriormente.

REGRAS OBRIGATÓRIAS:
- Escreva como uma pessoa real, não como bot
- Seja calorosa, empática e natural
- Use o nome da cliente se souber
- Reference o interesse ou produto específico que ela demonstrou (se houver)
- Máximo 2-3 parágrafos curtos, separados por linha em branco
- Use no máximo 1 emoji por parágrafo
- Não mencione "follow-up", "automação", "sistema"
- Não seja genérica — personalize com base no contexto
- Use linguagem informal e brasileira (pode usar "linda", "amor", etc com moderação)
- Emojis permitidos: ❤️ 🥰 ✨ 💕 😍 💖 🌸 🤍 👗 🛍️
- A mensagem deve parecer que Amanda escreveu pessoalmente pensando nessa cliente

CONTEXTO DO LEAD:
- Lead frio (0-20): mensagem suave e curiosa
- Lead morno (21-50): mensagem com referência a interesse específico
- Lead quente (51-80): mensagem com senso leve de novidade/oportunidade
- Lead muito quente (81+): mensagem direta com produto/estilo que ela quer`;

export async function generateFollowupMessage(
  ctx: FollowupContext
): Promise<FollowupGeneratorResult> {
  const { client, profile, recentMessages, relevantMemories, attemptNumber, leadTemperature } = ctx;

  const firstName = (client.preferred_name || client.name || '').split(' ')[0] || '';
  const categories = profile?.categories_interest?.join(', ') || '';
  const products = profile?.products_mentioned?.join(', ') || '';
  const emotion = client.emotion_profile;
  const intent = client.dominant_intent;

  const contextParts = [
    firstName ? `Nome: ${firstName}` : '',
    `Temperatura do lead: ${leadTemperature}`,
    `Emoção detectada: ${emotion}`,
    `Intenção principal: ${intent}`,
    categories ? `Categorias de interesse: ${categories}` : '',
    products ? `Produtos mencionados: ${products}` : '',
    recentMessages.length > 0
      ? `Últimas mensagens:\n${recentMessages
          .slice(-3)
          .map(m => `${m.role === 'client' ? 'Cliente' : 'Amanda'}: ${m.content.slice(0, 100)}`)
          .join('\n')}`
      : '',
    relevantMemories.length > 0
      ? `Memórias relevantes:\n${relevantMemories.slice(0, 3).join('\n')}`
      : '',
    `Tentativa de follow-up: ${attemptNumber} de 8`,
  ].filter(Boolean).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_FOLLOWUP },
        { role: 'user', content: `CONTEXTO DA CLIENTE:\n${contextParts}\n\nEscreva a mensagem de follow-up:` },
      ],
      max_tokens: config.OPENAI_MAX_TOKENS,
      temperature: config.OPENAI_TEMPERATURE,
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
    });

    const content = response.choices[0]?.message?.content ?? '';
    return { message: content, tokensUsed: response.usage?.total_tokens ?? 0 };
  } catch (err) {
    logger.warn({ err }, 'Modelo principal falhou — usando fallback');
    return generateFallbackFollowup(firstName, leadTemperature, categories);
  }
}

async function generateFallbackFollowup(
  firstName: string,
  temperature: string,
  categories: string
): Promise<FollowupGeneratorResult> {
  const greeting = firstName ? `Oi ${firstName}!` : 'Oi!';
  const catText = categories ? ` vi que você se interessou por ${categories}` : '';
  const response = await openai.chat.completions.create({
    model: config.OPENAI_FALLBACK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_FOLLOWUP },
      {
        role: 'user',
        content: `${greeting} Escreva uma mensagem de follow-up${catText} para lead ${temperature}. Seja natural.`,
      },
    ],
    max_tokens: 300,
    temperature: 0.8,
  });
  return {
    message: response.choices[0]?.message?.content ?? `${greeting} Passando pra ver se posso te ajudar com alguma coisa! 💕`,
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}
