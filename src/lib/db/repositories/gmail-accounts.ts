/**
 * Gmail Accounts Repository
 * Database operations for gmail_accounts table
 *
 * NOTE: All functions accept Clerk userId (string) and convert to UUID internally.
 * Database schema uses UUID FK to users.id (not TEXT clerk_user_id).
 */

import { query, transaction } from '../client';
import { findUserByClerkId } from './users';
import type { GmailAccount, CreateGmailAccount, GmailAccountType } from '../types';
import type { PoolClient } from 'pg';

/**
 * Find Gmail account by ID
 */
export async function findGmailAccountById(accountId: string): Promise<GmailAccount | null> {
  const result = await query<GmailAccount>(
    'SELECT * FROM gmail_accounts WHERE id = $1',
    [accountId]
  );
  return result.rows[0] || null;
}

/**
 * Find Gmail account by email
 */
export async function findGmailAccountByEmail(email: string): Promise<GmailAccount | null> {
  const result = await query<GmailAccount>(
    'SELECT * FROM gmail_accounts WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Find all Gmail accounts for a user
 * @param clerkUserId - Clerk user ID (converted to UUID internally)
 */
export async function findGmailAccountsByUserId(clerkUserId: string): Promise<GmailAccount[]> {
  // Convert Clerk ID to UUID
  const user = await findUserByClerkId(clerkUserId);
  if (!user) {
    throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
  }

  const result = await query<GmailAccount>(
    'SELECT * FROM gmail_accounts WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id]
  );
  return result.rows;
}

/**
 * Find Gmail account by user ID and account type
 * @param clerkUserId - Clerk user ID (converted to UUID internally)
 */
export async function findGmailAccountByUserIdAndType(
  clerkUserId: string,
  accountType: GmailAccountType
): Promise<GmailAccount | null> {
  // Convert Clerk ID to UUID
  const user = await findUserByClerkId(clerkUserId);
  if (!user) {
    throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
  }

  const result = await query<GmailAccount>(
    'SELECT * FROM gmail_accounts WHERE user_id = $1 AND account_type = $2',
    [user.id, accountType]
  );
  return result.rows[0] || null;
}

/**
 * Create or update Gmail account (upsert)
 * @param accountData.user_id - Should be Clerk user ID (converted to UUID internally)
 */
export async function upsertGmailAccount(accountData: CreateGmailAccount): Promise<GmailAccount> {
  return await transaction(async (client: PoolClient) => {
    // Convert Clerk ID to UUID
    const user = await findUserByClerkId(accountData.user_id);
    if (!user) {
      throw new Error(`User not found for Clerk ID: ${accountData.user_id}`);
    }

    // Check if account exists by email
    const existing = await findGmailAccountByEmail(accountData.email);

    if (existing) {
      // Update existing account
      const result = await client.query<GmailAccount>(
        `UPDATE gmail_accounts SET
          google_account_email = $1,
          sync_settings = $2,
          account_type = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = $4
        RETURNING *`,
        [
          accountData.google_account_email,
          JSON.stringify(accountData.sync_settings),
          accountData.account_type,
          accountData.email,
        ]
      );
      return result.rows[0];
    } else {
      // Create new account with UUID user_id
      const result = await client.query<GmailAccount>(
        `INSERT INTO gmail_accounts (
          user_id, email, account_type, google_account_email, sync_settings
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          user.id, // Use UUID, not Clerk ID
          accountData.email,
          accountData.account_type,
          accountData.google_account_email,
          JSON.stringify(accountData.sync_settings),
        ]
      );
      return result.rows[0];
    }
  });
}

/**
 * Update last synced timestamp
 */
export async function updateLastSyncedAt(accountId: string): Promise<void> {
  await query(
    'UPDATE gmail_accounts SET last_synced_at = CURRENT_TIMESTAMP WHERE id = $1',
    [accountId]
  );
}

/**
 * Update sync settings
 */
export async function updateSyncSettings(
  accountId: string,
  syncSettings: Record<string, any>
): Promise<GmailAccount> {
  const result = await query<GmailAccount>(
    `UPDATE gmail_accounts SET
      sync_settings = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *`,
    [JSON.stringify(syncSettings), accountId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Gmail account ${accountId} not found`);
  }

  return result.rows[0];
}

/**
 * Update account type
 */
export async function updateGmailAccountType(
  accountId: string,
  accountType: GmailAccountType
): Promise<GmailAccount> {
  const result = await query<GmailAccount>(
    `UPDATE gmail_accounts SET
      account_type = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *`,
    [accountType, accountId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Gmail account ${accountId} not found`);
  }

  return result.rows[0];
}

/**
 * Delete Gmail account
 */
export async function deleteGmailAccount(accountId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM gmail_accounts WHERE id = $1',
    [accountId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete Gmail account by user ID and email
 * @param clerkUserId - Clerk user ID (converted to UUID internally)
 */
export async function deleteGmailAccountByUserIdAndEmail(
  clerkUserId: string,
  email: string
): Promise<boolean> {
  // Convert Clerk ID to UUID
  const user = await findUserByClerkId(clerkUserId);
  if (!user) {
    throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
  }

  const result = await query(
    'DELETE FROM gmail_accounts WHERE user_id = $1 AND email = $2',
    [user.id, email]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get valid (non-expired) Gmail account
 */
export async function getValidGmailAccount(accountId: string): Promise<GmailAccount | null> {
  const account = await findGmailAccountById(accountId);
  if (!account) return null;
  // Token expiry checking is now handled by the DB function is_gmail_token_expired()
  return account;
}

/**
 * Count Gmail accounts for a user
 * @param clerkUserId - Clerk user ID (converted to UUID internally)
 */
export async function countGmailAccountsByUserId(clerkUserId: string): Promise<number> {
  // Convert Clerk ID to UUID
  const user = await findUserByClerkId(clerkUserId);
  if (!user) {
    throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
  }

  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM gmail_accounts WHERE user_id = $1',
    [user.id]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get accounts that need syncing (based on sync settings)
 */
export async function getAccountsNeedingSyncing(): Promise<GmailAccount[]> {
  const result = await query<GmailAccount>(
    `SELECT * FROM gmail_accounts
    WHERE (sync_settings->>'autoSync')::boolean = true
    AND (
      last_synced_at IS NULL
      OR last_synced_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
    )
    ORDER BY last_synced_at ASC NULLS FIRST
    LIMIT 10`
  );
  return result.rows;
}
