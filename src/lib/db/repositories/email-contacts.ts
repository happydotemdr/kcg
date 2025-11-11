/**
 * Email Contacts Repository
 * Database operations for email_contacts table
 */

import { query, transaction } from '../client';
import type {
  EmailContact,
  CreateEmailContact,
  ContactFilters,
  ContactSourceType,
  ContactVerificationStatus,
} from '../types';
import type { PoolClient } from 'pg';

/**
 * Create new email contact
 */
export async function createContact(data: CreateEmailContact): Promise<EmailContact> {
  const result = await query<EmailContact>(
    `INSERT INTO email_contacts (
      user_id, email, display_name, organization, domain,
      phone_numbers, addresses, source_type, tags,
      verification_status, verification_method, verified_at, verified_by,
      confidence_score, email_count, first_seen, last_seen,
      linked_calendar_events, linked_family_members,
      extraction_metadata, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *`,
    [
      data.user_id,
      data.email,
      data.display_name || null,
      data.organization || null,
      data.domain || null,
      data.phone_numbers,
      data.addresses,
      data.source_type || null,
      data.tags,
      data.verification_status || 'unverified',
      data.verification_method || null,
      data.verified_at || null,
      data.verified_by || null,
      data.confidence_score || 0.5,
      data.email_count || 0,
      data.first_seen,
      data.last_seen,
      data.linked_calendar_events,
      data.linked_family_members,
      data.extraction_metadata ? JSON.stringify(data.extraction_metadata) : null,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

/**
 * Upsert contact (update if exists, insert if not)
 * Increments email_count and updates last_seen if contact exists
 */
export async function upsertContact(
  userId: string,
  email: string,
  updates: Partial<CreateEmailContact>
): Promise<EmailContact> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findByEmail(userId, email);

    if (existing) {
      // Update existing contact - increment email_count and update last_seen
      const result = await client.query<EmailContact>(
        `UPDATE email_contacts SET
          display_name = COALESCE($1, display_name),
          organization = COALESCE($2, organization),
          domain = COALESCE($3, domain),
          phone_numbers = COALESCE($4, phone_numbers),
          addresses = COALESCE($5, addresses),
          source_type = COALESCE($6, source_type),
          tags = COALESCE($7, tags),
          confidence_score = COALESCE($8, confidence_score),
          email_count = email_count + 1,
          last_seen = CURRENT_TIMESTAMP,
          linked_calendar_events = COALESCE($9, linked_calendar_events),
          linked_family_members = COALESCE($10, linked_family_members),
          extraction_metadata = COALESCE($11, extraction_metadata),
          notes = COALESCE($12, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $13 AND email = $14
        RETURNING *`,
        [
          updates.display_name || null,
          updates.organization || null,
          updates.domain || null,
          updates.phone_numbers || null,
          updates.addresses || null,
          updates.source_type || null,
          updates.tags || null,
          updates.confidence_score || null,
          updates.linked_calendar_events || null,
          updates.linked_family_members || null,
          updates.extraction_metadata ? JSON.stringify(updates.extraction_metadata) : null,
          updates.notes || null,
          userId,
          email,
        ]
      );
      return result.rows[0];
    } else {
      // Create new contact
      return await createContact({
        user_id: userId,
        email,
        display_name: updates.display_name || null,
        organization: updates.organization || null,
        domain: updates.domain || null,
        phone_numbers: updates.phone_numbers || [],
        addresses: updates.addresses || [],
        source_type: updates.source_type || null,
        tags: updates.tags || [],
        verification_status: updates.verification_status || 'unverified',
        verification_method: null,
        verified_at: null,
        verified_by: null,
        confidence_score: updates.confidence_score || 0.5,
        email_count: 0,
        first_seen: new Date(),
        last_seen: new Date(),
        linked_calendar_events: updates.linked_calendar_events || [],
        linked_family_members: updates.linked_family_members || [],
        extraction_metadata: updates.extraction_metadata || null,
        notes: updates.notes || null,
      });
    }
  });
}

/**
 * Find contact by ID
 */
export async function findById(contactId: string): Promise<EmailContact | null> {
  const result = await query<EmailContact>(
    'SELECT * FROM email_contacts WHERE id = $1',
    [contactId]
  );
  return result.rows[0] || null;
}

/**
 * Find contact by email
 */
export async function findByEmail(userId: string, email: string): Promise<EmailContact | null> {
  const result = await query<EmailContact>(
    'SELECT * FROM email_contacts WHERE user_id = $1 AND email = $2',
    [userId, email]
  );
  return result.rows[0] || null;
}

/**
 * Find contacts by user ID with optional filters
 */
export async function findByUserId(
  userId: string,
  filters?: ContactFilters
): Promise<EmailContact[]> {
  const conditions: string[] = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters?.sourceType) {
    conditions.push(`source_type = $${paramIndex++}`);
    params.push(filters.sourceType);
  }

  if (filters?.verificationStatus) {
    conditions.push(`verification_status = $${paramIndex++}`);
    params.push(filters.verificationStatus);
  }

  if (filters?.tags && filters.tags.length > 0) {
    conditions.push(`tags && $${paramIndex++}::text[]`);
    params.push(filters.tags);
  }

  if (filters?.domain) {
    conditions.push(`domain = $${paramIndex++}`);
    params.push(filters.domain);
  }

  if (filters?.minConfidence !== undefined) {
    conditions.push(`confidence_score >= $${paramIndex++}`);
    params.push(filters.minConfidence);
  }

  if (filters?.minEmailCount !== undefined) {
    conditions.push(`email_count >= $${paramIndex++}`);
    params.push(filters.minEmailCount);
  }

  const whereClause = conditions.join(' AND ');
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  const sql = `
    SELECT * FROM email_contacts
    WHERE ${whereClause}
    ORDER BY email_count DESC, last_seen DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);

  const result = await query<EmailContact>(sql, params);
  return result.rows;
}

/**
 * Find contacts pending verification
 * Gets unverified contacts with confidence > threshold and email_count >= minCount
 */
export async function findPendingVerification(
  userId: string,
  confidenceThreshold: number = 0.7,
  minEmailCount: number = 2
): Promise<EmailContact[]> {
  const result = await query<EmailContact>(
    `SELECT * FROM email_contacts
    WHERE user_id = $1
      AND verification_status = 'unverified'
      AND confidence_score > $2
      AND email_count >= $3
    ORDER BY confidence_score DESC, email_count DESC`,
    [userId, confidenceThreshold, minEmailCount]
  );
  return result.rows;
}

/**
 * Update verification status
 */
export async function updateVerification(
  contactId: string,
  status: ContactVerificationStatus,
  method: string,
  verifiedBy: string
): Promise<EmailContact> {
  const result = await query<EmailContact>(
    `UPDATE email_contacts SET
      verification_status = $1,
      verification_method = $2,
      verified_at = CURRENT_TIMESTAMP,
      verified_by = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *`,
    [status, method, verifiedBy, contactId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Contact ${contactId} not found`);
  }

  return result.rows[0];
}

/**
 * Link calendar event to contact
 */
export async function linkCalendarEvent(
  contactId: string,
  eventId: string
): Promise<void> {
  await query(
    `UPDATE email_contacts
    SET linked_calendar_events = array_append(linked_calendar_events, $1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2`,
    [eventId, contactId]
  );
}

/**
 * Delete contact by ID
 */
export async function deleteById(contactId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM email_contacts WHERE id = $1',
    [contactId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
