/**
 * DOS-Themed ChatGPT Component with ChatKit Integration
 * Retro command-line interface aesthetic
 */

import React, { useState, useEffect } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useStore } from '@nanostores/react';
import { resolvedThemeAtom } from '@lib/theme/themeStore';
// import DosInput from './DosInput'; // ✅ REMOVED: Using ChatKit's built-in composer
import DosSidebar from './DosSidebar';
import AppHeader from '../AppHeader';
import DosLoadingIndicator from './DosLoadingIndicator';
import ToolApprovalModal from './ToolApprovalModal';

export default function DosChat() {
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [tokenWarning, setTokenWarning] = useState<boolean>(false);
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'dark-pro';

  // Progress indicator state
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const [currentToolExecution, setCurrentToolExecution] = useState<{
    toolName: string;
    status: string;
  } | null>(null);

  // Tool approval state
  const [pendingApproval, setPendingApproval] = useState<{
    approvalId: string;
    toolName: string;
    toolArguments: Record<string, any>;
    timeoutMs: number;
  } | null>(null);

  // Initialize ChatKit
  const { control, setThreadId, sendUserMessage } = useChatKit({
    api: {
      async getClientSecret(existingSecret: string | null) {
        try {
          // If we have an existing secret, try to refresh it
          if (existingSecret) {
            console.log('[DosChat] Refreshing existing client secret');
            const refreshRes = await fetch('/api/chatkit/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ client_secret: existingSecret }),
            });

            if (refreshRes.ok) {
              const { client_secret, expires_at } = await refreshRes.json();
              console.log('[DosChat] Token refreshed successfully, expires at:', expires_at);
              setTokenExpiresAt(expires_at);
              setTokenWarning(false);
              return client_secret;
            } else {
              console.warn('[DosChat] Token refresh failed, creating new session');
              // Fall through to create new session
            }
          }

          // Create new session
          console.log('[DosChat] Creating new client secret');
          const res = await fetch('/api/chatkit/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!res.ok) {
            throw new Error('Failed to get client secret');
          }

          const { client_secret, expires_at } = await res.json();
          console.log('[DosChat] New session created, expires at:', expires_at);
          setTokenExpiresAt(expires_at);
          setTokenWarning(false);
          return client_secret;
        } catch (err) {
          console.error('[DosChat] Error getting client secret:', err);
          setError('Authentication failed. Please refresh the page.');
          throw err;
        }
      },
      // ✅ ChatKit API base URL - ChatKit will append paths like /backend for message handling
      url: '/api/chatkit',
    },

    // ✅ Composer configuration - explicitly enable with custom settings
    composer: {
      placeholder: 'ENTER COMMAND...',
      attachments: {
        enabled: true,
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
        },
      },
    },

    // ✅ Explicitly enable history (threads list)
    history: {
      enabled: false, // We have custom sidebar, so disable built-in
    },

    // ✅ Explicitly disable header (we have custom AppHeader)
    header: {
      enabled: false,
    },

    // Event Handlers
    onReady: () => {
      console.log('[DosChat] ChatKit is ready');
      setError(null); // Clear any initialization errors
    },

    onResponseStart: () => {
      console.log('[DosChat] Assistant response started');
      setIsResponding(true);
      setCurrentToolExecution(null); // Clear any previous tool execution
    },

    onResponseEnd: () => {
      console.log('[DosChat] Assistant response ended');
      setIsResponding(false);
      setCurrentToolExecution(null);
    },

    onThreadChange: (event) => {
      console.log('[DosChat] Thread changed:', event.threadId);
      setCurrentThreadId(event.threadId);
    },

    onThreadLoadStart: (event) => {
      console.log('[DosChat] Loading thread:', event.threadId);
      // Can add loading state for thread loading
    },

    onThreadLoadEnd: (event) => {
      console.log('[DosChat] Thread loaded:', event.threadId);
      // Can remove loading state for thread loading
    },

    onLog: (event) => {
      console.log('[DosChat Log]', event.name, event.data);

      // Handle tool approval requests from SSE stream
      if (event.name === 'tool_approval_requested' || event.data?.type === 'tool_approval_requested') {
        const data = (event.data || event) as any;
        setPendingApproval({
          approvalId: data.approval_id || '',
          toolName: data.tool_name || '',
          toolArguments: data.tool_arguments || {},
          timeoutMs: data.timeout_ms || 30000,
        });
      }

      // Track tool execution progress
      if (event.name === 'progress' || event.name === 'tool.execute') {
        const data = event.data as any;
        const toolName = data?.tool_name || data?.toolName || 'unknown';
        const status = data?.status || 'EXECUTING';
        setCurrentToolExecution({ toolName, status });
      }

      // Clear tool execution on completion
      if (event.name === 'tool.complete' || event.name === 'response.end') {
        setCurrentToolExecution(null);
      }

      // Track specific events for analytics
      if (event.name === 'message.send') {
        console.log('[DosChat] User sent message:', event.data);
      } else if (event.name === 'message.feedback') {
        console.log('[DosChat] User provided feedback:', event.data);
      } else if (event.name === 'message.share') {
        console.log('[DosChat] User shared message:', event.data);
      }
    },

    onError: (event) => {
      console.error('[DosChat] ChatKit error:', event.error);

      // Enhanced error handling with detailed logging
      const errorMessage = event.error?.message || 'An error occurred';
      const errorStack = event.error?.stack || 'No stack trace available';

      console.error('[DosChat] Error details:', {
        message: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
      });

      // Set user-friendly error message
      setError(errorMessage);

      // Could send to error tracking service here
      // Example: Sentry, LogRocket, etc.
      /*
      fetch('/api/errors', {
        method: 'POST',
        body: JSON.stringify({
          error: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString(),
        }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => console.error('Failed to log error:', err));
      */
    },
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor token expiry and show warning when approaching expiration
  useEffect(() => {
    if (!tokenExpiresAt) return;

    const checkTokenExpiry = () => {
      const expiry = new Date(tokenExpiresAt).getTime();
      const now = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;

      // Show warning if token expires within 5 minutes
      if (now > expiry - fiveMinutesMs && now < expiry) {
        setTokenWarning(true);
      } else if (now >= expiry) {
        // Token has expired
        setTokenWarning(false);
        setError('Session expired. Please refresh the page.');
      } else {
        setTokenWarning(false);
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every 30 seconds
    const timer = setInterval(checkTokenExpiry, 30000);
    return () => clearInterval(timer);
  }, [tokenExpiresAt]);

  // Handle approval decision
  const handleApprove = async (approvalId: string) => {
    console.log('[DosChat] Approving tool:', approvalId);
    try {
      // ✅ FIXED: Use ChatKit protocol actions endpoint
      const response = await fetch(`/api/chatkit/threads/${currentThreadId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, approved: true }),
      });

      if (response.ok) {
        console.log('[DosChat] Approval sent successfully');
        setPendingApproval(null);
      } else {
        console.error('[DosChat] Failed to send approval');
        setError('Failed to approve action');
      }
    } catch (err) {
      console.error('[DosChat] Error sending approval:', err);
      setError('Failed to approve action');
    }
  };

  const handleReject = async (approvalId: string) => {
    console.log('[DosChat] Rejecting tool:', approvalId);
    try {
      // ✅ FIXED: Use ChatKit protocol actions endpoint
      const response = await fetch(`/api/chatkit/threads/${currentThreadId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, approved: false }),
      });

      if (response.ok) {
        console.log('[DosChat] Rejection sent successfully');
        setPendingApproval(null);
      } else {
        console.error('[DosChat] Failed to send rejection');
        setError('Failed to reject action');
      }
    } catch (err) {
      console.error('[DosChat] Error sending rejection:', err);
      setError('Failed to reject action');
    }
  };

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

  // ✅ REMOVED: handleSendMessage - ChatKit composer handles this automatically

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // ✅ DEBUG: Log control object to see if composer is configured
  useEffect(() => {
    console.log('[DosChat] ChatKit control object:', control);
    console.log('[DosChat] Composer config:', {
      placeholder: 'ENTER COMMAND...',
      attachments: {
        enabled: true,
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
        },
      },
    });
  }, [control]);

  return (
    <div className="dos-container flex h-screen relative overflow-hidden flex-col">
      {/* Unified Header */}
      <div style={{ flexShrink: 0 }}>
        <AppHeader currentPage="chatgpt" />
      </div>

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
          <div className={`dos-session-bar p-2 ${isDark ? 'border-b-2 border-green-500 font-mono' : 'border-b border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDark ? 'text-green-400' : 'text-gray-700'}`}>
                  {isDark
                    ? `┌─ SESSION: ${currentThreadId ? 'ACTIVE' : 'NEW'} ─┐`
                    : `Session: ${currentThreadId ? 'Active' : 'New'}`
                  }
                </span>
                <span className={`text-xs ${isDark ? 'text-green-400' : 'text-gray-500'}`}>
                  {isDark ? `[${formatTime(currentTime)}]` : formatTime(currentTime)}
                </span>
                {tokenWarning && (
                  <span className={`text-xs animate-pulse ${isDark ? 'text-yellow-400' : 'text-amber-600'}`}>
                    {isDark ? '[⚠ TOKEN EXPIRING SOON]' : '⚠ Token expiring soon'}
                  </span>
                )}
              </div>
              {/* Calendar Connection Status */}
              <div className="flex items-center gap-2">
                {calendarConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    className={`text-xs px-2 py-0.5 ${
                      isDark
                        ? 'text-green-400 border border-green-500 hover:bg-green-900 hover:bg-opacity-20'
                        : 'text-green-700 border border-green-500 bg-green-50 rounded'
                    }`}
                    disabled
                  >
                    {isDark ? '[√] CALENDAR.SYS' : '✓ Calendar Connected'}
                  </button>
                  <button
                    onClick={handleDisconnectCalendar}
                    className={`text-xs ${isDark ? 'text-yellow-400 hover:text-yellow-300 underline' : 'text-amber-600 hover:text-amber-700 underline'}`}
                  >
                    {isDark ? '[UNLOAD]' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectCalendar}
                  className={`text-xs px-2 py-0.5 ${
                    isDark
                      ? 'text-yellow-400 border border-yellow-500 hover:bg-yellow-900 hover:bg-opacity-20'
                      : 'text-amber-600 border border-amber-500 bg-amber-50 rounded hover:bg-amber-100'
                  }`}
                >
                  {isDark ? '[LOAD CALENDAR.SYS]' : 'Connect Calendar'}
                </button>
              )}
              </div>
            </div>
          </div>

          {/* Error Display (outside of ChatKit scrolling area) */}
          {error && (
            <div className="border border-red-500 p-2 m-4 mb-0 bg-red-900 bg-opacity-20" style={{ flexShrink: 0 }}>
              <span className="text-red-400 font-mono">
                *** ERROR: {error} ***
              </span>
            </div>
          )}

          {/* Loading Indicator (outside of ChatKit scrolling area) */}
          {(isResponding || currentToolExecution) && (
            <div className="m-4 mb-0" style={{ flexShrink: 0 }}>
              <DosLoadingIndicator
                state={
                  currentToolExecution
                    ? 'executing_tool'
                    : isResponding
                      ? 'thinking'
                      : 'streaming'
                }
                toolName={currentToolExecution?.toolName}
                toolStatus={currentToolExecution?.status}
              />
            </div>
          )}

          {/* ChatKit Component - ✅ CRITICAL: Use style prop for explicit height */}
          <div className="flex-1 dos-screen" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ChatKit
              control={control}
              className="chatkit-dos-theme"
              style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
            />
          </div>
        </div>
      </div>

      {/* Global Theme CSS Override for ChatKit (Light mode: modern, Dark mode: DOS) */}
      <style>{`
        /* ⚠️ TEMPORARY DEBUG MODE: Uncomment to disable ALL custom styling and see if composer appears */
        /*
        :global(.chatkit-dos-theme *) {
          all: revert !important;
        }
        */

        /* ChatKit Theme Override - Adapts to light/dark */
        :global(.chatkit-dos-theme) {
          background: transparent !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }

        /* Light mode: Modern styling */
        :global([data-theme="light"] .chatkit-dos-theme) {
          color: var(--color-text) !important;
          font-family: var(--font-family-base) !important;
        }

        /* Dark mode: DOS styling */
        :global([data-theme="dark"] .chatkit-dos-theme) {
          color: #4ade80 !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Message containers - Dark mode DOS style */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="message"]) {
          background: transparent !important;
          border: 1px solid #22c55e !important;
          color: #4ade80 !important;
          padding: 0.5rem !important;
          margin-bottom: 1rem !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Message containers - Light mode modern style */
        :global([data-theme="light"] .chatkit-dos-theme [class*="message"]) {
          background: var(--color-surface) !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text) !important;
          padding: 0.75rem !important;
          margin-bottom: 1rem !important;
          border-radius: var(--radius-md) !important;
        }

        /* User messages - Dark mode cyan */
        :global([data-theme="dark"] .chatkit-dos-theme [data-role="user"]),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="user"]) {
          color: #67e8f9 !important;
          border-color: #06b6d4 !important;
        }

        /* User messages - Light mode primary color */
        :global([data-theme="light"] .chatkit-dos-theme [data-role="user"]),
        :global([data-theme="light"] .chatkit-dos-theme [class*="user"]) {
          color: var(--color-primary) !important;
          border-color: var(--color-primary) !important;
          background: var(--color-info-bg) !important;
        }

        /* Assistant messages - Dark mode yellow */
        :global([data-theme="dark"] .chatkit-dos-theme [data-role="assistant"]),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="assistant"]) {
          color: #fde047 !important;
          border-color: #eab308 !important;
        }

        /* Assistant messages - Light mode secondary color */
        :global([data-theme="light"] .chatkit-dos-theme [data-role="assistant"]),
        :global([data-theme="light"] .chatkit-dos-theme [class*="assistant"]) {
          color: var(--color-text) !important;
          border-color: var(--color-border) !important;
        }

        /* Composer styling - Dark mode DOS */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"]) {
          background: #000 !important;
          border-top: 2px solid #22c55e !important;
        }

        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] input),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] textarea) {
          background: #000 !important;
          color: #4ade80 !important;
          border: 2px solid #22c55e !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Composer styling - Light mode modern */
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"]) {
          background: var(--color-surface) !important;
          border-top: 1px solid var(--color-border) !important;
        }

        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] input),
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] textarea) {
          background: var(--color-background) !important;
          color: var(--color-text) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-md) !important;
        }

        /* Tool use indicators - Dark mode */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="progress"]),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="tool"]) {
          color: #22d3ee !important;
          border: 1px solid #06b6d4 !important;
          background: rgba(6, 182, 212, 0.1) !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Tool use indicators - Light mode */
        :global([data-theme="light"] .chatkit-dos-theme [class*="progress"]),
        :global([data-theme="light"] .chatkit-dos-theme [class*="tool"]) {
          color: var(--color-info) !important;
          border: 1px solid var(--color-info) !important;
          background: var(--color-info-bg) !important;
          border-radius: var(--radius-md) !important;
        }

        /* Hide default header if present */
        :global(.chatkit-dos-theme [class*="header"]) {
          display: none !important;
        }

        /* Style thread container - messages should scroll, composer should be fixed */
        :global(.chatkit-dos-theme [class*="thread"]) {
          background: transparent !important;
          padding: 1rem !important;
          flex: 1 !important;
          overflow-y: auto !important;
          min-height: 0 !important;
        }

        /* Empty state styling */
        :global(.chatkit-dos-theme [class*="empty"]),
        :global(.chatkit-dos-theme [class*="start"]) {
          color: #4ade80 !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Button styling - Dark mode DOS */
        :global([data-theme="dark"] .chatkit-dos-theme button) {
          background: #000 !important;
          color: #4ade80 !important;
          border: 1px solid #22c55e !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        :global([data-theme="dark"] .chatkit-dos-theme button:hover) {
          background: rgba(34, 197, 94, 0.2) !important;
          border-color: #4ade80 !important;
        }

        /* Button styling - Light mode modern */
        :global([data-theme="light"] .chatkit-dos-theme button) {
          background: var(--color-primary) !important;
          color: var(--color-background) !important;
          border: 1px solid var(--color-primary) !important;
          border-radius: var(--radius-md) !important;
        }

        :global([data-theme="light"] .chatkit-dos-theme button:hover) {
          background: var(--color-primary-dark) !important;
        }

        /* Scrollbar styling - Dark mode */
        :global([data-theme="dark"] .chatkit-dos-theme ::-webkit-scrollbar) {
          width: 12px;
        }

        :global([data-theme="dark"] .chatkit-dos-theme ::-webkit-scrollbar-track) {
          background: #000;
          border-left: 1px solid #22c55e;
        }

        :global([data-theme="dark"] .chatkit-dos-theme ::-webkit-scrollbar-thumb) {
          background: #22c55e;
          border: 1px solid #4ade80;
        }

        :global([data-theme="dark"] .chatkit-dos-theme ::-webkit-scrollbar-thumb:hover) {
          background: #4ade80;
        }

        /* Scrollbar styling - Light mode */
        :global([data-theme="light"] .chatkit-dos-theme ::-webkit-scrollbar) {
          width: 8px;
        }

        :global([data-theme="light"] .chatkit-dos-theme ::-webkit-scrollbar-track) {
          background: var(--color-surface);
        }

        :global([data-theme="light"] .chatkit-dos-theme ::-webkit-scrollbar-thumb) {
          background: var(--color-border);
          border-radius: var(--radius-sm);
        }

        :global([data-theme="light"] .chatkit-dos-theme ::-webkit-scrollbar-thumb:hover) {
          background: var(--color-text-light);
        }

        /* ✅ CRITICAL FIX: Composer MUST be visible and at bottom */
        :global(.chatkit-dos-theme [class*="composer"]) {
          padding: 1rem !important;
          flex-shrink: 0 !important;
          position: relative !important;
          z-index: 10 !important;
          /* ⚠️ DO NOT set display/visibility - let ChatKit manage it */
        }

        /* ✅ Force composer container to be visible if ChatKit is hiding it */
        :global(.chatkit-dos-theme > div[class*="composer"]),
        :global(.chatkit-dos-theme > [class*="composer"]),
        :global(.chatkit-dos-theme [role="region"][class*="composer"]) {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* DOS Command Prompt - Dark mode only */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"]::before) {
          content: 'C:\\>';
          color: #4ade80;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.125rem;
          margin-right: 0.5rem;
          font-weight: bold;
        }

        /* Placeholder - Dark mode */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] input::placeholder),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] textarea::placeholder) {
          color: #16a34a !important;
          opacity: 0.6;
          text-transform: uppercase;
        }

        /* Placeholder - Light mode */
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] input::placeholder),
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] textarea::placeholder) {
          color: var(--color-text-light) !important;
          text-transform: none;
        }

        /* Send button - Dark mode DOS */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] [class*="send"]),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] [type="submit"]) {
          background: #15803d !important;
          color: #4ade80 !important;
          border: 2px solid #22c55e !important;
          padding: 0.5rem 1rem !important;
          font-family: 'IBM Plex Mono', monospace !important;
          text-transform: uppercase;
          font-weight: bold;
        }

        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] [class*="send"]:hover),
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] [type="submit"]:hover) {
          background: #16a34a !important;
          border-color: #4ade80 !important;
        }

        /* Send button - Light mode modern */
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] [class*="send"]),
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] [type="submit"]) {
          background: var(--color-primary) !important;
          color: var(--color-background) !important;
          border: 1px solid var(--color-primary) !important;
          padding: 0.5rem 1rem !important;
          border-radius: var(--radius-md) !important;
        }

        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] [class*="send"]:hover),
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] [type="submit"]:hover) {
          background: var(--color-primary-dark) !important;
        }

        /* Attachment button - Dark mode */
        :global([data-theme="dark"] .chatkit-dos-theme [class*="composer"] [class*="attach"]) {
          background: #1e40af !important;
          color: #60a5fa !important;
          border: 2px solid #3b82f6 !important;
          font-family: 'IBM Plex Mono', monospace !important;
        }

        /* Attachment button - Light mode */
        :global([data-theme="light"] .chatkit-dos-theme [class*="composer"] [class*="attach"]) {
          background: var(--color-info) !important;
          color: var(--color-background) !important;
          border: 1px solid var(--color-info) !important;
          border-radius: var(--radius-md) !important;
        }
      `}</style>

      {/* Tool Approval Modal */}
      {pendingApproval && (
        <ToolApprovalModal
          approvalId={pendingApproval.approvalId}
          toolName={pendingApproval.toolName}
          toolArguments={pendingApproval.toolArguments}
          timeoutMs={pendingApproval.timeoutMs}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
