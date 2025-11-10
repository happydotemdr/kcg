/**
 * POST /api/chatkit/session
 *
 * Generate ChatKit client tokens for authenticated users.
 * This endpoint is called by the frontend to obtain a client_secret
 * that authorizes the ChatKit component to communicate with our backend.
 *
 * For self-hosted ChatKit backend, we use a simple session approach
 * where the Clerk session is sufficient for authentication.
 */

import type { APIRoute } from 'astro';

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

    // For self-hosted backend, we just need to confirm auth
    // The actual session is managed by Clerk
    // Return a client_secret that ChatKit can use
    const clientSecret = `chatkit_${userId}_${Date.now()}`;

    console.log('[ChatKit Session] Generated client secret for user:', userId);

    return new Response(
      JSON.stringify({ client_secret: clientSecret }),
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
