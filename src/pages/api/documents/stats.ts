/**
 * Document Stats API Endpoint
 * GET /api/documents/stats
 * Get document statistics for the current user
 */

import type { APIRoute } from 'astro';
import { getDocumentStats } from '../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const auth = await locals.auth();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch document statistics
    const stats = await getDocumentStats(userId);

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
