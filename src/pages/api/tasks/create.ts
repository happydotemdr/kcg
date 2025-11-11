/**
 * POST /api/tasks/create
 * Create task in Google Tasks + DB
 */

import type { APIRoute } from 'astro';
import { createTask } from '../../../lib/db/repositories/tasks';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import { createTask as createGoogleTask } from '../../../lib/google-tasks';
import { withUserMutex } from '../../../lib/sync-queue';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
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

    const body = await request.json() as {
      tasklistId: string;
      title: string;
      notes?: string;
      due_date?: string;
      calendarEventId?: string;
      parentTaskId?: string;
      googleAccountEmail?: string;
    };

    if (!body.tasklistId || !body.title) {
      return new Response(
        JSON.stringify({ error: 'tasklistId and title are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Task] Creating task in tasklist ${body.tasklistId}`, body);

    // Create task via withUserMutex for sequential execution
    const task = await withUserMutex(dbUser.id, async () => {
      // Create in Google Tasks first
      const googleTask = await createGoogleTask(
        dbUser.id,
        body.tasklistId,
        {
          title: body.title,
          notes: body.notes,
          due: body.due_date,
          parent: body.parentTaskId, // For subtasks (uses Google parent, not DB parent)
        },
        body.googleAccountEmail
      );

      // Save to DB with all fields
      const dbTask = await createTask({
        user_id: dbUser.id,
        google_account_email: body.googleAccountEmail || null,
        google_task_id: googleTask.id,
        google_tasklist_id: body.tasklistId,
        title: googleTask.title,
        notes: googleTask.notes || null,
        status: googleTask.status,
        due_date: googleTask.due ? new Date(googleTask.due) : null,
        calendar_event_id: body.calendarEventId || null,
        parent_task_id: body.parentTaskId || null, // DB reference for subtasks
        position: googleTask.position,
        metadata: null,
      });

      return dbTask;
    });

    console.log(`[Task] Successfully created task ${task.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        task,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Task] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create task',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
