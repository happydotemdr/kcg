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
import DocumentUploadZone from './DocumentUploadZone';
import DocumentHistory from './DocumentHistory';
import ProcessingStatusCard, { type ProcessingStage } from './ProcessingStatusCard';
import type { Message, Conversation } from '../../types/chat';
import {
  SUPPORTED_IMAGE_TYPES,
  ERROR_DISPLAY_DURATION_MS,
  MAX_FILES_PER_UPLOAD,
} from '../../lib/constants/documents';
import { compressImage } from '../../utils/imageCompression';
import { validateFileSize, isImageFile } from '../../utils/fileValidation';
import { getFileSizeErrorMessage, getCompressionErrorMessage, getUnsupportedTypeErrorMessage, formatFileSize } from '../../utils/errorMessages';

export default function Chat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [toolInUse, setToolInUse] = useState<string | null>(null);

  // Document upload state
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState<Map<string, ProcessingStage>>(new Map());
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);

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

  // Handle document upload
  // NOTE: This is a synchronous flow - files are sent directly to Claude for analysis
  // The "uploading" status is just UI feedback during the operation
  // No background processing or status polling is needed
  const handleDocumentUpload = async (files: File[]) => {
    // Track batch processing results
    const results = {
      succeeded: [] as string[],
      failed: [] as Array<{ fileName: string; reason: string }>,
    };

    try {
      setShowUploadZone(false);

      for (const file of files) {
        // Show brief "processing" indicator
        const tempId = `${file.name}-${Date.now()}`;
        setUploadingDocuments((prev) => new Map(prev).set(tempId, 'uploading'));

        // Validate file type first (Claude Vision API only supports images)
        const isImage = file.type.startsWith('image/');

        if (!isImage) {
          setUploadingDocuments((prev) => {
            const newMap = new Map(prev);
            newMap.set(tempId, 'error');
            return newMap;
          });

          // Log technical details for debugging
          console.error('[DocumentUpload] Non-image file type:', { name: file.name, type: file.type, size: file.size });

          const errorMessage = `"${file.name}" is not an image file. Currently, only images are supported for document extraction. Support for PDF and DOCX files is coming soon. Please upload an image file (JPEG, PNG, GIF, or WebP).`;

          // Track failure
          results.failed.push({
            fileName: file.name,
            reason: 'Not an image file',
          });

          setError(errorMessage);

          // Auto-clear error after duration (unless critical)
          const isCriticalError = errorMessage.includes('authentication') ||
                                 errorMessage.includes('Session expired') ||
                                 errorMessage.includes('quota');

          if (!isCriticalError) {
            setTimeout(() => {
              setError(null);
            }, ERROR_DISPLAY_DURATION_MS * 2);
          }

          // Remove error indicator after configured duration
          setTimeout(() => {
            setUploadingDocuments((prev) => {
              const newMap = new Map(prev);
              newMap.delete(tempId);
              return newMap;
            });
          }, ERROR_DISPLAY_DURATION_MS);
          continue;
        }

        if (!isImageFile(file)) {
          setUploadingDocuments((prev) => {
            const newMap = new Map(prev);
            newMap.set(tempId, 'error');
            return newMap;
          });

          // Use error utility for consistent messaging
          const errorMessage = getUnsupportedTypeErrorMessage(file.name, file.type);

          // Track failure
          results.failed.push({
            fileName: file.name,
            reason: 'Unsupported image type',
          });

          // Log technical details for debugging
          console.error('[DocumentUpload] Unsupported image type:', { name: file.name, type: file.type, size: file.size, supportedTypes: SUPPORTED_IMAGE_TYPES });

          setError(errorMessage);

          // Auto-clear error after duration (unless critical)
          const isCriticalError = errorMessage.includes('authentication') ||
                                 errorMessage.includes('Session expired') ||
                                 errorMessage.includes('quota');

          if (!isCriticalError) {
            setTimeout(() => {
              setError(null);
            }, ERROR_DISPLAY_DURATION_MS * 2);
          }

          // Remove error indicator after configured duration
          setTimeout(() => {
            setUploadingDocuments((prev) => {
              const newMap = new Map(prev);
              newMap.delete(tempId);
              return newMap;
            });
          }, ERROR_DISPLAY_DURATION_MS);
          continue;
        }

        // Validate file size
        const sizeValidation = validateFileSize(file);
        if (!sizeValidation.valid) {
          setUploadingDocuments((prev) => {
            const newMap = new Map(prev);
            newMap.set(tempId, 'error');
            return newMap;
          });

          const errorMessage = getFileSizeErrorMessage(file.name, file.size);

          // Track failure
          results.failed.push({
            fileName: file.name,
            reason: 'File too large',
          });

          // Log technical details for debugging
          console.error('[DocumentUpload] File size validation failed:', {
            name: file.name,
            size: file.size,
            sizeMB: (file.size / (1024 * 1024)).toFixed(2),
            validation: sizeValidation,
          });

          setError(errorMessage);

          // Auto-clear error after duration (unless critical)
          const isCriticalError = errorMessage.includes('authentication') ||
                                 errorMessage.includes('Session expired') ||
                                 errorMessage.includes('quota');

          if (!isCriticalError) {
            setTimeout(() => {
              setError(null);
            }, ERROR_DISPLAY_DURATION_MS * 2);
          }

          // Remove error indicator after configured duration
          setTimeout(() => {
            setUploadingDocuments((prev) => {
              const newMap = new Map(prev);
              newMap.delete(tempId);
              return newMap;
            });
          }, ERROR_DISPLAY_DURATION_MS);
          continue;
        }

        try {
          // Update status to show compression is happening
          setUploadingDocuments((prev) => new Map(prev).set(tempId, 'compressing'));

          // Compress image and get metadata
          const { blob, metadata } = await compressImage(file);

          // Display compression statistics
          const originalFormatted = formatFileSize(metadata.originalSize);
          const compressedFormatted = formatFileSize(metadata.compressedSize);
          const savingsPercent = ((1 - metadata.compressionRatio) * 100).toFixed(0);
          console.log(`Compressed ${file.name}: ${originalFormatted} → ${compressedFormatted} (${savingsPercent}% reduction)`);

          // Convert compressed blob to base64 for Claude Vision API
          const arrayBuffer = await blob.arrayBuffer();
          const base64Data = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          // Save to database for history (non-blocking, fire-and-forget)
          const formData = new FormData();
          formData.append('file', file);
          fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          }).then(() => {
            setDocumentRefreshTrigger((prev) => prev + 1);
          }).catch((err) => {
            console.error('Failed to save document to database:', err);
          });

          // Clear processing indicator - Claude's streaming response is now the progress indicator
          setUploadingDocuments((prev) => {
            const newMap = new Map(prev);
            newMap.delete(tempId);
            return newMap;
          });

          // Send document directly to Claude for synchronous processing
          const message = `I've uploaded "${file.name}". Please analyze this document and extract any calendar events you find. Look for dates, times, event names, locations, and recurring patterns. Present the events in a clear format and ask if I'd like to add them to my calendar.`;

          await handleSendMessage(message, [{
            data: base64Data,
            mediaType: 'image/jpeg', // Always JPEG after compression
          }]);

          // Track success
          results.succeeded.push(file.name);

        } catch (fileErr) {
          // Show error for this specific file
          setUploadingDocuments((prev) => {
            const newMap = new Map(prev);
            newMap.set(tempId, 'error');
            return newMap;
          });

          // Use specialized error message for compression failures
          const errorMessage = fileErr instanceof Error
            ? getCompressionErrorMessage(file.name, fileErr)
            : `Failed to process "${file.name}". Please try a different image or compress it manually before uploading.`;

          // Track failure
          results.failed.push({
            fileName: file.name,
            reason: fileErr instanceof Error ? fileErr.message : 'Processing failed',
          });

          // Log technical details for debugging
          console.error('[DocumentUpload] Compression or processing failed:', {
            name: file.name,
            size: file.size,
            type: file.type,
            error: fileErr instanceof Error ? fileErr.message : 'Unknown error',
            stack: fileErr instanceof Error ? fileErr.stack : undefined,
          });

          setError(errorMessage);

          // Auto-clear error after duration (unless critical)
          const isCriticalError = errorMessage.includes('authentication') ||
                                 errorMessage.includes('Session expired') ||
                                 errorMessage.includes('quota');

          if (!isCriticalError) {
            setTimeout(() => {
              setError(null);
            }, ERROR_DISPLAY_DURATION_MS * 2);
          }

          // Remove error indicator after configured duration
          setTimeout(() => {
            setUploadingDocuments((prev) => {
              const newMap = new Map(prev);
              newMap.delete(tempId);
              return newMap;
            });
          }, ERROR_DISPLAY_DURATION_MS);
        }
      }

      // Show aggregate summary after all files processed
      if (results.failed.length > 0) {
        const summary = `Processed ${files.length} files: ${results.succeeded.length} succeeded, ${results.failed.length} failed.\n\nFailed files:\n${results.failed.map(f => `• ${f.fileName}`).join('\n')}`;

        console.error('[DocumentUpload] Batch processing summary:', results);

        setError(summary);

        // Auto-clear error after longer duration for batch results
        setTimeout(() => setError(null), ERROR_DISPLAY_DURATION_MS * 2);
      } else if (results.succeeded.length > 0) {
        console.log('[DocumentUpload] All files processed successfully:', results.succeeded);
      }
    } catch (err) {
      // Log technical details for debugging
      console.error('[DocumentUpload] Unexpected error during upload process:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        filesAttempted: files.length,
      });

      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during document upload. Please try again or contact support if the issue persists.'
      );
    }
  };

  return (
    <div className="h-full w-full grid bg-gray-50" style={{ gridTemplateRows: 'auto 1fr' }}>
      {/* Header */}
      <AppHeader currentPage="chat" />

      {/* Main Content Area */}
      <div className="grid overflow-hidden" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
        {/* Sidebar */}
        <ChatSidebar
          currentConversationId={conversation?.id}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main Chat Area */}
        <div className="grid overflow-hidden" style={{ gridTemplateRows: 'auto 1fr auto' }}>
          {/* Conversation Info Bar */}
          <div className="px-6 py-3 flex items-center justify-between bg-white border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {conversation?.title || 'New Conversation'}
              </h2>
              {conversation && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Model: {conversation.model}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Document Upload Button */}
              <button
                onClick={() => setShowUploadZone(!showUploadZone)}
                className="px-4 py-2 text-sm font-medium flex items-center gap-2 relative"
                style={{
                  background: showUploadZone ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: showUploadZone ? 'var(--color-background)' : 'var(--color-text)',
                  border: `1px solid ${showUploadZone ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all var(--transition-base)'
                }}
                onMouseEnter={(e) => {
                  if (!showUploadZone) {
                    e.currentTarget.style.background = 'var(--color-background)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showUploadZone) {
                    e.currentTarget.style.background = 'var(--color-surface)';
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Document
                {/* Upload count badge */}
                {uploadingDocuments.size > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold"
                    style={{
                      background: 'var(--color-warning, #f59e0b)',
                      color: 'var(--color-background)',
                      borderRadius: 'var(--radius-full)',
                      border: '2px solid var(--color-background)',
                    }}
                  >
                    {uploadingDocuments.size}
                  </span>
                )}
              </button>

              {/* Calendar Connection Button */}
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
        <div className="overflow-y-auto">
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

          {/* Document Upload Zone */}
          {showUploadZone && (
            <div className="mx-6 mt-4">
              <DocumentUploadZone
                onUpload={handleDocumentUpload}
                disabled={isStreaming}
                maxFiles={MAX_FILES_PER_UPLOAD}
              />
            </div>
          )}

          {/* Processing Status Cards */}
          {/* Note: Only shows brief "uploading" indicator - real processing happens via Claude's streaming response */}
          {Array.from(uploadingDocuments.entries()).map(([id, stage]) => {
            const fileName = id.split('-').slice(0, -1).join('-');
            return (
              <div key={id} className="mx-6 mt-4">
                <ProcessingStatusCard
                  fileName={fileName}
                  stage={stage}
                  progress={stage === 'uploading' ? 50 : 0}
                  eventsFound={0}
                />
              </div>
            );
          })}

          {messages.length === 0 && !error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Start a conversation
                </h2>
                <p className="max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
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
            <div className="flex gap-4 p-4" style={{ background: 'var(--color-surface)' }}>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 flex items-center justify-center text-sm font-medium" style={{
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))',
                  color: 'var(--color-background)'
                }}>
                  AI
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>Claude</div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                  {streamingText}
                  <span className="inline-block w-2 h-4 ml-1 animate-pulse" style={{ background: 'var(--color-primary)' }}></span>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingText && (
            <div className="flex gap-4 p-4" style={{ background: 'var(--color-surface)' }}>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 flex items-center justify-center text-sm font-medium" style={{
                  borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))',
                  color: 'var(--color-background)'
                }}>
                  AI
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm mb-2" style={{ color: 'var(--color-text)' }}>Claude</div>
                {toolInUse ? (
                  <div className="text-sm flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
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
                    <div className="w-2 h-2 animate-bounce" style={{ background: 'var(--color-text-light)', borderRadius: 'var(--radius-full)' }}></div>
                    <div className="w-2 h-2 animate-bounce" style={{ background: 'var(--color-text-light)', borderRadius: 'var(--radius-full)', animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 animate-bounce" style={{ background: 'var(--color-text-light)', borderRadius: 'var(--radius-full)', animationDelay: '0.2s' }}></div>
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
              <div className="px-6 py-2 text-sm" style={{
                background: 'var(--color-warning-bg)',
                borderTop: '1px solid var(--color-warning)'
              }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-warning)' }}>
                    Claude is thinking...
                  </span>
                  <button
                    onClick={handleCancelStreaming}
                    className="font-medium"
                    style={{
                      color: 'var(--color-error)',
                      transition: 'opacity var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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

        {/* Document History Sidebar */}
        <DocumentHistory
          onViewDocument={(id) => console.log('View document:', id)}
          refreshTrigger={documentRefreshTrigger}
        />
      </div>
    </div>
  );
}
