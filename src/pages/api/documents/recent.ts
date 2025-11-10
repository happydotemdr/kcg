/**
 * Recent Documents API Endpoint
 * GET /api/documents/recent
 * Get recent document uploads (last 7 days) with stats
 */

import type { APIRoute } from 'astro';
import { getRecentDocuments, getDocumentStats } from '../../../lib/db';

export const GET: APIRoute = async ({ locals, url }) => {
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

    // Get days parameter (default 7)
    const days = parseInt(url.searchParams.get('days') || '7');

    // Fetch recent documents and stats
    const [documents, stats] = await Promise.all([
      getRecentDocuments(userId, days),
      getDocumentStats(userId),
    ]);

    return new Response(
      JSON.stringify({
        documents,
        stats,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to fetch recent documents:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
