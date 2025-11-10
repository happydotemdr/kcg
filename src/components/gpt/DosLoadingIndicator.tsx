/**
 * Modern Loading Indicator
 * Shows different states: thinking, executing_tool, streaming
 */

import React from 'react';

export type LoadingState = 'thinking' | 'executing_tool' | 'streaming';

interface DosLoadingIndicatorProps {
  state: LoadingState;
  toolName?: string;
  toolStatus?: string;
}

export default function DosLoadingIndicator({
  state,
  toolName,
  toolStatus = 'EXECUTING'
}: DosLoadingIndicatorProps) {

  const renderContent = () => {
    switch (state) {
      case 'thinking':
        return (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <span className="text-gray-700">Thinking</span>
          </div>
        );

      case 'executing_tool':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
              <span className="text-gray-700">
                {toolStatus}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {toolName && `Using: ${toolName}`}
            </div>
          </div>
        );

      case 'streaming':
        return (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <span className="text-gray-700">Streaming response</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-3 text-sm rounded transition-colors bg-gray-50 border border-gray-200">
      {renderContent()}
    </div>
  );
}
