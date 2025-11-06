/**
 * DOS-Themed Message Component
 * Displays individual messages in retro terminal style
 */

import React from 'react';
import type { Message } from '../../types/chat';

interface DosMessageProps {
  message: Message;
  index: number;
}

export default function DosMessage({ message }: DosMessageProps) {
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
    <div className="mb-4 font-mono">
      {/* Message Header */}
      <div className="mb-1 flex items-center gap-2">
        <span className={isUser ? 'text-cyan-400' : 'text-yellow-400'}>
          {isUser ? '>' : '>'} {isUser ? 'USER' : 'CHATGPT'}:
        </span>
        <span className="text-green-600 text-xs">
          [{formatTimestamp(message.timestamp)}]
        </span>
      </div>

      {/* Message Content */}
      <div className="ml-4">
        {/* Images */}
        {images.length > 0 && (
          <div className="mb-2 space-y-2">
            {images.map((img: any, idx: number) => (
              <div key={idx} className="border-2 border-green-500 p-1 inline-block">
                <img
                  src={`data:${img.source.media_type};base64,${img.source.data}`}
                  alt="Uploaded"
                  className="max-w-md"
                  style={{ filter: 'contrast(1.2) brightness(0.9)' }}
                />
                <div className="text-xs text-green-600 mt-1">
                  [IMAGE ATTACHED: {img.source.media_type}]
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text */}
        <div className={`whitespace-pre-wrap ${isUser ? 'text-cyan-300' : 'text-green-300'}`}>
          {textContent}
        </div>
      </div>

      {/* Separator */}
      <div className="mt-2 text-green-600">
        {'─'.repeat(80)}
      </div>
    </div>
  );
}
