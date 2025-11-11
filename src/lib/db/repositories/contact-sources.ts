/**
 * Contact Sources Repository
 * Database operations for contact_sources table
 */

import { query, transaction } from '../client';
import type { ContactSource, CreateContactSource } from '../types';
import type { PoolClient } from 'pg';

/**
 * Create new contact source
 */
export async function createSource(data: CreateContactSource): Promise<ContactSource> {
  const result = await query<ContactSource>(
    `INSERT INTO contact_sources (
      email_contact_id, provider, external_id, external_resource_name,
      account_email, etag, sync_direction, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.email_contact_id,
      data.provider,
      data.external_id,
      data.external_resource_name,
      data.account_email,
      data.etag || null,
      data.sync_direction || 'import',
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Find contact source by email contact ID
 */
export async function findByEmailContactId(emailContactId: string): Promise<ContactSource[]> {
  const result = await query<ContactSource>(
    'SELECT * FROM contact_sources WHERE email_contact_id = $1',
    [emailContactId]
  );
  return result.rows;
}

/**
 * Find contact source by external ID and provider
 */
export async function findByExternalId(
  externalId: string,
  provider: 'google_contacts' | 'microsoft_contacts'
): Promise<ContactSource | null> {
  const result = await query<ContactSource>(
    'SELECT * FROM contact_sources WHERE external_id = $1 AND provider = $2',
    [externalId, provider]
  );
  return result.rows[0] || null;
}

/**
 * Find contact source by resource name (Google Contacts specific)
 */
export async function findByResourceName(
  resourceName: string,
  accountEmail: string
): Promise<ContactSource | null> {
  const result = await query<ContactSource>(
    `SELECT * FROM contact_sources
     WHERE external_resource_name = $1
       AND account_email = $2
       AND provider = 'google_contacts'`,
    [resourceName, accountEmail]
  );
  return result.rows[0] || null;
}

/**
 * Update sync status (etag and last_synced_at)
 */
export async function updateSyncStatus(
  id: string,
  etag: string | null
): Promise<ContactSource> {
  const result = await query<ContactSource>(
    `UPDATE contact_sources SET
      etag = $1,
      last_synced_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *`,
    [etag, id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Contact source ${id} not found`);
  }

  return result.rows[0];
}

/**
 * Update etag only (for conflict detection)
 */
export async function updateEtag(id: string, etag: string): Promise<ContactSource> {
  const result = await query<ContactSource>(
    `UPDATE contact_sources SET
      etag = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *`,
    [etag, id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Contact source ${id} not found`);
  }

  return result.rows[0];
}

/**
 * Delete contact source by ID
 */
export async function deleteSource(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM contact_sources WHERE id = $1',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Find all contact sources for a specific account
 */
export async function findByAccountEmail(
  accountEmail: string,
  provider: 'google_contacts' | 'microsoft_contacts'
): Promise<ContactSource[]> {
  const result = await query<ContactSource>(
    `SELECT * FROM contact_sources
     WHERE account_email = $1 AND provider = $2
     ORDER BY updated_at DESC`,
    [accountEmail, provider]
  );
  return result.rows;
}

/**
 * Upsert contact source (update if exists, insert if not)
 */
export async function upsertSource(
  emailContactId: string,
  externalResourceName: string,
  accountEmail: string,
  data: CreateContactSource
): Promise<ContactSource> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findByResourceName(externalResourceName, accountEmail);

    if (existing) {
      // Update existing source
      const result = await client.query<ContactSource>(
        `UPDATE contact_sources SET
          email_contact_id = $1,
          external_id = $2,
          etag = $3,
          sync_direction = $4,
          metadata = $5,
          last_synced_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *`,
        [
          emailContactId,
          data.external_id,
          data.etag || null,
          data.sync_direction || 'import',
          data.metadata ? JSON.stringify(data.metadata) : null,
          existing.id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new source
      return await createSource(data);
    }
  });
}
