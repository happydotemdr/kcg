# Google Calendar Integration Setup Guide

This guide will help you set up the Google Calendar integration for the KCG chat application using the Claude Agent SDK.

## Overview

The integration allows Claude to access your Google Calendar and retrieve upcoming events when asked. This is implemented using:
- **Claude Agent SDK** with tool use (agentic loop)
- **Google Calendar API** for fetching events
- **OAuth2** for secure authentication
- **PostgreSQL** for storing OAuth tokens

## Features

- ✅ Claude can read your next 5 upcoming calendar events
- ✅ Secure OAuth2 authentication flow
- ✅ Real-time tool use indicators in the chat
- ✅ Easy connect/disconnect calendar functionality
- ✅ Automatic token refresh handling
- ✅ Per-user calendar connections stored in database

## Setup Instructions

### 1. Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Enable APIs and Services**
4. Search for and enable **Google Calendar API**

### 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: External (for testing) or Internal (for organization)
   - App name: Keep Choosing Good Chat
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events.readonly`
   - Add test users (if using External type)

4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: KCG Chat Calendar Integration
   - Authorized redirect URIs:
     - Development: `http://localhost:4321/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`

5. Save the **Client ID** and **Client Secret**

### 3. Update Environment Variables

Add these variables to your `.env` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:4321/api/auth/google/callback
```

### 4. Initialize Database Schema

The Google OAuth tokens table needs to be added to your database:

```bash
# Run database initialization (this will apply the schema.sql with the new table)
npm run db:init
```

This will create the `google_oauth_tokens` table to store user OAuth tokens.

### 5. Start the Application

```bash
npm run dev
```

Visit `http://localhost:4321/chat`

## How to Use

### Connecting Your Calendar

1. Open the chat interface at `/chat`
2. Click the **"Connect Calendar"** button in the header
3. You'll be redirected to Google's OAuth consent screen
4. Grant permission to access your calendar
5. You'll be redirected back to the chat with a success message
6. The button will now show **"Calendar Connected"** with a green checkmark

### Using Calendar Features

Once connected, you can ask Claude about your calendar:

**Example prompts:**
- "What's on my calendar today?"
- "Show me my upcoming meetings"
- "What do I have scheduled this week?"
- "What's my next appointment?"

Claude will automatically use the `get_calendar_events` tool to fetch your events and display them in a formatted response.

### Tool Use Indicator

When Claude is accessing your calendar, you'll see a blue loading indicator that says **"Checking your calendar..."**

### Disconnecting Your Calendar

Click the **"Disconnect"** link next to the calendar status to revoke access. This will delete your OAuth tokens from the database.

## Architecture Details

### Claude Agent SDK Integration

The integration uses Anthropic's tool use feature to implement an agentic workflow:

1. **Tool Definition** (`src/lib/claude.ts`):
   - Defines the `get_calendar_events` tool with JSON schema
   - Specifies parameters (max_results)
   - Provides clear description for Claude to understand when to use it

2. **Agentic Loop** (`streamChatCompletionWithTools`):
   - Claude decides when to use the calendar tool
   - Tool is executed server-side with user's OAuth credentials
   - Results are fed back to Claude
   - Claude formulates a natural language response
   - Maximum 5 iterations to prevent infinite loops

3. **Tool Execution** (`executeTool` function):
   - Checks if calendar is connected
   - Validates user permissions
   - Fetches events from Google Calendar API
   - Formats results for Claude to process

### API Routes

**Authentication Routes:**
- `GET /api/auth/google/connect` - Initiates OAuth flow
- `GET /api/auth/google/callback` - Handles OAuth callback
- `GET /api/auth/google/status` - Check connection status
- `POST /api/auth/google/disconnect` - Disconnect calendar

**Chat Route:**
- `POST /api/chat/send` - Enhanced with tool use support
  - Streams responses with SSE
  - Handles tool_use events
  - Executes calendar tool when needed

### Database Schema

```sql
CREATE TABLE google_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expiry_date BIGINT, -- Unix timestamp in milliseconds
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- One token per user
);
```

### Security Features

- OAuth tokens are encrypted in transit (HTTPS)
- Tokens stored securely in PostgreSQL
- Automatic token refresh when expired
- Per-user token isolation
- Clerk authentication required for all endpoints
- Tokens deleted on disconnect

## Troubleshooting

### "User not found in database"

This means the user hasn't been synced from Clerk to the database yet. This can happen if:
- The database hasn't been initialized
- The Clerk webhook isn't configured
- The user was created before the database was set up

**Solution:** Ensure database is initialized and user exists in the `users` table.

### "Google Calendar is not connected"

The user needs to connect their calendar first.

**Solution:** Click "Connect Calendar" button and complete OAuth flow.

### "Failed to fetch calendar events"

Possible causes:
- Token expired (should auto-refresh)
- Google API quota exceeded
- Calendar API not enabled
- Invalid credentials

**Solution:** Check Google Cloud Console for API status and quotas.

### OAuth Redirect Mismatch

Error: "redirect_uri_mismatch"

**Solution:** Ensure the redirect URI in Google Cloud Console exactly matches the one in your `.env` file.

## Production Deployment

### Environment Variables

Update these for production:

```bash
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### Google Cloud OAuth Consent Screen

- Switch from "Testing" to "In Production" mode
- Add your production domain to authorized domains
- Update redirect URIs to use HTTPS production URLs

### Security Considerations

1. Use HTTPS in production (required for OAuth)
2. Store environment variables securely (use secrets management)
3. Enable database SSL connections
4. Monitor API usage and quotas
5. Implement rate limiting on API routes
6. Set up proper CORS policies

## Future Enhancements

Potential improvements to the calendar integration:

- [ ] Create/update/delete calendar events (requires additional scopes)
- [ ] Search events by date range or keywords
- [ ] Support for multiple calendars
- [ ] Calendar event reminders
- [ ] Conflict detection for scheduling
- [ ] Integration with other Google services (Gmail, Tasks)
- [ ] Export conversations with calendar context

## Support

For issues or questions:
- Check the [Anthropic Tool Use Documentation](https://docs.anthropic.com/claude/docs/tool-use)
- Review [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- Check application logs for detailed error messages

## License

This integration is part of the Keep Choosing Good project.
