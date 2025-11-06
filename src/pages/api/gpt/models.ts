/**
 * GET /api/gpt/models
 * List available OpenAI models
 */

import type { APIRoute } from 'astro';
import { AVAILABLE_MODELS } from '../../../lib/openai';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(AVAILABLE_MODELS), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
