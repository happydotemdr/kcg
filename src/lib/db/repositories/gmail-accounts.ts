/**
 * Gmail Accounts Repository
 * Database operations for gmail_accounts table
 */

import { query, transaction } from '../client';
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
 */
export async function findGmailAccountsByUserId(userId: string): Promise<GmailAccount[]> {
  const result = await query<GmailAccount>(
    'SELECT * FROM gmail_accounts WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

/**
 * Find Gmail account by user ID and account type
 */
export async function findGmailAccountByUserIdAndType(
  userId: string,
  accountType: GmailAccountType
): Promise<GmailAccount | null> {
  const result = await query<GmailAccount>(
    'SELECT * FROM gmail_accounts WHERE user_id = $1 AND account_type = $2',
    [userId, accountType]
  );
  return result.rows[0] || null;
}

/**
 * Create or update Gmail account (upsert)
 */
export async function upsertGmailAccount(accountData: CreateGmailAccount): Promise<GmailAccount> {
  return await transaction(async (client: PoolClient) => {
    // Check if account exists by email
    const existing = await findGmailAccountByEmail(accountData.email);

    if (existing) {
      // Update existing account
      const result = await client.query<GmailAccount>(
        `UPDATE gmail_accounts SET
          gmail_access_token = $1,
          gmail_refresh_token = $2,
          gmail_token_type = $3,
          gmail_expiry_date = $4,
          gmail_scope = $5,
          sync_settings = $6,
          account_type = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE email = $8
        RETURNING *`,
        [
          accountData.gmail_access_token,
          accountData.gmail_refresh_token || null,
          accountData.gmail_token_type || 'Bearer',
          accountData.gmail_expiry_date || null,
          accountData.gmail_scope || null,
          JSON.stringify(accountData.sync_settings),
          accountData.account_type,
          accountData.email,
        ]
      );
      return result.rows[0];
    } else {
      // Create new account
      const result = await client.query<GmailAccount>(
        `INSERT INTO gmail_accounts (
          user_id, email, account_type,
          gmail_access_token, gmail_refresh_token, gmail_token_type,
          gmail_expiry_date, gmail_scope, sync_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          accountData.user_id,
          accountData.email,
          accountData.account_type,
          accountData.gmail_access_token,
          accountData.gmail_refresh_token || null,
          accountData.gmail_token_type || 'Bearer',
          accountData.gmail_expiry_date || null,
          accountData.gmail_scope || null,
          JSON.stringify(accountData.sync_settings),
        ]
      );
      return result.rows[0];
    }
  });
}

/**
 * Update Gmail account tokens (for OAuth refresh)
 */
export async function updateGmailAccountTokens(
  accountId: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expiry_date?: number;
    scope?: string;
  }
): Promise<GmailAccount> {
  const result = await query<GmailAccount>(
    `UPDATE gmail_accounts SET
      gmail_access_token = $1,
      gmail_refresh_token = COALESCE($2, gmail_refresh_token),
      gmail_token_type = COALESCE($3, gmail_token_type),
      gmail_expiry_date = COALESCE($4, gmail_expiry_date),
      gmail_scope = COALESCE($5, gmail_scope),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *`,
    [
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.token_type || null,
      tokens.expiry_date || null,
      tokens.scope || null,
      accountId,
    ]
  );

  if (result.rows.length === 0) {
    throw new Error(`Gmail account ${accountId} not found`);
  }

  return result.rows[0];
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
 */
export async function deleteGmailAccountByUserIdAndEmail(
  userId: string,
  email: string
): Promise<boolean> {
  const result = await query(
    'DELETE FROM gmail_accounts WHERE user_id = $1 AND email = $2',
    [userId, email]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Check if Gmail token is expired
 */
export function isGmailTokenExpired(account: GmailAccount): boolean {
  if (!account.gmail_expiry_date) return false;
  return Date.now() >= account.gmail_expiry_date;
}

/**
 * Get valid (non-expired) Gmail account
 */
export async function getValidGmailAccount(accountId: string): Promise<GmailAccount | null> {
  const account = await findGmailAccountById(accountId);
  if (!account) return null;
  if (isGmailTokenExpired(account)) return null;
  return account;
}

/**
 * Count Gmail accounts for a user
 */
export async function countGmailAccountsByUserId(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM gmail_accounts WHERE user_id = $1',
    [userId]
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
