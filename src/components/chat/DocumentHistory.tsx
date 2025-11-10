/**
 * DocumentHistory Component
 * Sidebar showing recent document uploads and their status
 */

import React, { useState, useEffect } from 'react';
import type { ProcessedDocument } from '../../lib/db/repositories/documents';

interface DocumentHistoryProps {
  onViewDocument?: (documentId: string) => void;
  refreshTrigger?: number; // Increment to trigger refresh
}

interface DocumentStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  total_events_added: number;
}

export default function DocumentHistory({ onViewDocument, refreshTrigger = 0 }: DocumentHistoryProps) {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch recent documents (last 7 days)
      const response = await fetch('/api/documents/recent');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: '✅', label: 'Completed', color: 'var(--color-success-text, #10b981)' };
      case 'processing':
        return { icon: '⏳', label: 'Processing', color: 'var(--color-warning, #f59e0b)' };
      case 'failed':
        return { icon: '❌', label: 'Failed', color: 'var(--color-error, #ef4444)' };
      default:
        return { icon: '📄', label: 'Uploaded', color: 'var(--color-text-secondary)' };
    }
  };

  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return then.toLocaleDateString();
  };

  if (isCollapsed) {
    return (
      <div
        className="p-2"
        style={{
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full p-2 rounded flex items-center justify-center"
          style={{
            color: 'var(--color-text-secondary)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background)';
            e.currentTarget.style.color = 'var(--color-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          title="Show document history"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-80 flex flex-col"
      style={{
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        maxHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
          Recent Uploads
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded"
          style={{
            color: 'var(--color-text-secondary)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background)';
            e.currentTarget.style.color = 'var(--color-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          title="Hide sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div
          className="p-4"
          style={{
            background: 'var(--color-background)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded" style={{ background: 'var(--color-surface)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {stats.total}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Total
              </div>
            </div>
            <div className="p-2 rounded" style={{ background: 'var(--color-surface)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-success-text, #10b981)' }}>
                {stats.total_events_added}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Events Added
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8" style={{ color: 'var(--color-error, #ef4444)' }}>
            <p className="text-sm">{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">No recent uploads</p>
          </div>
        ) : (
          documents.map((doc) => {
            const statusDisplay = getStatusDisplay(doc.status);

            return (
              <div
                key={doc.id}
                className="p-3 rounded cursor-pointer"
                style={{
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  transition: 'all var(--transition-base)',
                }}
                onClick={() => onViewDocument?.(doc.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* File icon and name */}
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg flex-shrink-0">📄</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text)' }}
                      title={doc.file_name}
                    >
                      {doc.file_name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatRelativeTime(doc.uploaded_at)}
                    </p>
                  </div>
                </div>

                {/* Status and event count */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1" style={{ color: statusDisplay.color }}>
                    {statusDisplay.icon} {statusDisplay.label}
                  </span>
                  {doc.events_added > 0 && (
                    <span style={{ color: 'var(--color-success-text, #10b981)' }}>
                      +{doc.events_added} events
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Refresh Button */}
      <div
        className="p-3"
        style={{
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={fetchDocuments}
          disabled={isLoading}
          className="w-full py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-background)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--color-text)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>↻ Refresh</>
          )}
        </button>
      </div>
    </div>
  );
}
