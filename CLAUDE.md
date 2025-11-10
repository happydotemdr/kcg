# Keep Choosing Good - AI Chat Application

## Overview
A modern AI chat experience built with Astro and React, featuring Claude (Anthropic) integration. The application demonstrates best practices for building production-ready chat interfaces with streaming responses, multimodal support, and agent capabilities.

## Architecture

### Tech Stack
- **Frontend**: Astro v5 + React + Tailwind CSS
- **Backend**: Astro API Routes (Node.js)
- **Authentication**: Clerk (@clerk/astro v2)
- **AI**: Anthropic Claude SDK (@anthropic-ai/sdk) with streaming implementation
- **Storage**: File-based JSON conversation persistence

### Recent Upgrades (November 2025)
This project has been upgraded to the latest versions:
- **Astro v4 → v5.15.4**: Migrated to Astro v5 with updated configuration
- **@clerk/astro v1 → v2.14.5**: Updated authentication with new API
- **@astrojs/node v8 → v9.5.0**: Latest Node adapter
- **@astrojs/react v3 → v4.4.2**: React integration updates
- **@astrojs/tailwind v5 → v6.0.2**: Tailwind CSS updates

#### Breaking Changes Addressed
1. **Output Mode**: Using `output: 'server'` for full server-side rendering (required for API routes with Node adapter)
2. **Clerk Authentication**: Updated from `locals.auth.userId` to `locals.auth()` function call pattern
3. **Type Safety**: All TypeScript errors resolved with updated type definitions

### Key Features
1. **User Authentication**: Complete sign-up/sign-in flow powered by Clerk with protected routes
2. **Real-time Streaming**: Server-Sent Events (SSE) for streaming responses from Claude
3. **Multimodal Support**: Image upload and vision analysis
4. **Conversation Management**: Persistent chat history with resume capability
5. **Context Management**: Following best practices for token management
6. **Clean Modern UI**: Modern design with smooth animations and account avatar
7. **Responsive Design**: Works seamlessly on desktop and mobile devices
8. **Claude Agent SDK Integration**: Google Calendar with **Full CRUD Operations** and **Multi-Calendar Support**
   - **Full CRUD**: Create, Read, Update, Delete calendar events via natural language
   - **Multi-Calendar Support**: Intelligent routing to family, personal, or work calendars
   - **Smart Calendar Selection**: Automatic inference from keywords ("dentist" → family, "investor meeting" → work)
   - **Intelligent Calendar Extraction**: Upload documents/images (schedules, flyers, screenshots) and automatically extract events with duplicate detection and batch creation
   - **Agentic workflow**: Automatic tool execution with streaming feedback
   - **OAuth2 authentication**: Secure access with write permissions
   - **Per-user token storage**: PostgreSQL-backed token management
   - **Configuration UI**: Web interface for mapping calendars to entity types at `/calendar-config`
   - See [CALENDAR_CRUD_README.md](./CALENDAR_CRUD_README.md) and [CALENDAR_EXTRACTION_README.md](./CALENDAR_EXTRACTION_README.md) for complete documentation
9. **Gmail Agent Integration**: Sophisticated email management with Claude AI
   - **Multi-Account Support**: Manage family, personal, work, school, and kids accounts
   - **Efficient Fetching**: Metadata-first approach, on-demand body retrieval for cost optimization
   - **AI-Powered Classification**: Automatic categorization (calendar, invoice, school, etc.)
   - **Advanced Search Engine**: Multi-dimensional filtering with Gmail query syntax
   - **Smart Intelligence**: Extract dates, actions, and deadlines from emails
   - **Cost-Optimized**: Batch processing, minimal storage, selective AI usage
   - **OAuth2 Authentication**: Secure Gmail access with automatic token refresh
   - **Data Privacy**: 90-day retention, no full body storage, GDPR compliant
   - See [GMAIL_AGENT_README.md](./GMAIL_AGENT_README.md) for complete documentation

## Project Structure

```
src/
├── components/
│   ├── UserMenu.tsx      # Account avatar with login/logout
│   ├── chat/             # Claude chat components
│   │   ├── Chat.tsx      # Main chat orchestrator with streaming
│   │   ├── ChatMessage.tsx   # Individual message display
│   │   ├── ChatInput.tsx     # Message input with image upload
│   │   └── ChatSidebar.tsx   # Conversation history sidebar
│   └── DevDashboard.tsx  # Developer dashboard component
├── lib/
│   ├── claude.ts         # Claude SDK wrapper and utilities
│   └── storage.ts        # Claude conversation persistence
├── pages/
│   ├── api/
│   │   └── chat/         # Claude API routes (all protected with Clerk auth)
│   │       ├── send.ts   # POST - Send message with streaming
│   │       ├── conversations.ts  # GET - List conversations
│   │       ├── conversations/[id].ts  # GET/DELETE - Manage conversation
│   │       └── models.ts # GET - List available models
│   ├── sign-in.astro     # Clerk sign-in page
│   ├── sign-up.astro     # Clerk sign-up page with custom styling
│   ├── dashboard/        # Protected dashboard pages
│   │   └── index.astro   # User dashboard with profile info
│   └── chat.astro        # Claude chat page (protected, modern UI)
└── types/
    └── chat.ts           # Message and Conversation types
```

## API Endpoints

**Note**: All API endpoints require authentication via Clerk. Unauthenticated requests will receive a 401 Unauthorized response.

### Claude Endpoints (`/api/chat/*`)

#### POST /api/chat/send
Send a message to Claude and receive streaming response.
- Supports new conversations or continuing existing ones
- Handles text + image multimodal input
- Returns SSE stream with incremental responses

#### GET /api/chat/conversations
List all Claude conversations, sorted by most recent.

#### GET /api/chat/conversations/[id]
Retrieve a specific Claude conversation with full message history.

#### DELETE /api/chat/conversations/[id]
Delete a Claude conversation permanently.

#### GET /api/chat/models
List available Claude models.

## Authentication

The application uses [Clerk](https://clerk.com) for user authentication, providing a complete sign-up/sign-in flow with minimal setup.

### Features
- **Sign-Up/Sign-In Pages**: Pre-built, customizable authentication pages
- **Protected Routes**: Chat pages and API endpoints require authentication
- **User Management**: Built-in user profile management via Clerk dashboard
- **Account Avatar**: UserMenu component with account dropdown and logout functionality
- **Multiple Auth Methods**: Email/password, social logins (Google, GitHub, etc.)
- **Session Management**: Automatic session handling and token refresh

### Implementation Details
- **Protected Pages**: `/chat` redirects to sign-in if user is not authenticated
- **Protected API Routes**: All `/api/chat/*` endpoints validate Clerk sessions
- **UserMenu Component**:
  - Clean modern UI design
  - Dashboard link and user avatar with dropdown menu
  - Sign-out functionality

### Setup
1. Create a free Clerk account at https://dashboard.clerk.com
2. Create a new application in Clerk dashboard
3. Copy your API keys to `.env` (see Environment Variables section below)
4. Configure allowed redirect URLs in Clerk dashboard:
   - Sign-in URL: `http://localhost:4321/sign-in` (dev) or `https://yourdomain.com/sign-in` (prod)
   - Sign-up URL: `http://localhost:4321/sign-up` (dev) or `https://yourdomain.com/sign-up` (prod)
   - After sign-in URL: `http://localhost:4321/dashboard` (dev) or `https://yourdomain.com/dashboard` (prod)

## Configuration

### Environment Variables
```bash
# Authentication (Required)
# Get from: https://dashboard.clerk.com → API Keys
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # Clerk publishable key
CLERK_SECRET_KEY=sk_test_...              # Clerk secret key

# Optional Clerk Configuration
PUBLIC_CLERK_SIGN_IN_URL=/sign-in
PUBLIC_CLERK_SIGN_UP_URL=/sign-up
PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Claude API (Required for /chat page)
# Get from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...

# Google Calendar Integration (Optional, for calendar tool)
# Get from: https://console.cloud.google.com/apis/credentials
# See CALENDAR_SETUP.md for detailed setup instructions
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4321/api/auth/google/callback
```

**Note**: For Google Calendar integration setup, see [`CALENDAR_SETUP.md`](./CALENDAR_SETUP.md) for complete instructions.

### Default Settings

#### Claude Chat
- **Model**: claude-sonnet-4-20250514 (most intelligent, best for complex tasks)
- **Max Tokens**: 4096 per response
- **Context Window**: Managed automatically by storage layer
- **Conversation Pruning**: Keeps last 20 messages by default
- **Storage**: `data/conversations/`
- **Streaming**: Server-Sent Events (SSE) for real-time responses

## Best Practices Implemented

### From Anthropic's Guidelines

1. **Streaming Responses**
   - Uses high-level `messages.stream()` API
   - Implements proper event handlers for text deltas
   - Graceful error handling and cancellation

2. **Context Management**
   - Automatic conversation pruning to manage token limits
   - Clear separation between conversations
   - Efficient message history storage

3. **Multimodal Support**
   - Proper image encoding (base64)
   - Support for multiple image formats (JPEG, PNG, GIF, WebP)
   - Images sent before questions about them

4. **Error Handling**
   - Comprehensive try-catch blocks
   - User-friendly error messages
   - Streaming cancellation support

5. **Type Safety**
   - Full TypeScript coverage
   - Proper type definitions matching Anthropic's API
   - Type-safe message content blocks

## Development

### Setup
```bash
npm install
cp .env.example .env
# Add your Clerk keys and ANTHROPIC_API_KEY to .env
npm run dev
```

Visit:
- Home: http://localhost:4321/ (with sign-in/sign-up links)
- Sign Up: http://localhost:4321/sign-up
- Sign In: http://localhost:4321/sign-in
- Dashboard: http://localhost:4321/dashboard (requires authentication)
- Claude Chat: http://localhost:4321/chat (requires authentication)

### Building
```bash
npm run build
npm run preview
```

## Feature Planning & Development Workflow

This project includes a comprehensive **Feature Breakdown System** for planning and implementing new features in a structured, repeatable way.

### What It Does

The Feature Breakdown System is a Claude skill that:
1. **Guides Discovery**: Asks 9 strategic questions to understand your feature idea
2. **Analyzes Architecture**: Reviews the codebase to determine integration points
3. **Creates Vertical Slices**: Breaks features into independently deliverable chunks
4. **Generates Atomic Tasks**: Produces specific, testable tasks ready for implementation

### Quick Start

```
You: "I want to plan a new feature using the feature breakdown skill"
```

Answer 9 questions about your feature, and the system will generate a detailed implementation plan with:
- User stories and acceptance criteria
- Architectural decisions and rationale
- Vertical slices with dependencies clearly marked
- Atomic tasks with validation steps
- Testing strategy
- Agent assignment recommendations
- TodoWrite-ready task format

### Documentation

- **Full Guide**: [docs/FEATURE-BREAKDOWN-GUIDE.md](./docs/FEATURE-BREAKDOWN-GUIDE.md)
- **Quick Reference**: [docs/FEATURE-BREAKDOWN-QUICK-REFERENCE.md](./docs/FEATURE-BREAKDOWN-QUICK-REFERENCE.md)
- **Example Plan**: [docs/features/EXAMPLE-favorite-responses-implementation-plan.md](./docs/features/EXAMPLE-favorite-responses-implementation-plan.md)
- **Skill File**: [.claude/skills/feature-breakdown.md](./.claude/skills/feature-breakdown.md)

### When to Use

- ✅ **Medium to Large Features**: Multiple components or API endpoints
- ✅ **Complex Integrations**: Touching multiple systems
- ✅ **New Architectural Patterns**: Establishing new conventions
- ✅ **Team Collaboration**: Need clear, documented plan

### Output Location

Generated plans are saved to: `docs/features/[feature-name]-implementation-plan.md`

## Data Storage

Conversations are stored as JSON files in `data/conversations/`.

Each conversation includes:
- Unique ID
- Auto-generated title from first message
- Full message history with timestamps
- Model and system prompt configuration
- Created/updated timestamps

## Future Enhancements
- Per-user conversation storage (currently shared across all users)
- Agent capabilities with tool use
- Custom system prompts
- Model selection in UI
- Export conversations
- Search conversation history
- Token usage tracking and display
- Prompt caching for long conversations

## References

### Authentication
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Astro Integration](https://clerk.com/docs/references/astro/overview)
- [Clerk Dashboard](https://dashboard.clerk.com)

### Claude
- [Anthropic Claude SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Streaming Guide](https://docs.anthropic.com/claude/reference/messages-streaming)
- [Vision Guide](https://docs.anthropic.com/claude/docs/vision)
