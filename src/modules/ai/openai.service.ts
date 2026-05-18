// ════════════════════════════════════════════════════════
// Amanda AI — OpenAI Service
// Embeddings, transcrição de áudio, análise de imagem
// (Amanda não gera respostas automáticas — apenas follow-ups)
// ════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { retryWithBackoff } from '../../utils/helpers';
import { Emocao, EmotionType } from '../../types';

const client = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: config.OPENAI_TIMEOUT_MS,
  maxRetries: 2,
});

// ── Embeddings ────────────────────────────────────────────
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0]?.embedding ?? [];
}

// ── Transcrição de áudio ──────────────────────────────────
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext  = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'mp3';
  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

  const response = await client.audio.transcriptions.create({
    file,
    model: config.OPENAI_WHISPER_MODEL,
    language: 'pt',
    response_format: 'text',
  });

  return typeof response === 'string' ? response : (response as { text: string }).text;
}

// ── Análise de imagem ─────────────────────────────────────
export async function analyzeImage(imageUrl: string, prompt?: string): Promise<string> {
  const defaultPrompt = 'Descreva esta peça de roupa detalhadamente: estilo, cor, tipo, ocasião adequada, tecido aparente.';

  const response = await client.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt ?? defaultPrompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content ?? '';
}

// ── Detecção de emoção rápida (legado — usado em fallbacks) ──
export async function detectEmotion(message: string): Promise<EmotionType> {
  try {
    const response = await client.chat.completions.create({
      model: config.OPENAI_FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Detecte a emoção principal. Responda APENAS com uma palavra: neutra, inseguranca, ansiedade, felicidade, irritacao, indecisao, empolgacao, curiosidade, urgencia, receio, frustracao, impulso_compra',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 15,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.trim().toLowerCase() ?? 'neutra';
    const validas: EmotionType[] = [
      'neutra', 'inseguranca', 'ansiedade', 'felicidade', 'irritacao',
      'indecisao', 'empolgacao', 'curiosidade', 'urgencia', 'receio',
      'frustracao', 'impulso_compra',
    ];
    return validas.includes(raw as EmotionType) ? (raw as EmotionType) : 'neutra';
  } catch {
    return 'neutra';
  }
}

// ── TTS (para possível uso futuro em follow-ups de áudio) ─
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

// ── Geração de texto genérica (para prompts customizados) ─
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 500,
  temperature = 0.7
): Promise<string> {
  try {
    const response = await retryWithBackoff(
      () => client.chat.completions.create({
        model: config.OPENAI_FALLBACK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      2,
      1000
    );
    return response.choices[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    logger.error({ err }, 'Erro ao gerar texto');
    return '';
  }
}

// Exportações de compatibilidade (prompts.loader ainda importa loadAllPrompts)
export { loadAllPrompts, invalidatePromptsCache } from './prompts.loader';
