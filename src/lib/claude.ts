/**
 * Claude SDK Integration
 * Following Anthropic's best practices for Messages API
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Message } from '../types/chat';
import {
  getUpcomingEvents,
  formatEventsForChat,
  isCalendarConnected,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  type CreateEventParams,
  type UpdateEventParams,
} from './google-calendar';
import { selectCalendar, formatCalendarSelectionMessage } from './calendar-mapper';
import type { CalendarEntityType } from './db/types';

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
export const DEFAULT_SYSTEM_PROMPT = `You are Claude, a helpful AI assistant created by Anthropic. You are knowledgeable, thoughtful, and aim to provide accurate and helpful responses. You can understand and analyze images when they are provided. You have access to tools that allow you to help users with their Google Calendar.`;

/**
 * Build an enhanced system prompt with date awareness and calendar mappings
 * This helps Claude understand:
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
      enhancedPrompt += `You can see which calendar was selected in the tool execution results.`;

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
 * Calendar tool definitions for Claude
 * Supports full CRUD operations on Google Calendar
 */

// READ: Get upcoming events
export const GET_CALENDAR_EVENTS_TOOL: Tool = {
  name: 'get_calendar_events',
  description: 'Retrieves upcoming events from the user\'s Google Calendar. Use this when the user asks about their schedule, upcoming events, meetings, or appointments. The system will automatically select the appropriate calendar based on context (family, personal, or work).',
  input_schema: {
    type: 'object',
    properties: {
      max_results: {
        type: 'number',
        description: 'Maximum number of events to retrieve (default: 5, max: 10)',
        default: 5,
      },
      entity_type: {
        type: 'string',
        enum: ['family', 'personal', 'work'],
        description: 'Optional: Specific calendar to query. If not provided, will be inferred from context.',
      },
    },
    required: [],
  },
};

// CREATE: Add new event
export const CREATE_CALENDAR_EVENT_TOOL: Tool = {
  name: 'create_calendar_event',
  description: 'Creates a new event on the user\'s Google Calendar. Use this when the user wants to add, schedule, or create an appointment, meeting, or reminder. The system will automatically select the appropriate calendar (family, personal, or work) based on the event context.',
  input_schema: {
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
};

// UPDATE: Modify existing event
export const UPDATE_CALENDAR_EVENT_TOOL: Tool = {
  name: 'update_calendar_event',
  description: 'Updates an existing event on the user\'s Google Calendar. Use this when the user wants to reschedule, modify, or change details of an existing event. You must first retrieve the event to get its ID.',
  input_schema: {
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
};

// DELETE: Remove event
export const DELETE_CALENDAR_EVENT_TOOL: Tool = {
  name: 'delete_calendar_event',
  description: 'Deletes an event from the user\'s Google Calendar. Use this when the user wants to cancel, remove, or delete an event. You must first retrieve the event to get its ID. Always confirm the event details with the user before deleting.',
  input_schema: {
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
};

// All calendar tools
export const CALENDAR_TOOLS: Tool[] = [
  GET_CALENDAR_EVENTS_TOOL,
  CREATE_CALENDAR_EVENT_TOOL,
  UPDATE_CALENDAR_EVENT_TOOL,
  DELETE_CALENDAR_EVENT_TOOL,
];

// Legacy export for backwards compatibility
export const CALENDAR_TOOL = GET_CALENDAR_EVENTS_TOOL;

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

/**
 * Execute a tool call
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
      console.log(`[Tool:get_calendar_events] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

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
      console.log(`[Tool:create_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

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
      console.log(`[Tool:update_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

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
      console.log(`[Tool:delete_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

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
      error: `Unknown tool: ${toolName}`,
    };
  } catch (error) {
    console.error(`[Tool:${toolName}] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Stream a chat completion with tool use support (Agent SDK pattern)
 * Implements an agentic loop where Claude can call tools and process results
 *
 * @param messages - Conversation history
 * @param userId - User ID for accessing user-specific resources (like calendar)
 * @param onText - Callback for text chunks
 * @param onToolUse - Callback when a tool is being used
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 * @param model - Model to use
 * @param systemPrompt - System prompt for Claude
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
    // Convert messages to Anthropic format
    let anthropicMessages: MessageParam[] = messages.map(toAnthropicMessage);
    let fullText = '';
    const maxIterations = 5; // Prevent infinite loops
    let iteration = 0;

    // Get the user's latest message for context in calendar selection
    const userMessage = messages.length > 0 && messages[messages.length - 1].role === 'user'
      ? messages[messages.length - 1].content
          .filter(block => block.type === 'text')
          .map(block => (block as any).text)
          .join(' ')
      : '';

    // Agentic loop: continue until Claude stops using tools
    while (iteration < maxIterations) {
      iteration++;

      // Create streaming request with all calendar tools (CRUD)
      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: CALENDAR_TOOLS, // Use all CRUD tools
      });

      let currentResponse: any = null;
      let toolUsed = false;

      // Handle different event types
      stream.on('text', (text: string) => {
        fullText += text;
        onText(text);
      });

      stream.on('error', (error) => {
        onError(error);
      });

      // Wait for final message
      currentResponse = await stream.finalMessage();

      // Check if Claude used a tool
      const toolUseBlocks = currentResponse.content.filter(
        (block: any) => block.type === 'tool_use'
      );

      if (toolUseBlocks.length > 0) {
        toolUsed = true;

        // Process each tool use
        for (const toolBlock of toolUseBlocks) {
          const { id: toolUseId, name: toolName, input: toolInput } = toolBlock;

          // Notify UI that tool is being used
          onToolUse(toolName, toolInput);

          // Execute the tool with user message context for calendar selection
          const toolResult = await executeTool(toolName, toolInput, userId, userMessage);

          // Add assistant's response (with tool_use) to messages
          anthropicMessages.push({
            role: 'assistant',
            content: currentResponse.content,
          });

          // Add tool result to messages
          anthropicMessages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUseId,
                content: toolResult.success
                  ? toolResult.result!
                  : `Error: ${toolResult.error}`,
              },
            ],
          });
        }

        // Continue the loop to get Claude's response to the tool results
        continue;
      }

      // No tools used, we're done
      break;
    }

    // Call completion handler
    onComplete(fullText);
  } catch (error) {
    onError(error as Error);
  }
}
