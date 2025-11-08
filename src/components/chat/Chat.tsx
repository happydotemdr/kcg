/**
 * Main Chat Component
 * Integrates all chat functionality with streaming support
 * Following Anthropic's best practices for real-time chat
 */

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import AppHeader from '../AppHeader';
import type { Message, Conversation } from '../../types/chat';

export default function Chat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [toolInUse, setToolInUse] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check calendar connection status on mount
  useEffect(() => {
    checkCalendarStatus();

    // Check for OAuth callback success/error
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar_connected') === 'true') {
      setCalendarConnected(true);
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('calendar_error')) {
      const errorType = params.get('calendar_error');
      setError(`Calendar connection failed: ${errorType}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status');
      if (response.ok) {
        const data = await response.json();
        setCalendarConnected(data.connected);
      }
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const handleConnectCalendar = () => {
    window.location.href = '/api/auth/google/connect';
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      });
      if (response.ok) {
        setCalendarConnected(false);
      }
    } catch (err) {
      console.error('Failed to disconnect calendar:', err);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Load conversation
  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data: Conversation = await response.json();
      setConversation(data);
      setMessages(data.messages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    setConversation(null);
    setMessages([]);
    setError(null);
    setStreamingText('');
  };

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    loadConversation(id);
  };

  // Handle conversation deletion
  const handleDeleteConversation = (id: string) => {
    if (conversation?.id === id) {
      handleNewChat();
    }
  };

  // Send message with streaming
  const handleSendMessage = async (
    message: string,
    images: { data: string; mediaType: string }[]
  ) => {
    if (isStreaming) return;

    try {
      setIsStreaming(true);
      setError(null);
      setStreamingText('');

      // Add user message to UI immediately
      const userMessageId = `temp-${Date.now()}`;
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: [
          { type: 'text', text: message },
          ...images.map((img) => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: img.mediaType as any,
              data: img.data,
            },
          })),
        ],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Send request
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation?.id,
          message,
          images,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content_block_delta' && data.delta?.text) {
              accumulatedText += data.delta.text;
              setStreamingText(accumulatedText);
              setToolInUse(null); // Clear tool indicator when receiving text
            } else if (data.type === 'tool_use') {
              // Tool is being used
              setToolInUse(data.tool_name);
            } else if (data.type === 'message_stop') {
              // Stream complete - add assistant message
              const assistantMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: [{ type: 'text', text: accumulatedText }],
                timestamp: Date.now(),
              };

              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingText('');
              setToolInUse(null);

              // Update conversation ID if this was a new conversation
              if (data.conversationId && !conversation) {
                await loadConversation(data.conversationId);
              }
            } else if (data.type === 'error') {
              throw new Error(data.error || 'Streaming error');
            }
          } catch (parseError) {
            console.error('Error parsing SSE message:', parseError);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      }
      setStreamingText('');
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Cancel streaming
  const handleCancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 flex-col">
      {/* Unified Header */}
      <AppHeader theme="modern" currentPage="chat" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          currentConversationId={conversation?.id}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Conversation Info Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800">
                {conversation?.title || 'New Conversation'}
              </h2>
              {conversation && (
                <p className="text-xs text-gray-500">
                  Model: {conversation.model}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Calendar Connection Button */}
              {calendarConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Calendar Connected
                  </span>
                  <button
                    onClick={handleDisconnectCalendar}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectCalendar}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {messages.length === 0 && !error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Start a conversation
                </h2>
                <p className="text-gray-600 max-w-md">
                  Ask me anything! I can help with questions, analysis, creative
                  writing, and more. You can also upload images for me to analyze.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Streaming Message */}
          {isStreaming && streamingText && (
            <div className="flex gap-4 p-4 bg-gray-50">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br from-purple-500 to-blue-500">
                  AI
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="font-medium text-sm text-gray-700">Claude</div>
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4 p-4 bg-gray-50">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br from-purple-500 to-blue-500">
                  AI
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-700 mb-2">Claude</div>
                {toolInUse ? (
                  <div className="text-sm text-blue-600 flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>
                      {toolInUse === 'get_calendar_events' ? 'Checking your calendar...' : `Using ${toolInUse}...`}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div>
          {isStreaming && (
            <div className="px-6 py-2 bg-yellow-50 border-t border-yellow-200 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-yellow-800">
                  Claude is thinking...
                </span>
                <button
                  onClick={handleCancelStreaming}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            placeholder="Type your message... (Shift+Enter for new line)"
          />
        </div>
      </div>
    </div>
  );
}
