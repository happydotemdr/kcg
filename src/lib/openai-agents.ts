/**
 * OpenAI Agents SDK Integration
 *
 * This module provides the agent configuration and execution logic
 * for the ChatGPT page using OpenAI's official Agents SDK.
 *
 * Key responsibilities:
 * - Define calendar tool schemas with Zod
 * - Wrap existing Google Calendar functions for Agents SDK
 * - Configure GPT agent with tools and instructions
 * - Execute agentic loop with streaming support
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import {
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  isCalendarConnected,
  type CreateEventParams,
  type UpdateEventParams,
} from './google-calendar';
import {
  selectCalendar,
  formatCalendarSelectionMessage,
} from './calendar-mapper';
import { formatEventsForChat } from './google-calendar';
import type { CalendarEntityType } from './db/types';
import type { Message } from '../types/chat';

/**
 * Default system prompt for GPT agent
 */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to the user's Google Calendar.

You can help with:
- Viewing upcoming events and schedule
- Creating new calendar events
- Updating existing events
- Deleting events

When working with calendars:
- Events can be on family, personal, or work calendars
- You'll automatically select the right calendar based on context
- Always confirm details before making changes

Current date and time: ${new Date().toLocaleString('en-US', {
  timeZone: 'America/New_York',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  timeZoneName: 'short'
})}`;

// ============================================================================
// ZOD SCHEMAS FOR CALENDAR TOOLS
// ============================================================================

/**
 * Schema for get_calendar_events tool
 */
const getCalendarEventsSchema = z.object({
  max_results: z.number().int().min(1).max(10).optional().describe('Maximum number of events to retrieve (default: 5, max: 10)'),
  entity_type: z.enum(['family', 'personal', 'work']).optional().describe('Optional: Specific calendar to query. If not provided, will be inferred from context.'),
});

/**
 * Schema for create_calendar_event tool
 */
const createCalendarEventSchema = z.object({
  summary: z.string().min(1).describe('Event title/summary (required)'),
  start_datetime: z.string().optional().describe('Event start date and time in ISO 8601 format (e.g., "2025-11-15T14:00:00-05:00"). For all-day events, use start_date instead.'),
  start_date: z.string().optional().describe('For all-day events, the start date in YYYY-MM-DD format (e.g., "2025-11-15")'),
  end_datetime: z.string().optional().describe('Event end date and time in ISO 8601 format. For all-day events, use end_date instead.'),
  end_date: z.string().optional().describe('For all-day events, the end date in YYYY-MM-DD format'),
  description: z.string().optional().describe('Optional event description or notes'),
  location: z.string().optional().describe('Optional event location'),
  attendees: z.array(z.string().email()).optional().describe('Optional array of attendee email addresses'),
  entity_type: z.enum(['family', 'personal', 'work']).optional().describe('Optional: Specific calendar to create event on. If not provided, will be inferred from event context (e.g., "dentist" → family, "investor meeting" → work).'),
});

/**
 * Schema for update_calendar_event tool
 */
const updateCalendarEventSchema = z.object({
  event_id: z.string().min(1).describe('The Google Calendar event ID to update (required). Get this from get_calendar_events first.'),
  summary: z.string().optional().describe('New event title/summary'),
  start_datetime: z.string().optional().describe('New start date and time in ISO 8601 format'),
  start_date: z.string().optional().describe('New start date for all-day events (YYYY-MM-DD)'),
  end_datetime: z.string().optional().describe('New end date and time in ISO 8601 format'),
  end_date: z.string().optional().describe('New end date for all-day events (YYYY-MM-DD)'),
  description: z.string().optional().describe('New event description'),
  location: z.string().optional().describe('New event location'),
  attendees: z.array(z.string().email()).optional().describe('New list of attendee email addresses'),
  entity_type: z.enum(['family', 'personal', 'work']).optional().describe('Optional: Which calendar the event is on. If not provided, will be inferred.'),
});

/**
 * Schema for delete_calendar_event tool
 */
const deleteCalendarEventSchema = z.object({
  event_id: z.string().min(1).describe('The Google Calendar event ID to delete (required). Get this from get_calendar_events first.'),
  entity_type: z.enum(['family', 'personal', 'work']).optional().describe('Optional: Which calendar the event is on. If not provided, will be inferred.'),
});

// ============================================================================
// TOOL EXECUTION FUNCTIONS
// ============================================================================

/**
 * Execute get_calendar_events tool
 */
async function executeGetCalendarEvents(
  input: z.infer<typeof getCalendarEventsSchema>,
  userId: string,
  userMessage: string = ''
): Promise<string> {
  console.log('[Agents SDK:get_calendar_events] Executing with input:', input);

  // Check calendar connection
  const connected = await isCalendarConnected(userId);
  if (!connected) {
    return 'Google Calendar is not connected. Please connect your calendar first by clicking the "Connect Calendar" button.';
  }

  const maxResults = Math.min(input.max_results || 5, 10);
  const entityType = input.entity_type as CalendarEntityType | undefined;

  // Select appropriate calendar
  const selection = await selectCalendar(userId, userMessage, entityType);
  console.log(`[Agents SDK:get_calendar_events] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

  // Fetch events from selected calendar
  const events = await getUpcomingEvents(userId, maxResults);
  const formattedEvents = formatEventsForChat(events);
  const calendarInfo = formatCalendarSelectionMessage(selection);

  return `${calendarInfo}\n\n${formattedEvents}`;
}

/**
 * Execute create_calendar_event tool
 */
async function executeCreateCalendarEvent(
  input: z.infer<typeof createCalendarEventSchema>,
  userId: string
): Promise<string> {
  console.log('[Agents SDK:create_calendar_event] Executing with input:', input);

  // Check calendar connection
  const connected = await isCalendarConnected(userId);
  if (!connected) {
    return 'Google Calendar is not connected. Please connect your calendar first.';
  }

  // Validate start/end times
  if (!input.start_datetime && !input.start_date) {
    return 'Error: Event must have a start time (start_datetime or start_date)';
  }
  if (!input.end_datetime && !input.end_date) {
    return 'Error: Event must have an end time (end_datetime or end_date)';
  }

  const entityType = input.entity_type as CalendarEntityType | undefined;

  // Select appropriate calendar based on event context
  const eventContext = `${input.summary || ''} ${input.description || ''} ${input.location || ''}`;
  const selection = await selectCalendar(userId, eventContext, entityType);
  console.log(`[Agents SDK:create_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

  // Build event parameters
  const eventParams: CreateEventParams = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: {},
    end: {},
  };

  // Handle start time
  if (input.start_datetime) {
    eventParams.start.dateTime = input.start_datetime;
  } else if (input.start_date) {
    eventParams.start.date = input.start_date;
  }

  // Handle end time
  if (input.end_datetime) {
    eventParams.end.dateTime = input.end_datetime;
  } else if (input.end_date) {
    eventParams.end.date = input.end_date;
  }

  // Add attendees if provided
  if (input.attendees && Array.isArray(input.attendees)) {
    eventParams.attendees = input.attendees.map((email: string) => ({ email }));
  }

  // Create the event
  const createdEvent = await createEvent(userId, eventParams, selection.calendarId);
  const calendarInfo = formatCalendarSelectionMessage(selection);

  return `${calendarInfo}\n\nEvent created successfully!\n\nTitle: ${createdEvent.summary}\nStart: ${createdEvent.start?.dateTime || createdEvent.start?.date}\nEnd: ${createdEvent.end?.dateTime || createdEvent.end?.date}\nEvent ID: ${createdEvent.id}`;
}

/**
 * Execute update_calendar_event tool
 */
async function executeUpdateCalendarEvent(
  input: z.infer<typeof updateCalendarEventSchema>,
  userId: string
): Promise<string> {
  console.log('[Agents SDK:update_calendar_event] Executing with input:', input);

  // Check calendar connection
  const connected = await isCalendarConnected(userId);
  if (!connected) {
    return 'Google Calendar is not connected. Please connect your calendar first.';
  }

  const entityType = input.entity_type as CalendarEntityType | undefined;

  // Select calendar
  const selection = await selectCalendar(userId, '', entityType);
  console.log(`[Agents SDK:update_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

  // Build update parameters
  const updateParams: UpdateEventParams = {
    eventId: input.event_id,
  };

  if (input.summary) updateParams.summary = input.summary;
  if (input.description) updateParams.description = input.description;
  if (input.location) updateParams.location = input.location;

  // Handle start time
  if (input.start_datetime || input.start_date) {
    updateParams.start = {};
    if (input.start_datetime) updateParams.start.dateTime = input.start_datetime;
    if (input.start_date) updateParams.start.date = input.start_date;
  }

  // Handle end time
  if (input.end_datetime || input.end_date) {
    updateParams.end = {};
    if (input.end_datetime) updateParams.end.dateTime = input.end_datetime;
    if (input.end_date) updateParams.end.date = input.end_date;
  }

  // Handle attendees
  if (input.attendees) {
    updateParams.attendees = input.attendees.map((email) => ({ email }));
  }

  // Update the event
  const updatedEvent = await updateEvent(userId, updateParams, selection.calendarId);
  const calendarInfo = formatCalendarSelectionMessage(selection);

  return `${calendarInfo}\n\nEvent updated successfully!\n\nTitle: ${updatedEvent.summary}\nStart: ${updatedEvent.start?.dateTime || updatedEvent.start?.date}\nEnd: ${updatedEvent.end?.dateTime || updatedEvent.end?.date}`;
}

/**
 * Execute delete_calendar_event tool
 */
async function executeDeleteCalendarEvent(
  input: z.infer<typeof deleteCalendarEventSchema>,
  userId: string
): Promise<string> {
  console.log('[Agents SDK:delete_calendar_event] Executing with input:', input);

  // Check calendar connection
  const connected = await isCalendarConnected(userId);
  if (!connected) {
    return 'Google Calendar is not connected. Please connect your calendar first.';
  }

  const entityType = input.entity_type as CalendarEntityType | undefined;

  // Select calendar
  const selection = await selectCalendar(userId, '', entityType);
  console.log(`[Agents SDK:delete_calendar_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

  // Delete the event
  await deleteEvent(userId, input.event_id, selection.calendarId);
  const calendarInfo = formatCalendarSelectionMessage(selection);

  return `${calendarInfo}\n\nEvent deleted successfully!`;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

/**
 * Create a GPT agent with Google Calendar tools
 */
export function createGPTAgent(userId: string, systemPrompt?: string): Agent {
  const agent = new Agent({
    name: 'Calendar Assistant',
    instructions: systemPrompt || DEFAULT_SYSTEM_PROMPT,
    model: 'gpt-4o',
    tools: [
      tool({
        name: 'get_calendar_events',
        description: 'Retrieves upcoming events from the user\'s Google Calendar. Use this when the user asks about their schedule, upcoming events, meetings, or appointments. The system will automatically select the appropriate calendar based on context (family, personal, or work).',
        parameters: getCalendarEventsSchema,
        execute: async (input: z.infer<typeof getCalendarEventsSchema>) => {
          return await executeGetCalendarEvents(input, userId, '');
        },
      }),
      tool({
        name: 'create_calendar_event',
        description: 'Creates a new event on the user\'s Google Calendar. Use this when the user wants to add, schedule, or create an appointment, meeting, or reminder. The system will automatically select the appropriate calendar (family, personal, or work) based on the event context.',
        parameters: createCalendarEventSchema,
        execute: async (input: z.infer<typeof createCalendarEventSchema>) => {
          return await executeCreateCalendarEvent(input, userId);
        },
      }),
      tool({
        name: 'update_calendar_event',
        description: 'Updates an existing event on the user\'s Google Calendar. Use this when the user wants to reschedule, modify, or change details of an existing event. You must first retrieve the event to get its ID.',
        parameters: updateCalendarEventSchema,
        execute: async (input: z.infer<typeof updateCalendarEventSchema>) => {
          return await executeUpdateCalendarEvent(input, userId);
        },
      }),
      tool({
        name: 'delete_calendar_event',
        description: 'Deletes an event from the user\'s Google Calendar. Use this when the user wants to cancel, remove, or delete an event. You must first retrieve the event to get its ID. Always confirm the event details with the user before deleting.',
        parameters: deleteCalendarEventSchema,
        needsApproval: true, // Require human approval for deletion
        execute: async (input: z.infer<typeof deleteCalendarEventSchema>) => {
          return await executeDeleteCalendarEvent(input, userId);
        },
      }),
    ],
  });

  return agent;
}

// ============================================================================
// AGENT EXECUTION WITH STREAMING
// ============================================================================

/**
 * Run agent with streaming support
 *
 * This function executes the agent and streams responses back via callbacks.
 * It handles tool execution automatically via the Agents SDK.
 * Uses the correct Runner.run() pattern with proper event types.
 * Supports human-in-the-loop tool approval via onToolApproval callback.
 */
export async function runAgentWithStreaming(
  agent: Agent,
  messages: Message[],
  userId: string,
  onText: (text: string) => void,
  onToolUse: (toolName: string, toolInput: any) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
  onToolApproval?: (toolName: string, toolInput: any) => Promise<boolean> // Returns true if approved
): Promise<void> {
  console.log('[Agents SDK] Starting agent execution with', messages.length, 'messages');

  try {
    // Convert Message[] to simple string for agent input
    // The agent will handle the conversation internally
    const latestUserMessage = messages[messages.length - 1];
    let userInput: any = latestUserMessage.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join(' ');

    console.log('[Agents SDK] User input:', userInput);

    let accumulatedText = '';
    let continueExecution = true;

    // Main execution loop (handles interruptions/approvals)
    while (continueExecution) {
      // Run agent with streaming using correct pattern
      const streamedResult = await run(agent, userInput, {
        maxTurns: 5, // Prevent infinite loops
        stream: true,
      });

      console.log('[Agents SDK] Processing stream events');

      // Process streaming events with correct event types
      for await (const event of streamedResult) {
        // Handle raw model text streaming
        // ✅ FIXED: Match Context7 docs for text delta extraction
        if (event.type === 'raw_model_stream_event') {
          const data = event.data as any;
          // Primary format from Context7: event.delta.text
          if (event.delta && typeof event.delta === 'object' && 'text' in event.delta) {
            const textDelta = (event.delta as any).text;
            if (textDelta) {
              accumulatedText += textDelta;
              onText(textDelta);
              console.log('[Agents SDK] Text delta (primary):', textDelta.substring(0, 50));
            }
          }
          // Fallback formats for compatibility
          else if (data.type === 'content.delta' && data.delta) {
            const textDelta = data.delta;
            accumulatedText += textDelta;
            onText(textDelta);
            console.log('[Agents SDK] Text delta (fallback 1):', textDelta.substring(0, 50));
          }
          else if (data.type === 'text_stream' && data.text) {
            accumulatedText += data.text;
            onText(data.text);
            console.log('[Agents SDK] Text stream (fallback 2):', data.text.substring(0, 50));
          }
        }

        // Handle agent handoffs
        else if (event.type === 'agent_updated_stream_event') {
          console.log('[Agents SDK] Agent updated:', event.agent?.name);
        }

        // Handle run items (tool calls, outputs, etc.)
        else if (event.type === 'run_item_stream_event') {
          const item = event.item;
          console.log('[Agents SDK] Run item event:', item?.type);

          // Tool call detection (correct type is snake_case)
          if (item?.type === 'tool_call_item') {
            const toolCall = item as any;
            const toolName = toolCall.rawItem?.name || toolCall.name;
            const toolArgs = toolCall.rawItem?.arguments || toolCall.arguments;

            if (toolName) {
              console.log('[Agents SDK] Tool call detected:', toolName);
              onToolUse(toolName, toolArgs);
            }
          }

          // Tool approval detection
          if (item?.type === 'tool_approval_item') {
            const approvalItem = item as any;
            const toolName = approvalItem.rawItem?.name || approvalItem.name;
            const toolArgs = approvalItem.rawItem?.arguments || approvalItem.arguments;

            console.log('[Agents SDK] Tool approval required:', toolName);

            if (onToolApproval) {
              // Callback will handle approval UX
              const approved = await onToolApproval(toolName, toolArgs);
              console.log('[Agents SDK] Tool approval result:', approved);

              // The backend will need to handle the actual approve/reject
              // This just informs via callback
            }
          }

          // Message output items (correct type is snake_case)
          if (item?.type === 'message_output_item') {
            const messageItem = item as any;
            if (messageItem.rawItem?.content) {
              const content = messageItem.rawItem.content;
              // Handle text content from message
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    accumulatedText += block.text;
                    onText(block.text);
                  }
                }
              }
            }
          }
        }
      }

      console.log('[Agents SDK] Stream processing complete');

      // Wait for stream completion
      await streamedResult.completed;

      // Check for interruptions after stream completes
      if (streamedResult.interruptions && streamedResult.interruptions.length > 0) {
        console.log('[Agents SDK] Detected', streamedResult.interruptions.length, 'interruptions');

        // Handle each interruption
        for (const interruption of streamedResult.interruptions) {
          const interruptionData = interruption as any;
          const toolName = interruptionData.rawItem?.name || 'unknown';
          const toolArgs = interruptionData.rawItem?.arguments || {};

          console.log('[Agents SDK] Processing interruption for tool:', toolName);

          if (onToolApproval) {
            // Ask for approval
            const approved = await onToolApproval(toolName, toolArgs);

            if (approved) {
              console.log('[Agents SDK] Tool approved, resuming with approval');
              streamedResult.state.approve(interruption);
            } else {
              console.log('[Agents SDK] Tool rejected, resuming with rejection');
              streamedResult.state.reject(interruption);
            }
          } else {
            // No approval callback provided, auto-reject for safety
            console.warn('[Agents SDK] No approval callback, auto-rejecting:', toolName);
            streamedResult.state.reject(interruption);
          }
        }

        // Resume execution with updated state
        console.log('[Agents SDK] Resuming agent execution after approval');
        userInput = streamedResult.state;
        // Continue loop to re-run with state
      } else {
        // No interruptions, execution complete
        continueExecution = false;

        // Extract final output from RunResult
        const finalOutput = streamedResult.finalOutput || accumulatedText;
        console.log('[Agents SDK] Final output length:', finalOutput.length);

        onComplete(finalOutput);
      }
    }

  } catch (error) {
    console.error('[Agents SDK] Execution error:', error);

    // Handle specific error types
    if ((error as any).name === 'MaxTurnsExceededError') {
      console.error('[Agents SDK] Agent exceeded maximum turns');
      onError(new Error('Agent exceeded maximum conversation turns'));
    } else if ((error as any).name === 'ToolCallError') {
      console.error('[Agents SDK] Tool call failed:', error);
      onError(new Error('Tool execution failed'));
    } else if ((error as any).name === 'ModelBehaviorError') {
      console.error('[Agents SDK] Unexpected model behavior:', error);
      onError(new Error('Unexpected model behavior'));
    } else {
      onError(error as Error);
    }
  }
}

/**
 * Export tool schemas for reference
 */
export const CALENDAR_TOOL_SCHEMAS = {
  getCalendarEvents: getCalendarEventsSchema,
  createCalendarEvent: createCalendarEventSchema,
  updateCalendarEvent: updateCalendarEventSchema,
  deleteCalendarEvent: deleteCalendarEventSchema,
};
