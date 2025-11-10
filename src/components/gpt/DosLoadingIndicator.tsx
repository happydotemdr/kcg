/**
 * DOS-Themed Loading Indicator
 * Shows different states: thinking, executing_tool, streaming
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { resolvedThemeAtom } from '@lib/theme/themeStore';

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
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'dark-pro';

  const renderContent = () => {
    switch (state) {
      case 'thinking':
        return (
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-cyan-400' : 'text-indigo-600'}>[AI]</span>
            <span className={isDark ? 'text-green-400' : 'text-gray-700'}>{isDark ? 'PROCESSING' : 'Processing'}</span>
            <span className={`animate-blink ${isDark ? 'text-green-400' : 'text-gray-700'}`}>_</span>
          </div>
        );

      case 'executing_tool':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={isDark ? 'text-yellow-400' : 'text-amber-600'}>⚙</span>
              <span className={isDark ? 'text-yellow-400' : 'text-amber-600'}>{isDark ? toolStatus.toUpperCase() : toolStatus}:</span>
              <span className={isDark ? 'text-cyan-400 font-mono' : 'text-indigo-600'}>{toolName || 'unknown'}</span>
            </div>
            <div className="flex items-center gap-1 pl-4">
              <span className={isDark ? 'text-green-400' : 'text-gray-600'}>{isDark ? '└─' : '→'}</span>
              <span className={`text-xs ${isDark ? 'text-green-400' : 'text-gray-600'}`}>{isDark ? 'Please wait' : 'Please wait'}</span>
              <span className={`animate-blink ${isDark ? 'text-green-400' : 'text-gray-600'}`}>_</span>
            </div>
          </div>
        );

      case 'streaming':
        return (
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-green-500' : 'text-indigo-600'}>►</span>
            <span className={isDark ? 'text-green-400' : 'text-gray-700'}>{isDark ? 'STREAMING' : 'Streaming'}</span>
            <span className={`animate-pulse ${isDark ? 'text-green-400' : 'text-gray-700'}`}>...</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`dos-loading-indicator p-3 text-sm ${
      isDark
        ? 'border-2 border-green-500 bg-black bg-opacity-80 font-mono'
        : 'border border-gray-300 bg-gray-50 rounded'
    }`}>
      <div className="relative">
        {/* Scanline effect overlay - Dark mode only */}
        {isDark && (
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)',
          }}></div>
        )}

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
