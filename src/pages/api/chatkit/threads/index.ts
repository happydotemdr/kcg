/**
 * POST /api/chatkit/threads
 *
 * ChatKit Protocol: Create a new thread (conversation)
 *
 * Request body: {}
 * Response: { thread: Thread }
 */

import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { createConversation } from '../../../lib/gpt-storage';
import type { Conversation } from '../../../types/chat';
import type { Thread } from '../../../types/chatkit-events';

export const prerender = false;

/**
 * Convert Conversation to Thread object
 */
function conversationToThread(conversation: Conversation): Thread {
  return {
    id: conversation.id,
    title: conversation.title || 'New Chat',
    created_at: new Date(conversation.createdAt).toISOString(),
    status: { type: 'active' },
    metadata: {
      model: conversation.model,
      messageCount: conversation.messages.length,
    },
    items: {
      data: [],
      has_more: false,
      after: null,
    },
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication (Clerk v2 pattern)
    const { userId: clerkUserId, isAuthenticated } = locals.auth();
    console.log('[ChatKit:POST /threads] Clerk User ID:', clerkUserId);

    if (!isAuthenticated || !clerkUserId) {
      console.error('[ChatKit:POST /threads] Unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (may contain initial settings)
    const body = await request.json().catch(() => ({}));
    const { model = 'gpt-4o', systemPrompt } = body;

    console.log('[ChatKit:POST /threads] Creating new thread');

    // Create a placeholder user message for conversation initialization
    const placeholderMessage = {
      id: uuidv4(),
      role: 'user' as const,
      content: [{ type: 'text' as const, text: '' }],
      timestamp: Date.now(),
    };

    // Create new conversation
    const conversation = await createConversation(
      placeholderMessage,
      clerkUserId,
      model,
      systemPrompt
    );

    console.log('[ChatKit:POST /threads] Thread created:', conversation.id);

    // Convert to Thread format
    const thread = conversationToThread(conversation);

    return new Response(
      JSON.stringify({ thread }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ChatKit:POST /threads] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create thread',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
