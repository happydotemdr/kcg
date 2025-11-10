/**
 * POST /api/chatkit/runs/qa
 *
 * Q&A endpoint using OpenAI Responses API (Chat Completions without tools)
 * Handles general questions and conversations that don't require calendar operations
 *
 * This endpoint is called when the user's message doesn't indicate calendar intent
 * Benefits: Lower latency, simpler logging, more cost-effective for simple queries
 */

import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { streamQAResponse } from '../../../../lib/openai-routing';
import { buildEnhancedSystemPrompt } from '../../../../lib/openai';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import {
  createConversation,
  getConversation,
  updateConversation,
} from '../../../../lib/gpt-storage';
import type { Message, Conversation } from '../../../../types/chat';
import type {
  ThreadStreamEvent,
  Thread,
  ThreadItem,
  UserMessageItem,
  AssistantMessageItem,
  EndOfTurnItem,
} from '../../../../types/chatkit-events';

export const prerender = false;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Emit a ThreadStreamEvent via SSE
 */
function emitSSE(controller: ReadableStreamDefaultController, event: ThreadStreamEvent): void {
  const data = JSON.stringify(event);
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
}

/**
 * Convert Conversation to Thread object
 */
function conversationToThread(conversation: Conversation): Thread {
  return {
    id: conversation.id,
    title: conversation.title,
    created_at: new Date(conversation.createdAt).toISOString(),
    status: { type: 'active' },
    metadata: {},
    items: {
      data: conversation.messages.map((msg) => messageToThreadItem(msg, conversation.id)),
      has_more: false,
      after: null,
    },
  };
}

/**
 * Convert Message to ThreadItem (UserMessageItem or AssistantMessageItem)
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
 * Convert our Message format to simple OpenAI format for Responses API
 */
function toSimpleMessages(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map(msg => {
    // Extract text content only (Responses API doesn't need complex multimodal for simple Q&A)
    const textContent = msg.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return {
      role: msg.role,
      content: textContent,
    };
  });
}

// ============================================================================
// API Route Handler
// ============================================================================

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();
    console.log('[Q&A] Clerk User ID:', clerkUserId);

    if (!clerkUserId) {
      console.error('[Q&A] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(clerkUserId);
    console.log('[Q&A] Database user lookup result:', dbUser ? `Found: ${dbUser.id}` : 'NOT FOUND');

    if (!dbUser) {
      console.error('[Q&A] User not found in database. Clerk ID:', clerkUserId);
      return new Response(
        JSON.stringify({ error: 'User not found in database', clerkUserId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Q&A] OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          details: 'OPENAI_API_KEY is not configured. Please add it to your .env file.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { conversationId, message, images, model, systemPrompt } = body;

    console.log('[Q&A] Request:', {
      conversationId: conversationId || 'NEW',
      messageLength: message?.length || 0,
      hasImages: !!images?.length,
      model: model || 'default',
    });

    if (!message || message.trim() === '') {
      console.error('[Q&A] Empty message received');
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: [
        { type: 'text', text: message },
        ...(images || []).map((img: { mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string }) => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: img.mediaType,
            data: img.data,
          },
        })),
      ],
      timestamp: Date.now(),
    };

    console.log('[Q&A] User message created:', {
      id: userMessage.id,
      contentBlocks: userMessage.content.length,
    });

    // Get or create conversation
    let conversation: Conversation;
    const isNewConversation = !conversationId;

    if (conversationId) {
      console.log('[Q&A] Loading existing conversation:', conversationId);
      const existingConversation = await getConversation(conversationId);
      if (!existingConversation) {
        console.error('[Q&A] Conversation not found:', conversationId);
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      conversation = existingConversation;
      console.log('[Q&A] Conversation loaded:', {
        id: conversation.id,
        messageCount: conversation.messages.length,
      });
    } else {
      console.log('[Q&A] Creating new conversation');
      conversation = await createConversation(userMessage, clerkUserId, model, systemPrompt);
      console.log('[Q&A] New conversation created:', conversation.id);
    }

    // Add user message to conversation if it already existed
    if (conversationId) {
      await updateConversation(conversation.id, [userMessage]);
      conversation.messages.push(userMessage);
      console.log('[Q&A] User message added to conversation, total messages:', conversation.messages.length);
    }

    // Build enhanced system prompt (includes date/time context)
    console.log('[Q&A] Building enhanced system prompt for user:', dbUser.id);
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(
      dbUser.id,
      conversation.systemPrompt
    );
    console.log('[Q&A] Enhanced system prompt length:', enhancedSystemPrompt.length);

    // Convert messages to simple format for Responses API
    const simpleMessages = toSimpleMessages(conversation.messages);

    // Set up streaming response with ThreadStreamEvent protocol
    const stream = new ReadableStream({
      async start(controller) {
        let assistantItemId = `msg-${Date.now()}`;
        let accumulatedText = '';
        let hasError = false;

        console.log('[Q&A] Starting SSE stream (ThreadStreamEvent protocol)');

        try {
          // ============================================================
          // Event Flow:
          // 1. thread.created (only for new conversations)
          // 2. thread.item.added (user message)
          // 3. thread.item.added (assistant message shell)
          // 4. thread.item.updated (text streaming)
          // 5. thread.item.done (assistant message complete)
          // 6. thread.item.added (end_of_turn)
          // ============================================================

          // Step 1: Emit thread.created for new conversations
          if (isNewConversation) {
            const thread = conversationToThread(conversation);
            emitSSE(controller, { type: 'thread.created', thread });
            console.log('[Q&A] Emitted thread.created');
          }

          // Step 2: Emit user message item
          const userItem = messageToThreadItem(userMessage, conversation.id);
          emitSSE(controller, { type: 'thread.item.added', item: userItem });
          console.log('[Q&A] Emitted user message item');

          // Step 3: Create and emit assistant message shell (empty content)
          const assistantItem: AssistantMessageItem = {
            id: assistantItemId,
            thread_id: conversation.id,
            created_at: new Date().toISOString(),
            type: 'assistant_message',
            content: [],
          };
          emitSSE(controller, { type: 'thread.item.added', item: assistantItem });
          console.log('[Q&A] Emitted assistant message shell');

          // Step 4-6: Stream Q&A response using Responses API
          await streamQAResponse(
            simpleMessages,
            enhancedSystemPrompt,

            // onText: Stream text deltas
            (text: string) => {
              if (hasError) return;

              accumulatedText += text;

              // Update assistant message content
              assistantItem.content = [{
                type: 'output_text',
                text: accumulatedText,
                annotations: [],
              }];

              // Emit thread.item.updated with new content
              emitSSE(controller, {
                type: 'thread.item.updated',
                item_id: assistantItemId,
                update: { content: assistantItem.content },
              });

              console.log('[Q&A] Streamed text chunk, length:', text.length, 'total:', accumulatedText.length);
            },

            // onComplete: Mark done and save to storage
            async (fullText: string) => {
              if (hasError) return;

              console.log('[Q&A] Response complete, final text length:', fullText.length);

              // Ensure final text is set
              assistantItem.content = [{
                type: 'output_text',
                text: fullText,
                annotations: [],
              }];

              // Emit thread.item.done
              emitSSE(controller, {
                type: 'thread.item.done',
                item: assistantItem,
              });

              console.log('[Q&A] Emitted thread.item.done');

              // Emit end_of_turn
              const endOfTurn: EndOfTurnItem = {
                id: `eot-${Date.now()}`,
                thread_id: conversation.id,
                created_at: new Date().toISOString(),
                type: 'end_of_turn',
              };
              emitSSE(controller, { type: 'thread.item.added', item: endOfTurn });

              console.log('[Q&A] Emitted end_of_turn');

              // Save assistant message to conversation
              const assistantMessage: Message = {
                id: assistantItemId,
                role: 'assistant',
                content: [{ type: 'text', text: fullText }],
                timestamp: Date.now(),
              };

              await updateConversation(conversation.id, [assistantMessage]);
              console.log('[Q&A] Assistant message saved to conversation');

              console.log('[Q&A] Stream completed successfully');
              controller.close();
            },

            // onError: Emit error event
            (error: Error) => {
              hasError = true;
              console.error('[Q&A] Response error:', error);

              emitSSE(controller, {
                type: 'error',
                code: 'custom',
                message: error.message || 'An error occurred during Q&A',
                allow_retry: true,
              });

              controller.close();
            }
          );
        } catch (error) {
          hasError = true;
          console.error('[Q&A] Stream setup error:', error);

          emitSSE(controller, {
            type: 'error',
            code: 'custom',
            message: error instanceof Error ? error.message : 'Unknown error',
            allow_retry: true,
          });

          controller.close();
        }
      },
    });

    console.log('[Q&A] Returning SSE stream response (ThreadStreamEvent protocol)');

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Q&A] Top-level error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
