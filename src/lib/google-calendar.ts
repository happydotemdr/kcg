/**
 * Google Calendar Integration
 * Handles OAuth2 authentication and calendar event retrieval
 */

import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { findTokenByUserId, upsertOAuthToken, isTokenExpired } from './db/repositories/google-oauth';
import * as emailContactsRepo from './db/repositories/email-contacts';
import { inferGoogleAccount } from './account-inference';

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4321/api/auth/google/callback';

// Required scopes for calendar, Gmail, Contacts, and Tasks access (unified OAuth)
export const CALENDAR_SCOPES = [
  // User info scope (to get email address)
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',

  // Calendar scopes (calendar scope includes calendar.events)
  'https://www.googleapis.com/auth/calendar',

  // Gmail scope (https://mail.google.com/ includes readonly, compose, modify)
  'https://mail.google.com/',

  // Contacts scope (People API)
  'https://www.googleapis.com/auth/contacts',

  // Tasks scope
  'https://www.googleapis.com/auth/tasks',
];

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for user to grant access
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: CALENDAR_SCOPES,
    prompt: 'consent', // Force consent screen to ensure we get refresh token
    state: state, // Include state parameter for security
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get OAuth2 client configured with user's credentials
 */
async function getAuthenticatedClient(userId: string, googleAccountEmail?: string) {
  const tokenData = await findTokenByUserId(userId, googleAccountEmail);

  if (!tokenData) {
    throw new Error('No Google Calendar connection found. Please connect your calendar first.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: tokenData.token_type,
    expiry_date: tokenData.expiry_date,
  });

  // Handle token refresh automatically
  oauth2Client.on('tokens', async (tokens) => {
    // Update tokens in database when they are refreshed
    if (tokens.refresh_token || tokenData.refresh_token) {
      await upsertOAuthToken({
        user_id: userId,
        google_account_email: tokenData.google_account_email,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || tokenData.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || null,
        scope: tokenData.scope,
      });
    }
  });

  return oauth2Client;
}

/**
 * Calendar event interface for simplified response
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  htmlLink: string;
  status: string;
}

/**
 * Fetch next N calendar events for a user
 */
export async function getUpcomingEvents(
  userId: string,
  maxResults: number = 5
): Promise<CalendarEvent[]> {
  try {
    const auth = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Transform to simplified format
    return events.map((event: calendar_v3.Schema$Event) => ({
      id: event.id!,
      summary: event.summary || 'No title',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map(a => ({
        email: a.email!,
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      htmlLink: event.htmlLink!,
      status: event.status!,
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw new Error(`Failed to fetch calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user has connected their Google Calendar
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const token = await findTokenByUserId(userId);
  if (!token) return false;
  if (isTokenExpired(token)) return false;
  return true;
}

/**
 * Format calendar events for display in chat
 */
export function formatEventsForChat(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "You have no upcoming events in your calendar.";
  }

  let result = `Here are your next ${events.length} calendar events:\n\n`;

  events.forEach((event, index) => {
    const startTime = event.start.dateTime || event.start.date;
    const endTime = event.end.dateTime || event.end.date;

    result += `${index + 1}. **${event.summary}**\n`;
    result += `   📅 ${formatDateTime(startTime!)}`;

    if (endTime && startTime !== endTime) {
      result += ` - ${formatDateTime(endTime)}`;
    }
    result += '\n';

    if (event.location) {
      result += `   📍 ${event.location}\n`;
    }

    if (event.description) {
      const shortDesc = event.description.length > 100
        ? event.description.substring(0, 100) + '...'
        : event.description;
      result += `   📝 ${shortDesc}\n`;
    }

    if (event.attendees && event.attendees.length > 0) {
      result += `   👥 ${event.attendees.length} attendee(s)\n`;
    }

    result += '\n';
  });

  return result;
}

/**
 * Format date/time for display
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);

  // Check if it's an all-day event (date only, no time)
  if (dateString.length === 10) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Format with time
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Interface for creating a calendar event
 */
export interface CreateEventParams {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string; // ISO 8601 format
    date?: string; // YYYY-MM-DD for all-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

/**
 * Interface for updating a calendar event
 */
export interface UpdateEventParams extends Partial<CreateEventParams> {
  eventId: string;
}

/**
 * Google Calendar List item interface
 */
export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
}

/**
 * List all calendars for a user
 * Used for calendar configuration/mapping
 */
export async function listCalendars(userId: string): Promise<GoogleCalendarListItem[]> {
  try {
    const auth = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    console.log(`[Calendar] Listed ${calendars.length} calendars for user ${userId}`);

    return calendars.map((cal) => ({
      id: cal.id!,
      summary: cal.summary || 'Unnamed Calendar',
      description: cal.description || undefined,
      timeZone: cal.timeZone || 'UTC',
      primary: cal.primary || false,
      accessRole: cal.accessRole || 'reader',
      backgroundColor: cal.backgroundColor || undefined,
    }));
  } catch (error) {
    console.error('[Calendar] Error listing calendars:', error);
    throw new Error(`Failed to list calendars: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  userId: string,
  params: CreateEventParams,
  calendarId: string = 'primary',
  clerkUserId?: string
): Promise<CalendarEvent> {
  try {
    // Use smart account inference if clerkUserId is provided
    let googleAccountEmail: string | undefined;
    if (clerkUserId) {
      const inference = await inferGoogleAccount(clerkUserId, {
        eventDetails: {
          summary: params.summary,
          description: params.description,
          attendees: params.attendees?.map(a => a.email),
        },
      });

      // Use suggested account if confidence is high enough
      if (inference.confidence > 0.7 && inference.suggestedEmail) {
        googleAccountEmail = inference.suggestedEmail;
        console.log(`[Calendar] Using inferred account: ${googleAccountEmail} (confidence: ${inference.confidence})`);
        console.log(`[Calendar] Reasoning: ${inference.reasoning}`);
      } else if (inference.fallbackToPrimary) {
        console.log(`[Calendar] Using primary account (${inference.reasoning})`);
      }
    }

    const auth = await getAuthenticatedClient(userId, googleAccountEmail);
    const calendar = google.calendar({ version: 'v3', auth });

    console.log(`[Calendar] Creating event on calendar ${calendarId} for user ${userId}:`, params.summary);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: params.start,
        end: params.end,
        attendees: params.attendees,
        reminders: params.reminders,
      },
    });

    const event = response.data;

    console.log(`[Calendar] Event created successfully: ${event.id}`);

    return {
      id: event.id!,
      summary: event.summary || 'No title',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email!,
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      htmlLink: event.htmlLink!,
      status: event.status!,
    };
  } catch (error) {
    console.error('[Calendar] Error creating event:', error);
    throw new Error(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  userId: string,
  params: UpdateEventParams,
  calendarId: string = 'primary',
  clerkUserId?: string
): Promise<CalendarEvent> {
  try {
    // Use smart account inference if clerkUserId is provided
    let googleAccountEmail: string | undefined;
    if (clerkUserId) {
      const inference = await inferGoogleAccount(clerkUserId, {
        eventDetails: {
          summary: params.summary,
          description: params.description,
          attendees: params.attendees?.map(a => a.email),
        },
      });

      // Use suggested account if confidence is high enough
      if (inference.confidence > 0.7 && inference.suggestedEmail) {
        googleAccountEmail = inference.suggestedEmail;
        console.log(`[Calendar] Using inferred account: ${googleAccountEmail} (confidence: ${inference.confidence})`);
        console.log(`[Calendar] Reasoning: ${inference.reasoning}`);
      } else if (inference.fallbackToPrimary) {
        console.log(`[Calendar] Using primary account (${inference.reasoning})`);
      }
    }

    const auth = await getAuthenticatedClient(userId, googleAccountEmail);
    const calendar = google.calendar({ version: 'v3', auth });

    const { eventId, ...updates } = params;

    console.log(`[Calendar] Updating event ${eventId} on calendar ${calendarId} for user ${userId}`);

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: updates.summary,
        description: updates.description,
        location: updates.location,
        start: updates.start,
        end: updates.end,
        attendees: updates.attendees,
        reminders: updates.reminders,
      },
    });

    const event = response.data;

    console.log(`[Calendar] Event updated successfully: ${event.id}`);

    return {
      id: event.id!,
      summary: event.summary || 'No title',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email!,
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      htmlLink: event.htmlLink!,
      status: event.status!,
    };
  } catch (error) {
    console.error('[Calendar] Error updating event:', error);
    throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  userId: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  try {
    const auth = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    console.log(`[Calendar] Deleting event ${eventId} from calendar ${calendarId} for user ${userId}`);

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    console.log(`[Calendar] Event deleted successfully: ${eventId}`);
  } catch (error) {
    console.error('[Calendar] Error deleting event:', error);
    throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a specific calendar event by ID
 */
export async function getEvent(
  userId: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<CalendarEvent> {
  try {
    const auth = await getAuthenticatedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    const event = response.data;

    return {
      id: event.id!,
      summary: event.summary || 'No title',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email!,
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      htmlLink: event.htmlLink!,
      status: event.status!,
    };
  } catch (error) {
    console.error('[Calendar] Error fetching event:', error);
    throw new Error(`Failed to fetch event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check contact trust level for calendar event automation
 * Returns trust status, confidence score, and auto-approval eligibility
 */
export async function checkContactTrust(userId: string, senderEmail: string) {
  const contact = await emailContactsRepo.findByEmail(userId, senderEmail);
  if (!contact) {
    return { trusted: false, confidence: 0, autoApprove: false };
  }

  return {
    trusted: contact.verification_status === 'verified',
    confidence: contact.confidence_score,
    autoApprove: contact.verification_status === 'verified' && contact.confidence_score > 0.8,
  };
}
