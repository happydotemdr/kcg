/**
 * GET /api/chatkit/threads/[id]
 * DELETE /api/chatkit/threads/[id]
 *
 * ChatKit Protocol: Get or delete a specific thread
 *
 * GET Response: { thread: Thread }
 * DELETE Response: { success: true }
 */

import type { APIRoute } from 'astro';
import { getConversation, deleteConversation } from '../../../../lib/gpt-storage';
import type { Conversation, Message } from '../../../../types/chat';
import type {
  Thread,
  ThreadItem,
  UserMessageItem,
  AssistantMessageItem,
} from '../../../../types/chatkit-events';

export const prerender = false;

/**
 * Convert Message to ThreadItem
 */
function messageToThreadItem(message: Message, threadId: string): ThreadItem {
  const base = {
    id: message.id,
    thread_id: threadId,
    created_at: new Date(message.timestamp).toISOString(),
  };

  if (message.role === 'user') {
    const userItem: UserMessageItem = {
      ...base,
      type: 'user_message',
      content: message.content
        .filter((c) => c.type === 'text')
        .map((c) => ({ type: 'input_text', text: c.text })),
      attachments: message.content
        .filter((c) => c.type === 'image')
        .map((c, idx) => ({
          type: 'image',
          id: `img-${message.id}-${idx}`,
          name: `image-${idx}.jpg`,
          mime_type: c.source.media_type,
          url: `data:${c.source.media_type};base64,${c.source.data}`,
        })),
      quoted_text: null,
    };
    return userItem;
  } else {
    const assistantItem: AssistantMessageItem = {
      ...base,
      type: 'assistant_message',
      content: message.content
        .filter((c) => c.type === 'text')
        .map((c) => ({ type: 'output_text', text: c.text, annotations: [] })),
    };
    return assistantItem;
  }
}

/**
 * Convert Conversation to Thread
 */
function conversationToThread(conversation: Conversation): Thread {
  return {
    id: conversation.id,
    title: conversation.title,
    created_at: new Date(conversation.createdAt).toISOString(),
    status: { type: 'active' },
    metadata: {
      model: conversation.model,
      messageCount: conversation.messages.length,
    },
    items: {
      data: conversation.messages.map((msg) =>
        messageToThreadItem(msg, conversation.id)
      ),
      has_more: false,
      after: null,
    },
  };
}

/**
 * GET - Retrieve thread details
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { userId: clerkUserId, isAuthenticated } = locals.auth();
    console.log('[ChatKit:GET /threads/:id] Clerk User ID:', clerkUserId);

    if (!isAuthenticated || !clerkUserId) {
      console.error('[ChatKit:GET /threads/:id] Unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const threadId = params.id;
    if (!threadId) {
      return new Response(
        JSON.stringify({ error: 'Thread ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ChatKit:GET /threads/:id] Fetching thread:', threadId);

    const conversation = await getConversation(threadId);
    if (!conversation) {
      console.error('[ChatKit:GET /threads/:id] Thread not found:', threadId);
      return new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const thread = conversationToThread(conversation);

    console.log('[ChatKit:GET /threads/:id] Thread retrieved with', thread.items.data.length, 'items');

    return new Response(
      JSON.stringify({ thread }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ChatKit:GET /threads/:id] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get thread',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * DELETE - Delete a thread
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const { userId: clerkUserId, isAuthenticated } = locals.auth();
    console.log('[ChatKit:DELETE /threads/:id] Clerk User ID:', clerkUserId);

    if (!isAuthenticated || !clerkUserId) {
      console.error('[ChatKit:DELETE /threads/:id] Unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const threadId = params.id;
    if (!threadId) {
      return new Response(
        JSON.stringify({ error: 'Thread ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ChatKit:DELETE /threads/:id] Deleting thread:', threadId);

    await deleteConversation(threadId);

    console.log('[ChatKit:DELETE /threads/:id] Thread deleted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ChatKit:DELETE /threads/:id] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete thread',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
