/**
 * Claude SDK Integration
 * Following Anthropic's best practices for Messages API
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages';
import type { Message } from '../types/chat';

// Initialize the Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Default model - Claude Sonnet 4
 * Using the latest stable model as recommended by Anthropic
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Default system prompt for a helpful AI assistant
 */
export const DEFAULT_SYSTEM_PROMPT = `You are Claude, a helpful AI assistant created by Anthropic. You are knowledgeable, thoughtful, and aim to provide accurate and helpful responses. You can understand and analyze images when they are provided.`;

/**
 * Convert our Message format to Anthropic's format
 */
function toAnthropicMessage(message: Message): AnthropicMessage {
  return {
    role: message.role,
    content: message.content.map(block => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: block.text,
        };
      } else {
        return {
          type: 'image',
          source: block.source,
        };
      }
    }),
  } as AnthropicMessage;
}

/**
 * Stream a chat completion from Claude
 * Uses the high-level streaming API with event handlers
 *
 * @param messages - Conversation history
 * @param onText - Callback for text chunks
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 * @param model - Model to use
 * @param systemPrompt - System prompt for Claude
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
    // Convert messages to Anthropic format
    const anthropicMessages = messages.map(toAnthropicMessage);

    let fullText = '';

    // Use the high-level streaming API as recommended by Anthropic
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    // Handle text deltas
    stream.on('text', (text: string) => {
      fullText += text;
      onText(text);
    });

    // Handle errors
    stream.on('error', (error) => {
      onError(error);
    });

    // Wait for the stream to complete and get the final message
    await stream.finalMessage();

    // Call completion handler after stream finishes
    onComplete(fullText);

  } catch (error) {
    onError(error as Error);
  }
}

/**
 * Get a non-streaming chat completion from Claude
 * Useful for testing or when streaming is not needed
 *
 * @param messages - Conversation history
 * @param model - Model to use
 * @param systemPrompt - System prompt for Claude
 * @returns The assistant's response text
 */
export async function getChatCompletion(
  messages: Message[],
  model: string = DEFAULT_MODEL,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<string> {
  try {
    const anthropicMessages = messages.map(toAnthropicMessage);

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    // Extract text from response
    const textBlocks = response.content.filter(block => block.type === 'text');
    return textBlocks.map(block => (block as any).text).join('\n');

  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Available Claude models
 * Following Anthropic's naming conventions
 */
export const AVAILABLE_MODELS = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Most intelligent model, best for complex tasks',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Top-level performance for highly complex tasks',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous generation, still highly capable',
  },
] as const;

/**
 * Estimate token count for messages
 * Rough estimation: ~4 characters per token
 * For production, use Anthropic's token counting API
 */
export function estimateTokens(messages: Message[]): number {
  let charCount = 0;

  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === 'text') {
        charCount += block.text.length;
      } else {
        // Images are approximately 1000-2000 tokens depending on size
        charCount += 1500 * 4; // Rough estimate
      }
    }
  }

  return Math.ceil(charCount / 4);
}
