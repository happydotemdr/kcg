/**
 * POST /api/chatkit/backend
 *
 * ChatKit backend router endpoint
 * This endpoint:
 * 1. Authenticates the request
 * 2. Detects user intent (calendar vs Q&A)
 * 3. Routes to appropriate endpoint:
 *    - /api/chatkit/runs/calendar - For calendar operations (Agents SDK with tools)
 *    - /api/chatkit/runs/qa - For general Q&A (Responses API, no tools)
 *
 * Benefits of routing:
 * - Calendar Agent: Multi-step tool execution, calendar CRUD operations
 * - Q&A: Lower latency, simpler logging, more cost-effective
 *
 * SSE Protocol: ThreadStreamEvent (see /docs/chatkit-event-mapping.md)
 */

import type { APIRoute } from 'astro';
import { detectIntent } from '../../../lib/openai-routing';

export const prerender = false;

// ============================================================================
// API Route Handler - Router
// ============================================================================

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();
    console.log('[ChatKit Router] Clerk User ID:', clerkUserId);

    if (!clerkUserId) {
      console.error('[ChatKit Router] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body to extract message for intent detection
    const body = await request.json();
    const { message } = body;

    if (!message || message.trim() === '') {
      console.error('[ChatKit Router] Empty message received');
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Detect intent (calendar vs Q&A)
    const intent = detectIntent(message);
    console.log('[ChatKit Router] Detected intent:', intent, 'for message:', message.substring(0, 100));

    // Route to appropriate endpoint
    const targetEndpoint = intent === 'calendar'
      ? '/api/chatkit/runs/calendar'
      : '/api/chatkit/runs/qa';

    console.log('[ChatKit Router] Routing to:', targetEndpoint);

    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const targetUrl = `${baseUrl}${targetEndpoint}`;

    // Forward the request to the target endpoint
    const forwardedRequest = new Request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || '', // Forward auth cookies
      },
      body: JSON.stringify(body),
    });

    // Make the request to the target endpoint
    const response = await fetch(forwardedRequest);

    // Return the streaming response directly
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });

  } catch (error) {
    console.error('[ChatKit Router] Top-level error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
