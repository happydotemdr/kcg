/**
 * ChatMessage Component
 * Displays individual chat messages with support for text and images
 */

import React from 'react';
import type { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className="flex gap-4 p-4"
      style={{
        background: isAssistant ? 'var(--color-surface)' : 'var(--color-background)'
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className="w-8 h-8 flex items-center justify-center text-sm font-medium"
          style={{
            borderRadius: 'var(--radius-full)',
            background: isAssistant
              ? 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))'
              : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            color: 'var(--color-background)'
          }}
        >
          {isAssistant ? 'AI' : 'U'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
          {isAssistant ? 'Claude' : 'You'}
        </div>

        {message.content.map((block, idx) => {
          if (block.type === 'text') {
            return (
              <div
                key={idx}
                className="prose prose-sm max-w-none whitespace-pre-wrap"
                style={{ color: 'var(--color-text)' }}
              >
                {block.text}
              </div>
            );
          } else if (block.type === 'image') {
            return (
              <div key={idx} className="max-w-sm">
                <img
                  src={`data:${block.source.media_type};base64,${block.source.data}`}
                  alt="Uploaded image"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />
              </div>
            );
          }
          return null;
        })}

        {/* Timestamp */}
        <div className="text-xs" style={{ color: 'var(--color-text-light)' }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
