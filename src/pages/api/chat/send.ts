/**
 * POST /api/chat/send
 * Main chat endpoint with streaming support
 * Following Anthropic's best practices for streaming responses
 */

import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { streamChatCompletionWithTools, buildEnhancedSystemPrompt } from '../../../lib/claude';
import {
  createConversation,
  getConversation,
  updateConversation,
} from '../../../lib/storage';
import type { Message, ChatRequest } from '../../../types/chat';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID for tool execution
    const dbUser = await findUserByClerkId(clerkUserId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          details: 'ANTHROPIC_API_KEY is not configured. Please add it to your .env file.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
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
      // Build enhanced system prompt with date awareness and calendar mappings
      const enhancedSystemPrompt = await buildEnhancedSystemPrompt(
        dbUser.id,
        systemPrompt // Use custom prompt if provided, otherwise defaults to DEFAULT_SYSTEM_PROMPT
      );
      conversation = await createConversation(userMessage, clerkUserId, model, enhancedSystemPrompt);
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

        // Helper function to safely enqueue data
        const safeEnqueue = (data: string): boolean => {
          try {
            // Check if controller is still open (desiredSize is null when closed)
            if (controller.desiredSize !== null) {
              controller.enqueue(encoder.encode(data));
              return true;
            } else {
              console.error('Cannot write to closed stream controller');
              return false;
            }
          } catch (error) {
            console.error('Error enqueueing data to stream:', error);
            return false;
          }
        };

        // Helper function to safely close controller
        const safeClose = () => {
          try {
            if (controller.desiredSize !== null) {
              controller.close();
            }
          } catch (error) {
            console.error('Error closing stream controller:', error);
          }
        };

        try {
          // Stream the completion with tool use support
          await streamChatCompletionWithTools(
            conversation!.messages,
            dbUser.id, // Database user ID for tool execution
            // On text chunk
            (text: string) => {
              if (hasError) return;

              fullResponse += text;

              // Send SSE format
              const data = JSON.stringify({
                type: 'content_block_delta',
                delta: { type: 'text_delta', text },
              });

              safeEnqueue(`data: ${data}\n\n`);
            },
            // On tool use
            (toolName: string, toolInput: any) => {
              if (hasError) return;

              // Notify client that a tool is being used
              const data = JSON.stringify({
                type: 'tool_use',
                tool_name: toolName,
                tool_input: toolInput,
              });

              safeEnqueue(`data: ${data}\n\n`);
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

              safeEnqueue(`data: ${data}\n\n`);
              safeClose();
            },
            // On error
            (error: Error) => {
              hasError = true;

              // Enhanced error logging with full context
              console.error('[API/chat/send] Streaming error:', {
                errorMessage: error.message,
                errorStack: error.stack,
                errorName: error.name,
                userId: dbUser.id,
                clerkUserId: clerkUserId,
                conversationId: conversation?.id || 'new-conversation',
                model: conversation?.model || model,
                messageCount: conversation?.messages.length || 0,
                hasImages: (images || []).length > 0,
                imageCount: (images || []).length,
                timestamp: new Date().toISOString(),
                // Include first 200 chars of error for quick scanning
                errorPreview: error.message?.substring(0, 200),
              });

              // Categorize error for user-friendly messaging
              let userMessage = error.message || 'An error occurred during streaming';
              let canRetry = true;

              // Image-related errors
              if (error.message?.includes('image') || error.message?.includes('base64')) {
                userMessage = 'There was a problem processing your image. Please ensure it is a valid image file under 5 MB and try again.';
              }
              // Rate limiting
              else if (error.message?.includes('rate_limit') || error.message?.includes('429')) {
                userMessage = 'Too many requests. Please wait a moment and try again.';
              }
              // Quota exceeded
              else if (error.message?.includes('quota') || error.message?.includes('insufficient_quota')) {
                userMessage = 'Service quota exceeded. Please contact support or try again later.';
                canRetry = false;
              }
              // Authentication errors
              else if (error.message?.includes('API key') || error.message?.includes('authentication') || error.message?.includes('401')) {
                userMessage = 'Authentication error. Please refresh the page and try again.';
                canRetry = false;
              }
              // Timeout errors
              else if (error.message?.includes('timeout')) {
                userMessage = 'Request timed out. Please try again with a shorter message or fewer images.';
              }
              // Generic API errors
              else if (error.message?.includes('5 MB')) {
                userMessage = 'Image file size exceeds the 5 MB limit. Please compress or resize your image and try again.';
              }

              const data = JSON.stringify({
                type: 'error',
                error: userMessage,
                errorCode: error.name || 'STREAMING_ERROR',
                canRetry: canRetry,
                timestamp: new Date().toISOString(),
              });

              safeEnqueue(`data: ${data}\n\n`);
              safeClose();
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

          safeEnqueue(`data: ${data}\n\n`);
          safeClose();
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
