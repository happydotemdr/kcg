/**
 * Contact Verification Queue Repository
 * Database operations for contact_verification_queue table
 */

import { query } from '../client';
import type { VerificationQueueItem, CreateVerificationQueueItem } from '../types';

/**
 * Create verification queue entry with AI suggestion
 */
export async function createVerificationQueueItem(
  data: CreateVerificationQueueItem
): Promise<VerificationQueueItem> {
  const result = await query<VerificationQueueItem>(
    `INSERT INTO contact_verification_queue (
      user_id, contact_id, suggested_type, suggested_tags,
      reasoning, confidence, sample_email_ids
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      data.user_id,
      data.contact_id,
      data.suggested_type || null,
      data.suggested_tags || null,
      data.reasoning || null,
      data.confidence || null,
      data.sample_email_ids || null,
    ]
  );
  return result.rows[0];
}

/**
 * Find verification queue items by user ID, optionally filtered by status
 */
export async function findByUserId(
  userId: string,
  status?: 'pending' | 'approved' | 'rejected' | 'modified'
): Promise<VerificationQueueItem[]> {
  let sql = 'SELECT * FROM contact_verification_queue WHERE user_id = $1';
  const params: any[] = [userId];

  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query<VerificationQueueItem>(sql, params);
  return result.rows;
}

/**
 * Approve verification: update queue status and mark contact as verified
 */
export async function approve(queueId: string, contactId: string): Promise<VerificationQueueItem> {
  const result = await query<VerificationQueueItem>(
    `UPDATE contact_verification_queue
    SET status = 'approved', user_action_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND contact_id = $2
    RETURNING *`,
    [queueId, contactId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Queue item not found: ${queueId}`);
  }

  // Update contact verification status
  await query(
    `UPDATE email_contacts
    SET verification_status = 'verified', verified_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [contactId]
  );

  return result.rows[0];
}

/**
 * Reject verification: update queue status to rejected
 */
export async function reject(queueId: string): Promise<VerificationQueueItem> {
  const result = await query<VerificationQueueItem>(
    `UPDATE contact_verification_queue
    SET status = 'rejected', user_action_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *`,
    [queueId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Queue item not found: ${queueId}`);
  }

  return result.rows[0];
}

/**
 * Modify contact details: update queue status to 'modified'
 */
export async function modify(
  queueId: string,
  contactId: string,
  updates: {
    suggested_type?: string;
    suggested_tags?: string[];
    reasoning?: string;
    confidence?: number;
  }
): Promise<VerificationQueueItem> {
  const result = await query<VerificationQueueItem>(
    `UPDATE contact_verification_queue
    SET status = 'modified',
        suggested_type = COALESCE($3, suggested_type),
        suggested_tags = COALESCE($4, suggested_tags),
        reasoning = COALESCE($5, reasoning),
        confidence = COALESCE($6, confidence),
        user_action_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND contact_id = $2
    RETURNING *`,
    [
      queueId,
      contactId,
      updates.suggested_type || null,
      updates.suggested_tags || null,
      updates.reasoning || null,
      updates.confidence || null,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error(`Queue item not found: ${queueId}`);
  }

  return result.rows[0];
}

/**
 * Delete queue entry by contact ID
 */
export async function deleteByContactId(contactId: string): Promise<number> {
  const result = await query(
    'DELETE FROM contact_verification_queue WHERE contact_id = $1',
    [contactId]
  );
  return result.rowCount || 0;
}

/**
 * Get queue item by ID
 */
export async function getById(queueId: string): Promise<VerificationQueueItem | null> {
  const result = await query<VerificationQueueItem>(
    'SELECT * FROM contact_verification_queue WHERE id = $1',
    [queueId]
  );
  return result.rows[0] || null;
}

/**
 * Find queue item by contact ID
 */
export async function findByContactId(contactId: string): Promise<VerificationQueueItem | null> {
  const result = await query<VerificationQueueItem>(
    'SELECT * FROM contact_verification_queue WHERE contact_id = $1',
    [contactId]
  );
  return result.rows[0] || null;
}

/**
 * Get pending count for user
 */
export async function getPendingCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM contact_verification_queue WHERE user_id = $1 AND status = $2',
    [userId, 'pending']
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}
