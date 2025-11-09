# ChatGPT Agent SDK Google Calendar Integration - Research Findings

**Date:** November 9, 2025
**Author:** Claude Agent Implementation
**Version:** 1.0.0

---

## Executive Summary

This document summarizes the research findings for implementing a production-ready ChatGPT agent with full CRUD operations on Google Calendar. After thorough analysis of the OpenAI ecosystem and existing codebase, we've determined that the optimal approach is to enhance the existing OpenAI Chat Completions API with function calling, rather than adopting new experimental frameworks.

**Key Finding:** Our current implementation already uses production-ready patterns. We need to expand functionality, not change architecture.

---

## Table of Contents

1. [OpenAI/ChatGPT Ecosystem Overview](#openai-chatgpt-ecosystem-overview)
2. [Current Implementation Analysis](#current-implementation-analysis)
3. [Calendar Configuration Analysis](#calendar-configuration-analysis)
4. [Gap Analysis](#gap-analysis)
5. [Architecture Recommendations](#architecture-recommendations)
6. [Implementation Strategy](#implementation-strategy)
7. [References](#references)

---

## OpenAI/ChatGPT Ecosystem Overview

### 1. **Agents SDK (2025) - NEW**

**Status:** Production-ready, successor to Swarm

**Key Features:**
- Evolved from experimental Swarm framework
- Key primitives: Agents, Handoffs, Guardrails, Sessions
- Built-in tracing and debugging capabilities
- Works with new Responses API
- Automatic conversation history management

**Assessment:**
- **Pros:** Modern, comprehensive framework with built-in features
- **Cons:** New API, requires migration, less mature ecosystem
- **Recommendation:** Monitor for future adoption, but not required for current project

### 2. **Chat Completions API with Function Calling - PRODUCTION**

**Status:** Mature, production-ready (our current approach)

**Key Features:**
- Stateless architecture
- Manual orchestration with full control
- Mature ecosystem and extensive documentation
- Supports streaming responses
- Function calling for tool execution

**Assessment:**
- **Pros:** Proven, stable, well-documented, we already use it
- **Cons:** Requires manual state management
- **Recommendation:** ✅ **Use this approach** - it's production-ready and we're already using it

### 3. **Assistants API**

**Status:** Being phased out in 2026

**Key Features:**
- Built-in tools (Code Interpreter, Retrieval, Function calling)
- Automatic state management with threads
- Higher quality function calling

**Assessment:**
- **Cons:** Being deprecated in 2026
- **Recommendation:** ❌ Do not adopt

### 4. **Swarm Framework**

**Status:** Educational, experimental

**Key Features:**
- Lightweight multi-agent orchestration
- Routines and handoffs pattern
- Based on Chat Completions API

**Assessment:**
- **Cons:** Explicitly marked as educational, not for production
- **Recommendation:** ❌ Do not use for production

---

## Current Implementation Analysis

### Claude Implementation (src/lib/claude.ts)

**Status:** ✅ Full CRUD - Production Ready

**Tools Implemented:**
1. `get_calendar_events` - READ operation
2. `create_calendar_event` - CREATE operation
3. `update_calendar_event` - UPDATE operation
4. `delete_calendar_event` - DELETE operation

**Key Features:**
- Full integration with calendar-mapper.ts for intelligent calendar selection
- Enhanced system prompt with date/time context and calendar mappings
- Agentic loop with `streamChatCompletionWithTools`
- Proper error handling and logging
- User context passed for calendar selection

**Example Implementation:**
```typescript
export const CALENDAR_TOOLS: Tool[] = [
  GET_CALENDAR_EVENTS_TOOL,
  CREATE_CALENDAR_EVENT_TOOL,
  UPDATE_CALENDAR_EVENT_TOOL,
  DELETE_CALENDAR_EVENT_TOOL,
];

// Agentic loop with tool execution
await streamChatCompletionWithTools(
  messages,
  userId, // For calendar selection
  onText,
  onToolUse,
  onComplete,
  onError,
  model,
  systemPrompt
);
```

### ChatGPT Implementation (src/lib/openai.ts)

**Status:** ⚠️ Partial - Only READ operation

**Functions Implemented:**
1. `get_calendar_events` - READ operation only

**Missing:**
- ❌ `create_calendar_event` - CREATE operation
- ❌ `update_calendar_event` - UPDATE operation
- ❌ `delete_calendar_event` - DELETE operation
- ❌ Calendar mapping integration
- ❌ Enhanced system prompt with date/calendar context

**Current Function:**
```typescript
export const CALENDAR_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_calendar_events',
    description: 'Retrieves the next 5 upcoming events...',
    parameters: { /* READ only params */ }
  },
};
```

**Issues:**
1. No calendar mapping - uses 'primary' calendar only
2. Basic system prompt without date/calendar context
3. Missing CRUD operations
4. Tool execution doesn't pass user message context

---

## Calendar Configuration Analysis

### Database Schema

**Table:** `user_calendar_mappings`

```sql
CREATE TABLE user_calendar_mappings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    google_calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'family', 'personal', 'work'
    is_default BOOLEAN DEFAULT FALSE,
    calendar_time_zone VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    UNIQUE(user_id, entity_type), -- One calendar per entity type
    UNIQUE(user_id, google_calendar_id),
    CHECK (entity_type IN ('family', 'personal', 'work'))
);
```

### Calendar Mapper Service (src/lib/calendar-mapper.ts)

**Selection Logic (Priority Order):**

1. **Explicit Entity Type** - Caller specifies entity type
2. **Explicit Mention** - User says "on my work calendar"
3. **Keyword Inference** - Matches keywords to entity types
   - Work: meeting, client, investor, business, etc.
   - Personal: hobby, gym, friend, coffee, etc.
   - Family: kids, dentist, doctor, birthday, etc.
4. **Default Calendar** - User's configured default
5. **Family Calendar** - MVP priority fallback
6. **Any Calendar** - Last resort

**Key Features:**
- Comprehensive logging for transparency
- Returns `CalendarSelectionResult` with reasoning
- User-friendly error messages
- Keyword-based inference with ~20 keywords per entity type

### Web Configuration UI

**Location:** `/calendar-config`

**Features:**
- List all Google Calendars
- Create calendar mappings (calendar → entity type)
- Set default calendar
- Delete mappings
- Real-time updates

---

## Gap Analysis

### What We Have ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Google Calendar CRUD API | ✅ Complete | src/lib/google-calendar.ts |
| Calendar Mapping Logic | ✅ Complete | src/lib/calendar-mapper.ts |
| Database Schema | ✅ Complete | PostgreSQL with migrations |
| Configuration UI | ✅ Complete | /calendar-config page |
| Claude Integration | ✅ Complete | Full CRUD with mapping |
| OpenAI Agentic Loop | ✅ Complete | streamChatCompletionWithTools |
| Authentication | ✅ Complete | Clerk integration |

### What's Missing ❌

| Component | Status | Priority |
|-----------|--------|----------|
| OpenAI CREATE function | ❌ Missing | High |
| OpenAI UPDATE function | ❌ Missing | High |
| OpenAI DELETE function | ❌ Missing | High |
| Calendar mapping in OpenAI | ❌ Missing | High |
| Enhanced system prompt | ❌ Missing | Medium |
| OpenAI date/time context | ❌ Missing | Medium |
| User message context passing | ❌ Missing | High |

---

## Architecture Recommendations

### Recommended Approach: Enhanced Function Calling

**Decision:** Continue using OpenAI Chat Completions API with function calling, mirroring the Claude implementation architecture.

**Rationale:**
1. ✅ Production-ready and mature
2. ✅ We already have working infrastructure
3. ✅ Can reuse 100% of existing code (calendar-mapper, google-calendar)
4. ✅ Proven pattern with Claude implementation
5. ✅ No migration required
6. ✅ OpenAI's recommended production approach (until Agents SDK matures)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     /chatgpt Chat Interface                  │
│                    (DOS Terminal Theme)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              POST /api/gpt/send (API Route)                  │
│  - Authentication (Clerk)                                    │
│  - Conversation Management                                   │
│  - SSE Streaming Setup                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         src/lib/openai.ts - Enhanced Implementation          │
│                                                              │
│  streamChatCompletionWithTools(                             │
│    messages, userId, onText, onToolUse, ...                 │
│  )                                                           │
│                                                              │
│  Functions:                                                  │
│  ┌────────────────────────────────────────────────┐        │
│  │ 1. get_calendar_events (READ)         [DONE]   │        │
│  │ 2. create_calendar_event (CREATE)     [TODO]   │        │
│  │ 3. update_calendar_event (UPDATE)     [TODO]   │        │
│  │ 4. delete_calendar_event (DELETE)     [TODO]   │        │
│  └────────────────────────────────────────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Tool Execution Layer                            │
│                                                              │
│  executeTool(toolName, toolInput, userId, userMessage)      │
│    - Validates calendar connection                          │
│    - Routes to appropriate handler                          │
│    - Returns formatted results                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         src/lib/calendar-mapper.ts [REUSE]                   │
│                                                              │
│  selectCalendar(userId, userMessage, explicitEntityType)    │
│    1. Check explicit entity type                            │
│    2. Detect "on my work calendar" patterns                 │
│    3. Infer from keywords                                   │
│    4. Use default calendar                                  │
│    5. Fallback to family                                    │
│                                                              │
│  Returns: CalendarSelectionResult {                         │
│    calendarId, entityType, calendarName, reason             │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         src/lib/google-calendar.ts [REUSE]                   │
│                                                              │
│  CRUD Operations:                                            │
│  - listCalendars(userId)                                    │
│  - getUpcomingEvents(userId, maxResults, calendarId)        │
│  - createEvent(userId, params, calendarId)                  │
│  - updateEvent(userId, params, calendarId)                  │
│  - deleteEvent(userId, eventId, calendarId)                 │
│  - getEvent(userId, eventId, calendarId)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Calendar API                             │
│              (OAuth2 authenticated)                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Parallel Architecture:** Mirror Claude's implementation for consistency
2. **Code Reuse:** Leverage existing calendar-mapper and google-calendar modules
3. **Stateless Function Calls:** Maintain OpenAI's stateless pattern
4. **Rich Context:** Pass user message to calendar mapper for intelligent selection
5. **Comprehensive Logging:** Log all calendar selection decisions
6. **Error Handling:** User-friendly error messages with actionable guidance

---

## Implementation Strategy

### Phase 2: Development Tasks

#### Task 1: Enhance System Prompt (Medium Priority)
**File:** `src/lib/openai.ts`

Create `buildEnhancedSystemPrompt()` function similar to Claude implementation:
- Add current date/time context
- List user's configured calendar mappings
- Explain calendar selection logic
- Set expectations for tool behavior

#### Task 2: Add CREATE Function (High Priority)
**Function:** `create_calendar_event`

```typescript
export const CREATE_CALENDAR_EVENT_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_calendar_event',
    description: 'Creates a new event on the user\'s Google Calendar...',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Event title' },
        start_datetime: { type: 'string', description: 'ISO 8601 format' },
        start_date: { type: 'string', description: 'YYYY-MM-DD for all-day' },
        end_datetime: { type: 'string' },
        end_date: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        attendees: { type: 'array', items: { type: 'string' } },
        entity_type: { type: 'string', enum: ['family', 'personal', 'work'] }
      },
      required: ['summary']
    }
  }
};
```

**Implementation:**
- Select calendar using `selectCalendar(userId, eventContext, entityType)`
- Call `createEvent(userId, params, selection.calendarId)`
- Return formatted success message with calendar info

#### Task 3: Add UPDATE Function (High Priority)
**Function:** `update_calendar_event`

Similar to CREATE but includes `event_id` parameter. Must first retrieve event to get details, then update.

#### Task 4: Add DELETE Function (High Priority)
**Function:** `delete_calendar_event`

Includes confirmation in response. Must retrieve event details first for user confirmation.

#### Task 5: Enhance Tool Execution (High Priority)
**File:** `src/lib/openai.ts`

Modify `executeTool()` function:
- Accept `userMessage` parameter for context
- Integrate with calendar-mapper for all operations
- Add comprehensive logging
- Format calendar selection info in responses

#### Task 6: Update Agentic Loop (Medium Priority)
**File:** `src/lib/openai.ts`

Enhance `streamChatCompletionWithTools()`:
- Pass all 4 functions in tools array
- Extract user message context from messages
- Pass context to `executeTool()` calls

### Phase 3: Testing & Documentation

#### Testing Strategy

**Unit Tests:**
- Calendar mapping resolution
- Function parameter validation
- Error handling

**Integration Tests:**
- Full CRUD workflow
- Multi-calendar scenarios
- Edge cases (no mappings, expired tokens)

**Manual Testing Scenarios:**
1. "Add dentist appointment to my family calendar tomorrow at 2pm"
2. "Schedule investor pitch next Tuesday at 10am on work calendar"
3. "What's on my calendar this week?"
4. "Move the dentist appointment to 3pm"
5. "Cancel the investor pitch"

#### Documentation Deliverables

1. **Integration Guide** (`docs/CHATGPT-CALENDAR-INTEGRATION-GUIDE.md`)
   - Architecture overview
   - Function calling patterns
   - Calendar mapping logic
   - Error handling

2. **API Reference** (`docs/CHATGPT-CALENDAR-API-REFERENCE.md`)
   - Function definitions
   - Parameter schemas
   - Response formats
   - Example requests/responses

3. **Setup Instructions** (`docs/CHATGPT-CALENDAR-SETUP.md`)
   - Environment variables
   - Database setup
   - OAuth configuration
   - Testing instructions

---

## OpenAI Function Calling Best Practices (2025)

Based on recent OpenAI guidance:

### Function Design
1. ✅ **Clear descriptions** - Explain purpose, parameters, and output
2. ✅ **Intuitive names** - Use descriptive, obvious function names
3. ✅ **Enums for constraints** - Use enums to prevent invalid states
4. ✅ **Detailed parameter descriptions** - Help AI select correct function

### Optimization
1. ✅ **Guide with system prompt** - Explain when to use each function
2. ✅ **Don't make model fill known arguments** - Pre-fill what we know
3. ✅ **Combine sequential functions** - Reduce round trips
4. ✅ **Aim for <20 functions** - Higher accuracy with fewer functions

### Reliability
1. ✅ **Strict schema validation** - Validate all parameters
2. ✅ **Track function calls** - Log for debugging
3. ✅ **Restrict access** - Implement authorization
4. ✅ **Explicit data types** - Reduce argument generation errors
5. ✅ **Robust error handling** - Graceful recovery from failures

---

## Comparison: Claude vs OpenAI Implementation

| Aspect | Claude (Anthropic) | OpenAI (ChatGPT) |
|--------|-------------------|------------------|
| **Tool Definition** | `Tool` with `input_schema` | `ChatCompletionTool` with `parameters` |
| **Tool Call** | `tool_use` block | `function` call in `tool_calls` |
| **Tool Result** | `tool_result` message | `tool` role message |
| **Streaming** | `messages.stream()` | `chat.completions.create(stream=true)` |
| **Agentic Loop** | Similar pattern | Similar pattern |
| **Calendar Mapping** | ✅ Integrated | ❌ Not yet integrated |
| **CRUD Operations** | ✅ All 4 tools | ⚠️ Only READ |

**Key Insight:** The patterns are nearly identical. We can copy the Claude architecture almost 1:1.

---

## Risk Assessment

### Low Risk ✅
- Using proven Chat Completions API
- Reusing existing, tested infrastructure
- Small, incremental changes
- No breaking changes to existing functionality

### Medium Risk ⚠️
- OpenAI function calling quality vs Claude (generally good, but test thoroughly)
- Token usage with enhanced system prompts (monitor costs)

### High Risk ❌
- None identified

### Mitigation Strategies
1. **Test thoroughly** - Comprehensive test suite before production
2. **Monitor costs** - Track token usage with enhanced prompts
3. **Gradual rollout** - Enable for subset of users first
4. **Fallback handling** - Graceful degradation if calendar not configured

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 2: Development** | Add 3 functions + integration | 6-8 hours |
| **Phase 3: Testing** | Unit + integration tests | 3-4 hours |
| **Phase 3: Documentation** | 3 comprehensive guides | 3-4 hours |
| **Total** | Complete implementation | 12-16 hours |

---

## References

### OpenAI Documentation
- [Function Calling Guide](https://platform.openai.com/docs/guides/function-calling) - Official guide
- [Chat Completions API](https://platform.openai.com/docs/api-reference/chat) - API reference
- [Agents SDK](https://openai.github.io/openai-agents-python/) - New framework (monitor)
- [Function Calling Best Practices](https://community.openai.com/t/prompting-best-practices-for-tool-use-function-calling/1123036) - Community guide

### Existing Implementation
- `src/lib/claude.ts` - Reference implementation with full CRUD
- `src/lib/openai.ts` - Current implementation to enhance
- `src/lib/calendar-mapper.ts` - Reusable calendar selection logic
- `src/lib/google-calendar.ts` - Reusable CRUD operations
- `CALENDAR_CRUD_README.md` - Calendar integration documentation

### Research Sources
- OpenAI Swarm Framework: https://github.com/openai/swarm
- OpenAI Agents SDK Announcement: https://openai.com/index/new-tools-for-building-agents/
- Function Calling Quality Analysis: https://www.rohan-paul.com/p/openais-function-calling-strategy

---

## Next Steps

1. ✅ **Phase 1 Complete** - Research and evaluation done
2. 🔄 **Phase 2 Starting** - Begin implementation
   - Create backup branch
   - Implement CREATE function
   - Implement UPDATE function
   - Implement DELETE function
   - Integrate calendar mapping
   - Enhanced system prompt
3. ⏳ **Phase 3 Pending** - Testing and documentation

---

## Conclusion

We have a clear path forward that leverages our existing, production-ready infrastructure. The ChatGPT integration will mirror the successful Claude implementation, reusing battle-tested components like calendar-mapper and google-calendar.

**Key Advantages:**
- ✅ No risky architectural changes
- ✅ Reuse 100% of calendar infrastructure
- ✅ Proven patterns from Claude implementation
- ✅ Production-ready OpenAI API
- ✅ Clear implementation path

**Estimated Effort:** 12-16 hours for complete implementation, testing, and documentation.

**Risk Level:** Low - Building on proven patterns and infrastructure.

---

**Document Status:** ✅ Complete
**Review Date:** November 9, 2025
**Approved for Implementation:** Yes
