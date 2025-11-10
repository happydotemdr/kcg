/**
 * POST /api/chatkit/threads/[id]/actions
 * GET /api/chatkit/threads/[id]/actions (with approval_id query param)
 *
 * ChatKit Protocol: Handle custom actions for tool approval flow
 *
 * This endpoint manages the human-in-the-loop tool approval process:
 * - POST: User approves or rejects a tool call
 * - GET: Polling endpoint to check approval status
 *
 * POST Request body: {
 *   approval_id: string,
 *   approved: boolean
 * }
 *
 * GET Query params: ?approval_id=xyz
 * GET Response: { approved: boolean | null }
 */

import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory approval store (ephemeral, only during request lifecycle)
// In production, you'd want Redis or similar for distributed systems
const approvalStore = new Map<string, boolean | null>();

// Cleanup old approvals (prevent memory leaks)
const APPROVAL_EXPIRY_MS = 60000; // 60 seconds
const approvalTimestamps = new Map<string, number>();

function cleanupOldApprovals() {
  const now = Date.now();
  for (const [id, timestamp] of approvalTimestamps.entries()) {
    if (now - timestamp > APPROVAL_EXPIRY_MS) {
      approvalStore.delete(id);
      approvalTimestamps.delete(id);
    }
  }
}

/**
 * GET - Check approval status (polling endpoint)
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const { userId: clerkUserId, isAuthenticated } = locals.auth();

    if (!isAuthenticated || !clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const approvalId = url.searchParams.get('approval_id');

    if (!approvalId) {
      return new Response(
        JSON.stringify({ error: 'approval_id query parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ChatKit:GET /threads/:id/actions] Checking approval status:', approvalId);

    // Cleanup old approvals periodically
    cleanupOldApprovals();

    const approved = approvalStore.get(approvalId) ?? null;

    console.log('[ChatKit:GET /threads/:id/actions] Approval status:', approved);

    return new Response(
      JSON.stringify({ approved }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ChatKit:GET /threads/:id/actions] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to check approval status',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * POST - Submit approval decision
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { userId: clerkUserId, isAuthenticated } = locals.auth();

    if (!isAuthenticated || !clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { approval_id, approved } = body;

    if (!approval_id || typeof approved !== 'boolean') {
      return new Response(
        JSON.stringify({
          error: 'approval_id (string) and approved (boolean) are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ChatKit:POST /threads/:id/actions] Submitting approval:', approval_id, approved);

    // Store approval decision
    approvalStore.set(approval_id, approved);
    approvalTimestamps.set(approval_id, Date.now());

    console.log('[ChatKit:POST /threads/:id/actions] Approval decision stored');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ChatKit:POST /threads/:id/actions] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to submit approval',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
