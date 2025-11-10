/**
 * ChatKit ThreadStreamEvent Type Definitions
 *
 * This file contains all type definitions for the ChatKit ThreadStreamEvent protocol.
 * These types define the SSE event structure emitted by /api/chatkit/backend.
 *
 * Reference: /docs/chatkit-event-mapping.md
 */

// ============================================================================
// ThreadStatus
// ============================================================================

export type ThreadStatus =
  | { type: 'active' }
  | { type: 'locked'; reason?: string }
  | { type: 'closed'; reason?: string };

// ============================================================================
// ThreadItemBase - Inherited by all ThreadItem types
// ============================================================================

export interface ThreadItemBase {
  id: string;          // Item UUID
  thread_id: string;   // Parent thread UUID
  created_at: string;  // ISO 8601 timestamp
}

// ============================================================================
// ThreadItem Types (Discriminated Union)
// ============================================================================

export interface UserMessageItem extends ThreadItemBase {
  type: 'user_message';
  content: Array<{
    type: 'input_text';
    text: string;
  }>;
  attachments: Array<{
    type: 'image';
    id: string;
    name: string;
    mime_type: string;
    url: string;  // base64 data URL
  }>;
  quoted_text: string | null;
}

export interface AssistantMessageItem extends ThreadItemBase {
  type: 'assistant_message';
  content: Array<{
    type: 'output_text';
    text: string;
    annotations: any[];  // Empty array for now
  }>;
}

export interface ClientToolCallItem extends ThreadItemBase {
  type: 'client_tool_call';
  status: 'pending' | 'completed';
  call_id: string;
  name: string;
  arguments: Record<string, any>;
  output: any | null;
}

export interface EndOfTurnItem extends ThreadItemBase {
  type: 'end_of_turn';
}

export interface ToolApprovalItem extends ThreadItemBase {
  type: 'tool_approval';
  tool_name: string;
  tool_arguments: Record<string, any>;
  approval_id: string;  // Unique ID for matching approval response
  timeout_ms: number;    // Milliseconds before auto-reject
}

export type ThreadItem =
  | UserMessageItem
  | AssistantMessageItem
  | ClientToolCallItem
  | EndOfTurnItem
  | ToolApprovalItem;

// ============================================================================
// Thread Object Structure
// ============================================================================

export interface Thread {
  id: string;                    // Thread UUID
  title: string | null;          // Thread title (auto-generated from first message)
  created_at: string;            // ISO 8601 timestamp
  status: ThreadStatus;          // Thread status
  metadata: Record<string, any>; // Custom metadata (not sent to UI)
  items: {                       // Paginated items
    data: ThreadItem[];
    has_more: boolean;
    after: string | null;
  };
}

// ============================================================================
// ThreadStreamEvent Types (Discriminated Union)
// ============================================================================

export interface ThreadCreatedEvent {
  type: 'thread.created';
  thread: Thread;
}

export interface ThreadUpdatedEvent {
  type: 'thread.updated';
  thread: Thread;
}

export interface ThreadItemAddedEvent {
  type: 'thread.item.added';
  item: ThreadItem;
}

export interface ThreadItemUpdatedEvent {
  type: 'thread.item.updated';
  item_id: string;
  update: {
    content?: AssistantMessageItem['content'];
    status?: ClientToolCallItem['status'];
    output?: any;
  };
}

export interface ThreadItemDoneEvent {
  type: 'thread.item.done';
  item: ThreadItem;
}

export interface ThreadItemRemovedEvent {
  type: 'thread.item.removed';
  item_id: string;
}

export interface ThreadItemReplacedEvent {
  type: 'thread.item.replaced';
  old_item_id: string;
  new_item: ThreadItem;
}

export interface ProgressUpdateEvent {
  type: 'progress_update';
  icon: string | null;
  text: string;
}

export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string | null;
  allow_retry: boolean;
}

export interface NoticeEvent {
  type: 'notice';
  message: string;
  level: 'info' | 'warning' | 'error';
}

export interface ToolApprovalRequestedEvent {
  type: 'tool_approval_requested';
  approval_id: string;
  tool_name: string;
  tool_arguments: Record<string, any>;
  timeout_ms: number;
}

export type ThreadStreamEvent =
  | ThreadCreatedEvent
  | ThreadUpdatedEvent
  | ThreadItemAddedEvent
  | ThreadItemUpdatedEvent
  | ThreadItemDoneEvent
  | ThreadItemRemovedEvent
  | ThreadItemReplacedEvent
  | ProgressUpdateEvent
  | ErrorEvent
  | NoticeEvent
  | ToolApprovalRequestedEvent;
