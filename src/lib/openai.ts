/**
 * OpenAI SDK Integration
 * Following OpenAI's best practices for Chat Completions API
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type { Message } from '../types/chat';
import { getUpcomingEvents, isCalendarConnected, formatEventsForChat } from './google-calendar';

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Default model - GPT-4o
 * Using the latest stable model as recommended by OpenAI
 */
export const DEFAULT_MODEL = 'gpt-4o';

/**
 * Default system prompt for a helpful AI assistant
 */
export const DEFAULT_SYSTEM_PROMPT = `You are ChatGPT, a helpful AI assistant created by OpenAI. You are knowledgeable, thoughtful, and aim to provide accurate and helpful responses. You can understand and analyze images when they are provided.`;

/**
 * Google Calendar tool definition for OpenAI function calling
 */
export const CALENDAR_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_calendar_events',
    description: 'Retrieves the next 5 upcoming events from the user\'s Google Calendar. Use this when the user asks about their schedule, upcoming events, meetings, or appointments. Only works if the user has connected their Google Calendar.',
    parameters: {
      type: 'object',
      properties: {
        max_results: {
          type: 'number',
          description: 'Maximum number of events to retrieve (default: 5, max: 10)',
        },
      },
      required: [],
    },
  },
};

/**
 * Execute a function call
 */
async function executeTool(
  toolName: string,
  toolInput: any,
  userId: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  if (toolName === 'get_calendar_events') {
    // Check if calendar is connected
    const connected = await isCalendarConnected(userId);
    if (!connected) {
      return {
        success: false,
        error: 'Google Calendar is not connected. Please connect your calendar first to view your events.',
      };
    }

    try {
      const maxResults = Math.min(toolInput?.max_results || 5, 10);
      const events = await getUpcomingEvents(userId, maxResults);
      const formattedEvents = formatEventsForChat(events);

      return {
        success: true,
        result: formattedEvents,
      };
    } catch (error) {
      console.error('Error executing calendar tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve calendar events',
      };
    }
  }

  return {
    success: false,
    error: `Unknown tool: ${toolName}`,
  };
}

/**
 * Convert our Message format to OpenAI's format
 */
function toOpenAIMessage(message: Message): ChatCompletionMessageParam {
  if (message.role === 'assistant') {
    // For assistant messages, extract text content
    const textContent = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return {
      role: 'assistant',
      content: textContent,
    };
  }

  // For user messages, handle both text and images
  const content = message.content.map(block => {
    if (block.type === 'text') {
      return {
        type: 'text' as const,
        text: block.text,
      };
    } else {
      // Convert image block to OpenAI format
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:${block.source.media_type};base64,${block.source.data}`,
        },
      };
    }
  });

  return {
    role: 'user',
    content: content as any,
  };
}

/**
 * Stream a chat completion from ChatGPT
 * Uses the streaming API with async iteration
 *
 * @param messages - Conversation history
 * @param onText - Callback for text chunks
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 * @param model - Model to use
 * @param systemPrompt - System prompt for ChatGPT
 */
export async function streamChatCompletion(
  messages: Message[],
  onText: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
  model: string = DEFAULT_MODEL,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<void> {
  try {
    // Convert messages to OpenAI format
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(toOpenAIMessage),
    ];

    let fullText = '';

    // Use the streaming API as recommended by OpenAI
    const stream = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      stream: true,
      max_tokens: 4096,
    });

    // Handle stream chunks
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onText(delta);
      }
    }

    // Call completion handler
    onComplete(fullText);

  } catch (error) {
    onError(error as Error);
  }
}

/**
 * Stream a chat completion with function calling support
 * Implements an agentic loop for tool execution
 *
 * @param messages - Conversation history
 * @param userId - Database user ID for tool execution
 * @param onText - Callback for text chunks
 * @param onToolUse - Callback when a tool is used
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 * @param model - Model to use
 * @param systemPrompt - System prompt for ChatGPT
 */
export async function streamChatCompletionWithTools(
  messages: Message[],
  userId: string,
  onText: (text: string) => void,
  onToolUse: (toolName: string, toolInput: any) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
  model: string = DEFAULT_MODEL,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<void> {
  try {
    // Convert messages to OpenAI format
    let openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(toOpenAIMessage),
    ];

    let fullText = '';
    const MAX_ITERATIONS = 5; // Prevent infinite loops

    // Agentic loop: keep calling the API until no more tools are used
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      // Create streaming request with tools
      const stream = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        stream: true,
        max_tokens: 4096,
        tools: [CALENDAR_FUNCTION],
        tool_choice: 'auto', // Let the model decide when to use tools
      });

      let currentText = '';
      let toolCalls: Array<{
        id: string;
        name: string;
        arguments: string;
      }> = [];
      let currentToolCall: {
        id?: string;
        name?: string;
        arguments: string;
      } | null = null;

      // Process stream chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle text content
        if (delta?.content) {
          currentText += delta.content;
          fullText += delta.content;
          onText(delta.content);
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              // Initialize tool call if needed
              if (!currentToolCall || toolCallDelta.index > toolCalls.length - 1) {
                currentToolCall = {
                  id: toolCallDelta.id,
                  name: toolCallDelta.function?.name,
                  arguments: '',
                };
              }

              // Accumulate function arguments
              if (toolCallDelta.function?.arguments) {
                currentToolCall.arguments += toolCallDelta.function.arguments;
              }

              // Update ID and name if provided
              if (toolCallDelta.id) {
                currentToolCall.id = toolCallDelta.id;
              }
              if (toolCallDelta.function?.name) {
                currentToolCall.name = toolCallDelta.function.name;
              }
            }
          }
        }

        // Check if tool call is complete
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === 'tool_calls' && currentToolCall && currentToolCall.id && currentToolCall.name) {
          toolCalls.push({
            id: currentToolCall.id,
            name: currentToolCall.name,
            arguments: currentToolCall.arguments,
          });
          currentToolCall = null;
        }
      }

      // If no tool calls were made, we're done
      if (toolCalls.length === 0) {
        break;
      }

      // Execute tools and add results to conversation
      const toolResults: ChatCompletionMessageParam[] = [];

      // Add assistant message with tool calls
      openaiMessages.push({
        role: 'assistant',
        content: currentText || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      });

      // Execute each tool
      for (const toolCall of toolCalls) {
        let toolInput: any = {};
        try {
          toolInput = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
        } catch (e) {
          console.error('Error parsing tool arguments:', e);
        }

        // Notify UI that tool is being used
        onToolUse(toolCall.name, toolInput);

        // Execute the tool
        const result = await executeTool(toolCall.name, toolInput, userId);

        // Add tool result to messages
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.success ? result.result! : `Error: ${result.error}`,
        });
      }

      // Add tool results to conversation
      openaiMessages.push(...toolResults);

      // Continue loop to get the next response
    }

    // Call completion handler
    onComplete(fullText);

  } catch (error) {
    onError(error as Error);
  }
}

/**
 * Get a non-streaming chat completion from ChatGPT
 * Useful for testing or when streaming is not needed
 *
 * @param messages - Conversation history
 * @param model - Model to use
 * @param systemPrompt - System prompt for ChatGPT
 * @returns The assistant's response text
 */
export async function getChatCompletion(
  messages: Message[],
  model: string = DEFAULT_MODEL,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<string> {
  try {
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(toOpenAIMessage),
    ];

    const response = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

/**
 * Available OpenAI models
 * Following OpenAI's naming conventions
 */
export const AVAILABLE_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable model, great for complex tasks',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and affordable, good for most tasks',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Previous generation, still highly capable',
  },
  {
    id: 'o1-preview',
    name: 'o1 Preview',
    description: 'Advanced reasoning model for complex problems',
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    description: 'Efficient reasoning model for coding and STEM',
  },
] as const;

/**
 * Estimate token count for messages
 * Rough estimation: ~4 characters per token
 * For production, use OpenAI's tiktoken library
 */
export function estimateTokens(messages: Message[]): number {
  let charCount = 0;

  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === 'text') {
        charCount += block.text.length;
      } else {
        // Images are approximately 85-170 tokens per image depending on size
        charCount += 512 * 4; // Rough estimate
      }
    }
  }

  return Math.ceil(charCount / 4);
}
