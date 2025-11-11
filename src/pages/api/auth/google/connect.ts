/**
 * GET /api/auth/google/connect
 * Initiates Google OAuth flow for calendar access
 */

import type { APIRoute } from 'astro';
import { getAuthorizationUrl } from '../../../../lib/google-calendar';

export const prerender = false;

export const GET: APIRoute = async ({ locals, redirect, url }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get mode parameter (optional: 'add' to add a second+ account)
    const mode = url.searchParams.get('mode');

    // Build state parameter with userId and optional mode
    // Format: userId|mode (e.g., "user_123|add")
    const stateValue = mode ? `${userId}|${mode}` : userId;

    // Generate auth URL with state parameter included
    const authUrl = getAuthorizationUrl(stateValue);

    // Redirect to Google OAuth consent screen
    return redirect(authUrl, 302);

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
