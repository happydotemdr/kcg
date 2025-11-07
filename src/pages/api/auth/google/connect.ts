/**
 * GET /api/auth/google/connect
 * Initiates Google OAuth flow for calendar access
 */

import type { APIRoute } from 'astro';
import { getAuthorizationUrl } from '../../../../lib/google-calendar';

export const prerender = false;

export const GET: APIRoute = async ({ locals, redirect }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store user ID in session/state for callback
    // We'll use a simple state parameter that includes the clerk user ID
    const authUrl = getAuthorizationUrl();

    // Append state parameter with clerk user ID (you might want to encrypt this in production)
    const urlWithState = `${authUrl}&state=${encodeURIComponent(userId)}`;

    // Redirect to Google OAuth consent screen
    return redirect(urlWithState, 302);

  } catch (error) {
    console.error('Google OAuth connect error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth flow',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
