/**
 * Tasks Repository
 * Database operations for tasks table
 */

import { query, transaction } from '../client';
import type { Task, CreateTask } from '../types';
import type { PoolClient } from 'pg';

/**
 * Create new task
 */
export async function createTask(data: CreateTask): Promise<Task> {
  const result = await query<Task>(
    `INSERT INTO tasks (
      user_id, google_account_email, google_task_id, google_tasklist_id,
      title, notes, status, due_date, calendar_event_id,
      parent_task_id, position, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.user_id,
      data.google_account_email,
      data.google_task_id,
      data.google_tasklist_id,
      data.title,
      data.notes || null,
      data.status || 'needsAction',
      data.due_date || null,
      data.calendar_event_id || null,
      data.parent_task_id || null,
      data.position || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  return result.rows[0];
}

/**
 * Upsert task (update if exists by google_task_id, insert if not)
 */
export async function upsertTask(
  userId: string,
  googleTaskId: string,
  data: CreateTask
): Promise<Task> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findByGoogleTaskId(userId, googleTaskId);

    if (existing) {
      // Update existing task
      const result = await client.query<Task>(
        `UPDATE tasks SET
          title = $1,
          notes = $2,
          status = $3,
          due_date = $4,
          completed_date = CASE WHEN $3 = 'completed' AND status != 'completed' THEN CURRENT_TIMESTAMP ELSE completed_date END,
          calendar_event_id = $5,
          parent_task_id = $6,
          position = $7,
          metadata = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *`,
        [
          data.title,
          data.notes || null,
          data.status || 'needsAction',
          data.due_date || null,
          data.calendar_event_id || null,
          data.parent_task_id || null,
          data.position || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
          existing.id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new task
      return await createTask(data);
    }
  });
}

/**
 * Find task by Google task ID
 */
export async function findByGoogleTaskId(
  userId: string,
  googleTaskId: string
): Promise<Task | null> {
  const result = await query<Task>(
    'SELECT * FROM tasks WHERE user_id = $1 AND google_task_id = $2',
    [userId, googleTaskId]
  );
  return result.rows[0] || null;
}

/**
 * Find tasks by user ID
 */
export async function findByUserId(
  userId: string,
  options?: {
    status?: 'needsAction' | 'completed';
    limit?: number;
    offset?: number;
  }
): Promise<Task[]> {
  const conditions: string[] = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIndex = 2;

  if (options?.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(options.status);
  }

  const whereClause = conditions.join(' AND ');
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const sql = `
    SELECT * FROM tasks
    WHERE ${whereClause}
    ORDER BY
      CASE WHEN status = 'needsAction' THEN 0 ELSE 1 END,
      due_date ASC NULLS LAST,
      created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);

  const result = await query<Task>(sql, params);
  return result.rows;
}

/**
 * Find tasks by tasklist ID
 */
export async function findByTasklistId(
  userId: string,
  googleTasklistId: string,
  options?: {
    status?: 'needsAction' | 'completed';
  }
): Promise<Task[]> {
  const conditions: string[] = ['user_id = $1', 'google_tasklist_id = $2'];
  const params: any[] = [userId, googleTasklistId];
  let paramIndex = 3;

  if (options?.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(options.status);
  }

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT * FROM tasks
    WHERE ${whereClause}
    ORDER BY
      position ASC NULLS LAST,
      CASE WHEN status = 'needsAction' THEN 0 ELSE 1 END,
      due_date ASC NULLS LAST
  `;

  const result = await query<Task>(sql, params);
  return result.rows;
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<CreateTask>
): Promise<Task> {
  const fields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    params.push(updates.title);
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramIndex++}`);
    params.push(updates.notes);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    params.push(updates.status);
    // Auto-set completed_date when marking as completed
    if (updates.status === 'completed') {
      fields.push(`completed_date = CURRENT_TIMESTAMP`);
    }
  }
  if (updates.due_date !== undefined) {
    fields.push(`due_date = $${paramIndex++}`);
    params.push(updates.due_date);
  }
  if (updates.calendar_event_id !== undefined) {
    fields.push(`calendar_event_id = $${paramIndex++}`);
    params.push(updates.calendar_event_id);
  }
  if (updates.parent_task_id !== undefined) {
    fields.push(`parent_task_id = $${paramIndex++}`);
    params.push(updates.parent_task_id);
  }
  if (updates.position !== undefined) {
    fields.push(`position = $${paramIndex++}`);
    params.push(updates.position);
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    params.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');

  const sql = `
    UPDATE tasks SET ${fields.join(', ')}
    WHERE id = $${paramIndex++}
    RETURNING *
  `;
  params.push(taskId);

  const result = await query<Task>(sql, params);

  if (result.rows.length === 0) {
    throw new Error(`Task ${taskId} not found`);
  }

  return result.rows[0];
}

/**
 * Delete task by ID
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM tasks WHERE id = $1',
    [taskId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Complete task
 */
export async function completeTask(taskId: string): Promise<Task> {
  const result = await query<Task>(
    `UPDATE tasks SET
      status = 'completed',
      completed_date = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *`,
    [taskId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Task ${taskId} not found`);
  }

  return result.rows[0];
}

/**
 * Link calendar event to task
 */
export async function linkCalendarEvent(
  taskId: string,
  calendarEventId: string
): Promise<Task> {
  const result = await query<Task>(
    `UPDATE tasks SET
      calendar_event_id = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *`,
    [calendarEventId, taskId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Task ${taskId} not found`);
  }

  return result.rows[0];
}

/**
 * Find tasks with upcoming due dates
 */
export async function findUpcomingTasks(
  userId: string,
  daysAhead: number = 7
): Promise<Task[]> {
  const result = await query<Task>(
    `SELECT * FROM tasks
     WHERE user_id = $1
       AND status = 'needsAction'
       AND due_date IS NOT NULL
       AND due_date <= CURRENT_TIMESTAMP + INTERVAL '1 day' * $2
     ORDER BY due_date ASC`,
    [userId, daysAhead]
  );
  return result.rows;
}

/**
 * Find tasks linked to a calendar event
 */
export async function findByCalendarEventId(
  userId: string,
  calendarEventId: string
): Promise<Task[]> {
  const result = await query<Task>(
    `SELECT * FROM tasks
     WHERE user_id = $1 AND calendar_event_id = $2
     ORDER BY created_at DESC`,
    [userId, calendarEventId]
  );
  return result.rows;
}
