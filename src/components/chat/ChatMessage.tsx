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
      className={`flex gap-4 p-4 ${
        isAssistant ? 'bg-gray-50' : 'bg-white'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isAssistant
              ? 'bg-gradient-to-br from-purple-500 to-blue-500'
              : 'bg-gradient-to-br from-blue-500 to-cyan-500'
          }`}
        >
          {isAssistant ? 'AI' : 'U'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        <div className="font-medium text-sm text-gray-700">
          {isAssistant ? 'Claude' : 'You'}
        </div>

        {message.content.map((block, idx) => {
          if (block.type === 'text') {
            return (
              <div
                key={idx}
                className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap"
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
                  className="rounded-lg border border-gray-200 shadow-sm"
                />
              </div>
            );
          }
          return null;
        })}

        {/* Timestamp */}
        <div className="text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
