/**
 * GET /api/gpt/conversations
 * List all ChatGPT conversations
 */

import type { APIRoute } from 'astro';
import { listConversations } from '../../../lib/gpt-storage';

export const GET: APIRoute = async ({ locals }) => {
  try {
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

    const conversations = await listConversations();

    return new Response(JSON.stringify(conversations), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
