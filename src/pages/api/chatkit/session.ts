/**
 * POST /api/chatkit/session
 *
 * Generate ChatKit client tokens for authenticated users.
 * This endpoint is called by the frontend to obtain a client_secret
 * that authorizes the ChatKit component to communicate with our backend.
 *
 * For self-hosted ChatKit backend, we use a JWT-style token approach
 * with HMAC signatures and expiry timestamps. Tokens are valid for 1 hour
 * and can be refreshed via the /api/chatkit/refresh endpoint.
 */

import type { APIRoute } from 'astro';
import { generateClientSecret } from '../../../lib/chatkit-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Authenticate with Clerk
    const { userId } = locals.auth();
    console.log('[ChatKit Session] Clerk User ID:', userId);

    if (!userId) {
      console.error('[ChatKit Session] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate client_secret with expiry using HMAC-signed token
    const { clientSecret, expiresAt } = generateClientSecret(userId);

    console.log('[ChatKit Session] Generated client secret for user:', userId, 'expires at:', expiresAt);

    return new Response(
      JSON.stringify({
        client_secret: clientSecret,
        expires_at: expiresAt
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ChatKit Session] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
