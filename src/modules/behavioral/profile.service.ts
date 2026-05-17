import { query, queryOne } from '../../database/connection';
import { BehavioralAnalysis, CustomerBehaviorProfile } from '../../types';
import { logger } from '../../utils/logger';

export async function upsertBehaviorProfile(
  clientId: string,
  analysis: BehavioralAnalysis
): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM customer_behavior_profile WHERE client_id = $1',
    [clientId]
  );

  if (!existing) {
    await query(
      `INSERT INTO customer_behavior_profile
         (client_id, emotions_history, intents_history, categories_interest,
          products_mentioned, objections_raised, interaction_frequency, session_count, last_analyzed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 1, NOW())`,
      [
        clientId,
        [analysis.emotion],
        [analysis.intent],
        analysis.categories,
        analysis.productsDetected,
        analysis.objections,
      ]
    );
  } else {
    await query(
      `UPDATE customer_behavior_profile
       SET emotions_history     = (SELECT array_agg(DISTINCT e) FROM unnest(emotions_history || $2::text[]) AS e),
           intents_history      = (SELECT array_agg(DISTINCT i) FROM unnest(intents_history || $3::text[]) AS i),
           categories_interest  = (SELECT array_agg(DISTINCT c) FROM unnest(categories_interest || $4::text[]) AS c),
           products_mentioned   = (SELECT array_agg(DISTINCT p) FROM unnest(products_mentioned || $5::text[]) AS p),
           objections_raised    = (SELECT array_agg(DISTINCT o) FROM unnest(objections_raised || $6::text[]) AS o),
           interaction_frequency = interaction_frequency + 1,
           last_analyzed_at     = NOW(),
           updated_at           = NOW()
       WHERE client_id = $1`,
      [
        clientId,
        [analysis.emotion],
        [analysis.intent],
        analysis.categories,
        analysis.productsDetected,
        analysis.objections,
      ]
    );
  }
}

export async function updateClientBehaviorTags(
  clientId: string,
  newTags: string[]
): Promise<void> {
  if (newTags.length === 0) return;
  await query(
    `UPDATE clientes
     SET behavior_tags = (SELECT array_agg(DISTINCT t) FROM unnest(behavior_tags || $2::text[]) AS t),
         emotion_profile = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [clientId, newTags, newTags[0] ?? 'neutral']
  );
}

export async function updateClientEmotion(clientId: string, emotion: string): Promise<void> {
  await query(
    `UPDATE clientes SET emotion_profile = $2, updated_at = NOW() WHERE id = $1`,
    [clientId, emotion]
  );
}

export async function updateClientIntent(clientId: string, intent: string): Promise<void> {
  await query(
    `UPDATE clientes SET dominant_intent = $2, updated_at = NOW() WHERE id = $1`,
    [clientId, intent]
  );
}

export async function updatePreferredContactHour(clientId: string): Promise<void> {
  const hour = new Date().getHours();
  await query(
    `UPDATE clientes SET preferred_contact_hour = $2, updated_at = NOW() WHERE id = $1`,
    [clientId, hour]
  );
}

export async function getBehaviorProfile(clientId: string): Promise<CustomerBehaviorProfile | null> {
  return queryOne<CustomerBehaviorProfile>(
    'SELECT * FROM customer_behavior_profile WHERE client_id = $1',
    [clientId]
  );
}
