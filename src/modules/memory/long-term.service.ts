import { query, queryOne } from '../../database/connection';
import { Cliente } from '../../types';
import { generateEmbedding } from '../ai/openai.service';
import { saveMemory } from './vector.service';
import { logger } from '../../utils/logger';

export async function getOrCreateClient(phone: string, name?: string): Promise<Cliente> {
  const existing = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE phone = $1',
    [phone]
  );

  if (existing) {
    if (name && name !== existing.name) {
      await query(
        'UPDATE clientes SET name = $1, updated_at = NOW() WHERE id = $2',
        [name, existing.id]
      );
      existing.name = name;
    }
    return existing;
  }

  const [created] = await query<Cliente>(
    `INSERT INTO clientes (phone, name, preferred_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [phone, name ?? null, name ? name.split(' ')[0] : null]
  );

  logger.info({ phone, name }, 'Novo cliente criado');
  return created!;
}

export async function updateClientLastContact(clientId: string): Promise<void> {
  await query(
    'UPDATE clientes SET last_contact_at = NOW(), updated_at = NOW() WHERE id = $1',
    [clientId]
  );
}

export async function updateClientEmotion(
  clientId: string,
  emotion: string
): Promise<void> {
  await query(
    `UPDATE clientes
     SET emotion_profile = emotion_profile || jsonb_build_object($2::text, COALESCE((emotion_profile->$2)::int, 0) + 1),
         updated_at = NOW()
     WHERE id = $1`,
    [clientId, emotion]
  );
}

export async function getClientSummary(clientId: string): Promise<string> {
  const client = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE id = $1',
    [clientId]
  );
  if (!client) return '';

  const recentPurchases = await query<{ name: string; created_at: Date }>(
    `SELECT p.name, pe.created_at
     FROM pedidos pe
     JOIN jsonb_array_elements(pe.items) item ON TRUE
     JOIN produtos p ON p.id = (item->>'product_id')::uuid
     WHERE pe.client_id = $1 AND pe.status = 'paid'
     ORDER BY pe.created_at DESC
     LIMIT 3`,
    [clientId]
  );

  const parts: string[] = [];

  if (client.purchase_count > 0) {
    parts.push(`Cliente já comprou ${client.purchase_count} vez(es).`);
  }

  if (recentPurchases.length > 0) {
    const items = recentPurchases.map(p => p.name).join(', ');
    parts.push(`Últimas compras: ${items}.`);
  }

  const dominantEmotion = getDominantEmotion(client.emotion_profile);
  if (dominantEmotion) {
    parts.push(`Perfil emocional predominante: ${dominantEmotion}.`);
  }

  if (client.tags?.length) {
    parts.push(`Tags: ${client.tags.join(', ')}.`);
  }

  return parts.join(' ');
}

function getDominantEmotion(profile: Record<string, number>): string | null {
  if (!profile || Object.keys(profile).length === 0) return null;
  return Object.entries(profile).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function saveInteractionAsMemory(
  clientId: string,
  userMessage: string,
  amandaResponse: string
): Promise<void> {
  const text = `Cliente: "${userMessage}" | Amanda: "${amandaResponse}"`;
  await saveMemory(clientId, text, 'interaction');
}

export async function markClientOptOut(clientId: string): Promise<void> {
  await query(
    'UPDATE clientes SET opt_out = TRUE, opt_out_at = NOW(), updated_at = NOW() WHERE id = $1',
    [clientId]
  );
  logger.info({ clientId }, 'Cliente marcado como opt-out');
}
