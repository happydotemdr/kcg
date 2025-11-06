/**
 * GET /api/gpt/models
 * List available OpenAI models
 */

import type { APIRoute } from 'astro';
import { AVAILABLE_MODELS } from '../../../lib/openai';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // Check authentication
  let userId: string | null = null;
  try {
    const auth = (locals as any).auth();
    userId = auth?.userId || null;
  } catch (authError) {
    console.error('Authentication error:', authError);
    return new Response(
      JSON.stringify({
        error: 'Authentication service error. Please ensure CLERK_SECRET_KEY is configured.',
        details: authError instanceof Error ? authError.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
