# Keep Choosing Good - AI Chat Application

## Overview
A modern AI chat experience built with Astro, React, and the Anthropic Claude SDK. This application demonstrates best practices for building production-ready chat interfaces with Claude.

## Architecture

### Tech Stack
- **Frontend**: Astro + React + Tailwind CSS
- **Backend**: Astro API Routes (Node.js)
- **AI**: Anthropic Claude SDK (@anthropic-ai/sdk)
- **Storage**: File-based JSON conversation persistence

### Key Features
1. **Real-time Streaming**: Server-Sent Events (SSE) for streaming responses
2. **Multimodal Support**: Image upload and vision analysis
3. **Conversation Management**: Persistent chat history with resume capability
4. **Context Management**: Following Anthropic's best practices for token management
5. **Modern UI**: Responsive, accessible interface with smooth animations

## Project Structure

```
src/
├── components/chat/       # React chat components
│   ├── Chat.tsx          # Main chat orchestrator with streaming
│   ├── ChatMessage.tsx   # Individual message display
│   ├── ChatInput.tsx     # Message input with image upload
│   └── ChatSidebar.tsx   # Conversation history sidebar
├── lib/
│   ├── claude.ts         # Claude SDK wrapper and utilities
│   └── storage.ts        # Conversation persistence layer
├── pages/
│   ├── api/chat/         # API routes for chat operations
│   │   ├── send.ts       # POST - Send message with streaming
│   │   ├── conversations.ts  # GET - List conversations
│   │   ├── conversations/[id].ts  # GET/DELETE - Manage conversation
│   │   └── models.ts     # GET - List available models
│   └── chat.astro        # Main chat page
└── types/
    └── chat.ts           # TypeScript type definitions
```

## API Endpoints

### POST /api/chat/send
Send a message and receive streaming response.
- Supports new conversations or continuing existing ones
- Handles text + image multimodal input
- Returns SSE stream with incremental responses

### GET /api/chat/conversations
List all conversations, sorted by most recent.

### GET /api/chat/conversations/[id]
Retrieve a specific conversation with full message history.

### DELETE /api/chat/conversations/[id]
Delete a conversation permanently.

### GET /api/chat/models
List available Claude models.

## Configuration

### Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required: Your Anthropic API key
```

Get your API key from: https://console.anthropic.com/settings/keys

### Default Settings
- **Model**: claude-sonnet-4-20250514 (most intelligent, best for complex tasks)
- **Max Tokens**: 4096 per response
- **Context Window**: Managed automatically by storage layer
- **Conversation Pruning**: Keeps last 20 messages by default

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
# Add your ANTHROPIC_API_KEY to .env
npm run dev
```

### Building
```bash
npm run build
npm run preview
```

## Data Storage
Conversations are stored as JSON files in `data/conversations/`. Each conversation includes:
- Unique ID
- Auto-generated title from first message
- Full message history with timestamps
- Model and system prompt configuration
- Created/updated timestamps

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
- [Anthropic Claude SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Streaming Guide](https://docs.anthropic.com/claude/reference/messages-streaming)
- [Vision Guide](https://docs.anthropic.com/claude/docs/vision)
