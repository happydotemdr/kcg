/**
 * POST /api/chatkit/actions
 *
 * Actions API endpoint for ChatKit widgets
 * Handles structured calendar operations triggered by UI widgets
 * (Quick Add, What's Next, Reschedule Nudge, etc.)
 *
 * Unlike the chat endpoints, this is for direct programmatic actions
 * that don't require agent orchestration.
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users';
import {
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  isCalendarConnected,
  type CreateEventParams,
  type UpdateEventParams,
  type CalendarEvent,
} from '../../../lib/google-calendar';
import { selectCalendar, formatCalendarSelectionMessage } from '../../../lib/calendar-mapper';
import type { CalendarEntityType } from '../../../lib/db/types';
import { validateDateTime, validateDate, validateEmail } from '../../../lib/openai-routing';

export const prerender = false;

// ============================================================================
// Action Types
// ============================================================================

type ActionType =
  | 'quick_add'          // Create event quickly with minimal params
  | 'whats_next'         // Get upcoming events for next 24 hours
  | 'reschedule'         // Update event times
  | 'delete_event'       // Delete an event
  | 'list_events';       // List events with filters

interface BaseAction {
  action: ActionType;
  conversationId?: string; // Optional: link action to a conversation
}

interface QuickAddAction extends BaseAction {
  action: 'quick_add';
  title: string;
  date: string;           // YYYY-MM-DD
  startTime?: string;     // HH:MM (24h format)
  endTime?: string;       // HH:MM (24h format)
  attendees?: string[];   // Email addresses
  location?: string;
  entityType?: 'family' | 'personal' | 'work';
}

interface WhatsNextAction extends BaseAction {
  action: 'whats_next';
  hours?: number;         // Look ahead hours (default: 24)
}

interface RescheduleAction extends BaseAction {
  action: 'reschedule';
  eventId: string;
  newStartTime?: string;  // ISO 8601
  newEndTime?: string;    // ISO 8601
  entityType?: 'family' | 'personal' | 'work';
}

interface DeleteEventAction extends BaseAction {
  action: 'delete_event';
  eventId: string;
  entityType?: 'family' | 'personal' | 'work';
}

interface ListEventsAction extends BaseAction {
  action: 'list_events';
  maxResults?: number;
  entityType?: 'family' | 'personal' | 'work';
}

type Action = QuickAddAction | WhatsNextAction | RescheduleAction | DeleteEventAction | ListEventsAction;

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Handle Quick Add action
 * Creates an event from simple form inputs
 */
async function handleQuickAdd(action: QuickAddAction, userId: string): Promise<{ success: boolean; result?: CalendarEvent; error?: string }> {
  console.log('[Actions:quick_add] Creating event:', action.title);

  try {
    // Check calendar connection
    if (!await isCalendarConnected(userId)) {
      return { success: false, error: 'Google Calendar is not connected' };
    }

    // Validate required fields
    if (!action.title || action.title.trim() === '') {
      return { success: false, error: 'Event title is required' };
    }

    if (!action.date) {
      return { success: false, error: 'Event date is required' };
    }

    // Validate date format
    const dateValidation = validateDate(action.date);
    if (!dateValidation.valid) {
      return { success: false, error: dateValidation.error };
    }

    // Validate attendee emails
    if (action.attendees) {
      for (const email of action.attendees) {
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          return { success: false, error: `Invalid email: ${email}` };
        }
      }
    }

    // Select appropriate calendar
    const selection = await selectCalendar(userId, action.title, action.entityType);
    console.log(`[Actions:quick_add] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

    // Build event parameters
    const eventParams: CreateEventParams = {
      summary: action.title,
      location: action.location,
      start: {},
      end: {},
    };

    // Handle time-based or all-day event
    if (action.startTime && action.endTime) {
      // Time-based event
      const startDateTime = `${action.date}T${action.startTime}:00-05:00`; // TODO: Use user timezone
      const endDateTime = `${action.date}T${action.endTime}:00-05:00`;

      // Validate datetime format
      const startValidation = validateDateTime(startDateTime);
      if (!startValidation.valid) {
        return { success: false, error: startValidation.error };
      }

      const endValidation = validateDateTime(endDateTime);
      if (!endValidation.valid) {
        return { success: false, error: endValidation.error };
      }

      eventParams.start.dateTime = startDateTime;
      eventParams.end.dateTime = endDateTime;
    } else {
      // All-day event
      eventParams.start.date = action.date;
      // Google Calendar expects end date to be day after for all-day events
      const endDate = new Date(action.date);
      endDate.setDate(endDate.getDate() + 1);
      eventParams.end.date = endDate.toISOString().split('T')[0];
    }

    // Add attendees if provided
    if (action.attendees && action.attendees.length > 0) {
      eventParams.attendees = action.attendees.map(email => ({ email }));
    }

    // Create the event
    const createdEvent = await createEvent(userId, eventParams, selection.calendarId);

    console.log(`[Actions:quick_add] Event created successfully: ${createdEvent.id}`);

    return { success: true, result: createdEvent };

  } catch (error) {
    console.error('[Actions:quick_add] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event'
    };
  }
}

/**
 * Handle What's Next action
 * Fetches upcoming events for the next N hours
 */
async function handleWhatsNext(action: WhatsNextAction, userId: string): Promise<{ success: boolean; result?: CalendarEvent[]; error?: string }> {
  console.log('[Actions:whats_next] Fetching upcoming events');

  try {
    // Check calendar connection
    if (!await isCalendarConnected(userId)) {
      return { success: false, error: 'Google Calendar is not connected' };
    }

    // Fetch upcoming events (default: 5 events)
    const events = await getUpcomingEvents(userId, 5);

    // Filter events for next N hours
    const hoursAhead = action.hours || 24;
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const filteredEvents = events.filter(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date || '');
      return eventStart >= now && eventStart <= futureTime;
    });

    console.log(`[Actions:whats_next] Found ${filteredEvents.length} events in next ${hoursAhead} hours`);

    return { success: true, result: filteredEvents };

  } catch (error) {
    console.error('[Actions:whats_next] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch events'
    };
  }
}

/**
 * Handle Reschedule action
 * Updates event start/end times
 */
async function handleReschedule(action: RescheduleAction, userId: string): Promise<{ success: boolean; result?: CalendarEvent; error?: string }> {
  console.log('[Actions:reschedule] Updating event:', action.eventId);

  try {
    // Check calendar connection
    if (!await isCalendarConnected(userId)) {
      return { success: false, error: 'Google Calendar is not connected' };
    }

    // Validate event ID
    if (!action.eventId) {
      return { success: false, error: 'Event ID is required' };
    }

    // Validate datetimes if provided
    if (action.newStartTime) {
      const validation = validateDateTime(action.newStartTime);
      if (!validation.valid) {
        return { success: false, error: `Invalid start time: ${validation.error}` };
      }
    }

    if (action.newEndTime) {
      const validation = validateDateTime(action.newEndTime);
      if (!validation.valid) {
        return { success: false, error: `Invalid end time: ${validation.error}` };
      }
    }

    // Select appropriate calendar
    const selection = await selectCalendar(userId, '', action.entityType);
    console.log(`[Actions:reschedule] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

    // Build update parameters
    const updateParams: UpdateEventParams = {
      eventId: action.eventId,
    };

    if (action.newStartTime) {
      updateParams.start = { dateTime: action.newStartTime };
    }

    if (action.newEndTime) {
      updateParams.end = { dateTime: action.newEndTime };
    }

    // Update the event
    const updatedEvent = await updateEvent(userId, updateParams, selection.calendarId);

    console.log(`[Actions:reschedule] Event updated successfully: ${updatedEvent.id}`);

    return { success: true, result: updatedEvent };

  } catch (error) {
    console.error('[Actions:reschedule] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reschedule event'
    };
  }
}

/**
 * Handle Delete Event action
 */
async function handleDeleteEvent(action: DeleteEventAction, userId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[Actions:delete_event] Deleting event:', action.eventId);

  try {
    // Check calendar connection
    if (!await isCalendarConnected(userId)) {
      return { success: false, error: 'Google Calendar is not connected' };
    }

    // Validate event ID
    if (!action.eventId) {
      return { success: false, error: 'Event ID is required' };
    }

    // Select appropriate calendar
    const selection = await selectCalendar(userId, '', action.entityType);
    console.log(`[Actions:delete_event] Selected calendar: ${selection.calendarName} (${selection.entityType})`);

    // Delete the event
    await deleteEvent(userId, action.eventId, selection.calendarId);

    console.log(`[Actions:delete_event] Event deleted successfully`);

    return { success: true };

  } catch (error) {
    console.error('[Actions:delete_event] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete event'
    };
  }
}

/**
 * Handle List Events action
 */
async function handleListEvents(action: ListEventsAction, userId: string): Promise<{ success: boolean; result?: CalendarEvent[]; error?: string }> {
  console.log('[Actions:list_events] Listing events');

  try {
    // Check calendar connection
    if (!await isCalendarConnected(userId)) {
      return { success: false, error: 'Google Calendar is not connected' };
    }

    // Fetch events
    const maxResults = Math.min(action.maxResults || 10, 20); // Cap at 20
    const events = await getUpcomingEvents(userId, maxResults);

    console.log(`[Actions:list_events] Found ${events.length} events`);

    return { success: true, result: events };

  } catch (error) {
    console.error('[Actions:list_events] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list events'
    };
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();
    console.log('[Actions] Clerk User ID:', clerkUserId);

    if (!clerkUserId) {
      console.error('[Actions] No Clerk user ID - unauthorized');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(clerkUserId);
    console.log('[Actions] Database user lookup result:', dbUser ? `Found: ${dbUser.id}` : 'NOT FOUND');

    if (!dbUser) {
      console.error('[Actions] User not found in database. Clerk ID:', clerkUserId);
      return new Response(
        JSON.stringify({ error: 'User not found in database', clerkUserId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const action = await request.json() as Action;

    console.log('[Actions] Processing action:', action.action);

    // Route to appropriate handler
    let response: any;

    switch (action.action) {
      case 'quick_add':
        response = await handleQuickAdd(action, dbUser.id);
        break;

      case 'whats_next':
        response = await handleWhatsNext(action, dbUser.id);
        break;

      case 'reschedule':
        response = await handleReschedule(action, dbUser.id);
        break;

      case 'delete_event':
        response = await handleDeleteEvent(action, dbUser.id);
        break;

      case 'list_events':
        response = await handleListEvents(action, dbUser.id);
        break;

      default:
        console.error('[Actions] Unknown action type:', (action as any).action);
        return new Response(
          JSON.stringify({ error: 'Unknown action type' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Return response
    return new Response(
      JSON.stringify(response),
      {
        status: response.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Actions] Top-level error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
