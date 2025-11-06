/**
 * OpenAI SDK Integration
 * Following OpenAI's best practices for Chat Completions API
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Message } from '../types/chat';

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
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
