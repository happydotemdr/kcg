/**
 * Modern ChatGPT Sidebar Component
 * Conversation history with clean, modern design
 */

import React, { useState, useEffect } from 'react';
import type { ConversationListItem } from '../../types/chat';

interface DosSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

export default function DosSidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: DosSidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversations
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gpt/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // Refresh conversations list every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this conversation?')) return;

    try {
      const response = await fetch(`/api/gpt/conversations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleteConversation(id);
        loadConversations();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="sidebar w-80 flex flex-col bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="sidebar-header px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="new-chat-button w-full py-2.5 px-4 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="section-label text-xs font-semibold uppercase tracking-wider mb-3 px-3 text-gray-600">
          Recent Conversations
        </div>

        {isLoading && (
          <div className="loading-state text-sm px-3 py-2 text-gray-600">
            Loading<span className="animate-pulse">...</span>
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="empty-state text-sm px-3 py-2 text-gray-500">
            No conversations yet
          </div>
        )}

        <div className="conversation-list space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`
                conversation-item group relative cursor-pointer rounded-lg transition-all
                ${
                  currentConversationId === conv.id
                    ? 'bg-indigo-50 border-l-4 border-indigo-600'
                    : 'hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-start gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className={`conversation-title truncate font-medium text-sm ${
                    currentConversationId === conv.id
                      ? 'text-indigo-900'
                      : 'text-gray-900'
                  }`}>
                    {conv.title}
                  </div>
                  <div className={`conversation-date text-xs mt-1 ${
                    currentConversationId === conv.id
                      ? 'text-indigo-700'
                      : 'text-gray-500'
                  }`}>
                    {formatDate(conv.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="delete-button flex-shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded transition-all text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer px-4 py-3 border-t border-gray-200 bg-white">
        <div className="footer-info text-xs text-gray-500">
          <div>{conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}</div>
        </div>
      </div>
    </div>
  );
}
