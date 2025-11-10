/**
 * POST /api/chatkit/refresh
 *
 * Refresh ChatKit client tokens for authenticated users.
 * This endpoint is called by the frontend when a client_secret is approaching
 * expiry or has expired. It validates the existing token and issues a new one
 * with extended expiry.
 *
 * For self-hosted ChatKit backend, we use a JWT-style token approach
 * where tokens are time-limited and can be refreshed while the Clerk session
 * is still valid.
 */

import type { APIRoute } from 'astro';
import { validateClientSecret, generateClientSecret } from '../../../lib/chatkit-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { client_secret: existingSecret } = body;

    console.log('[ChatKit Refresh] Received refresh request');

    // Validate existing client_secret was provided
    if (!existingSecret || typeof existingSecret !== 'string') {
      console.error('[ChatKit Refresh] No client_secret provided');
      return new Response(
        JSON.stringify({ error: 'client_secret is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate with Clerk
    const { userId } = locals.auth();
    console.log('[ChatKit Refresh] Clerk User ID:', userId);

    if (!userId) {
      console.error('[ChatKit Refresh] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate existing client_secret (verify it belongs to this user)
    const validation = validateClientSecret(existingSecret, userId);

    if (!validation.valid) {
      console.error('[ChatKit Refresh] Invalid client_secret:', validation.reason);
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
          reason: validation.reason
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate new client_secret with extended expiry
    const { clientSecret, expiresAt } = generateClientSecret(userId);

    console.log('[ChatKit Refresh] Generated new client secret for user:', userId, 'expires at:', expiresAt);

    return new Response(
      JSON.stringify({
        client_secret: clientSecret,
        expires_at: expiresAt
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ChatKit Refresh] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to refresh session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
