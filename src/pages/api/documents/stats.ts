/**
 * Document Stats API Endpoint
 * GET /api/documents/stats
 * Get document statistics for the current user
 */

import type { APIRoute } from 'astro';
import { getDocumentStats } from '../../../lib/db';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();

    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(clerkUserId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch document statistics
    const stats = await getDocumentStats(dbUser.id);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch document stats:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
