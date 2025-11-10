/**
 * OpenAI Request Routing
 * Detects user intent and routes to appropriate backend:
 * - Calendar Agent (Agents SDK) for calendar operations
 * - Responses API for general Q&A
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Intent types
 */
export type Intent = 'calendar' | 'qa';

/**
 * Calendar keywords that indicate calendar intent
 */
const CALENDAR_KEYWORDS = [
  // Action verbs
  'schedule', 'reschedule', 'cancel', 'delete', 'create', 'add', 'remove', 'update', 'modify', 'move',
  // Calendar nouns
  'event', 'meeting', 'appointment', 'reminder', 'calendar',
  // Time references in calendar context
  'tomorrow', 'next week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  // Calendar queries
  'what\'s on', 'what do i have', 'am i free', 'do i have', 'show me',
  'when is', 'when am i', 'my schedule', 'upcoming',
  // Common event types
  'dentist', 'doctor', 'gym', 'dinner', 'lunch', 'breakfast', 'call', 'zoom', 'meet',
];

/**
 * Detect intent from user message using lightweight heuristics
 * This is a fast, local check before routing to the appropriate endpoint
 */
export function detectIntent(message: string): Intent {
  const lowerMessage = message.toLowerCase();

  // Check for calendar keywords
  for (const keyword of CALENDAR_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      console.log(`[Routing] Detected calendar intent via keyword: "${keyword}"`);
      return 'calendar';
    }
  }

  // Default to Q&A for everything else
  console.log('[Routing] Detected Q&A intent (no calendar keywords)');
  return 'qa';
}

/**
 * Stream a simple Q&A response using OpenAI Responses API
 * This is for non-calendar questions that don't need tools
 *
 * @param messages - Conversation history in OpenAI format
 * @param systemPrompt - System prompt
 * @param onText - Callback for text deltas
 * @param onComplete - Callback when complete
 * @param onError - Callback for errors
 */
export async function streamQAResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt: string,
  onText: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  console.log('[QA] Starting Responses API stream, messages:', messages.length);

  try {
    let fullText = '';

    // Add system prompt
    const apiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Use streaming Chat Completions API (Responses API)
    const stream = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: apiMessages,
      stream: true,
      max_tokens: 4096,
      // No tools - simple text generation
    });

    console.log('[QA] Stream created, processing chunks...');

    // Process stream chunks
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onText(delta);
      }
    }

    console.log('[QA] Stream complete, total length:', fullText.length);
    onComplete(fullText);

  } catch (error) {
    console.error('[QA] Stream error:', error);
    onError(error as Error);
  }
}

/**
 * PII Redaction Utilities
 * Redact sensitive information from tool inputs/outputs
 */

/**
 * Email regex pattern
 */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/**
 * Phone number patterns (US and international)
 */
const PHONE_PATTERN = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

/**
 * Redact PII from a string
 * Replaces emails and phone numbers with placeholders
 */
export function redactPII(text: string, options: { emails?: boolean; phones?: boolean } = {}): string {
  const { emails = true, phones = true } = options;

  let redacted = text;

  if (emails) {
    redacted = redacted.replace(EMAIL_PATTERN, '[EMAIL_REDACTED]');
  }

  if (phones) {
    redacted = redacted.replace(PHONE_PATTERN, '[PHONE_REDACTED]');
  }

  return redacted;
}

/**
 * Redact PII from a structured object (tool inputs/outputs)
 * Recursively processes all string values
 */
export function redactPIIFromObject(obj: any, options: { emails?: boolean; phones?: boolean } = {}): any {
  if (typeof obj === 'string') {
    return redactPII(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactPIIFromObject(item, options));
  }

  if (obj !== null && typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      redacted[key] = redactPIIFromObject(value, options);
    }
    return redacted;
  }

  return obj;
}

/**
 * Validate and normalize ISO 8601 datetime strings
 * Ensures proper format for Google Calendar API
 */
export function validateDateTime(datetime: string): { valid: boolean; error?: string } {
  try {
    const date = new Date(datetime);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date/time format' };
    }

    // Check if it's ISO 8601 format
    if (!datetime.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)) {
      return { valid: false, error: 'Date must be in ISO 8601 format (e.g., 2025-11-15T14:00:00-05:00)' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid date/time' };
  }
}

/**
 * Validate and normalize date-only strings (YYYY-MM-DD)
 * For all-day events
 */
export function validateDate(date: string): { valid: boolean; error?: string } {
  try {
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { valid: false, error: 'Date must be in YYYY-MM-DD format (e.g., 2025-11-15)' };
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return { valid: false, error: 'Invalid date' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid date' };
  }
}

/**
 * Validate email address
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  return { valid: true };
}
