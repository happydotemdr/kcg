/**
 * DOS-Themed Loading Indicator
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
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">[AI]</span>
            <span className="text-green-400">PROCESSING</span>
            <span className="animate-blink text-green-400">_</span>
          </div>
        );

      case 'executing_tool':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚙</span>
              <span className="text-yellow-400">{toolStatus.toUpperCase()}:</span>
              <span className="text-cyan-400 font-mono">{toolName || 'unknown'}</span>
            </div>
            <div className="flex items-center gap-1 pl-4">
              <span className="text-green-400">└─</span>
              <span className="text-green-400 text-xs">Please wait</span>
              <span className="animate-blink text-green-400">_</span>
            </div>
          </div>
        );

      case 'streaming':
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-500">►</span>
            <span className="text-green-400">STREAMING</span>
            <span className="animate-pulse text-green-400">...</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dos-loading-indicator p-3 border-2 border-green-500 bg-black bg-opacity-80 font-mono text-sm">
      <div className="relative">
        {/* Scanline effect overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)',
        }}></div>

        {/* Content */}
        <div className="relative z-10">
          {renderContent()}
        </div>
      </div>

      {/* Inline blink animation */}
      <style>{`
        @keyframes blink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }

        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </div>
  );
}
