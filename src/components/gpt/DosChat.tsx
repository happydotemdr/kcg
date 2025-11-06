/**
 * DOS-Themed ChatGPT Component
 * Retro command-line interface aesthetic
 */

import React, { useState, useEffect, useRef } from 'react';
import DosMessage from './DosMessage';
import DosInput from './DosInput';
import DosSidebar from './DosSidebar';
import type { Message, Conversation } from '../../types/chat';

export default function DosChat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Load conversation
  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/gpt/conversations/${id}`);
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
      const response = await fetch('/api/gpt/send', {
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="dos-container flex h-screen bg-black relative overflow-hidden">
      {/* CRT Scanlines Effect */}
      <div className="dos-scanlines pointer-events-none"></div>

      {/* Sidebar */}
      <DosSidebar
        currentConversationId={conversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* DOS Header */}
        <div className="dos-header border-b-2 border-green-500 p-2 font-mono">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-green-400">═══════════════════════════════════════════════════</span>
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-green-400">
              ┌─ CHATGPT.EXE v4.0 ─ {conversation?.title || 'NEW SESSION'} ─┐
            </span>
            <span className="text-green-400">[{formatTime(currentTime)}]</span>
          </div>
          <div className="text-green-400">
            └───────────────────────────────────────────────────────────────┘
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto dos-screen p-4 font-mono text-green-400">
          {error && (
            <div className="border border-red-500 p-2 mb-4 bg-red-900 bg-opacity-20">
              <span className="text-red-400">
                *** ERROR: {error} ***
              </span>
            </div>
          )}

          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full">
              <pre className="text-center text-green-400 mb-4">
{`╔═══════════════════════════════════════════════╗
║                                               ║
║     ██████╗██╗  ██╗ █████╗ ████████╗         ║
║    ██╔════╝██║  ██║██╔══██╗╚══██╔══╝         ║
║    ██║     ███████║███████║   ██║            ║
║    ██║     ██╔══██║██╔══██║   ██║            ║
║    ╚██████╗██║  ██║██║  ██║   ██║            ║
║     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝            ║
║                                               ║
║    ██████╗ ██████╗ ████████╗                 ║
║   ██╔════╝ ██╔══██╗╚══██╔══╝                 ║
║   ██║  ███╗██████╔╝   ██║                    ║
║   ██║   ██║██╔═══╝    ██║                    ║
║   ╚██████╔╝██║        ██║                    ║
║    ╚═════╝ ╚═╝        ╚═╝                    ║
║                                               ║
║        ARTIFICIAL INTELLIGENCE SYSTEM         ║
║                                               ║
╚═══════════════════════════════════════════════╝`}
              </pre>
              <div className="text-center space-y-2">
                <p>SYSTEM READY. AWAITING INPUT...</p>
                <p className="text-sm opacity-75">Type your query below</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <DosMessage key={msg.id} message={msg} index={idx} />
          ))}

          {/* Streaming Message */}
          {isStreaming && streamingText && (
            <div className="mb-4">
              <div className="mb-1">
                <span className="text-yellow-400">&gt; CHATGPT:</span>
              </div>
              <div className="ml-4 whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingText && (
            <div className="mb-4">
              <div className="mb-1">
                <span className="text-yellow-400">&gt; CHATGPT:</span>
              </div>
              <div className="ml-4">
                <span>PROCESSING</span>
                <span className="animate-pulse">...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="dos-input-area">
          {isStreaming && (
            <div className="px-4 py-2 border-t-2 border-yellow-500 bg-yellow-900 bg-opacity-20">
              <div className="flex items-center justify-between font-mono text-yellow-400">
                <span className="text-sm">
                  [STATUS: PROCESSING REQUEST...]
                </span>
                <button
                  onClick={handleCancelStreaming}
                  className="text-red-400 hover:text-red-300 font-bold px-2 border border-red-500"
                >
                  [ABORT]
                </button>
              </div>
            </div>
          )}

          <DosInput
            onSend={handleSendMessage}
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
