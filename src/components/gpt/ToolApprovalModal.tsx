/**
 * DOS-Themed Tool Approval Modal
 * Shows approval request with countdown timer
 */

import React, { useState, useEffect } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      {/* DOS-themed modal */}
      <div className="dos-approval-modal relative border-4 border-yellow-500 bg-black p-6 font-mono max-w-2xl w-full mx-4">
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(234, 179, 8, 0.1) 2px, rgba(234, 179, 8, 0.1) 4px)',
        }}></div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="border-b-2 border-yellow-500 pb-2 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-yellow-400 text-xl">
                ⚠ APPROVAL REQUIRED ⚠
              </h2>
              <div className="text-red-400 text-sm animate-pulse">
                [{timeLeft}s]
              </div>
            </div>
          </div>

          {/* Tool Info */}
          <div className="mb-6">
            <div className="text-cyan-400 mb-2">
              <span className="text-green-400">TOOL:</span> {toolName}
            </div>

            {/* Arguments */}
            {formatArguments().length > 0 && (
              <div className="border border-green-500 p-3 bg-green-900 bg-opacity-10 mt-3">
                <div className="text-green-400 mb-2 text-sm">PARAMETERS:</div>
                {formatArguments().map(({ key, value }) => (
                  <div key={key} className="text-cyan-300 text-sm mb-1 pl-2">
                    <span className="text-yellow-400">{key}:</span>{' '}
                    <span className="text-white">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className="border-2 border-red-500 p-3 bg-red-900 bg-opacity-20 mb-6">
            <div className="text-red-400 text-sm">
              <div className="mb-1">*** SECURITY WARNING ***</div>
              <div className="text-red-300">
                This action will permanently delete a calendar event.
              </div>
              <div className="text-red-300 mt-1">
                Please review the parameters carefully before approving.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReject}
              className="px-6 py-2 border-2 border-red-500 text-red-400 hover:bg-red-900 hover:bg-opacity-30 transition-colors"
            >
              [REJECT] (Esc)
            </button>
            <button
              onClick={handleApprove}
              className="px-6 py-2 border-2 border-green-500 text-green-400 hover:bg-green-900 hover:bg-opacity-30 transition-colors animate-pulse"
            >
              [APPROVE] (Enter)
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center text-green-400 text-xs">
            Press Enter to approve or Esc to reject
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
