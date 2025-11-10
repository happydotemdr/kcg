# ChatKit ThreadStreamEvent Mapping Architecture

## Overview

This document defines how to convert OpenAI Agents SDK events to ChatKit ThreadStreamEvent protocol for `/api/chatkit/backend` endpoint.

## ThreadStreamEvent Protocol Specification

### Event Types (Discriminated Union)

All events have a `type` field that determines the event structure:

```typescript
type ThreadStreamEvent =
  | ThreadCreatedEvent
  | ThreadUpdatedEvent
  | ThreadItemAddedEvent
  | ThreadItemUpdated
  | ThreadItemDoneEvent
  | ThreadItemRemovedEvent
  | ThreadItemReplacedEvent
  | ProgressUpdateEvent
  | ErrorEvent
  | NoticeEvent;
```

### Core Type Definitions

#### 1. ThreadCreatedEvent
```typescript
{
  type: "thread.created",
  thread: Thread
}
```

#### 2. ThreadItemAddedEvent
```typescript
{
  type: "thread.item.added",
  item: ThreadItem
}
```

#### 3. ThreadItemDoneEvent
```typescript
{
  type: "thread.item.done",
  item: ThreadItem
}
```

#### 4. ProgressUpdateEvent
```typescript
{
  type: "progress_update",
  icon: string | null,
  text: string
}
```

#### 5. ErrorEvent
```typescript
{
  type: "error",
  code: string,
  message: string | null,
  allow_retry: boolean
}
```

### Thread Object Structure

```typescript
interface Thread {
  id: string;                    // Thread UUID
  title: string | null;          // Thread title (auto-generated from first message)
  created_at: string;            // ISO 8601 timestamp
  status: ThreadStatus;          // { type: "active" } | { type: "locked", reason?: string } | { type: "closed", reason?: string }
  metadata: Record<string, any>; // Custom metadata (not sent to UI)
  items: {                       // Paginated items
    data: ThreadItem[];
    has_more: boolean;
    after: string | null;
  };
}
```

### ThreadItem Types (Discriminated Union)

```typescript
type ThreadItem =
  | UserMessageItem
  | AssistantMessageItem
  | ClientToolCallItem
  | EndOfTurnItem;
  // Note: WidgetItem, WorkflowItem, TaskItem, HiddenContextItem not needed for basic integration
```

#### ThreadItemBase (inherited by all items)
```typescript
{
  id: string;          // Item UUID
  thread_id: string;   // Parent thread UUID
  created_at: string;  // ISO 8601 timestamp
}
```

#### UserMessageItem
```typescript
{
  ...ThreadItemBase,
  type: "user_message",
  content: Array<{
    type: "input_text",
    text: string
  }>,
  attachments: Array<{
    type: "image",
    id: string,
    name: string,
    mime_type: string,
    url: string  // base64 data URL
  }>,
  quoted_text: string | null
}
```

#### AssistantMessageItem
```typescript
{
  ...ThreadItemBase,
  type: "assistant_message",
  content: Array<{
    type: "output_text",
    text: string,
    annotations: []  // Empty for now, can add later
  }>
}
```

#### ClientToolCallItem
```typescript
{
  ...ThreadItemBase,
  type: "client_tool_call",
  status: "pending" | "completed",
  call_id: string,
  name: string,
  arguments: Record<string, any>,
  output: any | null
}
```

#### EndOfTurnItem
```typescript
{
  ...ThreadItemBase,
  type: "end_of_turn"
}
```

## Event Flow Mapping

### Current Implementation (Agents SDK)
```typescript
// Agents SDK events from runAgentWithStreaming:
onText(text: string)           // Text delta streaming
onToolUse(toolName, toolInput) // Tool execution started
onComplete(finalText)          // Agent finished
onError(error)                 // Error occurred
```

### Required ChatKit Event Flow

#### Scenario 1: New Conversation
```
1. thread.created           → Create new thread with user message
2. thread.item.added        → User message added (UserMessageItem)
3. thread.item.added        → Assistant message started (AssistantMessageItem with empty content)
4. progress_update          → [Optional] "Thinking..." or tool execution
5. thread.item.updated      → Assistant message content streaming (update text)
6. thread.item.done         → Assistant message complete
7. thread.item.added        → EndOfTurnItem
```

#### Scenario 2: Existing Conversation
```
1. thread.item.added        → User message added
2. thread.item.added        → Assistant message started
3. progress_update          → [Optional] Tool execution
4. thread.item.updated      → Content streaming
5. thread.item.done         → Message complete
6. thread.item.added        → EndOfTurnItem
```

#### Scenario 3: Tool Calling
```
1. thread.item.added        → User message
2. progress_update          → "Executing get_calendar_events..."
3. thread.item.added        → ClientToolCallItem (status: "pending")
4. thread.item.updated      → ClientToolCallItem (status: "completed", output: {...})
5. thread.item.added        → Assistant message with tool result
6. thread.item.done         → Complete
7. thread.item.added        → EndOfTurnItem
```

#### Scenario 4: Error
```
1. thread.item.added        → User message
2. error                    → { code: "custom", message: "...", allow_retry: true }
```

## Implementation Requirements

### Backend Changes (`/api/chatkit/backend`)

#### 1. ThreadStreamEvent Type Definitions
Create `/src/types/chatkit-events.ts` with all ThreadStreamEvent type definitions.

#### 2. Event Emitter Helper
```typescript
function emitSSE(controller: ReadableStreamDefaultController, event: ThreadStreamEvent) {
  const data = JSON.stringify(event);
  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
}
```

#### 3. Conversation → Thread Conversion
```typescript
function conversationToThread(conversation: Conversation): Thread {
  return {
    id: conversation.id,
    title: conversation.title,
    created_at: new Date(conversation.createdAt).toISOString(),
    status: { type: "active" },
    metadata: {},
    items: {
      data: conversation.messages.map(msgToThreadItem),
      has_more: false,
      after: null
    }
  };
}
```

#### 4. Message → ThreadItem Conversion
```typescript
function messageToThreadItem(message: Message, threadId: string): ThreadItem {
  const base = {
    id: message.id,
    thread_id: threadId,
    created_at: new Date(message.timestamp).toISOString()
  };

  if (message.role === 'user') {
    return {
      ...base,
      type: "user_message",
      content: message.content
        .filter(c => c.type === 'text')
        .map(c => ({ type: "input_text", text: c.text })),
      attachments: message.content
        .filter(c => c.type === 'image')
        .map((c, idx) => ({
          type: "image",
          id: `img-${message.id}-${idx}`,
          name: `image-${idx}.jpg`,
          mime_type: c.source.media_type,
          url: `data:${c.source.media_type};base64,${c.source.data}`
        })),
      quoted_text: null
    };
  } else {
    return {
      ...base,
      type: "assistant_message",
      content: message.content
        .filter(c => c.type === 'text')
        .map(c => ({ type: "output_text", text: c.text, annotations: [] }))
    };
  }
}
```

#### 5. Streaming Event Conversion
```typescript
async start(controller) {
  let assistantItemId = `msg-${Date.now()}`;
  let accumulatedText = '';

  // 1. Emit thread.created or get existing thread
  if (!conversationId) {
    const thread = conversationToThread(conversation);
    emitSSE(controller, { type: "thread.created", thread });
  }

  // 2. Emit user message item
  const userItem = messageToThreadItem(userMessage, conversation.id);
  emitSSE(controller, { type: "thread.item.added", item: userItem });

  // 3. Create assistant message shell
  const assistantItem: AssistantMessageItem = {
    id: assistantItemId,
    thread_id: conversation.id,
    created_at: new Date().toISOString(),
    type: "assistant_message",
    content: []
  };
  emitSSE(controller, { type: "thread.item.added", item: assistantItem });

  // 4. Run agent with callbacks
  await runAgentWithStreaming(
    agent,
    conversation.messages,
    dbUser.id,

    // onText: Stream text deltas
    (text: string) => {
      accumulatedText += text;

      // Update assistant message content
      assistantItem.content = [{
        type: "output_text",
        text: accumulatedText,
        annotations: []
      }];

      emitSSE(controller, {
        type: "thread.item.updated",
        item_id: assistantItemId,
        update: { content: assistantItem.content }
      });
    },

    // onToolUse: Show progress
    (toolName: string, toolInput: any) => {
      emitSSE(controller, {
        type: "progress_update",
        icon: "⚙️",
        text: `Executing ${toolName}...`
      });

      // Optionally emit ClientToolCallItem
      const toolItem: ClientToolCallItem = {
        id: `tool-${Date.now()}`,
        thread_id: conversation.id,
        created_at: new Date().toISOString(),
        type: "client_tool_call",
        status: "pending",
        call_id: `call-${Date.now()}`,
        name: toolName,
        arguments: toolInput,
        output: null
      };
      emitSSE(controller, { type: "thread.item.added", item: toolItem });
    },

    // onComplete: Mark done
    async (finalText: string) => {
      // Ensure final text is set
      assistantItem.content = [{
        type: "output_text",
        text: finalText || accumulatedText,
        annotations: []
      }];

      // Emit done
      emitSSE(controller, {
        type: "thread.item.done",
        item: assistantItem
      });

      // Emit end of turn
      const endOfTurn: EndOfTurnItem = {
        id: `eot-${Date.now()}`,
        thread_id: conversation.id,
        created_at: new Date().toISOString(),
        type: "end_of_turn"
      };
      emitSSE(controller, { type: "thread.item.added", item: endOfTurn });

      // Save to storage
      await updateConversation(conversation.id, [assistantMessage]);

      controller.close();
    },

    // onError: Emit error event
    (error: Error) => {
      emitSSE(controller, {
        type: "error",
        code: "custom",
        message: error.message,
        allow_retry: true
      });
      controller.close();
    }
  );
}
```

## Testing Strategy

### Manual SSE Testing
```bash
curl -N -X POST http://localhost:4321/api/chatkit/backend \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=..." \
  -d '{
    "message": "What is on my calendar today?",
    "images": []
  }'
```

Expected output:
```
data: {"type":"thread.created","thread":{...}}

data: {"type":"thread.item.added","item":{"type":"user_message",...}}

data: {"type":"thread.item.added","item":{"type":"assistant_message",...}}

data: {"type":"progress_update","text":"Executing get_calendar_events..."}

data: {"type":"thread.item.updated","item_id":"...","update":{...}}

data: {"type":"thread.item.done","item":{...}}

data: {"type":"thread.item.added","item":{"type":"end_of_turn",...}}
```

### Validation Checklist

- [ ] SSE format: `data: {JSON}\n\n` (double newline)
- [ ] All events have correct `type` discriminator
- [ ] Thread IDs consistent across all events
- [ ] ISO 8601 timestamps (e.g., `2025-11-10T15:30:00.000Z`)
- [ ] UUIDs for all IDs (thread, item, call)
- [ ] Base64 image data in attachments
- [ ] Tool calls show pending → completed status progression
- [ ] EndOfTurnItem emitted after each assistant response
- [ ] Errors include allow_retry flag

## Success Criteria

✅ Backend compiles with no TypeScript errors
✅ SSE events match ThreadStreamEvent protocol exactly
✅ ChatKit React component can parse all events
✅ Tool calling flows work with progress indicators
✅ Conversation persistence maintains compatibility
✅ Error scenarios emit proper ErrorEvent

## Next Steps

After backend implementation:
1. Test with curl/Postman to verify SSE format
2. Integrate ChatKit React component in frontend
3. Apply DOS theme CSS overlay
4. End-to-end testing with calendar tools
