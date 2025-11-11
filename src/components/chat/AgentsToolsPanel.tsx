/**
 * AgentsToolsPanel Component
 * Main container for agent cards and activity summary
 * Replaces DocumentHistory as the right sidebar
 */

import React, { useState, useEffect } from 'react';
import AgentCard from './AgentCard';
import ActivitySummary from './ActivitySummary';
import ToolCategorySection from './ToolCategorySection';
import DocumentHistory from './DocumentHistory';

interface AgentStatus {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'needs-refresh' | 'error' | 'not-configured';
  capabilities: string[];
  description: string;
  uploadAction: {
    label: string;
    prompt: string;
    acceptedTypes: string[];
  } | null;
  settingsUrl: string | null;
  recentActivity: {
    count: number;
    lastAction: string;
    timestamp: string;
  } | null;
}

interface AgentActivity {
  agentId: string;
  agentName: string;
  icon: string;
  action: string;
  timestamp: string;
  details: string;
}

interface ActivitySummaryData {
  totalActions: number;
  byAgent: {
    calendar: number;
    gmail: number;
    todos: number;
  };
}

interface AgentsToolsPanelProps {
  onDocumentUpload: (files: File[], intentType?: 'calendar' | 'gmail' | 'generic') => void;
  documentRefreshTrigger: number;
}

export default function AgentsToolsPanel({
  onDocumentUpload,
  documentRefreshTrigger,
}: AgentsToolsPanelProps) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummaryData>({
    totalActions: 0,
    byAgent: { calendar: 0, gmail: 0, todos: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapse state from localStorage
    const saved = localStorage.getItem('agentsToolsPanel-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch agent status and activity on mount
  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch agent status
      const statusResponse = await fetch('/api/agents/status');
      if (!statusResponse.ok) {
        throw new Error('Failed to fetch agent status');
      }
      const statusData = await statusResponse.json();
      setAgents(statusData.agents || []);

      // Fetch recent activity
      const activityResponse = await fetch('/api/agents/activity/recent');
      if (!activityResponse.ok) {
        throw new Error('Failed to fetch activity');
      }
      const activityData = await activityResponse.json();
      setActivities(activityData.activities || []);
      setActivitySummary(activityData.summary || { totalActions: 0, byAgent: { calendar: 0, gmail: 0, todos: 0 } });

    } catch (err) {
      console.error('Error fetching agent data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent data');
    } finally {
      setIsLoading(false);
    }
  };

  // Save collapse state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('agentsToolsPanel-collapsed', JSON.stringify(newState));
  };

  // Handle agent-specific uploads
  const handleAgentUpload = (agentId: string) => (files: File[]) => {
    const intentType = agentId === 'calendar' ? 'calendar' : agentId === 'gmail' ? 'gmail' : 'generic';
    onDocumentUpload(files, intentType);
  };

  if (isCollapsed) {
    return (
      <div className="p-2 bg-gray-50 border-l border-gray-200">
        <button
          onClick={toggleCollapse}
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
          title="Show agents & tools"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  const connectedAgents = agents.filter((a) => a.status === 'connected' || a.status === 'needs-refresh');
  const availableAgents = agents.filter((a) => a.status === 'not-configured' || a.status === 'error');

  return (
    <div className="w-96 flex flex-col h-full bg-gray-50 border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <span>⚡</span>
          <span>Agents & Tools</span>
        </h3>
        <button
          onClick={toggleCollapse}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm">Loading agents...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4" style={{ color: 'var(--color-error, #ef4444)' }}>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchAgentData}
              className="mt-3 px-3 py-1 text-xs"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Connected Agents */}
            {connectedAgents.length > 0 && (
              <ToolCategorySection title="CONNECTED AGENTS" icon="🤖" defaultCollapsed={false}>
                {connectedAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onUpload={handleAgentUpload(agent.id)}
                  >
                    {/* Nest DocumentHistory inside Calendar Agent */}
                    {agent.id === 'calendar' && (
                      <DocumentHistory
                        onViewDocument={(id) => console.log('View document:', id)}
                        refreshTrigger={documentRefreshTrigger}
                        nested={true}
                      />
                    )}
                  </AgentCard>
                ))}
              </ToolCategorySection>
            )}

            {/* Available Agents */}
            {availableAgents.length > 0 && (
              <ToolCategorySection title="AVAILABLE AGENTS" icon="🔌" defaultCollapsed={true}>
                {availableAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onUpload={handleAgentUpload(agent.id)}
                  />
                ))}
              </ToolCategorySection>
            )}

            {/* Recent Activity */}
            {activitySummary.totalActions > 0 && (
              <ActivitySummary
                activities={activities}
                summary={activitySummary}
              />
            )}
          </>
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
          onClick={fetchAgentData}
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
