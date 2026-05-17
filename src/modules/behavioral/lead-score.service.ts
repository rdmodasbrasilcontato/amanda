import { query, queryOne } from '../../database/connection';
import { logger } from '../../utils/logger';
import { LeadTemperature } from '../../types';

// Points per event type
const SCORE_MAP: Record<string, number> = {
  price_inquiry:        15,
  size_inquiry:         20,
  photo_request:        25,
  availability_check:   15,
  link_clicked:         25,
  returned_next_day:    30,
  quick_reply:          15,
  audio_sent:           10,
  special_occasion:     20,
  purchase_intent:      30,
  browsed_categories:   15,
  long_session:         10,
  multiple_interactions: 20,
  image_sent:           15,
  urgency:              25,
  responded_to_followup: 35,
  first_contact:         5,
};

export async function recordScoreEvent(
  clientId: string,
  eventType: string,
  description?: string
): Promise<number> {
  const points = SCORE_MAP[eventType] ?? 5;

  await query(
    `INSERT INTO lead_score_events (client_id, event_type, points, description)
     VALUES ($1, $2, $3, $4)`,
    [clientId, eventType, points, description ?? null]
  );

  const result = await queryOne<{ lead_score: number; lead_temperature: string }>(
    `UPDATE clientes
     SET lead_score = LEAST(lead_score + $2, 200),
         lead_temperature = CASE
           WHEN lead_score + $2 >= 81  THEN 'very_hot'
           WHEN lead_score + $2 >= 51  THEN 'hot'
           WHEN lead_score + $2 >= 21  THEN 'warm'
           ELSE 'cold'
         END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING lead_score, lead_temperature`,
    [clientId, points]
  );

  logger.debug({ clientId, eventType, points, newScore: result?.lead_score }, 'Lead score atualizado');
  return result?.lead_score ?? 0;
}

export async function recordMultipleScoreEvents(
  clientId: string,
  events: string[]
): Promise<void> {
  for (const evt of events) {
    await recordScoreEvent(clientId, evt);
  }
}

export function scoreToTemperature(score: number): LeadTemperature {
  if (score >= 81) return 'very_hot';
  if (score >= 51) return 'hot';
  if (score >= 21) return 'warm';
  return 'cold';
}

export async function getLeadScore(clientId: string): Promise<{ score: number; temperature: LeadTemperature }> {
  const result = await queryOne<{ lead_score: number; lead_temperature: string }>(
    'SELECT lead_score, lead_temperature FROM clientes WHERE id = $1',
    [clientId]
  );
  return {
    score: result?.lead_score ?? 0,
    temperature: (result?.lead_temperature as LeadTemperature) ?? 'cold',
  };
}
