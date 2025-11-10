/**
 * POST /api/chatkit/approve
 *
 * Handle tool approval responses from the frontend.
 * This endpoint receives approval/rejection decisions and stores them
 * in a temporary cache for the backend stream to retrieve.
 *
 * Flow:
 * 1. Backend detects tool approval needed
 * 2. Backend emits tool_approval_requested event with approval_id
 * 3. Frontend shows approval modal
 * 4. User approves/rejects
 * 5. Frontend POSTs to this endpoint
 * 6. Backend retrieves decision and continues execution
 */

import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory cache for approval responses
// In production, use Redis or similar for multi-instance deployments
const approvalCache = new Map<string, { approved: boolean; timestamp: number }>();

// Clean up old approvals (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [approvalId, data] of approvalCache.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      approvalCache.delete(approvalId);
    }
  }
}, 60 * 1000); // Run cleanup every minute

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Authenticate with Clerk
    const { userId } = locals.auth();
    console.log('[ChatKit Approve] Clerk User ID:', userId);

    if (!userId) {
      console.error('[ChatKit Approve] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { approval_id, approved } = body;

    console.log('[ChatKit Approve] Received approval response:', {
      approval_id,
      approved,
    });

    // Validate input
    if (!approval_id || typeof approval_id !== 'string') {
      console.error('[ChatKit Approve] Invalid approval_id');
      return new Response(
        JSON.stringify({ error: 'approval_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof approved !== 'boolean') {
      console.error('[ChatKit Approve] Invalid approved value');
      return new Response(
        JSON.stringify({ error: 'approved must be a boolean' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store approval decision in cache
    approvalCache.set(approval_id, {
      approved,
      timestamp: Date.now(),
    });

    console.log('[ChatKit Approve] Approval decision stored:', approval_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ChatKit Approve] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process approval' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET /api/chatkit/approve?approval_id=xxx
 *
 * Internal endpoint for backend to retrieve approval decisions.
 * Returns approval status or null if not yet decided.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Authenticate with Clerk (internal requests only)
    const { userId } = locals.auth();

    if (!userId) {
      console.error('[ChatKit Approve GET] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const approvalId = url.searchParams.get('approval_id');

    if (!approvalId) {
      return new Response(
        JSON.stringify({ error: 'approval_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check cache for approval decision
    const decision = approvalCache.get(approvalId);

    if (decision) {
      // Remove from cache after retrieval (one-time use)
      approvalCache.delete(approvalId);

      console.log('[ChatKit Approve GET] Retrieved approval decision:', approvalId, decision.approved);

      return new Response(
        JSON.stringify({
          approved: decision.approved,
          timestamp: decision.timestamp,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // No decision yet
      return new Response(
        JSON.stringify({ approved: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[ChatKit Approve GET] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve approval' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
