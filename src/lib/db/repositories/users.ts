/**
 * User Repository
 * Database operations for users table
 */

import { query, transaction } from '../client';
import type { User, CreateUser } from '../types';
import type { PoolClient } from 'pg';

/**
 * Find user by Clerk user ID
 */
export async function findUserByClerkId(clerkUserId: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE clerk_user_id = $1',
    [clerkUserId]
  );
  return result.rows[0] || null;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUser): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (
      clerk_user_id, email, email_verified, first_name, last_name,
      username, profile_image_url, last_sign_in_at, metadata, banned
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      userData.clerk_user_id,
      userData.email,
      userData.email_verified || false,
      userData.first_name || null,
      userData.last_name || null,
      userData.username || null,
      userData.profile_image_url || null,
      userData.last_sign_in_at || null,
      JSON.stringify(userData.metadata || {}),
      userData.banned || false,
    ]
  );
  return result.rows[0];
}

/**
 * Update user by Clerk user ID
 */
export async function updateUser(
  clerkUserId: string,
  updates: Partial<Omit<User, 'id' | 'clerk_user_id' | 'created_at' | 'updated_at'>>
): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic UPDATE query
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.email_verified !== undefined) {
    fields.push(`email_verified = $${paramIndex++}`);
    values.push(updates.email_verified);
  }
  if (updates.first_name !== undefined) {
    fields.push(`first_name = $${paramIndex++}`);
    values.push(updates.first_name);
  }
  if (updates.last_name !== undefined) {
    fields.push(`last_name = $${paramIndex++}`);
    values.push(updates.last_name);
  }
  if (updates.username !== undefined) {
    fields.push(`username = $${paramIndex++}`);
    values.push(updates.username);
  }
  if (updates.profile_image_url !== undefined) {
    fields.push(`profile_image_url = $${paramIndex++}`);
    values.push(updates.profile_image_url);
  }
  if (updates.last_sign_in_at !== undefined) {
    fields.push(`last_sign_in_at = $${paramIndex++}`);
    values.push(updates.last_sign_in_at);
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(updates.metadata));
  }
  if (updates.banned !== undefined) {
    fields.push(`banned = $${paramIndex++}`);
    values.push(updates.banned);
  }

  if (fields.length === 0) {
    // No updates to perform
    return findUserByClerkId(clerkUserId);
  }

  values.push(clerkUserId);

  const result = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE clerk_user_id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete user by Clerk user ID
 */
export async function deleteUser(clerkUserId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM users WHERE clerk_user_id = $1',
    [clerkUserId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get all users with pagination
 */
export async function getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
  const result = await query<User>(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

/**
 * Count total users
 */
export async function countUsers(): Promise<number> {
  const result = await query('SELECT COUNT(*) as count FROM users');
  return parseInt(result.rows[0].count);
}

/**
 * Upsert user (create if not exists, update if exists)
 */
export async function upsertUser(userData: CreateUser): Promise<User> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findUserByClerkId(userData.clerk_user_id);

    if (existing) {
      // Update existing user
      const result = await client.query<User>(
        `UPDATE users SET
          email = $1,
          email_verified = $2,
          first_name = $3,
          last_name = $4,
          username = $5,
          profile_image_url = $6,
          last_sign_in_at = $7,
          metadata = $8,
          banned = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE clerk_user_id = $10
        RETURNING *`,
        [
          userData.email,
          userData.email_verified || false,
          userData.first_name || null,
          userData.last_name || null,
          userData.username || null,
          userData.profile_image_url || null,
          userData.last_sign_in_at || null,
          JSON.stringify(userData.metadata || {}),
          userData.banned || false,
          userData.clerk_user_id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new user
      const result = await client.query<User>(
        `INSERT INTO users (
          clerk_user_id, email, email_verified, first_name, last_name,
          username, profile_image_url, last_sign_in_at, metadata, banned
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          userData.clerk_user_id,
          userData.email,
          userData.email_verified || false,
          userData.first_name || null,
          userData.last_name || null,
          userData.username || null,
          userData.profile_image_url || null,
          userData.last_sign_in_at || null,
          JSON.stringify(userData.metadata || {}),
          userData.banned || false,
        ]
      );
      return result.rows[0];
    }
  });
}
