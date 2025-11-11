# Agents & Tools API Endpoints

This document describes the backend API endpoints for the Agents & Tools panel feature.

## Endpoints

### 1. GET /api/agents/status

Returns status and metadata for all available agents (Calendar, Gmail, Todos).

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "agents": [
    {
      "id": "calendar",
      "name": "Calendar Agent",
      "icon": "📅",
      "status": "connected",
      "capabilities": ["Full CRUD", "Multi-Calendar", "Event Extraction"],
      "description": "Manage calendar events across multiple calendars",
      "uploadAction": {
        "label": "Extract Events",
        "prompt": "I've uploaded '{filename}'. Please analyze this document and extract any calendar events, including dates, times, locations, and descriptions. Check for duplicates and add the events to my calendar.",
        "acceptedTypes": ["image/*", "application/pdf"]
      },
      "settingsUrl": "/calendar-config",
      "recentActivity": {
        "count": 3,
        "lastAction": "5 events added",
        "timestamp": "2025-11-10T12:34:56Z"
      }
    },
    {
      "id": "gmail",
      "name": "Gmail Agent",
      "icon": "📧",
      "status": "not-configured",
      "capabilities": ["Multi-Account", "Search", "Classification"],
      "description": "Analyze and manage emails across multiple accounts",
      "uploadAction": {
        "label": "Analyze Email",
        "prompt": "Please analyze this email screenshot and extract key information including sender, subject, important dates, actions required, and classify its priority. Let me know if I need to take any action.",
        "acceptedTypes": ["image/*"]
      },
      "settingsUrl": "/gmail-config",
      "recentActivity": null
    },
    {
      "id": "todos",
      "name": "Task Manager",
      "icon": "✅",
      "status": "not-configured",
      "capabilities": ["Coming Soon"],
      "description": "Manage tasks and to-do lists",
      "uploadAction": null,
      "settingsUrl": null,
      "recentActivity": null
    }
  ]
}
```

**Status Values:**
- `connected`: Agent is properly configured and OAuth tokens are valid
- `needs-refresh`: OAuth tokens need to be refreshed (not currently implemented)
- `error`: Error checking agent status
- `not-configured`: Agent has not been set up yet

**Calendar Agent Logic:**
- Checks `google_oauth_tokens` table for valid access token
- Queries `processed_documents` table for recent activity (last 24 hours)
- Returns count and most recent successful event extraction

**Gmail Agent Logic:**
- Checks `gmail_accounts` table for valid Gmail access token
- Currently returns no recent activity (placeholder for future implementation)

**Todos Agent:**
- Always returns `not-configured` (coming soon)

---

### 2. GET /api/agents/activity/recent

Returns aggregated recent activity across all agents from the last 24 hours.

**Authentication:** Required (Clerk)

**Response:**
```json
{
  "activities": [
    {
      "agentId": "calendar",
      "agentName": "Calendar Agent",
      "icon": "📅",
      "action": "3 events added",
      "timestamp": "2025-11-10T14:30:00Z",
      "details": "dentist-appointment.jpg"
    },
    {
      "agentId": "calendar",
      "agentName": "Calendar Agent",
      "icon": "📅",
      "action": "2 events added, 1 skipped",
      "timestamp": "2025-11-10T12:15:00Z",
      "details": "soccer-schedule.pdf"
    },
    {
      "agentId": "gmail",
      "agentName": "Gmail Agent",
      "icon": "📧",
      "action": "sync (5 emails)",
      "timestamp": "2025-11-10T11:20:00Z",
      "details": "sync (5 emails)"
    }
  ],
  "summary": {
    "totalActions": 5,
    "byAgent": {
      "calendar": 3,
      "gmail": 2,
      "todos": 0
    }
  }
}
```

**Data Sources:**
- **Calendar Agent**: `processed_documents` table (status = 'completed', last 24 hours)
- **Gmail Agent**: `email_processing_log` table (success = true, last 24 hours)
- **Todos Agent**: Not yet implemented (returns 0)

**Activity Limits:**
- Maximum 20 activities returned
- Sorted by timestamp descending (most recent first)

---

## Implementation Details

### Database Tables Used

1. **google_oauth_tokens**
   - Checked for Calendar agent connection status
   - Query: `SELECT access_token FROM google_oauth_tokens WHERE user_id = ?`

2. **gmail_accounts**
   - Checked for Gmail agent connection status
   - Query: `SELECT gmail_access_token FROM gmail_accounts WHERE user_id = ?`

3. **processed_documents**
   - Source of Calendar agent activity
   - Tracks document uploads, event extraction, and status
   - Filters: `user_id`, `status = 'completed'`, `created_at > NOW() - INTERVAL '24 hours'`

4. **email_processing_log**
   - Source of Gmail agent activity (when implemented)
   - Tracks Gmail operations like sync, search, classification
   - Filters: `user_id`, `success = true`, `created_at > NOW() - INTERVAL '24 hours'`

### Error Handling

Both endpoints:
- Return 401 if user is not authenticated (Clerk)
- Return 404 if authenticated user is not found in database
- Return 500 with error message if database queries fail
- Gracefully handle missing tables (e.g., Gmail tables may not exist yet)

### Authentication Pattern

Following Clerk v2 authentication pattern:
```typescript
const { userId: clerkUserId } = locals.auth();

if (!clerkUserId) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Database User Resolution

Both endpoints convert Clerk user ID to internal database user ID:
```typescript
const dbUser = await findUserByClerkId(clerkUserId);
if (!dbUser) {
  return new Response(
    JSON.stringify({ error: 'User not found in database' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

## Testing

### Manual Testing with curl

**Test /api/agents/status:**
```bash
curl -X GET http://localhost:4321/api/agents/status \
  -H "Cookie: __session=YOUR_CLERK_SESSION_TOKEN" \
  | jq
```

**Test /api/agents/activity/recent:**
```bash
curl -X GET http://localhost:4321/api/agents/activity/recent \
  -H "Cookie: __session=YOUR_CLERK_SESSION_TOKEN" \
  | jq
```

### Expected Behaviors

1. **No Calendar Connection:**
   - Calendar agent shows `status: "not-configured"`
   - No recent activity

2. **Calendar Connected, No Recent Activity:**
   - Calendar agent shows `status: "connected"`
   - `recentActivity: null`

3. **Calendar Connected with Recent Documents:**
   - Calendar agent shows `status: "connected"`
   - `recentActivity` shows count, action description, and timestamp

4. **Gmail Not Configured:**
   - Gmail agent shows `status: "not-configured"`
   - No recent activity

---

## Files Created

- `/home/wk/projects/kcg/src/pages/api/agents/status.ts`
- `/home/wk/projects/kcg/src/pages/api/agents/activity/recent.ts`
- `/home/wk/projects/kcg/docs/API_AGENTS_ENDPOINTS.md` (this file)

---

## Future Enhancements

1. **Token Expiry Detection:**
   - Implement `needs-refresh` status when OAuth tokens are expired
   - Check `expiry_date` fields in token tables

2. **Gmail Activity Tracking:**
   - Populate `email_processing_log` table when Gmail operations occur
   - Display meaningful Gmail activity in recent feed

3. **Todos Agent:**
   - Implement task management backend
   - Add database tables for task storage
   - Enable agent configuration and activity tracking

4. **Activity Pagination:**
   - Add query parameters for date range filtering
   - Support pagination (offset/limit)
   - Add filtering by agent type

5. **Real-time Updates:**
   - Consider WebSocket or SSE for live activity feed
   - Push notifications for agent actions

---

## Related Documentation

- [CALENDAR_CRUD_README.md](../CALENDAR_CRUD_README.md) - Calendar agent documentation
- [GMAIL_AGENT_README.md](../GMAIL_AGENT_README.md) - Gmail agent documentation
- [CLAUDE.md](../CLAUDE.md) - Overall project documentation
