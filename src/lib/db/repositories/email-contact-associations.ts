/**
 * Email Contact Associations Repository
 * Database operations for email_contact_associations table
 */

import { query } from '../client';
import type { EmailContactAssociation, CreateEmailContactAssociation } from '../types';

/**
 * Create association between email metadata and contact
 */
export async function createAssociation(
  data: CreateEmailContactAssociation
): Promise<EmailContactAssociation> {
  const result = await query<EmailContactAssociation>(
    `INSERT INTO email_contact_associations (
      email_metadata_id, contact_id, role, extraction_confidence
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (email_metadata_id, contact_id, role) DO UPDATE
    SET extraction_confidence = EXCLUDED.extraction_confidence
    RETURNING *`,
    [
      data.email_metadata_id,
      data.contact_id,
      data.role,
      data.extraction_confidence || 0.5,
    ]
  );
  return result.rows[0];
}

/**
 * Find associations by email metadata ID
 */
export async function findByEmailId(emailMetadataId: string): Promise<EmailContactAssociation[]> {
  const result = await query<EmailContactAssociation>(
    'SELECT * FROM email_contact_associations WHERE email_metadata_id = $1',
    [emailMetadataId]
  );
  return result.rows;
}

/**
 * Find associations by contact ID
 */
export async function findByContactId(contactId: string): Promise<EmailContactAssociation[]> {
  const result = await query<EmailContactAssociation>(
    'SELECT * FROM email_contact_associations WHERE contact_id = $1 ORDER BY extracted_at DESC',
    [contactId]
  );
  return result.rows;
}

/**
 * Delete association by ID
 */
export async function deleteById(associationId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM email_contact_associations WHERE id = $1',
    [associationId]
  );
  return (result.rowCount ?? 0) > 0;
}
