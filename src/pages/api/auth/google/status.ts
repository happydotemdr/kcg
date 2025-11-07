/**
 * GET /api/auth/google/status
 * Check if user has connected their Google Calendar
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import { isCalendarConnected } from '../../../../lib/google-calendar';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
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
        JSON.stringify({ connected: false, error: 'User not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if calendar is connected
    const connected = await isCalendarConnected(user.id);

    return new Response(
      JSON.stringify({ connected }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Calendar status check error:', error);
    return new Response(
      JSON.stringify({
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
