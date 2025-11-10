/**
 * Modern ChatGPT Component with ChatKit Integration
 * Clean, modern interface matching Claude chat aesthetic
 */

import React, { useState, useEffect } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import DosSidebar from './DosSidebar';
import AppHeader from '../AppHeader';
import DosLoadingIndicator from './DosLoadingIndicator';
import ToolApprovalModal from './ToolApprovalModal';
import QuickAdd from './widgets/QuickAdd';
import WhatsNext from './widgets/WhatsNext';
import Reschedule from './widgets/Reschedule';

type ActiveWidget = 'quick-add' | 'whats-next' | 'reschedule' | null;

export default function DosChat() {
  const [error, setError] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [tokenWarning, setTokenWarning] = useState<boolean>(false);

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

  // Widget state
  const [activeWidget, setActiveWidget] = useState<ActiveWidget>(null);

  // Initialize ChatKit
  const { control, setThreadId } = useChatKit({
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
      placeholder: 'Type your message...',
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

  // ✅ DEBUG: Log control object to see if composer is configured
  useEffect(() => {
    console.log('[DosChat] ChatKit control object:', control);
    console.log('[DosChat] Composer config:', {
      placeholder: 'Type your message...',
      attachments: {
        enabled: true,
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
        },
      },
    });
  }, [control]);

  // Widget handlers
  const handleWidgetSuccess = (eventId: string) => {
    console.log('[DosChat] Widget action successful for event:', eventId);
    setActiveWidget(null);
    // Optionally refresh calendar or show notification
  };

  const handleWidgetClose = () => {
    setActiveWidget(null);
  };

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--color-surface)' }}>
      {/* Unified Header */}
      <div style={{ flexShrink: 0 }}>
        <AppHeader currentPage="chatgpt" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DosSidebar
          currentConversationId={currentThreadId || undefined}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Conversation Info Bar */}
          <div className="px-6 py-3 flex items-center justify-between" style={{
            background: 'var(--color-background)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <div className="flex-1">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {currentThreadId ? 'Conversation' : 'New Conversation'}
              </h2>
              {tokenWarning && (
                <p className="text-xs animate-pulse" style={{ color: 'var(--color-warning)' }}>
                  Session expiring soon
                </p>
              )}
            </div>

            {/* Widget Actions & Calendar Connection */}
            <div className="flex items-center gap-3">
              {/* Widget Buttons (only show if calendar connected) */}
              {calendarConnected && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveWidget('quick-add')}
                    className="px-3 py-1.5 text-xs font-medium flex items-center gap-1"
                    title="Quick Add Event"
                    style={{
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-background)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    📅 Quick Add
                  </button>
                  <button
                    onClick={() => setActiveWidget('whats-next')}
                    className="px-3 py-1.5 text-xs font-medium flex items-center gap-1"
                    title="What's Next"
                    style={{
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-background)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    🕐 What's Next
                  </button>
                  <button
                    onClick={() => setActiveWidget('reschedule')}
                    className="px-3 py-1.5 text-xs font-medium flex items-center gap-1"
                    title="Reschedule Event"
                    style={{
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-background)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    🔄 Reschedule
                  </button>
                </div>
              )}

              {/* Calendar Connection Status */}
              {calendarConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm flex items-center gap-1" style={{ color: 'var(--color-success-text)' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Calendar Connected
                  </span>
                  <button
                    onClick={handleDisconnectCalendar}
                    className="text-xs"
                    style={{
                      color: 'var(--color-text-secondary)',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectCalendar}
                  className="px-4 py-2 text-sm font-medium flex items-center gap-2"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'var(--color-background)',
                    borderRadius: 'var(--radius-lg)',
                    transition: 'all var(--transition-base)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Connect Calendar
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 px-4 py-3" style={{
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
                borderRadius: 'var(--radius-lg)'
              }}>
                {error}
              </div>
            )}

            {/* Loading Indicator */}
            {(isResponding || currentToolExecution) && (
              <div className="mx-6 mt-4">
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

            {/* ChatKit Component */}
            <div className="flex-1" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <ChatKit
                control={control}
                className="chatkit-modern"
                style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Modern ChatKit Styling */}
      <style>{`
        /* ChatKit container - clean, modern layout */
        .chatkit-modern {
          background: transparent;
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--color-text);
          font-family: var(--font-family-base);
        }

        /* Thread/messages area - scrollable */
        .chatkit-modern [class*="thread"] {
          background: transparent;
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        /* Message styling */
        .chatkit-modern [class*="message"] {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          padding: 0.75rem;
          margin-bottom: 1rem;
          border-radius: var(--radius-md);
        }

        /* Composer - fixed at bottom */
        .chatkit-modern [class*="composer"] {
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          padding: 1rem;
          flex-shrink: 0;
        }

        .chatkit-modern [class*="composer"] input,
        .chatkit-modern [class*="composer"] textarea {
          background: var(--color-background);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.5rem;
        }

        .chatkit-modern [class*="composer"] input::placeholder,
        .chatkit-modern [class*="composer"] textarea::placeholder {
          color: var(--color-text-light);
        }

        /* Buttons */
        .chatkit-modern button {
          background: var(--color-primary);
          color: var(--color-background);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-md);
          padding: 0.5rem 1rem;
          transition: background var(--transition-base);
        }

        .chatkit-modern button:hover {
          background: var(--color-primary-dark);
        }
      `}</style>

      {/* Widgets */}
      {activeWidget === 'quick-add' && (
        <QuickAdd
          onClose={handleWidgetClose}
          onSuccess={handleWidgetSuccess}
        />
      )}
      {activeWidget === 'whats-next' && (
        <WhatsNext
          onClose={handleWidgetClose}
        />
      )}
      {activeWidget === 'reschedule' && (
        <Reschedule
          onClose={handleWidgetClose}
          onSuccess={handleWidgetSuccess}
        />
      )}

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
