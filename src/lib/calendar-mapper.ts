/**
 * Calendar Mapper Service
 *
 * Handles intelligent calendar selection based on:
 * 1. Explicit user specification ("add to my work calendar")
 * 2. Natural language inference (keywords like "investor meeting" → work calendar)
 * 3. Entity type mapping (user_calendar_mappings table)
 * 4. Default fallback to family calendar (MVP focus)
 *
 * Every calendar selection decision is logged for debugging and transparency.
 */

import type { CalendarEntityType } from './db/types';
import {
  findMappingByEntityType,
  findDefaultMapping,
  findMappingsByUserId,
} from './db/repositories/calendar-mappings';

/**
 * Result of calendar selection with reasoning
 */
export interface CalendarSelectionResult {
  calendarId: string;
  entityType: CalendarEntityType;
  calendarName: string;
  reason: string; // Human-readable explanation of why this calendar was selected
}

/**
 * Keywords for inferring calendar entity type from natural language
 */
const ENTITY_TYPE_KEYWORDS: Record<CalendarEntityType, string[]> = {
  work: [
    'work', 'office', 'meeting', 'client', 'investor', 'business', 'conference',
    'team', 'colleague', 'coworker', 'project', 'deadline', 'presentation',
    'call', 'standup', 'sprint', 'review', 'interview', 'professional',
    'manager', 'boss', 'employee', 'corporation', 'company', 'board',
  ],
  personal: [
    'personal', 'private', 'hobby', 'gym', 'workout', 'exercise', 'friend',
    'coffee', 'lunch', 'dinner', 'movie', 'book', 'study', 'learn',
    'volunteer', 'appointment', 'errand', 'shop', 'grocery',
  ],
  family: [
    'family', 'kids', 'children', 'spouse', 'parent', 'mom', 'dad',
    'school', 'pickup', 'drop-off', 'homework', 'soccer', 'practice',
    'recital', 'play', 'birthday', 'anniversary', 'vacation', 'trip',
    'dentist', 'doctor', 'pediatrician', 'daycare', 'babysitter',
    'home', 'house', 'household', 'chore',
  ],
};

/**
 * Explicit calendar specification patterns
 * Matches phrases like "on my work calendar" or "to family calendar"
 */
const EXPLICIT_PATTERNS: Array<{ pattern: RegExp; entityType: CalendarEntityType }> = [
  { pattern: /\b(on|to|in)\s+(my\s+)?(work|office|business)\s+calendar\b/i, entityType: 'work' },
  { pattern: /\b(on|to|in)\s+(my\s+)?personal\s+calendar\b/i, entityType: 'personal' },
  { pattern: /\b(on|to|in)\s+(my\s+)?family\s+calendar\b/i, entityType: 'family' },
  { pattern: /\bwork\s+calendar\b/i, entityType: 'work' },
  { pattern: /\bpersonal\s+calendar\b/i, entityType: 'personal' },
  { pattern: /\bfamily\s+calendar\b/i, entityType: 'family' },
];

/**
 * Select the appropriate calendar for a given user and intent
 *
 * @param userId - Database user ID
 * @param userMessage - The natural language message from the user
 * @param explicitEntityType - Optional: Explicitly specified entity type
 * @returns Calendar selection result with reasoning
 */
export async function selectCalendar(
  userId: string,
  userMessage: string,
  explicitEntityType?: CalendarEntityType
): Promise<CalendarSelectionResult> {
  console.log(`[CalendarMapper] Selecting calendar for user ${userId}`);
  console.log(`[CalendarMapper] User message: "${userMessage}"`);
  console.log(`[CalendarMapper] Explicit entity type: ${explicitEntityType || 'none'}`);

  // Step 1: Check for explicit entity type parameter
  if (explicitEntityType) {
    const mapping = await findMappingByEntityType(userId, explicitEntityType);
    if (mapping) {
      console.log(`[CalendarMapper] ✓ Selected ${mapping.calendar_name} (${explicitEntityType}) - explicitly specified by caller`);
      return {
        calendarId: mapping.google_calendar_id,
        entityType: explicitEntityType,
        calendarName: mapping.calendar_name,
        reason: `Explicitly specified ${explicitEntityType} calendar`,
      };
    } else {
      console.log(`[CalendarMapper] ⚠ Explicit entity type ${explicitEntityType} has no mapping for user ${userId}`);
      throw new Error(
        `You haven't configured a ${explicitEntityType} calendar yet. Please set up your calendar mappings first.`
      );
    }
  }

  // Step 2: Check for explicit calendar specification in user message
  const explicitMatch = detectExplicitCalendarSpecification(userMessage);
  if (explicitMatch) {
    const mapping = await findMappingByEntityType(userId, explicitMatch);
    if (mapping) {
      console.log(`[CalendarMapper] ✓ Selected ${mapping.calendar_name} (${explicitMatch}) - detected explicit mention in message`);
      return {
        calendarId: mapping.google_calendar_id,
        entityType: explicitMatch,
        calendarName: mapping.calendar_name,
        reason: `User explicitly mentioned "${explicitMatch} calendar" in their message`,
      };
    } else {
      console.log(`[CalendarMapper] ⚠ User mentioned ${explicitMatch} calendar but no mapping exists`);
      // Don't throw - fall through to inference/default
    }
  }

  // Step 3: Infer entity type from keywords in user message
  const inferredEntityType = inferEntityTypeFromMessage(userMessage);
  if (inferredEntityType) {
    const mapping = await findMappingByEntityType(userId, inferredEntityType);
    if (mapping) {
      console.log(`[CalendarMapper] ✓ Selected ${mapping.calendar_name} (${inferredEntityType}) - inferred from keywords in message`);
      return {
        calendarId: mapping.google_calendar_id,
        entityType: inferredEntityType,
        calendarName: mapping.calendar_name,
        reason: `Inferred ${inferredEntityType} calendar based on keywords in your message`,
      };
    } else {
      console.log(`[CalendarMapper] ⚠ Inferred ${inferredEntityType} but no mapping exists, falling back to default`);
    }
  }

  // Step 4: Use default calendar (typically family calendar for MVP)
  const defaultMapping = await findDefaultMapping(userId);
  if (defaultMapping) {
    console.log(`[CalendarMapper] ✓ Selected ${defaultMapping.calendar_name} (${defaultMapping.entity_type}) - user's default calendar`);
    return {
      calendarId: defaultMapping.google_calendar_id,
      entityType: defaultMapping.entity_type,
      calendarName: defaultMapping.calendar_name,
      reason: `Using your default ${defaultMapping.entity_type} calendar`,
    };
  }

  // Step 5: Fallback to family calendar if exists (MVP priority)
  const familyMapping = await findMappingByEntityType(userId, 'family');
  if (familyMapping) {
    console.log(`[CalendarMapper] ✓ Selected ${familyMapping.calendar_name} (family) - MVP default fallback`);
    return {
      calendarId: familyMapping.google_calendar_id,
      entityType: 'family',
      calendarName: familyMapping.calendar_name,
      reason: 'Using family calendar (default for ambiguous requests)',
    };
  }

  // Step 6: Last resort - use any available calendar
  const allMappings = await findMappingsByUserId(userId);
  if (allMappings.length > 0) {
    const firstMapping = allMappings[0];
    console.log(`[CalendarMapper] ⚠ Selected ${firstMapping.calendar_name} (${firstMapping.entity_type}) - last resort fallback`);
    return {
      calendarId: firstMapping.google_calendar_id,
      entityType: firstMapping.entity_type,
      calendarName: firstMapping.calendar_name,
      reason: `Using your ${firstMapping.entity_type} calendar (first available)`,
    };
  }

  // No calendars configured at all
  console.error(`[CalendarMapper] ✗ No calendar mappings found for user ${userId}`);
  throw new Error(
    'You haven\'t configured any calendars yet. Please connect your Google Calendar and set up calendar mappings first.'
  );
}

/**
 * Detect explicit calendar specification in user message
 * Example: "add to my work calendar" → 'work'
 */
function detectExplicitCalendarSpecification(message: string): CalendarEntityType | null {
  for (const { pattern, entityType } of EXPLICIT_PATTERNS) {
    if (pattern.test(message)) {
      return entityType;
    }
  }
  return null;
}

/**
 * Infer entity type from keywords in the message
 * Returns the entity type with the most keyword matches
 */
function inferEntityTypeFromMessage(message: string): CalendarEntityType | null {
  const messageLower = message.toLowerCase();
  const scores: Record<CalendarEntityType, number> = {
    work: 0,
    personal: 0,
    family: 0,
  };

  // Count keyword matches for each entity type
  for (const [entityType, keywords] of Object.entries(ENTITY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundary regex to match whole words
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(messageLower)) {
        scores[entityType as CalendarEntityType]++;
      }
    }
  }

  // Find the entity type with the highest score
  const maxScore = Math.max(...Object.values(scores));

  // Only return a result if there's a clear winner (at least 1 match)
  if (maxScore === 0) {
    return null;
  }

  // If there's a tie, prefer family (MVP priority)
  const entryTypeOrder: CalendarEntityType[] = ['family', 'work', 'personal'];
  for (const entityType of entryTypeOrder) {
    if (scores[entityType] === maxScore) {
      console.log(`[CalendarMapper] Inferred entity type: ${entityType} (score: ${maxScore})`);
      return entityType;
    }
  }

  return null;
}

/**
 * Get all configured calendars for a user
 * Used for displaying available calendars in UI
 */
export async function getUserCalendars(userId: string) {
  const mappings = await findMappingsByUserId(userId);
  console.log(`[CalendarMapper] Found ${mappings.length} calendar mappings for user ${userId}`);
  return mappings;
}

/**
 * Validate that a specific calendar ID is accessible for a user
 */
export async function validateCalendarAccess(
  userId: string,
  googleCalendarId: string
): Promise<boolean> {
  const mappings = await findMappingsByUserId(userId);
  const hasAccess = mappings.some((m) => m.google_calendar_id === googleCalendarId);

  console.log(`[CalendarMapper] Calendar ${googleCalendarId} access for user ${userId}: ${hasAccess}`);

  return hasAccess;
}

/**
 * Get a user-friendly message about which calendar was selected
 */
export function formatCalendarSelectionMessage(selection: CalendarSelectionResult): string {
  return `📅 ${selection.reason} - "${selection.calendarName}"`;
}
