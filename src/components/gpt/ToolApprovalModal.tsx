/**
 * DOS-Themed Tool Approval Modal
 * Shows approval request with countdown timer
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { resolvedThemeAtom } from '@lib/theme/themeStore';

interface ToolApprovalModalProps {
  approvalId: string;
  toolName: string;
  toolArguments: Record<string, any>;
  timeoutMs: number;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export default function ToolApprovalModal({
  approvalId,
  toolName,
  toolArguments,
  timeoutMs,
  onApprove,
  onReject,
}: ToolApprovalModalProps) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(timeoutMs / 1000));
  const resolvedTheme = useStore(resolvedThemeAtom);
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'dark-pro';

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-reject on timeout
          onReject(approvalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [approvalId, onReject]);

  const handleApprove = () => {
    onApprove(approvalId);
  };

  const handleReject = () => {
    onReject(approvalId);
  };

  // Format arguments for display
  const formatArguments = () => {
    return Object.entries(toolArguments).map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'object') {
        displayValue = JSON.stringify(value, null, 2);
      }
      return { key, value: String(displayValue) };
    });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black bg-opacity-90' : 'bg-gray-900 bg-opacity-75'}`}>
      {/* DOS-themed modal */}
      <div className={`dos-approval-modal relative p-6 max-w-2xl w-full mx-4 ${
        isDark
          ? 'border-4 border-yellow-500 bg-black font-mono'
          : 'border-2 border-amber-500 bg-white rounded-lg shadow-xl'
      }`}>
        {/* Scanlines - Dark mode only */}
        {isDark && (
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(234, 179, 8, 0.1) 2px, rgba(234, 179, 8, 0.1) 4px)',
          }}></div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className={`pb-2 mb-4 ${isDark ? 'border-b-2 border-yellow-500' : 'border-b-2 border-amber-500'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-xl ${isDark ? 'text-yellow-400' : 'text-amber-600 font-semibold'}`}>
                {isDark ? '⚠ APPROVAL REQUIRED ⚠' : '⚠ Approval Required'}
              </h2>
              <div className={`text-sm animate-pulse ${isDark ? 'text-red-400' : 'text-red-600 font-semibold'}`}>
                {isDark ? `[${timeLeft}s]` : `${timeLeft}s`}
              </div>
            </div>
          </div>

          {/* Tool Info */}
          <div className="mb-6">
            <div className={`mb-2 ${isDark ? 'text-cyan-400' : 'text-gray-700'}`}>
              <span className={isDark ? 'text-green-400' : 'text-gray-900 font-semibold'}>{isDark ? 'TOOL:' : 'Tool:'}</span> {toolName}
            </div>

            {/* Arguments */}
            {formatArguments().length > 0 && (
              <div className={`p-3 mt-3 ${
                isDark
                  ? 'border border-green-500 bg-green-900 bg-opacity-10'
                  : 'border border-gray-300 bg-gray-50 rounded'
              }`}>
                <div className={`mb-2 text-sm ${isDark ? 'text-green-400' : 'text-gray-700 font-semibold'}`}>
                  {isDark ? 'PARAMETERS:' : 'Parameters:'}
                </div>
                {formatArguments().map(({ key, value }) => (
                  <div key={key} className={`text-sm mb-1 pl-2 ${isDark ? 'text-cyan-300' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-yellow-400' : 'text-gray-900 font-medium'}>{key}:</span>{' '}
                    <span className={isDark ? 'text-white' : 'text-gray-600'}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className={`p-3 mb-6 ${
            isDark
              ? 'border-2 border-red-500 bg-red-900 bg-opacity-20'
              : 'border-2 border-red-400 bg-red-50 rounded'
          }`}>
            <div className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              <div className={`mb-1 ${isDark ? '' : 'font-semibold'}`}>
                {isDark ? '*** SECURITY WARNING ***' : 'Security Warning'}
              </div>
              <div className={isDark ? 'text-red-300' : 'text-red-600'}>
                This action will permanently delete a calendar event.
              </div>
              <div className={`mt-1 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                Please review the parameters carefully before approving.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReject}
              className={`px-6 py-2 transition-colors ${
                isDark
                  ? 'border-2 border-red-500 text-red-400 hover:bg-red-900 hover:bg-opacity-30'
                  : 'border-2 border-red-500 text-red-700 bg-white rounded hover:bg-red-50'
              }`}
            >
              {isDark ? '[REJECT] (Esc)' : 'Reject (Esc)'}
            </button>
            <button
              onClick={handleApprove}
              className={`px-6 py-2 transition-colors animate-pulse ${
                isDark
                  ? 'border-2 border-green-500 text-green-400 hover:bg-green-900 hover:bg-opacity-30'
                  : 'border-2 border-green-600 text-white bg-green-600 rounded hover:bg-green-700'
              }`}
            >
              {isDark ? '[APPROVE] (Enter)' : 'Approve (Enter)'}
            </button>
          </div>

          {/* Instructions */}
          <div className={`mt-4 text-center text-xs ${isDark ? 'text-green-400' : 'text-gray-600'}`}>
            {isDark ? 'Press Enter to approve or Esc to reject' : 'Press Enter to approve or Esc to reject'}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="hidden">
        <input
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleApprove();
            } else if (e.key === 'Escape') {
              handleReject();
            }
          }}
        />
      </div>
    </div>
  );
}
