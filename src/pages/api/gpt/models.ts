/**
 * GET /api/gpt/models
 * List available OpenAI models
 */

import type { APIRoute } from 'astro';
import { AVAILABLE_MODELS } from '../../../lib/openai';

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
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
