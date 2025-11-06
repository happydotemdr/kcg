# Keep Choosing Good - AI Chat Application

## Overview
A modern AI chat experience built with Astro and React, featuring both Claude (Anthropic) and ChatGPT (OpenAI) integrations. The application demonstrates best practices for building production-ready chat interfaces with multiple AI providers, including a unique retro DOS-themed ChatGPT interface.

## Architecture

### Tech Stack
- **Frontend**: Astro + React + Tailwind CSS
- **Backend**: Astro API Routes (Node.js)
- **AI**:
  - Anthropic Claude SDK (@anthropic-ai/sdk)
  - OpenAI SDK (openai)
- **Storage**: File-based JSON conversation persistence (separate storage for each AI provider)

### Key Features
1. **Dual AI Providers**: Both Claude and ChatGPT integrations in a single app
2. **Real-time Streaming**: Server-Sent Events (SSE) for streaming responses from both providers
3. **Multimodal Support**: Image upload and vision analysis for both AI models
4. **Conversation Management**: Persistent chat history with resume capability (separate storage per provider)
5. **Context Management**: Following best practices for token management
6. **Dual UI Themes**:
   - **Claude Chat** (`/chat`): Clean, modern design with smooth animations
   - **ChatGPT** (`/chatgpt`): Retro DOS terminal theme with CRT effects, scanlines, and command-line aesthetic
7. **Responsive Design**: Works seamlessly on desktop and mobile devices

## Project Structure

```
src/
├── components/
│   ├── chat/             # Claude chat components (modern UI)
│   │   ├── Chat.tsx      # Main chat orchestrator with streaming
│   │   ├── ChatMessage.tsx   # Individual message display
│   │   ├── ChatInput.tsx     # Message input with image upload
│   │   └── ChatSidebar.tsx   # Conversation history sidebar
│   └── gpt/              # ChatGPT components (DOS-themed UI)
│       ├── DosChat.tsx   # DOS-themed chat orchestrator
│       ├── DosMessage.tsx    # DOS-styled message display
│       ├── DosInput.tsx      # Command-line style input
│       └── DosSidebar.tsx    # File manager style sidebar
├── lib/
│   ├── claude.ts         # Claude SDK wrapper and utilities
│   ├── openai.ts         # OpenAI SDK wrapper and utilities
│   ├── storage.ts        # Claude conversation persistence
│   └── gpt-storage.ts    # ChatGPT conversation persistence
├── pages/
│   ├── api/
│   │   ├── chat/         # Claude API routes
│   │   │   ├── send.ts   # POST - Send message with streaming
│   │   │   ├── conversations.ts  # GET - List conversations
│   │   │   ├── conversations/[id].ts  # GET/DELETE - Manage conversation
│   │   │   └── models.ts # GET - List available models
│   │   └── gpt/          # ChatGPT API routes
│   │       ├── send.ts   # POST - Send message with streaming
│   │       ├── conversations.ts  # GET - List conversations
│   │       ├── conversations/[id].ts  # GET/DELETE - Manage conversation
│   │       └── models.ts # GET - List available models
│   ├── chat.astro        # Claude chat page (modern UI)
│   └── chatgpt.astro     # ChatGPT page (DOS terminal UI)
└── types/
    └── chat.ts           # TypeScript type definitions
```

## API Endpoints

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

### ChatGPT Endpoints (`/api/gpt/*`)

#### POST /api/gpt/send
Send a message to ChatGPT and receive streaming response.
- Supports new conversations or continuing existing ones
- Handles text + image multimodal input
- Returns SSE stream with incremental responses

#### GET /api/gpt/conversations
List all ChatGPT conversations, sorted by most recent.

#### GET /api/gpt/conversations/[id]
Retrieve a specific ChatGPT conversation with full message history.

#### DELETE /api/gpt/conversations/[id]
Delete a ChatGPT conversation permanently.

#### GET /api/gpt/models
List available OpenAI models.

## Configuration

### Environment Variables
```bash
# Claude API (for /chat page)
ANTHROPIC_API_KEY=sk-ant-...  # Required: Your Anthropic API key

# OpenAI API (for /chatgpt page)
OPENAI_API_KEY=sk-...  # Required: Your OpenAI API key
```

Get your API keys from:
- Claude: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

### Default Settings

#### Claude Chat
- **Model**: claude-sonnet-4-20250514 (most intelligent, best for complex tasks)
- **Max Tokens**: 4096 per response
- **Context Window**: Managed automatically by storage layer
- **Conversation Pruning**: Keeps last 20 messages by default
- **Storage**: `data/conversations/`

#### ChatGPT (DOS Theme)
- **Model**: gpt-4o (most capable model, great for complex tasks)
- **Max Tokens**: 4096 per response
- **Context Window**: Managed automatically by storage layer
- **Conversation Pruning**: Keeps last 20 messages by default
- **Storage**: `data/gpt-conversations/`

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
# Add your ANTHROPIC_API_KEY and OPENAI_API_KEY to .env
npm run dev
```

Visit:
- Claude Chat: http://localhost:4321/chat
- ChatGPT DOS Terminal: http://localhost:4321/chatgpt

### Building
```bash
npm run build
npm run preview
```

## Data Storage

Conversations are stored as JSON files with separate directories per provider:

### Claude Conversations
Location: `data/conversations/`

### ChatGPT Conversations
Location: `data/gpt-conversations/`

Each conversation includes:
- Unique ID
- Auto-generated title from first message
- Full message history with timestamps
- Model and system prompt configuration
- Created/updated timestamps

## ChatGPT DOS Terminal Theme

The ChatGPT page features a unique retro DOS command-line interface:

### Visual Features
- **CRT Monitor Effect**: Authentic scan lines and screen glow
- **DOS Color Scheme**: Classic green text on black background
- **Monospace Font**: IBM Plex Mono for authentic terminal look
- **ASCII Art**: DOS-style borders and command prompts
- **Blinking Cursor**: Classic terminal cursor animation
- **File Manager Sidebar**: DOS-style file listing for conversations

### UX Features
- Command-line style input with `C:\>` prompt
- Retro loading animations
- DOS-style error messages
- Keyboard shortcuts and terminal interactions
- Image upload with DOS-style preview

## Future Enhancements
- Agent capabilities with tool use
- Custom system prompts
- Model selection in UI
- Export conversations
- Search conversation history
- Token usage tracking and display
- Prompt caching for long conversations
- Multi-user support with authentication

## References

### Claude
- [Anthropic Claude SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Streaming Guide](https://docs.anthropic.com/claude/reference/messages-streaming)
- [Vision Guide](https://docs.anthropic.com/claude/docs/vision)

### ChatGPT
- [OpenAI Node SDK](https://github.com/openai/openai-node)
- [OpenAI Documentation](https://platform.openai.com/docs)
- [Chat Completions Guide](https://platform.openai.com/docs/guides/chat-completions)
- [Vision Guide](https://platform.openai.com/docs/guides/vision)
