/**
 * DOS-Themed Sidebar Component
 * Conversation history in retro file browser style
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
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="w-80 border-r-2 border-green-500 bg-black flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-green-500">
        <pre className="text-green-400 font-mono text-xs mb-3">
{`┌─────────────────────┐
│  FILE MANAGER v1.0  │
└─────────────────────┘`}
        </pre>
        <button
          onClick={onNewChat}
          className="w-full bg-green-900 text-green-300 font-mono py-2 px-3 border-2 border-green-500 hover:bg-green-800 hover:border-green-400 transition-colors"
        >
          [+] NEW SESSION
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-green-400 font-mono text-xs mb-2 px-2">
          DIRECTORY: C:\CHATGPT\SESSIONS\
        </div>

        {isLoading && (
          <div className="text-green-400 font-mono text-sm px-2">
            LOADING<span className="animate-pulse">...</span>
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="text-green-700 font-mono text-sm px-2">
            NO FILES FOUND
          </div>
        )}

        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`
                group relative cursor-pointer font-mono text-sm p-2 border
                transition-colors
                ${
                  currentConversationId === conv.id
                    ? 'bg-green-900 bg-opacity-40 border-green-400 text-green-300'
                    : 'border-green-700 text-green-500 hover:border-green-500 hover:text-green-400'
                }
              `}
            >
              {/* File Icon */}
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  {currentConversationId === conv.id ? '▶' : '□'}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Filename */}
                  <div className="truncate font-bold">
                    {conv.title}.txt
                  </div>
                  {/* Date */}
                  <div className="text-xs opacity-75 mt-1">
                    {formatDate(conv.updatedAt)}
                  </div>
                </div>
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 font-bold transition-opacity"
                  title="Delete"
                >
                  [X]
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-green-500 p-2">
        <div className="text-green-600 font-mono text-xs">
          <div>{conversations.length} FILE(S)</div>
          <div className="mt-1">
            SYSTEM: READY
          </div>
        </div>
      </div>
    </div>
  );
}
