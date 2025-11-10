/**
 * POST /api/chatkit/runs/calendar
 *
 * Calendar Agent endpoint using OpenAI Agents SDK
 * Handles calendar-related tasks with full CRUD operations via tool calling
 *
 * This endpoint is called when the user's message indicates calendar intent
 * (scheduling, viewing events, updating, deleting, etc.)
 */

import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { createGPTAgent, runAgentWithStreaming } from '../../../../lib/openai-agents';
import { buildEnhancedSystemPrompt } from '../../../../lib/openai';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';
import {
  createConversation,
  getConversation,
  updateConversation,
} from '../../../../lib/gpt-storage';
import { redactPIIFromObject } from '../../../../lib/openai-routing';
import type { Message, Conversation } from '../../../../types/chat';
import type {
  ThreadStreamEvent,
  Thread,
  ThreadItem,
  UserMessageItem,
  AssistantMessageItem,
  EndOfTurnItem,
  ClientToolCallItem,
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

// ============================================================================
// API Route Handler
// ============================================================================

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();
    console.log('[Calendar Agent] Clerk User ID:', clerkUserId);

    if (!clerkUserId) {
      console.error('[Calendar Agent] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID for tool execution
    const dbUser = await findUserByClerkId(clerkUserId);
    console.log('[Calendar Agent] Database user lookup result:', dbUser ? `Found: ${dbUser.id}` : 'NOT FOUND');

    if (!dbUser) {
      console.error('[Calendar Agent] User not found in database. Clerk ID:', clerkUserId);
      return new Response(
        JSON.stringify({ error: 'User not found in database', clerkUserId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Calendar Agent] OPENAI_API_KEY is not configured');
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

    console.log('[Calendar Agent] Request:', {
      conversationId: conversationId || 'NEW',
      messageLength: message?.length || 0,
      hasImages: !!images?.length,
      model: model || 'default',
    });

    if (!message || message.trim() === '') {
      console.error('[Calendar Agent] Empty message received');
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the user message with text and optional images
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

    console.log('[Calendar Agent] User message created:', {
      id: userMessage.id,
      contentBlocks: userMessage.content.length,
    });

    // Get or create conversation
    let conversation: Conversation;
    const isNewConversation = !conversationId;

    if (conversationId) {
      console.log('[Calendar Agent] Loading existing conversation:', conversationId);
      const existingConversation = await getConversation(conversationId);
      if (!existingConversation) {
        console.error('[Calendar Agent] Conversation not found:', conversationId);
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      conversation = existingConversation;
      console.log('[Calendar Agent] Conversation loaded:', {
        id: conversation.id,
        messageCount: conversation.messages.length,
      });
    } else {
      console.log('[Calendar Agent] Creating new conversation');
      conversation = await createConversation(userMessage, clerkUserId, model, systemPrompt);
      console.log('[Calendar Agent] New conversation created:', conversation.id);
    }

    // Add user message to conversation if it already existed
    if (conversationId) {
      await updateConversation(conversation.id, [userMessage]);
      conversation.messages.push(userMessage);
      console.log('[Calendar Agent] User message added to conversation, total messages:', conversation.messages.length);
    }

    // Build enhanced system prompt with date and calendar context
    console.log('[Calendar Agent] Building enhanced system prompt for user:', dbUser.id);
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(
      dbUser.id,
      conversation.systemPrompt
    );
    console.log('[Calendar Agent] Enhanced system prompt length:', enhancedSystemPrompt.length);

    // Create GPT agent with calendar tools
    console.log('[Calendar Agent] Creating GPT agent for user:', dbUser.id);
    const agent = createGPTAgent(dbUser.id, enhancedSystemPrompt);

    // Set up streaming response with ThreadStreamEvent protocol
    const stream = new ReadableStream({
      async start(controller) {
        let assistantItemId = `msg-${Date.now()}`;
        let accumulatedText = '';
        let hasError = false;

        console.log('[Calendar Agent] Starting SSE stream (ThreadStreamEvent protocol)');

        try {
          // ============================================================
          // Event Flow:
          // 1. thread.created (only for new conversations)
          // 2. thread.item.added (user message)
          // 3. thread.item.added (assistant message shell)
          // 4. progress_update (optional, during tool execution)
          // 5. thread.item.updated (text streaming)
          // 6. thread.item.done (assistant message complete)
          // 7. thread.item.added (end_of_turn)
          // ============================================================

          // Step 1: Emit thread.created for new conversations
          if (isNewConversation) {
            const thread = conversationToThread(conversation);
            emitSSE(controller, { type: 'thread.created', thread });
            console.log('[Calendar Agent] Emitted thread.created');
          }

          // Step 2: Emit user message item
          const userItem = messageToThreadItem(userMessage, conversation.id);
          emitSSE(controller, { type: 'thread.item.added', item: userItem });
          console.log('[Calendar Agent] Emitted user message item');

          // Step 3: Create and emit assistant message shell (empty content)
          const assistantItem: AssistantMessageItem = {
            id: assistantItemId,
            thread_id: conversation.id,
            created_at: new Date().toISOString(),
            type: 'assistant_message',
            content: [],
          };
          emitSSE(controller, { type: 'thread.item.added', item: assistantItem });
          console.log('[Calendar Agent] Emitted assistant message shell');

          // Step 4-7: Run agent with streaming callbacks
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

              // Emit thread.item.updated with new content
              emitSSE(controller, {
                type: 'thread.item.updated',
                item_id: assistantItemId,
                update: { content: assistantItem.content },
              });

              console.log('[Calendar Agent] Streamed text chunk, length:', text.length, 'total:', accumulatedText.length);
            },

            // onToolUse: Show progress and emit tool call item
            (toolName: string, toolInput: any) => {
              if (hasError) return;

              // Redact PII from tool inputs for logging
              const redactedInput = redactPIIFromObject(toolInput);
              console.log('[Calendar Agent] Tool execution:', toolName, 'Input:', redactedInput);

              // Emit progress update
              emitSSE(controller, {
                type: 'progress_update',
                icon: '📅',
                text: `Executing ${toolName}...`,
              });

              console.log('[Calendar Agent] Emitted progress_update for tool:', toolName);

              // Emit ClientToolCallItem (optional, for tool visibility in UI)
              const toolItem: ClientToolCallItem = {
                id: `tool-${Date.now()}`,
                thread_id: conversation.id,
                created_at: new Date().toISOString(),
                type: 'client_tool_call',
                status: 'pending',
                call_id: `call-${Date.now()}`,
                name: toolName,
                arguments: redactedInput,
                output: null,
              };
              emitSSE(controller, { type: 'thread.item.added', item: toolItem });

              console.log('[Calendar Agent] Emitted ClientToolCallItem:', toolName);
            },

            // onComplete: Mark done and save to storage
            async (finalText: string) => {
              if (hasError) return;

              console.log('[Calendar Agent] Agent execution complete, final text length:', finalText.length);

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

              console.log('[Calendar Agent] Emitted thread.item.done');

              // Emit end_of_turn
              const endOfTurn: EndOfTurnItem = {
                id: `eot-${Date.now()}`,
                thread_id: conversation.id,
                created_at: new Date().toISOString(),
                type: 'end_of_turn',
              };
              emitSSE(controller, { type: 'thread.item.added', item: endOfTurn });

              console.log('[Calendar Agent] Emitted end_of_turn');

              // Save assistant message to conversation
              const assistantMessage: Message = {
                id: assistantItemId,
                role: 'assistant',
                content: [{ type: 'text', text: finalText || accumulatedText }],
                timestamp: Date.now(),
              };

              await updateConversation(conversation.id, [assistantMessage]);
              console.log('[Calendar Agent] Assistant message saved to conversation');

              console.log('[Calendar Agent] Stream completed successfully');
              controller.close();
            },

            // onError: Emit error event
            (error: Error) => {
              hasError = true;
              console.error('[Calendar Agent] Agent execution error:', error);

              emitSSE(controller, {
                type: 'error',
                code: 'custom',
                message: error.message || 'An error occurred during calendar operation',
                allow_retry: true,
              });

              controller.close();
            },

            // onToolApproval: Handle tool approval requests
            async (toolName: string, toolInput: any): Promise<boolean> => {
              if (hasError) return false;

              const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const timeoutMs = 30000; // 30 seconds

              // Redact PII from tool inputs
              const redactedInput = redactPIIFromObject(toolInput);
              console.log('[Calendar Agent] Tool approval required:', toolName, 'ID:', approvalId, 'Input:', redactedInput);

              // Emit tool_approval_requested event to frontend
              emitSSE(controller, {
                type: 'tool_approval_requested',
                approval_id: approvalId,
                tool_name: toolName,
                tool_arguments: redactedInput,
                timeout_ms: timeoutMs,
              });

              console.log('[Calendar Agent] Emitted tool_approval_requested');

              // Poll for approval decision
              const startTime = Date.now();
              const pollInterval = 500; // Check every 500ms

              while (Date.now() - startTime < timeoutMs) {
                try {
                  // Check approval endpoint for decision
                  const approvalRes = await fetch(
                    `${request.url.split('/api/chatkit/runs/calendar')[0]}/api/chatkit/approve?approval_id=${approvalId}`,
                    {
                      headers: {
                        'Cookie': request.headers.get('Cookie') || '', // Forward auth cookies
                      },
                    }
                  );

                  if (approvalRes.ok) {
                    const { approved } = await approvalRes.json();

                    if (approved !== null) {
                      console.log('[Calendar Agent] Approval decision received:', approved);
                      return approved;
                    }
                  }
                } catch (err) {
                  console.error('[Calendar Agent] Error polling for approval:', err);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
              }

              // Timeout - auto-reject for safety
              console.warn('[Calendar Agent] Approval timeout, auto-rejecting:', toolName);
              return false;
            }
          );
        } catch (error) {
          hasError = true;
          console.error('[Calendar Agent] Stream setup error:', error);

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

    console.log('[Calendar Agent] Returning SSE stream response (ThreadStreamEvent protocol)');

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Calendar Agent] Top-level error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
