/**
 * GET/DELETE /api/gpt/conversations/[id]
 * Get or delete a specific ChatGPT conversation
 */

import type { APIRoute } from 'astro';
import { getConversation, deleteConversation } from '../../../../lib/gpt-storage';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Check authentication
    const auth = locals.auth;
    const userId = auth?.userId || null;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const conversation = await getConversation(id);

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Check authentication
    const auth = locals.auth;
    const userId = auth?.userId || null;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = await deleteConversation(id);

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete conversation' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
