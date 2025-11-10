/**
 * DOS-Themed Sidebar Component
 * Conversation history in retro file browser style
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { resolvedThemeAtom } from '@lib/theme/themeStore';
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
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'dark-pro';

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
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className={`dos-sidebar w-80 flex flex-col ${isDark ? 'border-r-2 border-green-500 bg-black' : 'border-r border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`dos-sidebar-header p-4 ${isDark ? 'border-b-2 border-green-500' : 'border-b border-gray-200'}`}>
        <pre className={`dos-sidebar-title text-xs mb-3 ${isDark ? 'text-green-400 font-mono' : 'text-gray-900'}`}>
{isDark ? `┌─────────────────────┐
│  FILE MANAGER v1.0  │
└─────────────────────┘` : 'FILE MANAGER v1.0'}
        </pre>
        <button
          onClick={onNewChat}
          className={`dos-sidebar-button w-full py-2 px-3 transition-colors ${
            isDark
              ? 'bg-green-900 text-green-300 font-mono border-2 border-green-500 hover:bg-green-800 hover:border-green-400'
              : 'bg-indigo-600 text-white border border-indigo-600 rounded hover:bg-indigo-700'
          }`}
        >
          {isDark ? '[+] NEW SESSION' : '+ New Session'}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className={`dos-sidebar-directory text-xs mb-2 px-2 ${isDark ? 'text-green-400 font-mono' : 'text-gray-600'}`}>
          {isDark ? 'DIRECTORY: C:\\CHATGPT\\SESSIONS\\' : 'Conversations'}
        </div>

        {isLoading && (
          <div className={`dos-sidebar-loading text-sm px-2 ${isDark ? 'text-green-400 font-mono' : 'text-gray-600'}`}>
            {isDark ? 'LOADING' : 'Loading'}<span className="animate-pulse">...</span>
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className={`dos-sidebar-empty text-sm px-2 ${isDark ? 'text-green-700 font-mono' : 'text-gray-500'}`}>
            {isDark ? 'NO FILES FOUND' : 'No conversations yet'}
          </div>
        )}

        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`
                dos-conversation-item group relative cursor-pointer text-sm p-2 border transition-colors
                ${isDark ? 'font-mono' : ''}
                ${
                  currentConversationId === conv.id
                    ? isDark
                      ? 'dos-conversation-active bg-green-900 bg-opacity-40 border-green-400 text-green-300'
                      : 'bg-indigo-50 border-indigo-400 text-indigo-900'
                    : isDark
                      ? 'border-green-700 text-green-500 hover:border-green-500 hover:text-green-400'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* File Icon */}
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  {isDark ? (currentConversationId === conv.id ? '▶' : '□') : (currentConversationId === conv.id ? '▶' : '○')}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Filename */}
                  <div className="truncate font-bold">
                    {isDark ? `${conv.title}.txt` : conv.title}
                  </div>
                  {/* Date */}
                  <div className="text-xs opacity-75 mt-1">
                    {formatDate(conv.updatedAt)}
                  </div>
                </div>
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className={`dos-delete-button flex-shrink-0 opacity-0 group-hover:opacity-100 font-bold transition-opacity ${
                    isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                  }`}
                  title="Delete"
                >
                  {isDark ? '[X]' : '×'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={`dos-sidebar-footer p-2 ${isDark ? 'border-t-2 border-green-500' : 'border-t border-gray-200'}`}>
        <div className={`text-xs ${isDark ? 'text-green-600 font-mono' : 'text-gray-500'}`}>
          <div>{conversations.length} {isDark ? 'FILE(S)' : conversations.length === 1 ? 'conversation' : 'conversations'}</div>
          <div className="mt-1">
            {isDark ? 'SYSTEM: READY' : 'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
}
