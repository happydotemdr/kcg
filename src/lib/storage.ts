/**
 * Conversation Storage System
 * File-based storage for conversation persistence
 * Following Anthropic's best practices for context management
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, Message, ConversationListItem } from '../types/chat';

const DATA_DIR = path.join(process.cwd(), 'data', 'conversations');

/**
 * Ensure the data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Generate a conversation title from the first user message
 */
function generateTitle(firstMessage: string): string {
  const maxLength = 50;
  const cleaned = firstMessage.trim().replace(/\n/g, ' ');
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  firstMessage: Message,
  model: string = 'claude-sonnet-4-20250514',
  systemPrompt?: string
): Promise<Conversation> {
  await ensureDataDir();

  const id = uuidv4();
  const now = Date.now();

  // Extract text from first message for title
  const firstText = firstMessage.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join(' ');

  const conversation: Conversation = {
    id,
    title: generateTitle(firstText || 'New conversation'),
    messages: [firstMessage],
    createdAt: now,
    updatedAt: now,
    model,
    systemPrompt,
  };

  const filePath = path.join(DATA_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

  return conversation;
}

/**
 * Get a conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  await ensureDataDir();

  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Update a conversation with new messages
 * Follows Anthropic's recommendation to manage context window size
 */
export async function updateConversation(
  id: string,
  newMessages: Message[]
): Promise<Conversation | null> {
  const conversation = await getConversation(id);
  if (!conversation) return null;

  conversation.messages.push(...newMessages);
  conversation.updatedAt = Date.now();

  const filePath = path.join(DATA_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));

  return conversation;
}

/**
 * List all conversations, sorted by most recent
 */
export async function listConversations(): Promise<ConversationListItem[]> {
  await ensureDataDir();

  try {
    const files = await fs.readdir(DATA_DIR);
    const conversations: ConversationListItem[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const conv: Conversation = JSON.parse(data);

        // Get last message text for preview
        const lastMsg = conv.messages[conv.messages.length - 1];
        const lastText = lastMsg?.content
          .filter(block => block.type === 'text')
          .map(block => (block as any).text)
          .join(' ')
          .substring(0, 100);

        conversations.push({
          id: conv.id,
          title: conv.title,
          lastMessage: lastText,
          updatedAt: conv.updatedAt,
        });
      } catch (err) {
        console.error(`Error reading conversation file ${file}:`, err);
      }
    }

    // Sort by most recent
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    return [];
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<boolean> {
  await ensureDataDir();

  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Prune old messages from a conversation to manage context window
 * Following Anthropic's best practice of limiting conversation turns
 */
export async function pruneConversation(
  id: string,
  keepLastN: number = 20
): Promise<Conversation | null> {
  const conversation = await getConversation(id);
  if (!conversation) return null;

  if (conversation.messages.length > keepLastN) {
    // Keep the most recent messages
    conversation.messages = conversation.messages.slice(-keepLastN);
    conversation.updatedAt = Date.now();

    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
  }

  return conversation;
}
