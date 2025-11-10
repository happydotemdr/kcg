/**
 * ExtractionPreviewCard Component
 * Smart summary of extracted calendar events
 */

import React from 'react';

export interface ExtractedEvent {
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  location?: string;
  description?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  isDuplicate?: boolean;
  existingEventId?: string;
}

export interface ExtractionSummary {
  documentName: string;
  totalEvents: number;
  eventsByType: {
    games?: number;
    practices?: number;
    meetings?: number;
    other?: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  conflicts?: number;
  duplicates?: number;
  events: ExtractedEvent[];
}

interface ExtractionPreviewCardProps {
  summary: ExtractionSummary;
  onAddAll: () => void;
  onReview: () => void;
  onModify: () => void;
  isProcessing?: boolean;
}

export default function ExtractionPreviewCard({
  summary,
  onAddAll,
  onReview,
  onModify,
  isProcessing = false,
}: ExtractionPreviewCardProps) {
  const hasConflicts = (summary.conflicts || 0) > 0;
  const hasDuplicates = (summary.duplicates || 0) > 0;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
              {summary.documentName}
            </h3>
            {summary.dateRange && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {summary.dateRange.start} - {summary.dateRange.end}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Content */}
      <div className="p-4 space-y-4">
        {/* Event breakdown by type */}
        {Object.keys(summary.eventsByType).length > 0 && (
          <div className="space-y-2">
            {summary.eventsByType.games !== undefined && summary.eventsByType.games > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span style={{ color: 'var(--color-text)' }}>
                  <strong>{summary.eventsByType.games}</strong> Game
                  {summary.eventsByType.games !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {summary.eventsByType.practices !== undefined && summary.eventsByType.practices > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🏃</span>
                <span style={{ color: 'var(--color-text)' }}>
                  <strong>{summary.eventsByType.practices}</strong> Practice
                  {summary.eventsByType.practices !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {summary.eventsByType.meetings !== undefined && summary.eventsByType.meetings > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <span style={{ color: 'var(--color-text)' }}>
                  <strong>{summary.eventsByType.meetings}</strong> Meeting
                  {summary.eventsByType.meetings !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {summary.eventsByType.other !== undefined && summary.eventsByType.other > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl">📸</span>
                <span style={{ color: 'var(--color-text)' }}>
                  <strong>{summary.eventsByType.other}</strong> Special Event
                  {summary.eventsByType.other !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {(hasConflicts || hasDuplicates) && (
          <div
            className="p-3 rounded"
            style={{
              background: 'var(--color-warning-bg, rgba(245, 158, 11, 0.1))',
              border: '1px solid var(--color-warning, #f59e0b)',
            }}
          >
            {hasDuplicates && (
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--color-warning, #f59e0b)' }}>⚠️</span>
                <span style={{ color: 'var(--color-text)' }}>
                  {summary.duplicates} potential duplicate{summary.duplicates !== 1 ? 's' : ''}{' '}
                  detected
                </span>
              </div>
            )}
            {hasConflicts && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <span style={{ color: 'var(--color-warning, #f59e0b)' }}>⚠️</span>
                <span style={{ color: 'var(--color-text)' }}>
                  {summary.conflicts} conflict{summary.conflicts !== 1 ? 's' : ''} detected
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total events summary */}
        <div
          className="p-3 rounded text-center"
          style={{
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Total Events
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
            {summary.totalEvents}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="p-4 flex gap-2"
        style={{
          background: 'var(--color-background)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={onAddAll}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-background)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'var(--color-primary-dark)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)';
          }}
        >
          Add All
        </button>
        <button
          onClick={onReview}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'var(--color-background)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-surface)';
          }}
        >
          Review
        </button>
        <button
          onClick={onModify}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.background = 'var(--color-background)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-surface)';
          }}
        >
          Modify
        </button>
      </div>
    </div>
  );
}
