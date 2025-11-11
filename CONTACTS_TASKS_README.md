# Contacts & Tasks Integration

## Overview

This document describes the **Contacts and Tasks Integration** for Keep Choosing Good, which provides:

1. **Multi-Provider Contact Sync**: Bi-directional synchronization with Google Contacts and Microsoft Contacts (future)
2. **Contact Source Tracking**: Junction table pattern to track contacts across multiple providers
3. **Google Tasks Management**: Full CRUD operations with calendar linking and multi-account support
4. **Incremental Sync**: Efficient sync token management for both contacts and tasks

## Architecture

### Contact Sources: Junction Table Pattern

Contacts from Gmail extraction are stored in the `email_contacts` table. When syncing with external providers (Google Contacts, Microsoft Contacts), we use a **junction table** (`contact_sources`) to:

- Link one `email_contact` to multiple external provider contacts
- Track sync metadata (etag, last sync time, sync direction)
- Enable bi-directional sync without data duplication
- Support merge/split workflows

**Example Flow:**
```
email_contacts (KCG Internal)
    ↕ contact_sources (Junction)
    ↕ Google Contacts API
    ↕ Microsoft Contacts API (future)
```

### Sync Token Management

Both contacts and tasks use **incremental sync** to minimize API calls:

- **Full Sync**: Initial sync fetches all data and stores a sync token
- **Incremental Sync**: Subsequent syncs use the token to fetch only changes
- **Per-Account Tokens**: Tokens stored per Google account in `contact_sync_state` table

**Benefits:**
- Reduced API quota usage
- Faster sync times
- Lower latency for users

### Per-User Mutation Queue

Contact modifications are queued and synced in batches:

- Local changes (add, update, delete) queued in `contact_mutation_queue`
- Background sync process applies changes to external providers
- Conflict resolution: Last-write-wins with etag validation
- Retry logic with exponential backoff

## Features

### 1. Bi-Directional Contact Sync

**Import from Google Contacts:**
- Fetches contacts from user's Google Contacts
- Creates `email_contact` + `contact_source` junction records
- Supports incremental sync via sync tokens

**Export to Google Contacts:**
- Push local contacts to Google Contacts
- Creates `contact_source` link for tracking
- Updates etag for conflict detection

**Conflict Resolution:**
- Uses etag to detect concurrent modifications
- Offers user choice: keep local, keep remote, or merge

### 2. Google Tasks CRUD with Calendar Linking

**Features:**
- Create, read, update, delete tasks via natural language
- Multi-account support (family, personal, work)
- Automatic calendar event creation from tasks with due dates
- Tasklist management (view, filter, organize)

**Calendar Integration:**
- Tasks with due dates auto-create calendar events
- Bi-directional updates (task ↔ event)
- Configurable calendar selection per task type

### 3. Multi-Account Support

**Both contacts and tasks support:**
- Multiple Google accounts per user
- Per-account OAuth2 tokens
- Account selector in UI
- Intelligent routing (e.g., "dentist" → family calendar)

## API Endpoints

### Contact Endpoints

#### `GET /api/contacts/list`
List all contacts with filtering.

**Query Parameters:**
- `sourceType`: Filter by contact source (e.g., `google_contacts`)
- `verificationStatus`: Filter by verification status
- `search`: Search by name, email, or organization
- `minConfidence`: Minimum confidence score
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "contacts": [...],
  "count": 50,
  "page": 1,
  "limit": 50
}
```

#### `GET /api/contacts/:id/sources`
Get all provider sources for a contact.

**Response:**
```json
{
  "success": true,
  "sources": [
    {
      "id": "...",
      "provider": "google_contacts",
      "account_email": "user@example.com",
      "last_synced_at": "2025-11-10T12:00:00Z",
      "sync_direction": "bidirectional"
    }
  ]
}
```

#### `POST /api/google/contacts/sync`
Sync contacts from Google Contacts (incremental or full).

**Body:**
```json
{
  "googleAccountEmail": "user@example.com",
  "fullSync": false
}
```

**Response:**
```json
{
  "success": true,
  "imported": 5,
  "updated": 2,
  "deleted": 1,
  "syncToken": "..."
}
```

#### `POST /api/google/contacts/export`
Export a local contact to Google Contacts.

**Body:**
```json
{
  "contactId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "externalId": "...",
  "resourceName": "people/..."
}
```

#### `PATCH /api/contacts/:id`
Update contact sync settings.

**Body:**
```json
{
  "sync_enabled": true
}
```

### Task Endpoints

#### `GET /api/tasklists/list`
List all tasklists across accounts.

**Response:**
```json
{
  "success": true,
  "tasklists": [
    {
      "id": "...",
      "title": "My Tasks",
      "googleAccountEmail": "user@example.com"
    }
  ]
}
```

#### `GET /api/tasks/list`
List tasks in a tasklist.

**Query Parameters:**
- `tasklistId`: Required
- `googleAccountEmail`: Optional, for multi-account setups

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "...",
      "title": "Task title",
      "status": "needsAction",
      "due": "2025-11-15T00:00:00Z",
      "notes": "..."
    }
  ]
}
```

#### `POST /api/tasks/create`
Create a new task.

**Body:**
```json
{
  "tasklistId": "...",
  "title": "New task",
  "notes": "Task details",
  "due": "2025-11-15",
  "googleAccountEmail": "user@example.com"
}
```

#### `PATCH /api/tasks/:id`
Update a task (e.g., toggle status).

**Body:**
```json
{
  "status": "completed"
}
```

#### `DELETE /api/tasks/:id`
Delete a task permanently.

## Database Schema

### Tables Created

#### `contact_sources` (Migration 013)
Junction table linking email contacts to external providers.

```sql
CREATE TABLE contact_sources (
  id UUID PRIMARY KEY,
  email_contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_resource_name TEXT NOT NULL,
  account_email TEXT NOT NULL,
  etag TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_direction TEXT CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `contact_sync_state` (Migration 014)
Per-account sync token storage.

```sql
CREATE TABLE contact_sync_state (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_account_email TEXT NOT NULL,
  sync_token TEXT,
  last_full_sync_at TIMESTAMPTZ,
  last_incremental_sync_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('never_synced', 'syncing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_account_email)
);
```

#### `task_lists` (Migration 015)
Google Task lists.

```sql
CREATE TABLE task_lists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_account_email TEXT NOT NULL,
  title TEXT NOT NULL,
  updated TIMESTAMPTZ,
  self_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_account_email, id)
);
```

#### `tasks` (Migration 016)
Google Tasks.

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  task_list_id TEXT NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_account_email TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('needsAction', 'completed')),
  due TIMESTAMPTZ,
  completed TIMESTAMPTZ,
  parent TEXT,
  position TEXT,
  self_link TEXT,
  updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage Examples

### Sync Contacts from Google

```javascript
const response = await fetch('/api/google/contacts/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    googleAccountEmail: 'user@gmail.com',
    fullSync: false // Use incremental sync
  })
});

const data = await response.json();
console.log(`Imported: ${data.imported}, Updated: ${data.updated}`);
```

### Export Local Contact to Google

```javascript
const response = await fetch('/api/google/contacts/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contactId: 'contact-uuid' })
});

const data = await response.json();
console.log(`Exported to: ${data.resourceName}`);
```

### Create a Task

```javascript
const response = await fetch('/api/tasks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tasklistId: 'default-list',
    title: 'Call dentist',
    due: '2025-11-15',
    notes: 'Schedule checkup',
    googleAccountEmail: 'family@gmail.com'
  })
});

const data = await response.json();
console.log(`Task created: ${data.task.id}`);
```

### Toggle Task Status

```javascript
const response = await fetch(`/api/tasks/${taskId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'completed' })
});
```

## Migration Notes

### Migrations Applied

- **013_contact_sources**: Creates `contact_sources` junction table
- **014_contact_sync_state**: Creates sync token storage
- **015_task_lists**: Creates Google Tasks lists table
- **016_tasks**: Creates Google Tasks table

### Rollback

Each migration has a corresponding `_rollback.sql` file for safe reversals:

```bash
# Rollback all contacts/tasks migrations
psql $DATABASE_URL < src/lib/db/migrations/016_tasks_rollback.sql
psql $DATABASE_URL < src/lib/db/migrations/015_task_lists_rollback.sql
psql $DATABASE_URL < src/lib/db/migrations/014_contact_sync_state_rollback.sql
psql $DATABASE_URL < src/lib/db/migrations/013_contact_sources_rollback.sql
```

## UI Components

### `ContactSourcesBadge`
Displays provider badges (Google, Microsoft) with sync status.

**Props:**
- `sources`: Array of `ContactSource` objects

**Visual:**
```
[G Google ✓] [M Microsoft]
```

### `ContactSyncControls`
Action buttons for sync operations.

**Props:**
- `contactId`: Contact UUID
- `currentSources`: Array of current sources
- `onSyncComplete`: Callback after sync

**Actions:**
- Export to Google Contacts
- Enable/Disable sync

### `TaskList`
Displays tasks with filtering (All, Active, Completed).

**Props:**
- `tasklistId`: Tasklist ID
- `googleAccountEmail`: Account for multi-account setups

**Features:**
- Checkbox to toggle status
- Due date display with color coding
- Delete task button
- Task detail modal

### `AccountCard`
Displays Google account with service status indicators.

**New Services:**
- Calendar (Active/Not configured)
- Gmail (Active/Not configured)
- Contacts (Active/Not configured)
- Tasks (Active/Not configured)

## Future Work

### Microsoft Contacts Integration
- OAuth2 flow for Microsoft Graph API
- Junction table already supports `microsoft_contacts` provider
- Implement sync logic similar to Google Contacts

### Google Places API Integration
- Extract business contact details from emails
- Enrich contacts with phone, address, hours
- Link to Google Maps for location context

### Contact Merge/Split
- UI for reviewing duplicate contacts
- Merge workflow: combine sources, preserve all data
- Split workflow: break multi-source contact into separate entries

### Task Calendar Auto-Linking
- Automatically create calendar events for tasks with due dates
- Bi-directional updates (task ↔ event)
- Smart calendar selection based on task type

## Security & Privacy

### Data Retention
- Contact sources: 90-day retention after sync
- Tasks: Indefinite (user-controlled)
- Sync tokens: Encrypted at rest

### GDPR Compliance
- User can delete all contacts and sources
- Export all contact data via `/api/contacts/export-all` (future)
- Clear audit trail of sync operations

### API Permissions

**Google OAuth Scopes:**
- `https://www.googleapis.com/auth/contacts` (read/write contacts)
- `https://www.googleapis.com/auth/tasks` (read/write tasks)
- `https://www.googleapis.com/auth/calendar` (link tasks to calendar)

## Troubleshooting

### Sync Fails with "Invalid Sync Token"
**Cause:** Sync token expired or invalidated by Google.
**Solution:** Trigger a full sync by setting `fullSync: true` in the sync request.

### Duplicate Contacts After Export
**Cause:** Contact already exists in Google Contacts but not linked in `contact_sources`.
**Solution:** Implement duplicate detection before export (check by email).

### Tasks Not Showing in UI
**Cause:** Account not connected or tasklists not fetched.
**Solution:** Check OAuth tokens in `google_oauth_tokens` table and re-connect account if needed.

## Support

For issues or questions, see:
- [CALENDAR_CRUD_README.md](./CALENDAR_CRUD_README.md) - Calendar integration
- [GMAIL_AGENT_README.md](./GMAIL_AGENT_README.md) - Gmail integration
- [CLAUDE.md](./CLAUDE.md) - Project overview

---

**Last Updated:** 2025-11-11
**Version:** 1.0
