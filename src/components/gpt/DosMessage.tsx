/**
 * DOS-Themed Message Component
 * Displays individual messages in retro terminal style
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { resolvedThemeAtom } from '@lib/theme/themeStore';
import type { Message } from '../../types/chat';

interface DosMessageProps {
  message: Message;
  index: number;
}

export default function DosMessage({ message }: DosMessageProps) {
  const isUser = message.role === 'user';
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'dark-pro';

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
    <div className={`mb-4 ${isDark ? 'font-mono' : ''}`}>
      {/* Message Header */}
      <div className="mb-1 flex items-center gap-2">
        <span className={
          isDark
            ? (isUser ? 'text-cyan-400' : 'text-yellow-400')
            : (isUser ? 'text-indigo-600 font-semibold' : 'text-gray-900 font-semibold')
        }>
          {isDark ? '>' : ''} {isUser ? (isDark ? 'USER' : 'You') : (isDark ? 'CHATGPT' : 'Assistant')}:
        </span>
        <span className={`text-xs ${isDark ? 'text-green-600' : 'text-gray-500'}`}>
          {isDark ? `[${formatTimestamp(message.timestamp)}]` : formatTimestamp(message.timestamp)}
        </span>
      </div>

      {/* Message Content */}
      <div className="ml-4">
        {/* Images */}
        {images.length > 0 && (
          <div className="mb-2 space-y-2">
            {images.map((img: any, idx: number) => (
              <div key={idx} className={`p-1 inline-block ${isDark ? 'border-2 border-green-500' : 'border border-gray-300 rounded'}`}>
                <img
                  src={`data:${img.source.media_type};base64,${img.source.data}`}
                  alt="Uploaded"
                  className="max-w-md"
                  style={isDark ? { filter: 'contrast(1.2) brightness(0.9)' } : {}}
                />
                <div className={`text-xs mt-1 ${isDark ? 'text-green-600' : 'text-gray-600'}`}>
                  {isDark ? `[IMAGE ATTACHED: ${img.source.media_type}]` : `Attached: ${img.source.media_type}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text */}
        <div className={`whitespace-pre-wrap ${
          isDark
            ? (isUser ? 'text-cyan-300' : 'text-green-300')
            : (isUser ? 'text-gray-800' : 'text-gray-700')
        }`}>
          {textContent}
        </div>
      </div>

      {/* Separator */}
      <div className={`mt-2 ${isDark ? 'text-green-600' : 'text-gray-300'}`}>
        {isDark ? '─'.repeat(80) : '─'.repeat(80)}
      </div>
    </div>
  );
}
