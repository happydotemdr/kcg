/**
 * POST /api/chatkit/threads/[id]/messages
 *
 * ChatKit Protocol: Send a message to a thread with SSE streaming
 *
 * This is the core endpoint that handles:
 * - User message submission
 * - OpenAI Agents SDK execution with calendar tools
 * - SSE streaming with ThreadStreamEvent protocol
 * - Conversation persistence
 *
 * Request body: {
 *   content: Array<{ type: 'input_text', text: string } | { type: 'input_image', ... }>
 * }
 *
 * Response: SSE stream with ThreadStreamEvent format
 */

import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { createGPTAgent, runAgentWithStreaming } from '../../../../../lib/openai-agents';
import { buildEnhancedSystemPrompt } from '../../../../../lib/openai';
import { findUserByClerkId } from '../../../../../lib/db/repositories/users';
import {
  getConversation,
  updateConversation,
} from '../../../../../lib/gpt-storage';
import type { Message } from '../../../../../types/chat';
import type {
  ThreadStreamEvent,
  AssistantMessageItem,
  EndOfTurnItem,
  ClientToolCallItem,
  UserMessageItem,
} from '../../../../../types/chatkit-events';

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
 * Convert Message to ThreadItem (UserMessageItem)
 */
function messageToThreadItem(message: Message, threadId: string): UserMessageItem {
  return {
    id: message.id,
    thread_id: threadId,
    created_at: new Date(message.timestamp).toISOString(),
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
}

// ============================================================================
// API Route Handler
// ============================================================================

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Check authentication (Clerk v2 pattern)
    const { userId: clerkUserId, isAuthenticated } = locals.auth();
    console.log('[ChatKit:POST /threads/:id/messages] Clerk User ID:', clerkUserId);

    if (!isAuthenticated || !clerkUserId) {
      console.error('[ChatKit:POST /threads/:id/messages] Unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get thread ID from params
    const threadId = params.id;
    if (!threadId) {
      return new Response(
        JSON.stringify({ error: 'Thread ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ChatKit:POST /threads/:id/messages] Thread ID:', threadId);

    // Get database user ID for tool execution
    const dbUser = await findUserByClerkId(clerkUserId);
    console.log('[ChatKit:POST /threads/:id/messages] Database user:', dbUser ? `Found: ${dbUser.id}` : 'NOT FOUND');

    if (!dbUser) {
      console.error('[ChatKit:POST /threads/:id/messages] User not found in database');
      return new Response(
        JSON.stringify({ error: 'User not found in database', clerkUserId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('[ChatKit:POST /threads/:id/messages] OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          details: 'OPENAI_API_KEY is not configured'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (ChatKit format)
    const body = await request.json();
    const { content } = body;

    console.log('[ChatKit:POST /threads/:id/messages] Request content blocks:', content?.length || 0);

    if (!content || !Array.isArray(content) || content.length === 0) {
      console.error('[ChatKit:POST /threads/:id/messages] Invalid content');
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a non-empty array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract text and images from content
    const textBlocks = content.filter((c: any) => c.type === 'input_text');
    const imageBlocks = content.filter((c: any) => c.type === 'input_image');

    if (textBlocks.length === 0) {
      console.error('[ChatKit:POST /threads/:id/messages] No text content');
      return new Response(
        JSON.stringify({ error: 'At least one text content block is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const messageText = textBlocks.map((b: any) => b.text).join(' ');
    console.log('[ChatKit:POST /threads/:id/messages] Message text length:', messageText.length);

    // Build user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: [
        { type: 'text', text: messageText },
        ...imageBlocks.map((img: any) => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: img.mime_type || 'image/jpeg',
            data: img.data || img.url?.split(',')[1] || '',
          },
        })),
      ],
      timestamp: Date.now(),
    };

    console.log('[ChatKit:POST /threads/:id/messages] User message created:', userMessage.id);

    // Get existing conversation
    const conversation = await getConversation(threadId);
    if (!conversation) {
      console.error('[ChatKit:POST /threads/:id/messages] Thread not found:', threadId);
      return new Response(
        JSON.stringify({ error: 'Thread not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ChatKit:POST /threads/:id/messages] Conversation loaded with', conversation.messages.length, 'messages');

    // Add user message to conversation
    await updateConversation(threadId, [userMessage]);
    conversation.messages.push(userMessage);
    console.log('[ChatKit:POST /threads/:id/messages] User message saved to storage');

    // Build enhanced system prompt with date and calendar context
    console.log('[ChatKit:POST /threads/:id/messages] Building enhanced system prompt');
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(
      dbUser.id,
      conversation.systemPrompt
    );
    console.log('[ChatKit:POST /threads/:id/messages] Enhanced system prompt length:', enhancedSystemPrompt.length);

    // Create GPT agent with calendar tools
    console.log('[ChatKit:POST /threads/:id/messages] Creating GPT agent');
    const agent = createGPTAgent(dbUser.id, enhancedSystemPrompt);

    // Set up streaming response with ThreadStreamEvent protocol
    const stream = new ReadableStream({
      async start(controller) {
        let assistantItemId = `msg-${Date.now()}`;
        let accumulatedText = '';
        let hasError = false;

        console.log('[ChatKit:POST /threads/:id/messages] Starting SSE stream');

        try {
          // ============================================================
          // Event Flow (ChatKit ThreadStreamEvent Protocol):
          // 1. thread.item.added (user message)
          // 2. thread.item.added (assistant message shell)
          // 3. progress_update (optional, during tool execution)
          // 4. thread.item.updated (text streaming)
          // 5. thread.item.done (assistant message complete)
          // 6. thread.item.added (end_of_turn)
          // ============================================================

          // Step 1: Emit user message item
          const userItem = messageToThreadItem(userMessage, threadId);
          emitSSE(controller, { type: 'thread.item.added', item: userItem });
          console.log('[ChatKit:POST /threads/:id/messages] Emitted user message item');

          // Step 2: Create and emit assistant message shell
          const assistantItem: AssistantMessageItem = {
            id: assistantItemId,
            thread_id: threadId,
            created_at: new Date().toISOString(),
            type: 'assistant_message',
            content: [],
          };
          emitSSE(controller, { type: 'thread.item.added', item: assistantItem });
          console.log('[ChatKit:POST /threads/:id/messages] Emitted assistant message shell');

          // Step 3-6: Run agent with streaming callbacks
          await runAgentWithStreaming(
            agent,
            conversation.messages,
            dbUser.id,

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

              // Emit thread.item.updated
              emitSSE(controller, {
                type: 'thread.item.updated',
                item_id: assistantItemId,
                update: { content: assistantItem.content },
              });

              console.log('[ChatKit:POST /threads/:id/messages] Streamed text, total length:', accumulatedText.length);
            },

            // onToolUse: Show progress and emit tool call item
            (toolName: string, toolInput: any) => {
              if (hasError) return;

              // Emit progress update
              emitSSE(controller, {
                type: 'progress_update',
                icon: '⚙️',
                text: `Executing ${toolName}...`,
              });

              console.log('[ChatKit:POST /threads/:id/messages] Tool execution:', toolName);

              // Emit ClientToolCallItem (optional, for visibility)
              const toolItem: ClientToolCallItem = {
                id: `tool-${Date.now()}`,
                thread_id: threadId,
                created_at: new Date().toISOString(),
                type: 'client_tool_call',
                status: 'pending',
                call_id: `call-${Date.now()}`,
                name: toolName,
                arguments: toolInput,
                output: null,
              };
              emitSSE(controller, { type: 'thread.item.added', item: toolItem });
            },

            // onComplete: Mark done and save to storage
            async (finalText: string) => {
              if (hasError) return;

              console.log('[ChatKit:POST /threads/:id/messages] Agent execution complete');

              // Ensure final text is set
              assistantItem.content = [{
                type: 'output_text',
                text: finalText || accumulatedText,
                annotations: [],
              }];

              // Emit thread.item.done
              emitSSE(controller, {
                type: 'thread.item.done',
                item: assistantItem,
              });

              console.log('[ChatKit:POST /threads/:id/messages] Emitted thread.item.done');

              // Emit end_of_turn
              const endOfTurn: EndOfTurnItem = {
                id: `eot-${Date.now()}`,
                thread_id: threadId,
                created_at: new Date().toISOString(),
                type: 'end_of_turn',
              };
              emitSSE(controller, { type: 'thread.item.added', item: endOfTurn });

              console.log('[ChatKit:POST /threads/:id/messages] Emitted end_of_turn');

              // Save assistant message to conversation
              const assistantMessage: Message = {
                id: assistantItemId,
                role: 'assistant',
                content: [{ type: 'text', text: finalText || accumulatedText }],
                timestamp: Date.now(),
              };

              await updateConversation(threadId, [assistantMessage]);
              console.log('[ChatKit:POST /threads/:id/messages] Assistant message saved');

              console.log('[ChatKit:POST /threads/:id/messages] Stream completed successfully');
              controller.close();
            },

            // onError: Emit error event
            (error: Error) => {
              hasError = true;
              console.error('[ChatKit:POST /threads/:id/messages] Agent error:', error);

              emitSSE(controller, {
                type: 'error',
                code: 'custom',
                message: error.message || 'An error occurred during streaming',
                allow_retry: true,
              });

              controller.close();
            },

            // onToolApproval: Handle tool approval requests
            async (toolName: string, toolInput: any): Promise<boolean> => {
              if (hasError) return false;

              const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const timeoutMs = 30000;

              console.log('[ChatKit:POST /threads/:id/messages] Tool approval required:', toolName);

              // Emit tool_approval_requested event
              emitSSE(controller, {
                type: 'tool_approval_requested',
                approval_id: approvalId,
                tool_name: toolName,
                tool_arguments: toolInput,
                timeout_ms: timeoutMs,
              });

              // Poll for approval decision via actions endpoint
              const startTime = Date.now();
              const pollInterval = 500;

              while (Date.now() - startTime < timeoutMs) {
                try {
                  const approvalRes = await fetch(
                    `${request.url.split('/messages')[0]}/actions?approval_id=${approvalId}`,
                    {
                      headers: {
                        'Cookie': request.headers.get('Cookie') || '',
                      },
                    }
                  );

                  if (approvalRes.ok) {
                    const { approved } = await approvalRes.json();

                    if (approved !== null) {
                      console.log('[ChatKit:POST /threads/:id/messages] Approval decision:', approved);
                      return approved;
                    }
                  }
                } catch (err) {
                  console.error('[ChatKit:POST /threads/:id/messages] Error polling approval:', err);
                }

                await new Promise(resolve => setTimeout(resolve, pollInterval));
              }

              // Timeout - auto-reject
              console.warn('[ChatKit:POST /threads/:id/messages] Approval timeout, auto-rejecting');
              return false;
            }
          );
        } catch (error) {
          hasError = true;
          console.error('[ChatKit:POST /threads/:id/messages] Stream error:', error);

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

    console.log('[ChatKit:POST /threads/:id/messages] Returning SSE stream');

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[ChatKit:POST /threads/:id/messages] Top-level error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
