/**
 * Webhook Repository
 * Database operations for Clerk webhook events
 */

import { query } from '../client';
import type { ClerkWebhookEvent, CreateClerkWebhookEvent } from '../types';

/**
 * Store a webhook event
 */
export async function storeWebhookEvent(eventData: CreateClerkWebhookEvent): Promise<ClerkWebhookEvent> {
  const result = await query<ClerkWebhookEvent>(
    `INSERT INTO clerk_webhook_events (
      event_id, event_type, object_type, object_id, payload, processed
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      eventData.event_id,
      eventData.event_type,
      eventData.object_type || null,
      eventData.object_id || null,
      JSON.stringify(eventData.payload),
      eventData.processed || false,
    ]
  );
  return result.rows[0];
}

/**
 * Mark webhook event as processed
 */
export async function markWebhookProcessed(
  eventId: string,
  errorMessage?: string
): Promise<boolean> {
  const result = await query(
    `UPDATE clerk_webhook_events
    SET processed = true, processed_at = CURRENT_TIMESTAMP, error_message = $2
    WHERE event_id = $1`,
    [eventId, errorMessage || null]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get unprocessed webhook events
 */
export async function getUnprocessedWebhooks(limit: number = 100): Promise<ClerkWebhookEvent[]> {
  const result = await query<ClerkWebhookEvent>(
    `SELECT * FROM clerk_webhook_events
    WHERE processed = false
    ORDER BY created_at ASC
    LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Get webhook event by ID
 */
export async function getWebhookById(eventId: string): Promise<ClerkWebhookEvent | null> {
  const result = await query<ClerkWebhookEvent>(
    'SELECT * FROM clerk_webhook_events WHERE event_id = $1',
    [eventId]
  );
  return result.rows[0] || null;
}

/**
 * Get webhook events by type
 */
export async function getWebhooksByType(
  eventType: string,
  limit: number = 50
): Promise<ClerkWebhookEvent[]> {
  const result = await query<ClerkWebhookEvent>(
    `SELECT * FROM clerk_webhook_events
    WHERE event_type = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [eventType, limit]
  );
  return result.rows;
}

/**
 * Check if webhook event already exists
 */
export async function webhookExists(eventId: string): Promise<boolean> {
  const result = await query(
    'SELECT EXISTS(SELECT 1 FROM clerk_webhook_events WHERE event_id = $1)',
    [eventId]
  );
  return result.rows[0].exists;
}
