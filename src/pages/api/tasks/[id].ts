/**
 * GET /api/tasks/[id]
 * Fetch task by ID
 *
 * PATCH /api/tasks/[id]
 * Update task (title, notes, status, due_date)
 *
 * DELETE /api/tasks/[id]
 * Delete task
 */

import type { APIRoute } from 'astro';
import * as tasksRepo from '../../../lib/db/repositories/tasks';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import { updateTask as updateGoogleTask, deleteTask as deleteGoogleTask } from '../../../lib/google-tasks';
import { withUserMutex } from '../../../lib/sync-queue';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const auth = await locals.auth();

    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const taskId = params.id;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query task by ID and verify ownership
    const { query } = await import('../../../lib/db/client');
    const result = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, dbUser.id]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Task] Successfully fetched task ${taskId}`);

    return new Response(
      JSON.stringify({
        success: true,
        task: result.rows[0],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Task] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch task',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const auth = await locals.auth();

    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const taskId = params.id;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as Partial<{
      title: string;
      notes: string | null;
      status: 'needsAction' | 'completed';
      due_date: string | null;
    }>;

    console.log(`[Task] Updating task ${taskId}`, body);

    // Check task exists and belongs to user
    const { query } = await import('../../../lib/db/client');
    const existingResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, dbUser.id]
    );

    if (existingResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingTask = existingResult.rows[0];

    // Update via withUserMutex for sequential execution
    const updatedTask = await withUserMutex(dbUser.id, async () => {
      // Update in Google Tasks first
      await updateGoogleTask(
        dbUser.id,
        existingTask.google_tasklist_id,
        existingTask.google_task_id,
        {
          title: body.title,
          notes: body.notes !== undefined ? body.notes : undefined,
          status: body.status,
          due: body.due_date !== undefined ? (body.due_date || undefined) : undefined,
        },
        existingTask.google_account_email
      );

      // Update in database
      const updates: any = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.status !== undefined) updates.status = body.status;
      if (body.due_date !== undefined) updates.due_date = body.due_date;

      return await tasksRepo.updateTask(taskId, updates);
    });

    console.log(`[Task] Successfully updated task ${taskId}`);

    return new Response(
      JSON.stringify({
        success: true,
        task: updatedTask,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Task] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update task',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const auth = await locals.auth();

    if (!auth?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const taskId = params.id;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Task] Deleting task ${taskId}`);

    // Check task exists and belongs to user
    const { query } = await import('../../../lib/db/client');
    const existingResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, dbUser.id]
    );

    if (existingResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingTask = existingResult.rows[0];

    // Delete via withUserMutex for sequential execution
    await withUserMutex(dbUser.id, async () => {
      // Delete from Google Tasks first
      await deleteGoogleTask(
        dbUser.id,
        existingTask.google_tasklist_id,
        existingTask.google_task_id,
        existingTask.google_account_email
      );

      // Delete from database (cascade to subtasks)
      await tasksRepo.deleteTask(taskId);
    });

    console.log(`[Task] Successfully deleted task ${taskId}`);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Task] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete task',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
