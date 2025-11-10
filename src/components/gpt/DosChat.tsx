/**
 * DOS-Themed ChatGPT Component with ChatKit Integration
 * Retro command-line interface aesthetic
 */

import React, { useState, useEffect } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import '@openai/chatkit-react/styles.css';
import DosInput from './DosInput';
import DosSidebar from './DosSidebar';
import AppHeader from '../AppHeader';

export default function DosChat() {
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  // Initialize ChatKit
  const { control, setThreadId, sendUserMessage } = useChatKit({
    api: {
      async getClientSecret() {
        try {
          const res = await fetch('/api/chatkit/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!res.ok) {
            throw new Error('Failed to get client secret');
          }
          const { client_secret } = await res.json();
          return client_secret;
        } catch (err) {
          console.error('[DosChat] Error getting client secret:', err);
          setError('Authentication failed. Please refresh the page.');
          throw err;
        }
      },
      url: '/api/chatkit/backend',
      domainKey: undefined,
    },
    onThreadChange: (event) => {
      console.log('[DosChat] Thread changed:', event.threadId);
      setCurrentThreadId(event.threadId);
    },
    onError: (event) => {
      console.error('[DosChat] ChatKit error:', event);
      setError(event.error?.message || 'An error occurred');
    },
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check calendar connection status on mount
  useEffect(() => {
    const checkCalendarStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        if (response.ok) {
          const data = await response.json();
          setCalendarConnected(data.connected);
        }
      } catch (err) {
        console.error('Error checking calendar status:', err);
      }
    };

    checkCalendarStatus();

    // Check for OAuth callback success/error in URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') {
      setCalendarConnected(true);
      // Remove query param
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('calendar') === 'error') {
      setError('Failed to connect calendar. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Handle new chat
  const handleNewChat = () => {
    setCurrentThreadId(null);
    setThreadId(null); // ChatKit method to create new thread
    setError(null);
  };

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    setCurrentThreadId(id);
    setThreadId(id); // ChatKit method to switch thread
    setError(null);
  };

  // Handle conversation deletion
  const handleDeleteConversation = (id: string) => {
    if (currentThreadId === id) {
      handleNewChat();
    }
  };

  // Handle calendar connection
  const handleConnectCalendar = () => {
    window.location.href = '/api/auth/google/connect';
  };

  // Handle calendar disconnection
  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setCalendarConnected(false);
      } else {
        setError('Failed to disconnect calendar');
      }
    } catch (err) {
      setError('Failed to disconnect calendar');
    }
  };

  // Handle sending message via ChatKit
  const handleSendMessage = (
    message: string,
    images: { data: string; mediaType: string }[]
  ) => {
    sendUserMessage({
      text: message,
      attachments: images.map((img, idx) => ({
        type: 'image' as const,
        id: `img-${Date.now()}-${idx}`,
        preview_url: `data:${img.mediaType};base64,${img.data}`,
        name: `image-${idx}.jpg`,
        mime_type: img.mediaType,
      })),
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="dos-container flex h-screen bg-black relative overflow-hidden flex-col">
      {/* Unified DOS Header */}
      <AppHeader theme="dos" currentPage="chatgpt" />

      {/* CRT Scanlines Effect */}
      <div className="dos-scanlines pointer-events-none"></div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DosSidebar
          currentConversationId={currentThreadId || undefined}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Session Info Bar */}
          <div className="border-b-2 border-green-500 p-2 font-mono bg-black">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">
                  ┌─ SESSION: {currentThreadId ? 'ACTIVE' : 'NEW'} ─┐
                </span>
                <span className="text-green-400 text-xs">[{formatTime(currentTime)}]</span>
              </div>
              {/* Calendar Connection Status */}
              <div className="flex items-center gap-2">
                {calendarConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-green-400 border border-green-500 px-2 py-0.5 hover:bg-green-900 hover:bg-opacity-20"
                    disabled
                  >
                    [√] CALENDAR.SYS
                  </button>
                  <button
                    onClick={handleDisconnectCalendar}
                    className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                  >
                    [UNLOAD]
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectCalendar}
                  className="text-xs text-yellow-400 border border-yellow-500 px-2 py-0.5 hover:bg-yellow-900 hover:bg-opacity-20"
                >
                  [LOAD CALENDAR.SYS]
                </button>
              )}
              </div>
            </div>
          </div>

          {/* Messages Area with ChatKit */}
          <div className="flex-1 overflow-y-auto dos-screen">
            {error && (
              <div className="border border-red-500 p-2 m-4 mb-4 bg-red-900 bg-opacity-20">
                <span className="text-red-400 font-mono">
                  *** ERROR: {error} ***
                </span>
              </div>
            )}

            {/* ChatKit Component with DOS Theme */}
            <ChatKit
              control={control}
              className="chatkit-dos-theme"
            />
          </div>

          {/* Input Area */}
          <div className="dos-input-area">
            <DosInput
              onSend={handleSendMessage}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* DOS Theme CSS Override for ChatKit */}
      <style>{`
        /* ChatKit DOS Theme Override */
        :global(.chatkit-dos-theme) {
          background: transparent !important;
          color: #4ade80 !important;
          font-family: 'IBM Plex Mono', monospace !important;
          height: 100% !important;
        }

        /* Override message containers */
        :global(.chatkit-dos-theme [class*="message"]) {
          background: transparent !important;
          border: 1px solid #22c55e !important;
          color: #4ade80 !important;
          padding: 0.5rem !important;
          margin-bottom: 1rem !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* User messages in cyan */
        :global(.chatkit-dos-theme [data-role="user"]),
        :global(.chatkit-dos-theme [class*="user"]) {
          color: #67e8f9 !important;
          border-color: #06b6d4 !important;
        }

        /* Assistant messages in yellow */
        :global(.chatkit-dos-theme [data-role="assistant"]),
        :global(.chatkit-dos-theme [class*="assistant"]) {
          color: #fde047 !important;
          border-color: #eab308 !important;
        }

        /* Composer styling */
        :global(.chatkit-dos-theme [class*="composer"]) {
          background: #000 !important;
          border-top: 2px solid #22c55e !important;
        }

        :global(.chatkit-dos-theme [class*="composer"] input),
        :global(.chatkit-dos-theme [class*="composer"] textarea) {
          background: #000 !important;
          color: #4ade80 !important;
          border: 2px solid #22c55e !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Tool use indicators and progress */
        :global(.chatkit-dos-theme [class*="progress"]),
        :global(.chatkit-dos-theme [class*="tool"]) {
          color: #22d3ee !important;
          border: 1px solid #06b6d4 !important;
          background: rgba(6, 182, 212, 0.1) !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Hide default header if present */
        :global(.chatkit-dos-theme [class*="header"]) {
          display: none !important;
        }

        /* Style thread container */
        :global(.chatkit-dos-theme [class*="thread"]) {
          background: transparent !important;
          padding: 1rem !important;
        }

        /* Empty state styling */
        :global(.chatkit-dos-theme [class*="empty"]),
        :global(.chatkit-dos-theme [class*="start"]) {
          color: #4ade80 !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Button styling */
        :global(.chatkit-dos-theme button) {
          background: #000 !important;
          color: #4ade80 !important;
          border: 1px solid #22c55e !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        :global(.chatkit-dos-theme button:hover) {
          background: rgba(34, 197, 94, 0.2) !important;
          border-color: #4ade80 !important;
        }

        /* Scrollbar styling */
        :global(.chatkit-dos-theme ::-webkit-scrollbar) {
          width: 8px;
        }

        :global(.chatkit-dos-theme ::-webkit-scrollbar-track) {
          background: #000;
          border-left: 1px solid #22c55e;
        }

        :global(.chatkit-dos-theme ::-webkit-scrollbar-thumb) {
          background: #22c55e;
          border: 1px solid #4ade80;
        }

        :global(.chatkit-dos-theme ::-webkit-scrollbar-thumb:hover) {
          background: #4ade80;
        }
      `}</style>
    </div>
  );
}
