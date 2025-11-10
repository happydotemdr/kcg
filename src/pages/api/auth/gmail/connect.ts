/**
 * GET /api/auth/gmail/connect
 * Initiates Gmail OAuth flow for email access
 */

import type { APIRoute } from 'astro';
import { getGmailAuthorizationUrl } from '../../../../lib/gmail-agent';

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

    console.log(`[Gmail OAuth] Initiating connection for user ${userId}`);

    // Generate authorization URL with user ID in state
    const authUrl = getGmailAuthorizationUrl(userId);

    console.log('[Gmail OAuth] Redirecting to Google consent screen');

    // Redirect to Google OAuth consent screen
    return redirect(authUrl, 302);

  } catch (error) {
    console.error('[Gmail OAuth] Connect error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth flow',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
