/**
 * Modern Message Component
 * Displays individual messages in clean bubble design
 */

import React from 'react';
import type { Message } from '../../types/chat';

interface MessageProps {
  message: Message;
  index: number;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  // Extract text content
  const textContent = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('\n');

  // Extract image content
  const images = message.content.filter(block => block.type === 'image');

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-lg px-4 py-3 rounded-lg ${
        isUser
          ? 'bg-indigo-100 text-gray-900'
          : 'bg-gray-100 text-gray-900'
      }`}>
        {/* Message Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-gray-600">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div className="mb-3 space-y-2">
            {images.map((img: any, idx: number) => (
              <div key={idx} className="inline-block border border-gray-300 rounded">
                <img
                  src={`data:${img.source.media_type};base64,${img.source.data}`}
                  alt="Uploaded"
                  className="max-w-sm rounded"
                />
                <div className="text-xs text-gray-600 p-2">
                  {img.source.media_type}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text Content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {textContent}
        </div>
      </div>
    </div>
  );
}
