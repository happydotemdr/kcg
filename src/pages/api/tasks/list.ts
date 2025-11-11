/**
 * GET /api/tasks/list
 * List tasks by tasklist with optional filtering
 */

import type { APIRoute } from 'astro';
import { findByTasklistId } from '../../../lib/db/repositories/tasks';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
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

    // Parse query parameters
    const url = new URL(request.url);
    const tasklistId = url.searchParams.get('tasklistId');
    const status = url.searchParams.get('status') as 'needsAction' | 'completed' | 'all' | null;
    const showCompletedParam = url.searchParams.get('showCompleted');
    const showCompleted = showCompletedParam !== null ? showCompletedParam === 'true' : true;

    if (!tasklistId) {
      return new Response(
        JSON.stringify({ error: 'tasklistId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine status filter
    let statusFilter: 'needsAction' | 'completed' | undefined;
    if (status === 'needsAction' || status === 'completed') {
      statusFilter = status;
    } else if (status === 'all') {
      statusFilter = undefined; // No filter
    } else if (!showCompleted) {
      statusFilter = 'needsAction'; // Default: only active tasks if showCompleted is false
    }

    // Fetch tasks from database
    const tasks = await findByTasklistId(
      dbUser.id,
      tasklistId,
      statusFilter ? { status: statusFilter } : undefined
    );

    console.log(
      `[Tasks List] Found ${tasks.length} tasks for tasklist ${tasklistId} (user: ${auth.userId})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        tasks,
        count: tasks.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Tasks List] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
