# Google Calendar Full CRUD Integration with Multi-Calendar Support

## Overview

The Keep Choosing Good (KCG) application now supports **full CRUD operations** on Google Calendar with **intelligent multi-calendar management**. This feature enables natural language calendar management across different areas of life (family, personal, work).

## Key Features

### 1. **Full CRUD Operations**
- ✅ **Create**: Add events with comprehensive details (title, description, location, attendees, reminders)
- ✅ **Read**: Query upcoming events with filtering
- ✅ **Update**: Modify any event property
- ✅ **Delete**: Remove events with confirmation safeguards

### 2. **Multi-Calendar Support**
- Map multiple Google Calendars to entity types: `family`, `personal`, `work`
- **MVP Approach**: One-to-one mapping (one calendar per entity type per user)
- Intelligent calendar selection based on natural language context
- Default to family calendar for ambiguous requests

### 3. **Natural Language Intelligence**
The system automatically selects the right calendar based on keywords:

- **"Add dentist appointment"** → Family Calendar
- **"Schedule investor meeting"** → Work Calendar
- **"Remind me to call mom"** → Personal/Family Calendar

## Architecture

### Database Schema

```sql
CREATE TABLE user_calendar_mappings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  google_calendar_id VARCHAR(255) NOT NULL,
  calendar_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'family', 'personal', 'work'
  is_default BOOLEAN DEFAULT FALSE,
  calendar_time_zone VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  UNIQUE(user_id, entity_type),
  UNIQUE(user_id, google_calendar_id)
);
```

### Services

#### **CalendarMapper** (`src/lib/calendar-mapper.ts`)
Handles intelligent calendar selection:
1. Checks for explicit calendar specification ("on my work calendar")
2. Analyzes natural language for keywords
3. Falls back to family calendar (MVP default)
4. Comprehensive logging for debugging

#### **Google Calendar Operations** (`src/lib/google-calendar.ts`)
Full CRUD API:
- `listCalendars(userId)` - List all available calendars
- `getUpcomingEvents(userId, maxResults, calendarId)` - Read events
- `createEvent(userId, params, calendarId)` - Create events
- `updateEvent(userId, params, calendarId)` - Update events
- `deleteEvent(userId, eventId, calendarId)` - Delete events
- `getEvent(userId, eventId, calendarId)` - Get specific event

#### **Claude Agent Tools** (`src/lib/claude.ts`)
Four tool definitions for Claude AI:
- `get_calendar_events` - Read upcoming events
- `create_calendar_event` - Add new events
- `update_calendar_event` - Modify existing events
- `delete_calendar_event` - Remove events

### API Endpoints

#### Calendar Configuration
- `GET /api/calendar/calendars` - List user's Google Calendars
- `GET /api/calendar/mappings` - List calendar mappings
- `POST /api/calendar/mappings` - Create mapping
- `PUT /api/calendar/mappings/[id]` - Update mapping
- `DELETE /api/calendar/mappings/[id]` - Delete mapping

## Setup & Configuration

### 1. Update OAuth Scopes

The OAuth scopes have been updated to include write permissions:

```typescript
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];
```

**Important**: Users who previously connected their calendar will need to **reconnect** to grant write permissions.

### 2. Run Database Migration

```bash
npm run db:init
```

This will:
- Create the `user_calendar_mappings` table
- Set up indexes and triggers
- Add database functions for constraint enforcement

### 3. Configure Calendars

Users can configure their calendar mappings at: `/calendar-config`

**Configuration Steps:**
1. Navigate to `/calendar-config`
2. Select a Google Calendar from the dropdown
3. Choose entity type (family, personal, work)
4. Optionally mark as default
5. Click "Add Calendar Mapping"

## Usage Examples

### Natural Language Commands

**Creating Events:**
- "Add a dentist appointment tomorrow at 2pm" → Creates in family calendar
- "Schedule an investor pitch next Tuesday at 10am on my work calendar" → Creates in work calendar
- "Remind me to call mom on her birthday" → Creates in family/personal calendar

**Reading Events:**
- "What's on my calendar today?"
- "Show me my work meetings this week"
- "What family events do I have coming up?"

**Updating Events:**
- "Move the dentist appointment to 3pm"
- "Change the investor meeting location to our office"

**Deleting Events:**
- "Cancel the dentist appointment"
- "Remove the meeting with John"

### Calendar Selection Logic

The system follows this priority:

1. **Explicit Specification**: "on my work calendar"
2. **Keyword Inference**: Matches keywords to entity types
   - Work: meeting, client, investor, business, team, project
   - Personal: hobby, gym, friend, coffee, appointment
   - Family: kids, school, dentist, doctor, birthday, home
3. **Default Calendar**: Falls back to user's default (typically family)
4. **Family Calendar**: MVP priority default
5. **Any Available**: Last resort

### Logging

All calendar selections are logged for transparency:

```
[CalendarMapper] Selecting calendar for user abc123
[CalendarMapper] User message: "add dentist appointment tomorrow"
[CalendarMapper] ✓ Selected Family Calendar (family) - inferred from keywords in message
[Tool:create_calendar_event] Selected calendar: Family Calendar (family)
```

## API Reference

### CalendarMapper

```typescript
import { selectCalendar } from './lib/calendar-mapper';

const selection = await selectCalendar(userId, userMessage, explicitEntityType);
// Returns:
// {
//   calendarId: 'abc123@google.com',
//   entityType: 'family',
//   calendarName: 'Family Calendar',
//   reason: 'Using your default family calendar'
// }
```

### Google Calendar Operations

```typescript
import { createEvent, updateEvent, deleteEvent } from './lib/google-calendar';

// Create event
const event = await createEvent(userId, {
  summary: 'Dentist Appointment',
  start: { dateTime: '2025-11-15T14:00:00-05:00' },
  end: { dateTime: '2025-11-15T15:00:00-05:00' },
  location: 'Downtown Dental',
}, calendarId);

// Update event
await updateEvent(userId, {
  eventId: 'event123',
  summary: 'Updated Title',
}, calendarId);

// Delete event
await deleteEvent(userId, 'event123', calendarId);
```

## Testing

### Manual Testing Steps

1. **Setup**:
   - Connect Google Calendar
   - Configure at least one calendar mapping (family recommended)

2. **Test CREATE**:
   - Chat: "Add dentist appointment tomorrow at 2pm"
   - Verify event created in correct calendar

3. **Test READ**:
   - Chat: "What's on my calendar?"
   - Verify events are displayed correctly

4. **Test UPDATE**:
   - Chat: "Move the dentist appointment to 3pm"
   - Verify event time updated

5. **Test DELETE**:
   - Chat: "Cancel the dentist appointment"
   - Verify event removed

6. **Test Multi-Calendar**:
   - Configure work calendar
   - Chat: "Schedule investor meeting Tuesday at 10am"
   - Verify event goes to work calendar

### Automated Tests

```bash
# Run calendar selection logic tests (coming soon)
npm run test:calendar
```

## MVP Scope & Limitations

### In Scope ✅
- Full CRUD operations
- Three entity types: family, personal, work
- One calendar per entity type per user
- Keyword-based calendar inference
- Default calendar fallback
- Basic error handling and logging

### Out of Scope ❌
- Multiple calendars per entity type
- Advanced NLP for calendar selection
- Complex recurring event handling
- Calendar sharing/permissions
- Bulk operations
- Event color/category management

## Future Enhancements

1. **Many-to-Many Mappings**: Support multiple calendars per entity type
2. **Advanced NLP**: Use AI to improve calendar selection accuracy
3. **Smart Scheduling**: Suggest optimal times based on availability
4. **Recurring Events**: Better handling of event series
5. **Attendee Management**: Smart attendee suggestions
6. **Calendar Analytics**: Insights on time usage across calendars

## Troubleshooting

### "Calendar not connected" Error
**Solution**: Navigate to calendar config page and reconnect with new permissions.

### "No calendar mappings found" Error
**Solution**: Configure at least one calendar mapping at `/calendar-config`.

### Events going to wrong calendar
**Solution**: Check calendar selection logs. Add explicit calendar specification or update keyword mappings.

### Migration fails
**Solution**: Ensure PostgreSQL 17 is running and DATABASE_URL is correct. Check migration logs in console.

## Security Considerations

- All API endpoints require Clerk authentication
- Calendar mappings are user-isolated (by user_id)
- OAuth tokens stored securely in PostgreSQL
- Automatic token refresh handling
- Input validation on all CRUD operations

## Performance

- Database queries use indexes on `user_id` and `entity_type`
- Token caching with automatic refresh
- Minimal API calls to Google Calendar
- Efficient calendar selection with early returns

## Documentation Updates

See also:
- [Main README](./CLAUDE.md) - Project overview
- [Calendar Setup Guide](./CALENDAR_SETUP.md) - OAuth configuration
- [Feature Breakdown System](./docs/FEATURE-BREAKDOWN-GUIDE.md) - Development workflow

## Support

For issues or questions:
- Check logs: Calendar operations are logged with `[Calendar]` prefix
- Verify mappings: `/calendar-config` page
- Test connection: `/api/auth/google/status`

---

**Version**: 1.0.0
**Date**: November 8, 2025
**Author**: Claude Agent Implementation
