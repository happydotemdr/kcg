/**
 * API Endpoint: GET /api/calendar/calendars
 * Lists all available Google Calendars for the authenticated user
 * Used for calendar configuration/mapping
 */

import type { APIRoute } from 'astro';
import { listCalendars } from '../../../lib/google-calendar';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const auth = locals.auth();
    if (!auth?.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user
    const dbUser = await findUserByClerkId(auth.userId);
    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'User not found in database' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // List calendars from Google
    const calendars = await listCalendars(dbUser.id);

    return new Response(JSON.stringify({ calendars }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing calendars:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: 'Failed to list calendars',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
