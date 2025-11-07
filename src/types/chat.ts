/**
 * Type definitions for the AI Chat application
 * Following Anthropic's Messages API structure
 */

export type MessageRole = 'user' | 'assistant';

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

export interface TextContent {
  type: 'text';
  text: string;
}

export type ContentBlock = TextContent | ImageContent;

export interface Message {
  id: string;
  role: MessageRole;
  content: ContentBlock[];
  timestamp: number;
}

export interface Conversation {
  id: string;
  userId: string; // Clerk user ID who owns this conversation
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  systemPrompt?: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  images?: {
    data: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  }[];
  model?: string;
  systemPrompt?: string;
}

export interface ChatStreamChunk {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop' | 'error';
  delta?: {
    type: 'text_delta';
    text: string;
  };
  error?: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: number;
}
