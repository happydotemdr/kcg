/**
 * GET /api/gpt/models
 * List available OpenAI models
 */

import type { APIRoute } from 'astro';
import { AVAILABLE_MODELS } from '../../../lib/openai';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const { userId } = locals.auth();

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
  } catch (error) {
    console.error('Error listing models:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
