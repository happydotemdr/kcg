/**
 * GET /api/chat/conversations/[id]
 * Get a specific conversation
 *
 * DELETE /api/chat/conversations/[id]
 * Delete a conversation
 */

import type { APIRoute } from 'astro';
import { getConversation, deleteConversation } from '../../../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  // Check authentication
  const { userId } = locals.auth();

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

  try {
    const conversation = await getConversation(id);

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this conversation (allow access if userId is undefined for backward compatibility)
    if (conversation.userId !== undefined && conversation.userId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this conversation' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get conversation',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  // Check authentication
  const { userId } = locals.auth();

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

  try {
    // First, verify the conversation exists and user owns it
    const conversation = await getConversation(id);

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this conversation (allow access if userId is undefined for backward compatibility)
    if (conversation.userId !== undefined && conversation.userId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this conversation' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
