/**
 * OpenAI SDK Integration
 * Following OpenAI's best practices for Chat Completions API
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type { Message } from '../types/chat';
import {
  getUpcomingEvents,
  isCalendarConnected,
  formatEventsForChat,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  type CreateEventParams,
  type UpdateEventParams,
} from './google-calendar';
import { selectCalendar, formatCalendarSelectionMessage } from './calendar-mapper';
import type { CalendarEntityType } from './db/types';

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
export const DEFAULT_SYSTEM_PROMPT = `You are ChatGPT, a helpful AI assistant created by OpenAI. You are knowledgeable, thoughtful, and aim to provide accurate and helpful responses. You can understand and analyze images when they are provided. You have access to functions that allow you to help users with their Google Calendar.`;

/**
 * Build an enhanced system prompt with date awareness and calendar mappings
 * This helps ChatGPT understand:
 * - What "today", "tomorrow", "next week", etc. mean
 * - Which calendars the user has configured (family, personal, work)
 *
 * @param userId - Database user ID
 * @param basePrompt - Base system prompt to enhance (defaults to DEFAULT_SYSTEM_PROMPT)
 * @returns Enhanced system prompt with date and calendar context
 */
export async function buildEnhancedSystemPrompt(
  userId: string,
  basePrompt: string = DEFAULT_SYSTEM_PROMPT
): Promise<string> {
  // Get current date information
  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  let enhancedPrompt = basePrompt;

  // Add date/time context
  enhancedPrompt += `\n\n## Current Date & Time\n`;
  enhancedPrompt += `Today is ${dateString} at ${timeString}.\n`;
  enhancedPrompt += `Use this information when the user mentions relative dates like "today", "tomorrow", "next Monday", "last week", etc.`;

  // Add calendar mappings context
  try {
    const { findMappingsByUserId } = await import('./db/repositories/calendar-mappings');
    const mappings = await findMappingsByUserId(userId);

    if (mappings.length > 0) {
      enhancedPrompt += `\n\n## User's Calendar Configuration\n`;
      enhancedPrompt += `The user has configured the following calendars:\n\n`;

      for (const mapping of mappings) {
        const defaultMarker = mapping.is_default ? ' (DEFAULT)' : '';
        enhancedPrompt += `- **${mapping.calendar_name}**${defaultMarker}: Mapped to "${mapping.entity_type}" calendar\n`;
        if (mapping.calendar_time_zone) {
          enhancedPrompt += `  - Timezone: ${mapping.calendar_time_zone}\n`;
        }
      }

      enhancedPrompt += `\nWhen creating, updating, or deleting events, the system will automatically select the appropriate calendar based on context. `;
      enhancedPrompt += `You can see which calendar was selected in the function execution results.`;

      // Find default calendar if exists
      const defaultMapping = mappings.find(m => m.is_default);
      if (defaultMapping) {
        enhancedPrompt += ` The user's default calendar is "${defaultMapping.calendar_name}" (${defaultMapping.entity_type}).`;
      }
    } else {
      enhancedPrompt += `\n\n## User's Calendar Configuration\n`;
      enhancedPrompt += `The user has not configured any calendar mappings yet. They need to connect their Google Calendar and set up calendar mappings at /calendar-config before using calendar features.`;
    }
  } catch (error) {
    console.error('[buildEnhancedSystemPrompt] Error fetching calendar mappings:', error);
    // Continue without calendar context if there's an error
  }

  return enhancedPrompt;
}

/**
 * Calendar function definitions for OpenAI function calling
 * Supports full CRUD operations on Google Calendar
 */

// READ: Get upcoming events
export const GET_CALENDAR_EVENTS_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_calendar_events',
    description: 'Retrieves upcoming events from the user\'s Google Calendar. Use this when the user asks about their schedule, upcoming events, meetings, or appointments. The system will automatically select the appropriate calendar based on context (family, personal, or work).',
    parameters: {
      type: 'object',
      properties: {
        max_results: {
          type: 'number',
          description: 'Maximum number of events to retrieve (default: 5, max: 10)',
        },
        entity_type: {
          type: 'string',
          enum: ['family', 'personal', 'work'],
          description: 'Optional: Specific calendar to query. If not provided, will be inferred from context.',
        },
      },
      required: [],
    },
  },
};

// CREATE: Add new event
export const CREATE_CALENDAR_EVENT_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_calendar_event',
    description: 'Creates a new event on the user\'s Google Calendar. Use this when the user wants to add, schedule, or create an appointment, meeting, or reminder. The system will automatically select the appropriate calendar (family, personal, or work) based on the event context.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Event title/summary (required)',
        },
        start_datetime: {
          type: 'string',
          description: 'Event start date and time in ISO 8601 format (e.g., "2025-11-15T14:00:00-05:00"). For all-day events, use start_date instead.',
        },
        start_date: {
          type: 'string',
          description: 'For all-day events, the start date in YYYY-MM-DD format (e.g., "2025-11-15")',
        },
        end_datetime: {
          type: 'string',
          description: 'Event end date and time in ISO 8601 format. For all-day events, use end_date instead.',
        },
        end_date: {
          type: 'string',
          description: 'For all-day events, the end date in YYYY-MM-DD format',
        },
        description: {
          type: 'string',
          description: 'Optional event description or notes',
        },
        location: {
          type: 'string',
          description: 'Optional event location',
        },
        attendees: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional array of attendee email addresses',
        },
        entity_type: {
          type: 'string',
          enum: ['family', 'personal', 'work'],
          description: 'Optional: Specific calendar to create event on. If not provided, will be inferred from event context (e.g., "dentist" → family, "investor meeting" → work).',
        },
      },
      required: ['summary'],
    },
  },
};

// UPDATE: Modify existing event
export const UPDATE_CALENDAR_EVENT_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'update_calendar_event',
    description: 'Updates an existing event on the user\'s Google Calendar. Use this when the user wants to reschedule, modify, or change details of an existing event. You must first retrieve the event to get its ID.',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The Google Calendar event ID to update (required). Get this from get_calendar_events first.',
        },
        summary: {
          type: 'string',
          description: 'New event title/summary',
        },
        start_datetime: {
          type: 'string',
          description: 'New start date and time in ISO 8601 format',
        },
        start_date: {
          type: 'string',
          description: 'New start date for all-day events (YYYY-MM-DD)',
        },
        end_datetime: {
          type: 'string',
          description: 'New end date and time in ISO 8601 format',
        },
        end_date: {
          type: 'string',
          description: 'New end date for all-day events (YYYY-MM-DD)',
        },
        description: {
          type: 'string',
          description: 'New event description',
        },
        location: {
          type: 'string',
          description: 'New event location',
        },
        attendees: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'New list of attendee email addresses',
        },
        entity_type: {
          type: 'string',
          enum: ['family', 'personal', 'work'],
          description: 'Optional: Which calendar the event is on. If not provided, will be inferred.',
        },
      },
      required: ['event_id'],
    },
  },
};

// DELETE: Remove event
export const DELETE_CALENDAR_EVENT_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delete_calendar_event',
    description: 'Deletes an event from the user\'s Google Calendar. Use this when the user wants to cancel, remove, or delete an event. You must first retrieve the event to get its ID. Always confirm the event details with the user before deleting.',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The Google Calendar event ID to delete (required). Get this from get_calendar_events first.',
        },
        entity_type: {
          type: 'string',
          enum: ['family', 'personal', 'work'],
          description: 'Optional: Which calendar the event is on. If not provided, will be inferred.',
        },
      },
      required: ['event_id'],
    },
  },
};

// All calendar functions
export const CALENDAR_FUNCTIONS: ChatCompletionTool[] = [
  GET_CALENDAR_EVENTS_FUNCTION,
  CREATE_CALENDAR_EVENT_FUNCTION,
  UPDATE_CALENDAR_EVENT_FUNCTION,
  DELETE_CALENDAR_EVENT_FUNCTION,
];

// Legacy export for backwards compatibility
export const CALENDAR_FUNCTION = GET_CALENDAR_EVENTS_FUNCTION;

/**
 * Execute a function call with calendar mapping support
 * Supports full CRUD operations on Google Calendar
 */
async function executeTool(
  toolName: string,
  toolInput: any,
  userId: string,
  userMessage: string = ''
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    // Check if calendar is connected for all calendar operations
    const connected = await isCalendarConnected(userId);
    if (!connected) {
      return {
        success: false,
        error: 'Google Calendar is not connected. Please connect your calendar first by clicking the "Connect Calendar" button.',
      };
    }

    // READ: Get calendar events
    if (toolName === 'get_calendar_events') {
      const maxResults = Math.min(toolInput.max_results || 5, 10);
      const entityType = toolInput.entity_type as CalendarEntityType | undefined;

      // Select appropriate calendar
      const selection = await selectCalendar(userId, userMessage, entityType);
      console.log(`[Function:get_calendar_events] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

      // Fetch events from selected calendar
      const events = await getUpcomingEvents(userId, maxResults);
      const formattedEvents = formatEventsForChat(events);

      const calendarInfo = formatCalendarSelectionMessage(selection);

      return {
        success: true,
        result: `${calendarInfo}\n\n${formattedEvents}`,
      };
    }

    // CREATE: Add new event
    if (toolName === 'create_calendar_event') {
      const entityType = toolInput.entity_type as CalendarEntityType | undefined;

      // Select appropriate calendar based on event context
      const eventContext = `${toolInput.summary || ''} ${toolInput.description || ''} ${toolInput.location || ''}`;
      const selection = await selectCalendar(userId, eventContext, entityType);
      console.log(`[Function:create_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

      // Build event parameters
      const eventParams: CreateEventParams = {
        summary: toolInput.summary,
        description: toolInput.description,
        location: toolInput.location,
        start: {},
        end: {},
      };

      // Handle start time (datetime or date)
      if (toolInput.start_datetime) {
        eventParams.start.dateTime = toolInput.start_datetime;
      } else if (toolInput.start_date) {
        eventParams.start.date = toolInput.start_date;
      } else {
        return {
          success: false,
          error: 'Event must have a start time (start_datetime or start_date)',
        };
      }

      // Handle end time (datetime or date)
      if (toolInput.end_datetime) {
        eventParams.end.dateTime = toolInput.end_datetime;
      } else if (toolInput.end_date) {
        eventParams.end.date = toolInput.end_date;
      } else {
        return {
          success: false,
          error: 'Event must have an end time (end_datetime or end_date)',
        };
      }

      // Add attendees if provided
      if (toolInput.attendees && Array.isArray(toolInput.attendees)) {
        eventParams.attendees = toolInput.attendees.map((email: string) => ({ email }));
      }

      // Create the event
      const createdEvent = await createEvent(userId, eventParams, selection.calendarId);
      const calendarInfo = formatCalendarSelectionMessage(selection);

      return {
        success: true,
        result: `${calendarInfo}\n\nEvent created successfully:\n\n**${createdEvent.summary}**\n📅 ${createdEvent.start.dateTime || createdEvent.start.date}\n${createdEvent.location ? `📍 ${createdEvent.location}\n` : ''}🔗 ${createdEvent.htmlLink}`,
      };
    }

    // UPDATE: Modify existing event
    if (toolName === 'update_calendar_event') {
      const eventId = toolInput.event_id;
      if (!eventId) {
        return {
          success: false,
          error: 'Event ID is required to update an event',
        };
      }

      const entityType = toolInput.entity_type as CalendarEntityType | undefined;

      // Select appropriate calendar
      const selection = await selectCalendar(userId, userMessage, entityType);
      console.log(`[Function:update_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

      // Build update parameters
      const updateParams: UpdateEventParams = {
        eventId,
      };

      if (toolInput.summary) updateParams.summary = toolInput.summary;
      if (toolInput.description) updateParams.description = toolInput.description;
      if (toolInput.location) updateParams.location = toolInput.location;

      // Handle start time updates
      if (toolInput.start_datetime || toolInput.start_date) {
        updateParams.start = {};
        if (toolInput.start_datetime) {
          updateParams.start.dateTime = toolInput.start_datetime;
        } else if (toolInput.start_date) {
          updateParams.start.date = toolInput.start_date;
        }
      }

      // Handle end time updates
      if (toolInput.end_datetime || toolInput.end_date) {
        updateParams.end = {};
        if (toolInput.end_datetime) {
          updateParams.end.dateTime = toolInput.end_datetime;
        } else if (toolInput.end_date) {
          updateParams.end.date = toolInput.end_date;
        }
      }

      // Handle attendees updates
      if (toolInput.attendees && Array.isArray(toolInput.attendees)) {
        updateParams.attendees = toolInput.attendees.map((email: string) => ({ email }));
      }

      // Update the event
      const updatedEvent = await updateEvent(userId, updateParams, selection.calendarId);
      const calendarInfo = formatCalendarSelectionMessage(selection);

      return {
        success: true,
        result: `${calendarInfo}\n\nEvent updated successfully:\n\n**${updatedEvent.summary}**\n📅 ${updatedEvent.start.dateTime || updatedEvent.start.date}\n${updatedEvent.location ? `📍 ${updatedEvent.location}\n` : ''}🔗 ${updatedEvent.htmlLink}`,
      };
    }

    // DELETE: Remove event
    if (toolName === 'delete_calendar_event') {
      const eventId = toolInput.event_id;
      if (!eventId) {
        return {
          success: false,
          error: 'Event ID is required to delete an event',
        };
      }

      const entityType = toolInput.entity_type as CalendarEntityType | undefined;

      // Select appropriate calendar
      const selection = await selectCalendar(userId, userMessage, entityType);
      console.log(`[Function:delete_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

      // Get event details before deleting (for confirmation message)
      let eventSummary = 'Event';
      try {
        const event = await getEvent(userId, eventId, selection.calendarId);
        eventSummary = event.summary;
      } catch (error) {
        // Continue with deletion even if we can't get the event details
        console.warn('Could not fetch event details before deletion:', error);
      }

      // Delete the event
      await deleteEvent(userId, eventId, selection.calendarId);
      const calendarInfo = formatCalendarSelectionMessage(selection);

      return {
        success: true,
        result: `${calendarInfo}\n\nEvent "${eventSummary}" has been deleted successfully.`,
      };
    }

    return {
      success: false,
      error: `Unknown function: ${toolName}`,
    };
  } catch (error) {
    console.error(`[Function:${toolName}] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
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
  console.log('[OpenAI streamChatCompletionWithTools] Starting stream for user:', userId, 'model:', model, 'messages:', messages.length);

  try {
    // Convert messages to OpenAI format
    let openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(toOpenAIMessage),
    ];

    console.log('[OpenAI] Converted to OpenAI format:', openaiMessages.length, 'messages');

    let fullText = '';
    const MAX_ITERATIONS = 5; // Prevent infinite loops

    // Get the user's latest message for context in calendar selection
    const userMessage = messages.length > 0 && messages[messages.length - 1].role === 'user'
      ? messages[messages.length - 1].content
          .filter(block => block.type === 'text')
          .map(block => (block as any).text)
          .join(' ')
      : '';

    // Agentic loop: keep calling the API until no more tools are used
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      console.log('[OpenAI] Iteration', iteration + 1, '- Calling OpenAI API...');

      // Create streaming request with all calendar tools (CRUD)
      const stream = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        stream: true,
        max_tokens: 4096,
        tools: CALENDAR_FUNCTIONS, // Use all CRUD functions
        tool_choice: 'auto', // Let the model decide when to use tools
      });

      console.log('[OpenAI] Stream created successfully, processing chunks...');

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
      let chunkCount = 0;
      for await (const chunk of stream) {
        chunkCount++;
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (chunkCount === 1) {
          console.log('[OpenAI] First chunk received:', JSON.stringify(chunk, null, 2));
        }

        // Handle text content
        if (delta?.content) {
          currentText += delta.content;
          fullText += delta.content;
          onText(delta.content);
          console.log('[OpenAI] Text chunk received, length:', delta.content.length, 'total so far:', fullText.length);
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
        if (finishReason === 'tool_calls' && currentToolCall && currentToolCall.id && currentToolCall.name) {
          toolCalls.push({
            id: currentToolCall.id,
            name: currentToolCall.name,
            arguments: currentToolCall.arguments,
          });
          currentToolCall = null;
          console.log('[OpenAI] Tool call detected:', currentToolCall);
        }

        // Log finish reason
        if (finishReason) {
          console.log('[OpenAI] Stream finished with reason:', finishReason);
        }
      }

      console.log('[OpenAI] Stream loop ended. Chunks processed:', chunkCount, 'Text length:', currentText.length, 'Tool calls:', toolCalls.length);

      // If no tool calls were made, we're done
      if (toolCalls.length === 0) {
        console.log('[OpenAI] No tool calls made, breaking loop');
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

        // Execute the tool with user message context for calendar selection
        const result = await executeTool(toolCall.name, toolInput, userId, userMessage);

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
    console.log('[OpenAI] Stream completed successfully. Total text length:', fullText.length);
    onComplete(fullText);

  } catch (error) {
    console.error('[OpenAI] Stream error:', error);
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
