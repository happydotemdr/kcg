/**
 * GET /api/chat/models
 * List available Claude models
 */

import type { APIRoute } from 'astro';
import { AVAILABLE_MODELS } from '../../../lib/claude';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // Check authentication
  const { userId } = (locals as any).auth();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(AVAILABLE_MODELS), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
