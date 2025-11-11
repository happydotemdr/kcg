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

    // Store user ID and mode in state for callback
    // Format: userId|mode (e.g., "user_123|add")
    const authUrl = getAuthorizationUrl();

    // Build state parameter with userId and optional mode
    const stateValue = mode ? `${userId}|${mode}` : userId;
    const urlWithState = `${authUrl}&state=${encodeURIComponent(stateValue)}`;

    // Add prompt=consent to force account selection when adding accounts
    const finalUrl = mode === 'add' ? `${urlWithState}&prompt=consent` : urlWithState;

    // Redirect to Google OAuth consent screen
    return redirect(finalUrl, 302);

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
