/**
 * Main Chat Component
 * Integrates all chat functionality with streaming support
 * Following Anthropic's best practices for real-time chat
 */

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import type { Message, Conversation } from '../../types/chat';

export default function Chat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <ChatSidebar
        currentConversationId={conversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">
            {conversation?.title || 'New Conversation'}
          </h1>
          {conversation && (
            <p className="text-sm text-gray-500 mt-1">
              Model: {conversation.model}
            </p>
          )}
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
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
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
