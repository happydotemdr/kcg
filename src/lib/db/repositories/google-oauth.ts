/**
 * Google OAuth Token Repository
 * Database operations for google_oauth_tokens table
 */

import { query, transaction } from '../client';
import type { GoogleOAuthToken, CreateGoogleOAuthToken } from '../types';
import type { PoolClient } from 'pg';

/**
 * Find OAuth token by user ID (optionally filtered by Google account email)
 */
export async function findTokenByUserId(userId: string, googleAccountEmail?: string | null): Promise<GoogleOAuthToken | null> {
  if (googleAccountEmail) {
    const result = await query<GoogleOAuthToken>(
      'SELECT * FROM google_oauth_tokens WHERE user_id = $1 AND google_account_email = $2',
      [userId, googleAccountEmail]
    );
    return result.rows[0] || null;
  }

  // When no email specified, prefer tokens with email and most recently updated
  // This ensures we get the latest, most complete token
  const result = await query<GoogleOAuthToken>(
    `SELECT * FROM google_oauth_tokens
     WHERE user_id = $1
     ORDER BY
       CASE WHEN google_account_email IS NOT NULL THEN 0 ELSE 1 END,
       updated_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update OAuth token (upsert)
 */
export async function upsertOAuthToken(tokenData: CreateGoogleOAuthToken): Promise<GoogleOAuthToken> {
  return await transaction(async (client: PoolClient) => {
    // Check for existing token within the transaction
    const checkQuery = tokenData.google_account_email
      ? 'SELECT * FROM google_oauth_tokens WHERE user_id = $1 AND google_account_email = $2'
      : 'SELECT * FROM google_oauth_tokens WHERE user_id = $1';

    const checkParams = tokenData.google_account_email
      ? [tokenData.user_id, tokenData.google_account_email]
      : [tokenData.user_id];

    const existingResult = await client.query<GoogleOAuthToken>(checkQuery, checkParams);
    const existing = existingResult.rows[0];

    if (existing) {
      // Update existing token - match by both user_id AND google_account_email
      const result = await client.query<GoogleOAuthToken>(
        `UPDATE google_oauth_tokens SET
          access_token = $1,
          refresh_token = $2,
          token_type = $3,
          expiry_date = $4,
          scope = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6 AND google_account_email = $7
        RETURNING *`,
        [
          tokenData.access_token,
          tokenData.refresh_token || null,
          tokenData.token_type || 'Bearer',
          tokenData.expiry_date || null,
          tokenData.scope || null,
          tokenData.user_id,
          tokenData.google_account_email || null,
        ]
      );
      return result.rows[0];
    } else {
      // Create new token
      const result = await client.query<GoogleOAuthToken>(
        `INSERT INTO google_oauth_tokens (
          user_id, access_token, refresh_token, token_type, expiry_date, scope, google_account_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tokenData.user_id,
          tokenData.access_token,
          tokenData.refresh_token || null,
          tokenData.token_type || 'Bearer',
          tokenData.expiry_date || null,
          tokenData.scope || null,
          tokenData.google_account_email || null,
        ]
      );
      return result.rows[0];
    }
  });
}

/**
 * Delete OAuth token by user ID
 */
export async function deleteOAuthToken(userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM google_oauth_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete OAuth token by user ID and Google account email (account-specific delete)
 */
export async function deleteOAuthTokenByEmail(userId: string, googleAccountEmail: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM google_oauth_tokens WHERE user_id = $1 AND google_account_email = $2',
    [userId, googleAccountEmail]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: GoogleOAuthToken): boolean {
  if (!token.expiry_date) return false;
  return Date.now() >= token.expiry_date;
}

/**
 * Get valid token (not expired) for user
 */
export async function getValidToken(userId: string): Promise<GoogleOAuthToken | null> {
  const token = await findTokenByUserId(userId);
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return token;
}

/**
 * Find all OAuth tokens for a user (multi-account support)
 */
export async function findAllTokensByUserId(userId: string): Promise<GoogleOAuthToken[]> {
  const result = await query<GoogleOAuthToken>(
    `SELECT * FROM google_oauth_tokens
     WHERE user_id = $1
     ORDER BY is_primary DESC NULLS LAST, updated_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Find primary OAuth token for a user
 */
export async function findPrimaryTokenByUserId(userId: string): Promise<GoogleOAuthToken | null> {
  const result = await query<GoogleOAuthToken>(
    'SELECT * FROM google_oauth_tokens WHERE user_id = $1 AND is_primary = TRUE',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Set an account as primary (unsets any existing primary)
 */
export async function setPrimaryAccount(userId: string, googleAccountEmail: string): Promise<GoogleOAuthToken> {
  return await transaction(async (client: PoolClient) => {
    // Unset existing primary for this user
    await client.query(
      'UPDATE google_oauth_tokens SET is_primary = FALSE WHERE user_id = $1',
      [userId]
    );

    // Set new primary
    const result = await client.query<GoogleOAuthToken>(
      `UPDATE google_oauth_tokens
       SET is_primary = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND google_account_email = $2
       RETURNING *`,
      [userId, googleAccountEmail]
    );

    if (result.rows.length === 0) {
      throw new Error(`No Google account found for user ${userId} with email ${googleAccountEmail}`);
    }

    return result.rows[0];
  });
}

/**
 * Update account label for a specific Google account
 */
export async function updateAccountLabel(
  userId: string,
  googleAccountEmail: string,
  label: string
): Promise<GoogleOAuthToken> {
  const result = await query<GoogleOAuthToken>(
    `UPDATE google_oauth_tokens
     SET account_label = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2 AND google_account_email = $3
     RETURNING *`,
    [label, userId, googleAccountEmail]
  );

  if (result.rows.length === 0) {
    throw new Error(`No Google account found for user ${userId} with email ${googleAccountEmail}`);
  }

  return result.rows[0];
}
