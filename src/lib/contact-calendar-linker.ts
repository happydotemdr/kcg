import * as emailContactsRepo from './db/repositories/email-contacts';

/**
 * Link a contact to a calendar event
 */
export async function linkContactToEvent(contactId: string, eventId: string): Promise<void> {
  await emailContactsRepo.linkCalendarEvent(contactId, eventId);
}

/**
 * Get all calendar events linked to a contact
 */
export async function getContactEvents(userId: string, contactEmail: string): Promise<string[]> {
  const contact = await emailContactsRepo.findByEmail(userId, contactEmail);
  if (!contact) return [];
  return contact.linked_calendar_events || [];
}

/**
 * Suggest a contact for a calendar event based on keywords
 * Simple keyword matching implementation - can be enhanced with AI later
 */
export async function suggestContactForEvent(
  userId: string,
  eventSummary: string,
  eventDescription?: string
): Promise<string | null> {
  const text = `${eventSummary} ${eventDescription || ''}`.toLowerCase();

  // Query contacts with tags that match keywords in event
  // Basic implementation - placeholder for future enhancement

  return null;
}
