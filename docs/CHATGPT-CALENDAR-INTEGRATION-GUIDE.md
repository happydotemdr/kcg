# ChatGPT Google Calendar Integration Guide

**Version:** 1.0.0
**Date:** November 9, 2025
**Status:** Production Ready ✅

---

## Overview

This guide explains the ChatGPT Google Calendar integration with full CRUD (Create, Read, Update, Delete) operations and intelligent calendar mapping. The implementation mirrors the successful Claude integration and reuses all existing infrastructure.

### Key Features

- ✅ **Full CRUD Operations**: Create, read, update, and delete calendar events
- ✅ **Intelligent Calendar Mapping**: Automatic selection between family, personal, and work calendars
- ✅ **Natural Language**: Users can speak naturally ("add dentist appointment tomorrow")
- ✅ **Date/Time Awareness**: System understands "today", "tomorrow", "next week", etc.
- ✅ **Enhanced Context**: Calendar configuration and current date/time in system prompt
- ✅ **Production Ready**: Built on stable OpenAI Chat Completions API

---

## Architecture

### High-Level Flow

```
User Message → ChatGPT DOS Interface → API Endpoint → OpenAI Function Calling
     ↓
Calendar Mapper (intelligent selection)
     ↓
Google Calendar API (CRUD operations)
     ↓
Formatted Response → User
```

### Components

1. **Function Definitions** (`src/lib/openai.ts`)
   - 4 OpenAI functions for CRUD operations
   - Schema validation for parameters
   - Rich descriptions for AI understanding

2. **Tool Execution** (`executeTool()`)
   - Routes function calls to appropriate handlers
   - Integrates with calendar-mapper for intelligent selection
   - Formats responses with calendar context

3. **Calendar Mapping** (`src/lib/calendar-mapper.ts` - reused)
   - Keyword-based inference (e.g., "dentist" → family)
   - Explicit specification ("on my work calendar")
   - Default calendar fallback

4. **Enhanced System Prompt** (`buildEnhancedSystemPrompt()`)
   - Current date/time context
   - User's calendar configuration
   - Entity type explanations

5. **API Endpoint** (`src/pages/api/gpt/send.ts`)
   - Builds enhanced prompt on each request
   - Streams responses with SSE
   - Handles tool execution callbacks

---

## Function Definitions

### 1. GET_CALENDAR_EVENTS_FUNCTION (READ)

**Purpose:** Retrieve upcoming events from user's calendar

**Parameters:**
```typescript
{
  max_results?: number,    // Default: 5, Max: 10
  entity_type?: 'family' | 'personal' | 'work'
}
```

**Example Usage:**
```
User: "What's on my calendar today?"
AI calls: get_calendar_events({ max_results: 5 })
Result: Lists next 5 events from inferred calendar
```

### 2. CREATE_CALENDAR_EVENT_FUNCTION (CREATE)

**Purpose:** Add new events to user's calendar

**Required Parameters:**
```typescript
{
  summary: string  // Event title (required)
}
```

**Optional Parameters:**
```typescript
{
  start_datetime?: string,  // ISO 8601 format
  start_date?: string,      // YYYY-MM-DD for all-day events
  end_datetime?: string,
  end_date?: string,
  description?: string,
  location?: string,
  attendees?: string[],     // Email addresses
  entity_type?: 'family' | 'personal' | 'work'
}
```

**Example Usage:**
```
User: "Add dentist appointment tomorrow at 2pm"
AI calls: create_calendar_event({
  summary: "Dentist Appointment",
  start_datetime: "2025-11-10T14:00:00-05:00",
  end_datetime: "2025-11-10T15:00:00-05:00"
})
Result: Event created on family calendar (inferred from "dentist")
```

### 3. UPDATE_CALENDAR_EVENT_FUNCTION (UPDATE)

**Purpose:** Modify existing events

**Required Parameters:**
```typescript
{
  event_id: string  // Get from get_calendar_events first
}
```

**Optional Parameters:** (same as CREATE, all optional)

**Example Usage:**
```
User: "Move the dentist appointment to 3pm"
AI:
  1. Calls get_calendar_events() to find the event
  2. Extracts event_id
  3. Calls update_calendar_event({
       event_id: "abc123",
       start_datetime: "2025-11-10T15:00:00-05:00",
       end_datetime: "2025-11-10T16:00:00-05:00"
     })
Result: Event rescheduled
```

### 4. DELETE_CALENDAR_EVENT_FUNCTION (DELETE)

**Purpose:** Remove events from calendar

**Required Parameters:**
```typescript
{
  event_id: string  // Get from get_calendar_events first
}
```

**Optional Parameters:**
```typescript
{
  entity_type?: 'family' | 'personal' | 'work'
}
```

**Example Usage:**
```
User: "Cancel the dentist appointment"
AI:
  1. Calls get_calendar_events() to find the event
  2. Extracts event_id
  3. Calls delete_calendar_event({ event_id: "abc123" })
Result: Event deleted
```

---

## Calendar Mapping Logic

### Selection Priority

The system selects calendars in this order:

1. **Explicit Entity Type** (in function call)
   - If function includes `entity_type: 'work'`, use work calendar

2. **Explicit User Mention**
   - "Add to my work calendar" → work
   - "On my family calendar" → family

3. **Keyword Inference**
   - Work keywords: meeting, client, investor, business, etc.
   - Personal keywords: hobby, gym, friend, coffee, etc.
   - Family keywords: kids, dentist, doctor, birthday, etc.

4. **Default Calendar**
   - User's configured default (typically family)

5. **Family Calendar Fallback**
   - MVP priority

6. **Any Available Calendar**
   - Last resort

### Keyword Examples

**Work Calendar:**
- "Schedule investor meeting"
- "Add team standup"
- "Client presentation"

**Personal Calendar:**
- "Gym workout tomorrow"
- "Coffee with friend"
- "Book club meeting"

**Family Calendar:**
- "Dentist appointment"
- "Kids soccer practice"
- "Family dinner"

### Result Format

Every operation includes calendar selection info:

```
📅 Inferred family calendar based on keywords in your message - "Family Calendar"

Event created successfully:
**Dentist Appointment**
📅 Sat, Nov 10, 2025, 2:00 PM
🔗 https://calendar.google.com/event?eid=...
```

---

## Enhanced System Prompt

### What It Includes

```
You are ChatGPT, a helpful AI assistant...

## Current Date & Time
Today is Saturday, November 9, 2025 at 3:45 PM EST.
Use this information when the user mentions relative dates...

## User's Calendar Configuration
The user has configured the following calendars:

- **Family Calendar** (DEFAULT): Mapped to "family" calendar
  - Timezone: America/New_York
- **Work Calendar**: Mapped to "work" calendar
  - Timezone: America/New_York

When creating, updating, or deleting events, the system will automatically
select the appropriate calendar based on context. The user's default calendar
is "Family Calendar" (family).
```

### Why This Matters

1. **Date Understanding**: AI knows what "tomorrow" means
2. **Calendar Awareness**: AI knows which calendars exist
3. **Better Decisions**: AI can suggest appropriate calendar
4. **Transparency**: User sees which calendar was used

---

## Implementation Details

### Tool Execution Flow

```typescript
async function executeTool(
  toolName: string,
  toolInput: any,
  userId: string,
  userMessage: string = ''
) {
  // 1. Check calendar connection
  const connected = await isCalendarConnected(userId);

  // 2. Route to appropriate handler
  if (toolName === 'create_calendar_event') {
    // 3. Select calendar using mapper
    const eventContext = `${toolInput.summary} ${toolInput.description}`;
    const selection = await selectCalendar(userId, eventContext, toolInput.entity_type);

    // 4. Execute operation
    const event = await createEvent(userId, eventParams, selection.calendarId);

    // 5. Format response with calendar info
    return {
      success: true,
      result: `${formatCalendarSelection(selection)}\n\nEvent created...`
    };
  }
}
```

### Agentic Loop

```typescript
export async function streamChatCompletionWithTools(
  messages, userId, onText, onToolUse, onComplete, onError, model, systemPrompt
) {
  // Extract user message for calendar selection
  const userMessage = extractLatestUserMessage(messages);

  // Agentic loop (up to 5 iterations)
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Stream API call with all CRUD functions
    const stream = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      tools: CALENDAR_FUNCTIONS, // All 4 functions
      tool_choice: 'auto'
    });

    // Process tool calls
    for (const toolCall of toolCalls) {
      const result = await executeTool(
        toolCall.name,
        toolCall.input,
        userId,
        userMessage  // Pass context for calendar selection
      );

      // Add result to conversation
      openaiMessages.push({ role: 'tool', content: result });
    }

    // Continue until no more tool calls
    if (toolCalls.length === 0) break;
  }
}
```

---

## Error Handling

### Calendar Not Connected

```typescript
{
  success: false,
  error: 'Google Calendar is not connected. Please connect your calendar first...'
}
```

**User sees:**
```
Error: Google Calendar is not connected. Please connect your calendar first by clicking the "Connect Calendar" button.
```

### No Calendar Mappings

```typescript
throw new Error(
  'You haven\'t configured any calendars yet. Please connect your Google Calendar and set up calendar mappings first.'
);
```

**User sees:**
```
Error: You haven't configured any calendars yet. Please connect your Google Calendar and set up calendar mappings first.
```

### Missing Required Parameters

```typescript
if (!eventId) {
  return {
    success: false,
    error: 'Event ID is required to update an event'
  };
}
```

**User sees:**
```
Error: Event ID is required to update an event
```

---

## Testing Guide

### Manual Testing Scenarios

#### 1. CREATE Operation

**Test Case:** Add family calendar event
```
User: "Add dentist appointment tomorrow at 2pm"

Expected:
1. AI calls create_calendar_event with date/time
2. Calendar mapper infers "family" from "dentist"
3. Event created on family calendar
4. Response includes calendar selection reason
```

**Verify:**
- Event appears in Google Calendar
- Correct calendar (family) used
- Time is correct (2pm)

#### 2. READ Operation

**Test Case:** Query events
```
User: "What's on my calendar this week?"

Expected:
1. AI calls get_calendar_events with appropriate date range
2. Calendar mapper selects default or inferred calendar
3. Events listed with details
```

**Verify:**
- All events shown
- Correct calendar queried
- Dates formatted correctly

#### 3. UPDATE Operation

**Test Case:** Reschedule event
```
User: "Move the dentist appointment to 3pm"

Expected:
1. AI calls get_calendar_events to find event
2. AI extracts event_id
3. AI calls update_calendar_event with new time
4. Event updated successfully
```

**Verify:**
- Event rescheduled in Google Calendar
- New time is 3pm
- Other details unchanged

#### 4. DELETE Operation

**Test Case:** Cancel event
```
User: "Cancel the dentist appointment"

Expected:
1. AI calls get_calendar_events to find event
2. AI extracts event_id
3. AI calls delete_calendar_event
4. Event deleted successfully
```

**Verify:**
- Event removed from Google Calendar
- Confirmation message shown

#### 5. Calendar Mapping

**Test Case:** Work calendar inference
```
User: "Schedule investor pitch next Tuesday at 10am"

Expected:
1. AI calls create_calendar_event
2. Calendar mapper infers "work" from "investor"
3. Event created on work calendar
```

**Verify:**
- Event on work calendar (not family)
- Reason mentions keyword inference

### Debugging Tips

**Check Console Logs:**
```
[Function:create_calendar_event] Selected calendar: Work Calendar (work)
[CalendarMapper] ✓ Selected Work Calendar (work) - inferred from keywords in message
```

**Verify API Calls:**
- Open browser DevTools → Network tab
- Look for POST /api/gpt/send
- Check SSE messages for tool_use events

**Test Calendar Mapper Independently:**
```typescript
import { selectCalendar } from './lib/calendar-mapper';

const result = await selectCalendar(
  userId,
  "add dentist appointment tomorrow",
  undefined
);
console.log(result);
// Expected: { entityType: 'family', reason: '...', ... }
```

---

## Common Issues & Solutions

### Issue: AI doesn't use calendar functions

**Symptoms:**
- AI responds conversationally without calling functions
- No tool_use events in console

**Solutions:**
1. Check system prompt includes function descriptions
2. Verify CALENDAR_FUNCTIONS array passed to API
3. Try more explicit user messages ("add to my calendar")
4. Check model supports function calling (gpt-4o, gpt-4-turbo)

### Issue: Wrong calendar selected

**Symptoms:**
- Events go to unexpected calendar
- Keyword inference not working

**Solutions:**
1. Check calendar mappings at /calendar-config
2. Review calendar-mapper logs for decision reason
3. Add more keywords to ENTITY_TYPE_KEYWORDS
4. Use explicit calendar specification ("on my work calendar")

### Issue: Date/time parsing errors

**Symptoms:**
- Events created at wrong time
- "Invalid datetime" errors

**Solutions:**
1. Verify system prompt includes current date/time
2. Check timezone in calendar configuration
3. Ensure ISO 8601 format for datetime parameters
4. Test with absolute dates first ("November 10 at 2pm")

### Issue: Events not appearing in Google Calendar

**Symptoms:**
- API success but event not visible
- Different calendar than expected

**Solutions:**
1. Check which calendar was selected (see logs/response)
2. Verify calendar ID matches Google Calendar
3. Refresh Google Calendar (may take a moment)
4. Check calendar permissions (read/write access)

---

## Best Practices

### For Users

1. **Be Specific**: "Add dentist at 2pm tomorrow" better than "add appointment"
2. **Mention Calendar**: Use "on my work calendar" for explicit selection
3. **Use Natural Language**: System understands "tomorrow", "next week", etc.
4. **Configure Mappings**: Set up calendar mappings at /calendar-config first

### For Developers

1. **Follow OpenAI Guidelines**:
   - Clear function descriptions
   - Explicit parameter types
   - Enum for constrained values
   - <20 functions for best accuracy

2. **Comprehensive Logging**:
   - Log all calendar selections
   - Log function calls and results
   - Include reasoning in responses

3. **Error Handling**:
   - Validate all inputs
   - User-friendly error messages
   - Graceful degradation

4. **Testing**:
   - Test all CRUD operations
   - Test calendar inference
   - Test edge cases (no mappings, expired tokens)

---

## Integration with Existing Systems

### Claude vs ChatGPT

Both implementations share:
- ✅ Same calendar-mapper logic
- ✅ Same google-calendar operations
- ✅ Same database schema
- ✅ Same calendar configuration UI

Differences:
- Tool/function definition format (Anthropic vs OpenAI)
- System prompt building (separate functions)
- API endpoints (`/api/chat/*` vs `/api/gpt/*`)

### Shared Infrastructure

```
calendar-mapper.ts ──┐
                     ├──> Used by both Claude & ChatGPT
google-calendar.ts ──┘

calendar-mappings DB ──> Shared by both
google-oauth DB ──> Shared by both
/calendar-config UI ──> Shared by both
```

---

## Performance Considerations

### Token Usage

**Enhanced System Prompt:**
- Base prompt: ~50 tokens
- Date/time context: ~30 tokens
- Calendar config (3 calendars): ~100 tokens
- **Total overhead**: ~180 tokens per request

**Function Definitions:**
- All 4 functions: ~800 tokens
- Passed on every request with tools

**Recommendations:**
- Monitor costs with enhanced prompts
- Consider caching calendar config (when supported)
- Use cheaper models (gpt-4o-mini) for simpler queries

### API Latency

**Typical Flow:**
1. API request: ~50ms
2. Build enhanced prompt: ~20ms (DB query)
3. OpenAI API call: ~500-2000ms (streaming)
4. Calendar operation: ~200-500ms (Google API)
5. Total: ~1-3 seconds

**Optimizations:**
- Cache calendar mappings in memory
- Use streaming for better perceived performance
- Parallel tool execution when possible

---

## Future Enhancements

### Planned

1. **Advanced Calendar Selection**
   - Machine learning for better inference
   - Learning from user corrections
   - Context from previous events

2. **Recurring Events**
   - Weekly/monthly patterns
   - Exception handling
   - Smart rescheduling

3. **Smart Scheduling**
   - Find optimal times
   - Avoid conflicts
   - Suggest based on availability

4. **Event Templates**
   - Predefined event types
   - Quick creation
   - Consistent formatting

### Under Consideration

- Multi-attendee coordination
- Calendar analytics
- Event reminders via chat
- Integration with other calendars (Outlook, etc.)

---

## Support & Troubleshooting

### Logging

Enable detailed logging:
```typescript
// In src/lib/openai.ts
console.log(`[Function:${toolName}] Input:`, toolInput);
console.log(`[Function:${toolName}] Result:`, result);
```

### Debug Mode

Set environment variable:
```bash
DEBUG_CALENDAR=true
```

### Getting Help

1. **Check Logs**: Console logs show calendar selection decisions
2. **Review Research Doc**: `docs/CHATGPT-CALENDAR-RESEARCH-FINDINGS.md`
3. **Compare with Claude**: `src/lib/claude.ts` has reference implementation
4. **Test Calendar Mapper**: Run unit tests on calendar selection logic

---

## Conclusion

The ChatGPT Google Calendar integration provides full CRUD operations with intelligent calendar mapping, matching the functionality of the Claude implementation. By reusing existing infrastructure and following OpenAI best practices, we've built a production-ready system that handles natural language calendar management seamlessly.

**Next Steps:**
1. Test all CRUD operations thoroughly
2. Gather user feedback on calendar selection accuracy
3. Monitor API costs and performance
4. Iterate on keyword mappings based on usage patterns

---

**Version History:**
- 1.0.0 (2025-11-09): Initial release with full CRUD support

**Related Documentation:**
- [Research Findings](./CHATGPT-CALENDAR-RESEARCH-FINDINGS.md)
- [Calendar CRUD README](../CALENDAR_CRUD_README.md)
- [Calendar Setup Guide](../CALENDAR_SETUP.md)
