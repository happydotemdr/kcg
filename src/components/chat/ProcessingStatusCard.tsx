/**
 * ProcessingStatusCard Component
 * Real-time status display for document processing
 */

import React from 'react';

export type ProcessingStage =
  | 'uploading'
  | 'uploaded'
  | 'extracting'
  | 'checking'
  | 'complete'
  | 'error';

interface ProcessingStatusCardProps {
  fileName: string;
  stage: ProcessingStage;
  progress?: number; // 0-100
  eventsFound?: number;
  error?: string;
}

interface StageConfig {
  label: string;
  icon: string;
  complete: boolean;
}

export default function ProcessingStatusCard({
  fileName,
  stage,
  progress = 0,
  eventsFound = 0,
  error,
}: ProcessingStatusCardProps) {
  // Stage configurations
  const stages: Record<ProcessingStage, StageConfig> = {
    uploading: { label: 'Uploading...', icon: '⏳', complete: false },
    uploaded: { label: 'Document uploaded', icon: '✓', complete: true },
    extracting: { label: 'Finding dates & events...', icon: '⏳', complete: false },
    checking: { label: 'Checking existing calendar', icon: '⏳', complete: false },
    complete: { label: 'Ready to update calendar', icon: '✅', complete: true },
    error: { label: 'Error processing document', icon: '❌', complete: false },
  };

  const getStageStatus = (stageName: ProcessingStage): 'complete' | 'active' | 'pending' => {
    const stageOrder: ProcessingStage[] = ['uploading', 'uploaded', 'extracting', 'checking', 'complete'];
    const currentIndex = stageOrder.indexOf(stage);
    const stageIndex = stageOrder.indexOf(stageName);

    if (stage === 'error') return stageName === 'error' ? 'active' : 'pending';
    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">📄</span>
        <div className="flex-1 min-w-0">
          <h3
            className="font-medium truncate"
            style={{ color: 'var(--color-text)' }}
          >
            {fileName}
          </h3>
        </div>
      </div>

      {/* Progress bar */}
      {stage !== 'complete' && stage !== 'error' && (
        <div className="mb-4">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-background)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
              }}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-secondary)' }}>
            {progress}% Processing
          </p>
        </div>
      )}

      {/* Status steps */}
      <div className="space-y-2">
        {(['uploading', 'uploaded', 'extracting', 'checking'] as ProcessingStage[]).map((stageName) => {
          const status = getStageStatus(stageName);
          const config = stages[stageName];

          return (
            <div key={stageName} className="flex items-center gap-2">
              <span
                className="text-sm flex-shrink-0"
                style={{
                  color:
                    status === 'complete'
                      ? 'var(--color-success-text, #10b981)'
                      : status === 'active'
                      ? 'var(--color-primary)'
                      : 'var(--color-text-light)',
                }}
              >
                {status === 'complete' ? '✓' : status === 'active' ? config.icon : '○'}
              </span>
              <span
                className="text-sm"
                style={{
                  color:
                    status === 'complete' || status === 'active'
                      ? 'var(--color-text)'
                      : 'var(--color-text-secondary)',
                  fontWeight: status === 'active' ? 500 : 400,
                }}
              >
                {config.label}
              </span>
              {status === 'active' && (
                <span
                  className="ml-auto text-sm animate-pulse"
                  style={{ color: 'var(--color-primary)' }}
                >
                  •••
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && stage === 'error' && (
        <div
          className="mt-4 p-3 rounded text-sm"
          style={{
            background: 'var(--color-error-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--color-error, #ef4444)',
            color: 'var(--color-error, #ef4444)',
          }}
        >
          {error}
        </div>
      )}

      {/* Events found counter */}
      {eventsFound > 0 && stage !== 'error' && (
        <div
          className="mt-4 p-3 rounded text-sm"
          style={{
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>Found so far: </span>
          <span
            className="font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            {eventsFound} event{eventsFound !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
