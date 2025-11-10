/**
 * Recent Documents API Endpoint
 * GET /api/documents/recent
 * Get recent document uploads (last 7 days) with stats
 */

import type { APIRoute } from 'astro';
import { getRecentDocuments, getDocumentStats } from '../../../lib/db';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const GET: APIRoute = async ({ locals, url }) => {
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

    // Get days parameter (default 7)
    const days = parseInt(url.searchParams.get('days') || '7');

    // Fetch recent documents and stats
    const [documents, stats] = await Promise.all([
      getRecentDocuments(dbUser.id, days),
      getDocumentStats(dbUser.id),
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
