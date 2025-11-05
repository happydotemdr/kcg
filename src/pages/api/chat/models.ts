/**
 * GET /api/chat/models
 * List available Claude models
 */

import type { APIRoute } from 'astro';
import { AVAILABLE_MODELS } from '../../../lib/claude';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(AVAILABLE_MODELS), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
