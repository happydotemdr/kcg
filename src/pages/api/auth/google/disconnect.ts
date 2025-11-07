/**
 * POST /api/auth/google/disconnect
 * Disconnect user's Google Calendar
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { deleteOAuthToken } from '../../../../lib/db/repositories/google-oauth';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the database user
    const user = await findUserByClerkId(clerkUserId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete OAuth token
    const deleted = await deleteOAuthToken(user.id);

    return new Response(
      JSON.stringify({
        success: deleted,
        message: deleted ? 'Calendar disconnected successfully' : 'No calendar connection found',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Calendar disconnect error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to disconnect calendar',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
