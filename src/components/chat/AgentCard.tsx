/**
 * AgentCard Component
 * Display agent information with status, capabilities, and actions
 */

import React from 'react';
import ContextUploadButton from './ContextUploadButton';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    icon: string;
    status: 'connected' | 'needs-refresh' | 'error' | 'not-configured';
    capabilities: string[];
    description: string;
    uploadAction?: {
      label: string;
      prompt: string;
      acceptedTypes: string[];
    } | null;
    settingsUrl?: string | null;
    recentActivity?: {
      count: number;
      lastAction: string;
      timestamp: string;
    } | null;
  };
  onUpload?: (files: File[]) => void;
  children?: React.ReactNode;
}

export default function AgentCard({ agent, onUpload, children }: AgentCardProps) {
  const getStatusDisplay = () => {
    switch (agent.status) {
      case 'connected':
        return { color: 'bg-green-500', label: 'Connected' };
      case 'needs-refresh':
        return { color: 'bg-yellow-500', label: 'Needs Refresh' };
      case 'error':
        return { color: 'bg-red-500', label: 'Error' };
      case 'not-configured':
        return { color: 'bg-gray-400', label: 'Not Configured' };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleUpload = (files: File[]) => {
    if (onUpload) {
      onUpload(files);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      className="p-3 rounded"
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header: Name + Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.icon}</span>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {agent.name}
          </span>
        </div>
        <div className="flex items-center gap-1" title={statusDisplay.label}>
          <div className={`w-2 h-2 rounded-full ${statusDisplay.color}`}></div>
        </div>
      </div>

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div className="mb-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {agent.capabilities.slice(0, 3).join(' • ')}
          {agent.capabilities.length > 3 && ' ...'}
        </div>
      )}

      {/* Description */}
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {agent.description}
      </p>

      {/* Action Buttons */}
      <div className="space-y-2 mb-3">
        {agent.uploadAction && onUpload && (
          <ContextUploadButton
            label={agent.uploadAction.label}
            icon="📄"
            acceptedTypes={agent.uploadAction.acceptedTypes}
            onUpload={handleUpload}
            disabled={agent.status === 'error'}
          />
        )}

        {agent.settingsUrl && (
          <a
            href={agent.settingsUrl}
            className="w-full px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 block"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              transition: 'all var(--transition-base)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <span>⚙️</span>
            <span>Configure</span>
          </a>
        )}
      </div>

      {/* Nested Children (e.g., DocumentHistory) */}
      {children && (
        <div
          className="mt-3 pt-3"
          style={{
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {children}
        </div>
      )}

      {/* Recent Activity */}
      {agent.recentActivity && agent.recentActivity.count > 0 && (
        <div
          className="mt-3 pt-3 text-xs"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Recent: {agent.recentActivity.lastAction} ({formatRelativeTime(agent.recentActivity.timestamp)})
        </div>
      )}
    </div>
  );
}
