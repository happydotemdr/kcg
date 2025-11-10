/**
 * ChatSidebar Component
 * Conversation history and management
 */

import React, { useState, useEffect } from 'react';
import type { ConversationListItem } from '../../types/chat';

interface ChatSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

export default function ChatSidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      onDeleteConversation(id);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-64 flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2 font-medium flex items-center justify-center gap-2"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-background)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center" style={{ color: 'var(--color-text-light)' }}>
            Loading conversations...
          </div>
        )}

        {error && (
          <div className="p-4 text-center" style={{ color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="p-4 text-center" style={{ color: 'var(--color-text-light)' }}>
            No conversations yet
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="py-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className="px-4 py-3 cursor-pointer group relative"
                style={{
                  background: currentConversationId === conv.id ? 'var(--color-surface-hover)' : 'transparent',
                  transition: 'background var(--transition-base)'
                }}
                onMouseEnter={(e) => {
                  if (currentConversationId !== conv.id) {
                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentConversationId !== conv.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div className="pr-8">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {conv.title}
                  </div>
                  {conv.lastMessage && (
                    <div className="text-xs truncate mt-1" style={{ color: 'var(--color-text-light)' }}>
                      {conv.lastMessage}
                    </div>
                  )}
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDate(conv.updatedAt)}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
                  style={{
                    color: 'var(--color-text-light)',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-light)'}
                  title="Delete conversation"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 text-xs" style={{
        borderTop: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)'
      }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 animate-pulse" style={{
            background: 'var(--color-success)',
            borderRadius: 'var(--radius-full)'
          }}></div>
          <span>Powered by Claude AI</span>
        </div>
      </div>
    </div>
  );
}
