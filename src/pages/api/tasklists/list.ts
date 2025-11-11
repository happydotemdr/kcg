/**
 * GET /api/tasklists/list
 * List all tasklists for user
 */

import type { APIRoute } from 'astro';
import { findByUserId, findByAccountEmail } from '../../../lib/db/repositories/task-lists';
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
    const googleAccountEmail = url.searchParams.get('googleAccountEmail');

    // Fetch tasklists from database
    let tasklists;
    if (googleAccountEmail) {
      tasklists = await findByAccountEmail(dbUser.id, googleAccountEmail);
      console.log(
        `[Tasklists List] Found ${tasklists.length} tasklists for account ${googleAccountEmail} (user: ${auth.userId})`
      );
    } else {
      tasklists = await findByUserId(dbUser.id);
      console.log(
        `[Tasklists List] Found ${tasklists.length} tasklists for user ${auth.userId}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasklists,
        count: tasklists.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Tasklists List] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch tasklists',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
