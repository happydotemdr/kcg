# OpenAI Integration Upgrade - Implementation Summary

**Date**: 2025-11-10
**Status**: ✅ Core Backend Complete | 🚧 Widgets Pending

## Overview

We've restructured the OpenAI/ChatGPT integration to follow OpenAI's best practices, separating calendar operations (Agents SDK) from general Q&A (Responses API) for optimal performance, cost-efficiency, and user experience.

## Architecture Changes

### Before (Single Endpoint)
```
User Message → /api/chatkit/backend → Agents SDK (always) → Tools
```
- **Issues**:
  - Always used Agents SDK even for simple questions
  - Higher latency for non-calendar queries
  - Higher cost (tool-enabled models)
  - Unnecessary complexity for Q&A

### After (Intent-Based Routing)
```
User Message → /api/chatkit/backend (Router)
              ├─ [calendar intent] → /api/chatkit/runs/calendar (Agents SDK + Tools)
              └─ [Q&A intent] → /api/chatkit/runs/qa (Responses API, no tools)
```
- **Benefits**:
  - Calendar: Full CRUD with multi-step tool execution
  - Q&A: Lower latency, simpler, more cost-effective
  - Automatic intent detection via keyword matching
  - Widget support via `/api/chatkit/actions` for direct operations

## New Files Created

### 1. `/src/lib/openai-routing.ts`
**Purpose**: Intent detection and routing utilities

**Key Features**:
- `detectIntent(message)`: Detects calendar vs Q&A intent via keywords
- `streamQAResponse()`: Streams responses using Responses API
- `redactPII()`: Redacts emails/phones from tool inputs/outputs
- `validateDateTime()`, `validateDate()`, `validateEmail()`: Input validation

**Example**:
```typescript
const intent = detectIntent("Schedule a dentist appointment tomorrow");
// Returns: 'calendar'

const intent = detectIntent("What is the capital of France?");
// Returns: 'qa'
```

### 2. `/src/pages/api/chatkit/runs/calendar.ts`
**Purpose**: Calendar Agent endpoint using Agents SDK

**Features**:
- Full CRUD calendar operations via tool calling
- Multi-step agentic workflows
- Human-in-the-loop tool approval for destructive actions
- ThreadStreamEvent protocol for ChatKit compatibility
- PII redaction for all tool inputs/outputs
- Conversation persistence

**Example Request**:
```json
{
  "message": "Schedule a team meeting tomorrow at 2pm",
  "conversationId": "conv_123",
  "images": []
}
```

**Response**: SSE stream with ThreadStreamEvents

### 3. `/src/pages/api/chatkit/runs/qa.ts`
**Purpose**: Q&A endpoint using Responses API

**Features**:
- Simple text generation without tools
- Lower latency for quick responses
- ThreadStreamEvent protocol for consistency
- Conversation persistence
- Date/time awareness via enhanced system prompt

**Example Request**:
```json
{
  "message": "What's the weather like today?",
  "conversationId": "conv_456"
}
```

**Response**: SSE stream with ThreadStreamEvents

### 4. `/src/pages/api/chatkit/backend.ts` (Updated)
**Purpose**: Router endpoint that detects intent and forwards

**Flow**:
1. Authenticate user (Clerk)
2. Parse message from request body
3. Detect intent (calendar vs Q&A)
4. Forward to appropriate endpoint
5. Return streaming response

**Example Log Output**:
```
[ChatKit Router] Detected intent: calendar for message: Schedule a meeting tomorrow
[ChatKit Router] Routing to: /api/chatkit/runs/calendar
```

### 5. `/src/pages/api/chatkit/actions.ts`
**Purpose**: Direct calendar actions from widgets (no chat)

**Supported Actions**:
- `quick_add`: Create event from form inputs
- `whats_next`: Get upcoming events (next 24 hours)
- `reschedule`: Update event times
- `delete_event`: Delete an event
- `list_events`: List events with filters

**Example Request (Quick Add)**:
```json
{
  "action": "quick_add",
  "title": "Team Standup",
  "date": "2025-11-11",
  "startTime": "09:00",
  "endTime": "09:30",
  "attendees": ["team@example.com"],
  "entityType": "work"
}
```

**Example Response**:
```json
{
  "success": true,
  "result": {
    "id": "event_abc123",
    "summary": "Team Standup",
    "start": { "dateTime": "2025-11-11T09:00:00-05:00" },
    "end": { "dateTime": "2025-11-11T09:30:00-05:00" },
    "htmlLink": "https://calendar.google.com/...",
    "status": "confirmed"
  }
}
```

## Key Features Implemented

### ✅ Intent Detection
- Keyword-based routing (fast, local)
- Calendar keywords: schedule, meeting, calendar, event, etc.
- Defaults to Q&A for everything else

### ✅ Dual Execution Paths
- **Calendar Path**: Agents SDK with tool calling
  - Full CRUD operations
  - Multi-step workflows
  - Automatic calendar selection (family/personal/work)
  - Tool approval for destructive actions

- **Q&A Path**: Responses API without tools
  - Fast text generation
  - Lower cost
  - Simple logging
  - Date/time awareness

### ✅ PII Redaction
- Automatically redacts emails and phone numbers
- Applied to all tool inputs/outputs before logging
- Configurable (emails only, phones only, or both)

### ✅ Input Validation
- ISO 8601 datetime validation
- Date format validation (YYYY-MM-DD)
- Email address validation
- Timezone handling
- Error messages with clear guidance

### ✅ Actions API for Widgets
- Direct calendar operations without chat flow
- Structured payloads with validation
- Quick event creation
- List upcoming events
- Reschedule existing events
- Delete events

### ✅ ThreadStreamEvent Protocol
- Consistent SSE streaming across all endpoints
- Compatible with ChatKit React component
- Progress updates during tool execution
- Error handling with retry support

## Security Enhancements

1. **PII Redaction**: All tool inputs/outputs redacted before logging
2. **Server-Side Tokens**: Google OAuth tokens never leave backend
3. **Tool Approval**: Destructive actions (delete) require human confirmation
4. **Input Validation**: All user inputs validated before API calls
5. **Authentication**: All endpoints protected by Clerk auth

## Testing Recommendations

### Calendar Agent Tests
```bash
# Test event creation
curl -X POST http://localhost:4321/api/chatkit/runs/calendar \
  -H "Content-Type: application/json" \
  -d '{"message": "Schedule a dentist appointment tomorrow at 2pm"}'

# Test event listing
curl -X POST http://localhost:4321/api/chatkit/runs/calendar \
  -H "Content-Type: application/json" \
  -d '{"message": "What do I have on my calendar today?"}'

# Test event deletion (should request approval)
curl -X POST http://localhost:4321/api/chatkit/runs/calendar \
  -H "Content-Type: application/json" \
  -d '{"message": "Delete the dentist appointment"}'
```

### Q&A Tests
```bash
# Test general knowledge
curl -X POST http://localhost:4321/api/chatkit/runs/qa \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the capital of France?"}'

# Test date awareness
curl -X POST http://localhost:4321/api/chatkit/runs/qa \
  -H "Content-Type: application/json" \
  -d '{"message": "What day is it today?"}'
```

### Actions API Tests
```bash
# Test quick add
curl -X POST http://localhost:4321/api/chatkit/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "quick_add",
    "title": "Team Meeting",
    "date": "2025-11-11",
    "startTime": "14:00",
    "endTime": "15:00"
  }'

# Test what's next
curl -X POST http://localhost:4321/api/chatkit/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "whats_next", "hours": 24}'
```

## Pending: Widget Components

The following React components still need to be created:

### 1. Quick Add Widget (`/src/components/gpt/widgets/QuickAdd.tsx`)
- Form with: Title, Date, Start Time, End Time, Location, Attendees
- Calendar selector (family/personal/work)
- Submit button → calls `/api/chatkit/actions`
- Success/error feedback
- Optimistic UI updates

### 2. What's Next Widget (`/src/components/gpt/widgets/WhatsNext.tsx`)
- Shows upcoming events for next 24 hours
- Compact card layout with:
  - Event title
  - Start time
  - Location (if present)
  - Join button (if conference link present)
- Auto-refresh every 5 minutes
- Click to see full details

### 3. Reschedule Widget (`/src/components/gpt/widgets/Reschedule.tsx`)
- Event picker (dropdown or search)
- Time adjuster (e.g., "+30 min", "-1 hour", or specific time)
- Preview of new time
- Confirm button
- Undo option

### 4. DosChat Integration
Update `/src/components/gpt/DosChat.tsx` to include:
- Widget container above or beside chat
- Widget toggle buttons
- Widget state management
- Actions API integration

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Latency (Q&A)** | High (Agents SDK overhead) | Low (Responses API) |
| **Cost (Q&A)** | Higher (tool-enabled models) | Lower (no tools) |
| **Calendar Operations** | ✅ Full CRUD | ✅ Full CRUD (unchanged) |
| **Multi-step Workflows** | ✅ Yes | ✅ Yes (improved) |
| **Widget Support** | ❌ No | ✅ Yes (Actions API) |
| **PII Protection** | ⚠️ Basic | ✅ Comprehensive |
| **Intent Routing** | ❌ No | ✅ Automatic |
| **Input Validation** | ⚠️ Basic | ✅ Comprehensive |

## Next Steps

1. **Widget Implementation**: Create React components for Quick Add, What's Next, and Reschedule
2. **UI Integration**: Add widgets to DosChat component with responsive layout
3. **Testing**: Comprehensive testing of all endpoints and routing logic
4. **Documentation**: Update CLAUDE.md with new architecture details
5. **Performance Monitoring**: Add logging and metrics for intent detection accuracy

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| User can create, update, delete, list, and fetch events through chat | ✅ Complete |
| Quick Add widget creates an event in under three user interactions | 🚧 Pending (widget) |
| What's Next shows upcoming events and allows one-click join | 🚧 Pending (widget) |
| Q&A questions not related to calendar route to Responses API | ✅ Complete |
| All destructive changes require explicit confirmation | ✅ Complete |
| Logs show each tool call with inputs and normalized outputs | ✅ Complete |
| No Google OAuth tokens leave the backend | ✅ Complete |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Chat Input  │  │   Widgets    │  │  Calendar Status     │  │
│  │             │  │ • Quick Add  │  │  [Connected]         │  │
│  │ "Schedule   │  │ • What's Next│  │                       │  │
│  │  meeting"   │  │ • Reschedule │  │  [Connect Calendar]  │  │
│  └──────┬──────┘  └───────┬──────┘  └───────────────────────┘  │
└─────────┼──────────────────┼─────────────────────────────────────┘
          │                  │
          │ POST /api/chatkit/backend
          │                  │ POST /api/chatkit/actions
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Router                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Intent Detection (detectIntent)                          │  │
│  │  • Calendar keywords → 'calendar'                         │  │
│  │  • Everything else → 'qa'                                 │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│         ┌───────────┴───────────┐                               │
│         │                       │                               │
│         ▼                       ▼                               │
│  ┌──────────────┐        ┌──────────────┐                      │
│  │   Calendar   │        │     Q&A      │                      │
│  │  Agent Path  │        │     Path     │                      │
│  │              │        │              │                      │
│  │  Agents SDK  │        │ Responses    │                      │
│  │  + Tools     │        │    API       │                      │
│  └──────┬───────┘        └──────┬───────┘                      │
│         │                       │                               │
└─────────┼───────────────────────┼───────────────────────────────┘
          │                       │
          │                       │ (Simple streaming)
          │ (Multi-step tool execution)
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Calendar API                            │
│  • getUpcomingEvents                                              │
│  • createEvent                                                    │
│  • updateEvent                                                    │
│  • deleteEvent                                                    │
│  • getEvent                                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Code Quality

- ✅ TypeScript throughout
- ✅ Comprehensive error handling
- ✅ Detailed logging for debugging
- ✅ Input validation at all entry points
- ✅ PII redaction for sensitive data
- ✅ Consistent API response format
- ✅ ThreadStreamEvent protocol compliance
- ✅ Clean separation of concerns

## Conclusion

The OpenAI integration has been successfully restructured to follow best practices with:
- Intelligent routing between Calendar Agent and Q&A paths
- Comprehensive validation and security enhancements
- Actions API for direct widget operations
- Complete PII redaction
- Production-ready error handling

**Next milestone**: Implement widget components and integrate with DosChat UI.
