import { query, queryOne } from '../../database/connection';
import { Cliente } from '../../types';
import { generateEmbedding } from '../ai/openai.service';
import { logger } from '../../utils/logger';

export async function getOrCreateClient(phone: string, name?: string): Promise<Cliente> {
  const existing = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE phone = $1',
    [phone]
  );
  if (existing) {
    if (name && !existing.name) {
      await query('UPDATE clientes SET name = $2, updated_at = NOW() WHERE id = $1', [existing.id, name]);
      existing.name = name;
    }
    return existing;
  }

  const [created] = await query<Cliente>(
    `INSERT INTO clientes (phone, name, lead_score, lead_temperature, emotion_profile, dominant_intent, behavior_tags, total_interactions)
     VALUES ($1, $2, 0, 'cold', 'neutral', 'unknown', '{}', 0)
     RETURNING *`,
    [phone, name ?? null]
  );
  return created!;
}

export async function saveInteractionMemory(
  clientId: string,
  userMessage: string,
  summary: string
): Promise<void> {
  try {
    const content = `Cliente disse: "${userMessage.slice(0, 300)}". Resumo: ${summary}`;
    const embedding = await generateEmbedding(content);

    await query(
      `INSERT INTO memoria_vetorial (client_id, content, memory_type, embedding)
       VALUES ($1, $2, 'interaction', $3)`,
      [clientId, content, JSON.stringify(embedding)]
    );
  } catch (err) {
    logger.warn({ err }, 'Falha ao salvar memória de interação');
  }
}

export async function savePreferenceMemory(
  clientId: string,
  preference: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(preference);
    await query(
      `INSERT INTO memoria_vetorial (client_id, content, memory_type, embedding)
       VALUES ($1, $2, 'preference', $3)`,
      [clientId, preference, JSON.stringify(embedding)]
    );
  } catch (err) {
    logger.warn({ err }, 'Falha ao salvar preferência');
  }
}

export async function incrementInteractions(clientId: string): Promise<void> {
  await query(
    `UPDATE clientes
     SET total_interactions = total_interactions + 1,
         last_seen_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [clientId]
  );
}

export async function markClientOptOut(clientId: string): Promise<void> {
  await query(
    `UPDATE clientes
     SET opt_out = TRUE, opt_out_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [clientId]
  );
}

export async function pauseFollowupsForClient(clientId: string): Promise<void> {
  await query(
    `UPDATE clientes
     SET followup_paused = TRUE, followup_paused_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [clientId]
  );
}

export async function resumeFollowupsForClient(clientId: string): Promise<void> {
  await query(
    `UPDATE clientes
     SET followup_paused = FALSE, followup_paused_at = NULL, updated_at = NOW()
     WHERE id = $1 AND followup_paused = TRUE`,
    [clientId]
  );
}

export async function getOrCreateConversation(
  clientId: string
): Promise<{ id: string; status: string; handoff_active: boolean }> {
  const existing = await queryOne<{ id: string; status: string; handoff_active: boolean }>(
    `SELECT id, status, handoff_active FROM conversas
     WHERE client_id = $1 AND status = 'active'
     ORDER BY last_message_at DESC LIMIT 1`,
    [clientId]
  );
  if (existing) return existing;

  const [created] = await query<{ id: string; status: string; handoff_active: boolean }>(
    `INSERT INTO conversas (client_id, status) VALUES ($1, 'active')
     RETURNING id, status, handoff_active`,
    [clientId]
  );
  return created!;
}

export async function updateConversationLastMessage(conversationId: string): Promise<void> {
  await query(
    `UPDATE conversas
     SET last_message_at = NOW(), message_count = message_count + 1, updated_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );
}

export async function saveMessage(params: {
  conversationId: string;
  clientId: string;
  role: string;
  content: string;
  messageType: string;
  mediaUrl?: string;
  zapiMessageId?: string;
  emotionDetected?: string;
  intentDetected?: string;
}): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();
  await query(
    `INSERT INTO mensagens
       (id, conversation_id, client_id, role, content, message_type, media_url, zapi_message_id, emotion_detected, intent_detected)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      params.conversationId,
      params.clientId,
      params.role,
      params.content,
      params.messageType,
      params.mediaUrl ?? null,
      params.zapiMessageId ?? null,
      params.emotionDetected ?? null,
      params.intentDetected ?? null,
    ]
  );
  return id;
}

export async function getRecentMessages(
  conversationId: string,
  limit = 5
): Promise<Array<{ role: string; content: string }>> {
  return query(
    `SELECT role, content FROM mensagens
     WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [conversationId, limit]
  );
}
