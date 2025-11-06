/**
 * POST /api/chat/send
 * Main chat endpoint with streaming support
 * Following Anthropic's best practices for streaming responses
 */

import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { streamChatCompletion } from '../../../lib/claude';
import {
  createConversation,
  getConversation,
  updateConversation,
} from '../../../lib/storage';
import type { Message, ChatRequest } from '../../../types/chat';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId } = (locals as any).auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = await request.json();
    const { conversationId, message, images, model, systemPrompt } = body;

    if (!message || message.trim() === '') {
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
        ...(images || []).map(img => ({
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

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await getConversation(conversationId);
      if (!conversation) {
        return new Response(
          JSON.stringify({ error: 'Conversation not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      conversation = await createConversation(userMessage, model, systemPrompt);
    }

    // Add user message to conversation if it already existed
    if (conversationId) {
      await updateConversation(conversation.id, [userMessage]);
      conversation.messages.push(userMessage);
    }

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let hasError = false;

        try {
          // Stream the completion
          await streamChatCompletion(
            conversation!.messages,
            // On text chunk
            (text: string) => {
              if (hasError) return;

              fullResponse += text;

              // Send SSE format
              const data = JSON.stringify({
                type: 'content_block_delta',
                delta: { type: 'text_delta', text },
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            // On complete
            async (finalText: string) => {
              if (hasError) return;

              // Save assistant message to conversation
              const assistantMessage: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: [{ type: 'text', text: finalText }],
                timestamp: Date.now(),
              };

              await updateConversation(conversation!.id, [assistantMessage]);

              // Send completion event
              const data = JSON.stringify({
                type: 'message_stop',
                conversationId: conversation!.id,
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
            // On error
            (error: Error) => {
              hasError = true;
              console.error('Streaming error:', error);

              const data = JSON.stringify({
                type: 'error',
                error: error.message || 'An error occurred during streaming',
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
            conversation.model,
            conversation.systemPrompt
          );
        } catch (error) {
          hasError = true;
          console.error('Stream setup error:', error);

          const data = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        }
      },
    });

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
