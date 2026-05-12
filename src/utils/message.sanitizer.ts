import OpenAI from 'openai';
import { logger } from './logger';

type MessageParam = OpenAI.ChatCompletionMessageParam;
type ContentPart = OpenAI.ChatCompletionContentPart;

function sanitizeContentPart(part: unknown): ContentPart | null {
  if (part == null) return null;

  const p = part as ContentPart;

  if (p.type === 'text') {
    if (!p.text || p.text.trim() === '') return null;
    return p;
  }

  if (p.type === 'image_url') {
    if (!p.image_url?.url) return null;
    return p;
  }

  return p;
}

function sanitizeContent(
  content: MessageParam['content']
): MessageParam['content'] | null {
  if (content === null || content === undefined) return null;

  if (typeof content === 'string') {
    return content.trim().length > 0 ? content : null;
  }

  if (Array.isArray(content)) {
    const cleaned = content
      .map(sanitizeContentPart)
      .filter((p): p is ContentPart => p !== null);
    return cleaned.length > 0 ? cleaned : null;
  }

  return null;
}

/**
 * Remove mensagens inválidas (vazias, null, undefined, multimodal vazio)
 * antes de qualquer chamada à API OpenAI.
 */
export function sanitizeMessages(messages: MessageParam[]): MessageParam[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const result: MessageParam[] = [];

  for (const msg of messages) {
    if (msg == null) continue;

    const content = sanitizeContent(msg.content);
    if (content === null) continue;

    result.push({ ...msg, content } as MessageParam);
  }

  const dropped = messages.length - result.length;
  if (dropped > 0) {
    logger.warn({ dropped }, 'Sanitizer: mensagens inválidas removidas antes da API');
  }

  return result;
}

/**
 * Filtra memórias de curto prazo removendo entradas com conteúdo vazio/nulo.
 */
export function sanitizeShortTermHistory<T extends { role: string; content: string | null | undefined }>(
  messages: T[]
): Array<T & { content: string }> {
  if (!Array.isArray(messages)) return [];

  return messages.filter(
    (m): m is T & { content: string } =>
      m != null &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0
  );
}

/**
 * Filtra memórias relevantes removendo strings vazias/nulas.
 */
export function sanitizeMemories(memories: unknown[]): string[] {
  if (!Array.isArray(memories)) return [];

  return memories.filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0
  );
}
