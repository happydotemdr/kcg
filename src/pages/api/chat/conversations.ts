/**
 * GET /api/chat/conversations
 * List all conversations
 */

import type { APIRoute } from 'astro';
import { listConversations } from '../../../lib/storage';

export const GET: APIRoute = async () => {
  try {
    const conversations = await listConversations();

    return new Response(JSON.stringify(conversations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to list conversations',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
