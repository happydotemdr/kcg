/**
 * Contact Sync State Repository
 * Database operations for contact_sync_state table
 */

import { query, transaction } from '../client';
import type { ContactSyncState, CreateContactSyncState } from '../types';
import type { PoolClient } from 'pg';

/**
 * Upsert sync state (create or update)
 */
export async function upsertSyncState(
  userId: string,
  googleAccountEmail: string,
  updates: Partial<CreateContactSyncState>
): Promise<ContactSyncState> {
  return await transaction(async (client: PoolClient) => {
    const existing = await getSyncState(userId, googleAccountEmail);

    if (existing) {
      // Update existing
      const result = await client.query<ContactSyncState>(
        `UPDATE contact_sync_state SET
          sync_token = COALESCE($1, sync_token),
          last_full_sync_at = COALESCE($2, last_full_sync_at),
          last_incremental_sync_at = COALESCE($3, last_incremental_sync_at),
          sync_status = COALESCE($4, sync_status),
          error_message = COALESCE($5, error_message),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6 AND google_account_email = $7
        RETURNING *`,
        [
          updates.sync_token !== undefined ? updates.sync_token : null,
          updates.last_full_sync_at || null,
          updates.last_incremental_sync_at || null,
          updates.sync_status || null,
          updates.error_message !== undefined ? updates.error_message : null,
          userId,
          googleAccountEmail,
        ]
      );
      return result.rows[0];
    } else {
      // Create new
      const result = await client.query<ContactSyncState>(
        `INSERT INTO contact_sync_state (
          user_id, google_account_email, sync_token,
          last_full_sync_at, last_incremental_sync_at,
          sync_status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userId,
          googleAccountEmail,
          updates.sync_token || null,
          updates.last_full_sync_at || null,
          updates.last_incremental_sync_at || null,
          updates.sync_status || 'never_synced',
          updates.error_message || null,
        ]
      );
      return result.rows[0];
    }
  });
}

/**
 * Get sync state for a user and account
 */
export async function getSyncState(
  userId: string,
  googleAccountEmail: string
): Promise<ContactSyncState | null> {
  const result = await query<ContactSyncState>(
    `SELECT * FROM contact_sync_state
     WHERE user_id = $1 AND google_account_email = $2`,
    [userId, googleAccountEmail]
  );
  return result.rows[0] || null;
}

/**
 * Update sync token (for incremental sync)
 */
export async function updateSyncToken(
  userId: string,
  googleAccountEmail: string,
  syncToken: string
): Promise<ContactSyncState> {
  const result = await query<ContactSyncState>(
    `UPDATE contact_sync_state SET
      sync_token = $1,
      last_incremental_sync_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $2 AND google_account_email = $3
    RETURNING *`,
    [syncToken, userId, googleAccountEmail]
  );

  if (result.rows.length === 0) {
    throw new Error(`Sync state not found for user ${userId} and account ${googleAccountEmail}`);
  }

  return result.rows[0];
}

/**
 * Clear sync token (handle 410 Gone errors from Google API)
 * Forces a full sync on next attempt
 */
export async function clearSyncToken(
  userId: string,
  googleAccountEmail: string
): Promise<ContactSyncState> {
  const result = await query<ContactSyncState>(
    `UPDATE contact_sync_state SET
      sync_token = NULL,
      sync_status = 'never_synced',
      error_message = 'Sync token expired - full sync required',
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND google_account_email = $2
    RETURNING *`,
    [userId, googleAccountEmail]
  );

  if (result.rows.length === 0) {
    throw new Error(`Sync state not found for user ${userId} and account ${googleAccountEmail}`);
  }

  return result.rows[0];
}

/**
 * Mark sync as in progress
 */
export async function markSyncInProgress(
  userId: string,
  googleAccountEmail: string
): Promise<ContactSyncState> {
  return await upsertSyncState(userId, googleAccountEmail, {
    sync_status: 'syncing',
    error_message: null,
  });
}

/**
 * Mark sync as completed
 */
export async function markSyncCompleted(
  userId: string,
  googleAccountEmail: string,
  syncToken: string | null,
  isFullSync: boolean
): Promise<ContactSyncState> {
  const updates: Partial<CreateContactSyncState> = {
    sync_status: 'completed',
    error_message: null,
    sync_token: syncToken,
  };

  if (isFullSync) {
    updates.last_full_sync_at = new Date();
  } else {
    updates.last_incremental_sync_at = new Date();
  }

  return await upsertSyncState(userId, googleAccountEmail, updates);
}

/**
 * Mark sync as failed
 */
export async function markSyncFailed(
  userId: string,
  googleAccountEmail: string,
  errorMessage: string
): Promise<ContactSyncState> {
  return await upsertSyncState(userId, googleAccountEmail, {
    sync_status: 'failed',
    error_message: errorMessage,
  });
}

/**
 * Get all sync states for a user
 */
export async function getAllSyncStates(userId: string): Promise<ContactSyncState[]> {
  const result = await query<ContactSyncState>(
    `SELECT * FROM contact_sync_state
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}
