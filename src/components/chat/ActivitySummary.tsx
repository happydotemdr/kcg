/**
 * ActivitySummary Component
 * Display recent agent activity in a collapsible section
 */

import React, { useState } from 'react';

interface ActivitySummaryProps {
  activities: Array<{
    agentId: string;
    agentName: string;
    icon: string;
    action: string;
    timestamp: string;
    details?: string;
  }>;
  summary: {
    totalActions: number;
    byAgent: Record<string, number>;
  };
}

export default function ActivitySummary({ activities, summary }: ActivitySummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (isCollapsed) {
    return (
      <div
        className="px-4 py-3"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between"
          style={{
            color: 'var(--color-text)',
            transition: 'color var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text)';
          }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>📊</span>
            <span>RECENT ACTIVITY ({summary.totalActions})</span>
          </div>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={{
          color: 'var(--color-text)',
          transition: 'all var(--transition-base)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-background)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>📊</span>
          <span>RECENT ACTIVITY ({summary.totalActions})</span>
        </div>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Activity List */}
      <div className="px-4 pb-3 space-y-2">
        {activities.length === 0 ? (
          <div className="text-center py-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            No recent activity
          </div>
        ) : (
          activities.map((activity, idx) => (
            <div
              key={idx}
              className="p-2 rounded text-xs"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-start gap-2">
                <span>{activity.icon}</span>
                <div className="flex-1">
                  <div style={{ color: 'var(--color-text)' }}>
                    {activity.action}
                  </div>
                  <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatRelativeTime(activity.timestamp)}
                  </div>
                  {activity.details && (
                    <div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {activity.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
