/**
 * Task Lists Repository
 * Database operations for task_lists table
 */

import { query, transaction } from '../client';
import type { TaskList, CreateTaskList } from '../types';
import type { PoolClient } from 'pg';

/**
 * Create new task list
 */
export async function createTaskList(data: CreateTaskList): Promise<TaskList> {
  const result = await query<TaskList>(
    `INSERT INTO task_lists (
      user_id, google_account_email, google_tasklist_id,
      title, is_default, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      data.user_id,
      data.google_account_email,
      data.google_tasklist_id,
      data.title,
      data.is_default || false,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Upsert task list (update if exists by google_tasklist_id, insert if not)
 */
export async function upsertTaskList(
  userId: string,
  googleTasklistId: string,
  data: CreateTaskList
): Promise<TaskList> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findByGoogleTasklistId(userId, googleTasklistId);

    if (existing) {
      // Update existing task list
      const result = await client.query<TaskList>(
        `UPDATE task_lists SET
          title = $1,
          metadata = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *`,
        [
          data.title,
          data.metadata ? JSON.stringify(data.metadata) : null,
          existing.id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new task list
      return await createTaskList(data);
    }
  });
}

/**
 * Find task list by user ID
 */
export async function findByUserId(userId: string): Promise<TaskList[]> {
  const result = await query<TaskList>(
    `SELECT * FROM task_lists
     WHERE user_id = $1
     ORDER BY is_default DESC, title ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Find task list by Google tasklist ID
 */
export async function findByGoogleTasklistId(
  userId: string,
  googleTasklistId: string
): Promise<TaskList | null> {
  const result = await query<TaskList>(
    'SELECT * FROM task_lists WHERE user_id = $1 AND google_tasklist_id = $2',
    [userId, googleTasklistId]
  );
  return result.rows[0] || null;
}

/**
 * Find default task list for a user and account
 */
export async function findDefaultTaskList(
  userId: string,
  googleAccountEmail: string
): Promise<TaskList | null> {
  const result = await query<TaskList>(
    `SELECT * FROM task_lists
     WHERE user_id = $1 AND google_account_email = $2 AND is_default = TRUE
     LIMIT 1`,
    [userId, googleAccountEmail]
  );
  return result.rows[0] || null;
}

/**
 * Set a task list as default (unsets any existing default for that account)
 */
export async function setDefaultTasklist(
  userId: string,
  googleAccountEmail: string,
  googleTasklistId: string
): Promise<TaskList> {
  return await transaction(async (client: PoolClient) => {
    // Unset existing default for this user and account
    await client.query(
      `UPDATE task_lists SET is_default = FALSE
       WHERE user_id = $1 AND google_account_email = $2`,
      [userId, googleAccountEmail]
    );

    // Set new default
    const result = await client.query<TaskList>(
      `UPDATE task_lists
       SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND google_tasklist_id = $2
       RETURNING *`,
      [userId, googleTasklistId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Task list ${googleTasklistId} not found for user ${userId}`);
    }

    return result.rows[0];
  });
}

/**
 * Delete task list by ID
 */
export async function deleteTaskList(taskListId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM task_lists WHERE id = $1',
    [taskListId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Find task lists by account email
 */
export async function findByAccountEmail(
  userId: string,
  googleAccountEmail: string
): Promise<TaskList[]> {
  const result = await query<TaskList>(
    `SELECT * FROM task_lists
     WHERE user_id = $1 AND google_account_email = $2
     ORDER BY is_default DESC, title ASC`,
    [userId, googleAccountEmail]
  );
  return result.rows;
}

/**
 * Update task list title
 */
export async function updateTitle(
  taskListId: string,
  title: string
): Promise<TaskList> {
  const result = await query<TaskList>(
    `UPDATE task_lists
     SET title = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [title, taskListId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Task list ${taskListId} not found`);
  }

  return result.rows[0];
}
