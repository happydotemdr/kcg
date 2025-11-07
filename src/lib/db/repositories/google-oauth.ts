/**
 * Google OAuth Token Repository
 * Database operations for google_oauth_tokens table
 */

import { query, transaction } from '../client';
import type { GoogleOAuthToken, CreateGoogleOAuthToken } from '../types';
import type { PoolClient } from 'pg';

/**
 * Find OAuth token by user ID
 */
export async function findTokenByUserId(userId: string): Promise<GoogleOAuthToken | null> {
  const result = await query<GoogleOAuthToken>(
    'SELECT * FROM google_oauth_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update OAuth token (upsert)
 */
export async function upsertOAuthToken(tokenData: CreateGoogleOAuthToken): Promise<GoogleOAuthToken> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findTokenByUserId(tokenData.user_id);

    if (existing) {
      // Update existing token
      const result = await client.query<GoogleOAuthToken>(
        `UPDATE google_oauth_tokens SET
          access_token = $1,
          refresh_token = $2,
          token_type = $3,
          expiry_date = $4,
          scope = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
        RETURNING *`,
        [
          tokenData.access_token,
          tokenData.refresh_token || null,
          tokenData.token_type || 'Bearer',
          tokenData.expiry_date || null,
          tokenData.scope || null,
          tokenData.user_id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new token
      const result = await client.query<GoogleOAuthToken>(
        `INSERT INTO google_oauth_tokens (
          user_id, access_token, refresh_token, token_type, expiry_date, scope
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          tokenData.user_id,
          tokenData.access_token,
          tokenData.refresh_token || null,
          tokenData.token_type || 'Bearer',
          tokenData.expiry_date || null,
          tokenData.scope || null,
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
