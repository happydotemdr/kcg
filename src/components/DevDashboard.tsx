/**
 * Developer Dashboard Component
 * Comprehensive system information and troubleshooting tools
 */

import { useEffect, useState } from 'react';

interface SystemStats {
  timestamp: number;
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    uptime: number;
    memory: {
      total: number;
      used: number;
      external: number;
    };
  };
  environment: {
    nodeEnv: string;
    astroEnv: string;
  };
  storage: {
    claude: {
      conversations: number;
      sizeMB: string;
      path: string;
      latestActivity: number | null;
    };
    total: {
      conversations: number;
      sizeMB: string;
    };
  };
  envVars: {
    clerk: Array<{ name: string; set: boolean; value?: string }>;
    ai: Array<{ name: string; set: boolean; value?: string }>;
  };
  endpoints: {
    claude: Array<{ path: string; method: string; description: string }>;
    system: Array<{ path: string; method: string; description: string }>;
  };
  pages: Array<{ path: string; name: string; protected: boolean }>;
}

export default function DevDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/system/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch system stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="dev-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading system stats...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="dev-dashboard">
        <div className="error-container">
          <h2>Error Loading Stats</h2>
          <p>{error || 'Unknown error occurred'}</p>
          <button onClick={fetchStats} className="refresh-btn">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-dashboard">
      {/* Header */}
      <header className="dev-header">
        <div className="header-content">
          <div>
            <h1 className="dev-title">🛠️ Developer Dashboard</h1>
            <p className="dev-subtitle">System Information & Troubleshooting Tools</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="refresh-btn"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Stats'}
          </button>
        </div>
        <div className="last-updated">
          Last updated: {formatTimestamp(stats.timestamp)}
        </div>
      </header>

      {/* Main Content */}
      <main className="dev-content">
        {/* System Information */}
        <section className="dev-section">
          <h2 className="section-title">💻 System Information</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-label">Node Version</div>
              <div className="info-value">{stats.system.nodeVersion}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Platform</div>
              <div className="info-value">{stats.system.platform} ({stats.system.arch})</div>
            </div>
            <div className="info-card">
              <div className="info-label">Environment</div>
              <div className="info-value">
                <span className="env-badge">{stats.environment.nodeEnv}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Process Uptime</div>
              <div className="info-value">{formatUptime(stats.system.uptime)}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Memory Usage</div>
              <div className="info-value">
                {stats.system.memory.used} MB / {stats.system.memory.total} MB
                <div className="memory-bar">
                  <div
                    className="memory-fill"
                    style={{ width: `${(stats.system.memory.used / stats.system.memory.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">External Memory</div>
              <div className="info-value">{stats.system.memory.external} MB</div>
            </div>
          </div>
        </section>

        {/* Storage & Database */}
        <section className="dev-section">
          <h2 className="section-title">💾 Storage & Data</h2>
          <div className="storage-overview">
            <div className="storage-card total">
              <h3>Total Storage</h3>
              <div className="storage-stat">
                <div className="stat-value">{stats.storage.total.conversations}</div>
                <div className="stat-label">Total Conversations</div>
              </div>
              <div className="storage-stat">
                <div className="stat-value">{stats.storage.total.sizeMB} MB</div>
                <div className="stat-label">Total Size</div>
              </div>
            </div>

            <div className="storage-card claude">
              <h3>🤖 Claude Storage</h3>
              <div className="storage-stats">
                <div className="storage-stat">
                  <div className="stat-value">{stats.storage.claude.conversations}</div>
                  <div className="stat-label">Conversations</div>
                </div>
                <div className="storage-stat">
                  <div className="stat-value">{stats.storage.claude.sizeMB} MB</div>
                  <div className="stat-label">Storage Size</div>
                </div>
              </div>
              <div className="storage-path">
                <code>{stats.storage.claude.path}</code>
              </div>
              {stats.storage.claude.latestActivity && (
                <div className="latest-activity">
                  Latest: {getTimeAgo(stats.storage.claude.latestActivity)}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Environment Variables */}
        <section className="dev-section">
          <h2 className="section-title">🔐 Environment Variables</h2>
          <div className="env-groups">
            <div className="env-group">
              <h3>Clerk Authentication</h3>
              <div className="env-list">
                {stats.envVars.clerk.map((envVar) => (
                  <div key={envVar.name} className="env-item">
                    <span className="env-name">{envVar.name}</span>
                    <span className={`env-status ${envVar.set ? 'set' : 'missing'}`}>
                      {envVar.set ? '✓ Set' : '✗ Missing'}
                    </span>
                    {envVar.value && <code className="env-preview">{envVar.value}</code>}
                  </div>
                ))}
              </div>
            </div>

            <div className="env-group">
              <h3>AI API Keys</h3>
              <div className="env-list">
                {stats.envVars.ai.map((envVar) => (
                  <div key={envVar.name} className="env-item">
                    <span className="env-name">{envVar.name}</span>
                    <span className={`env-status ${envVar.set ? 'set' : 'missing'}`}>
                      {envVar.set ? '✓ Set' : '✗ Missing'}
                    </span>
                    {envVar.value && <code className="env-preview">{envVar.value}</code>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="dev-section">
          <h2 className="section-title">🔌 API Endpoints</h2>
          <div className="endpoints-grid">
            <div className="endpoint-group">
              <h3>Claude API</h3>
              <div className="endpoint-list">
                {stats.endpoints.claude.map((endpoint, idx) => (
                  <div key={idx} className="endpoint-item">
                    <div className="endpoint-method">{endpoint.method}</div>
                    <div className="endpoint-details">
                      <code className="endpoint-path">{endpoint.path}</code>
                      <div className="endpoint-desc">{endpoint.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="endpoint-group">
              <h3>System API</h3>
              <div className="endpoint-list">
                {stats.endpoints.system.map((endpoint, idx) => (
                  <div key={idx} className="endpoint-item">
                    <div className="endpoint-method">{endpoint.method}</div>
                    <div className="endpoint-details">
                      <code className="endpoint-path">{endpoint.path}</code>
                      <div className="endpoint-desc">{endpoint.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* App Pages */}
        <section className="dev-section">
          <h2 className="section-title">📄 Application Pages</h2>
          <div className="pages-grid">
            {stats.pages.map((page, idx) => (
              <div key={idx} className="page-item">
                <a href={page.path} className="page-link" target="_blank" rel="noopener noreferrer">
                  <div className="page-name">{page.name}</div>
                  <code className="page-path">{page.path}</code>
                  <span className={`page-badge ${page.protected ? 'protected' : 'public'}`}>
                    {page.protected ? '🔒 Protected' : '🌐 Public'}
                  </span>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* App Structure */}
        <section className="dev-section">
          <h2 className="section-title">📁 Application Structure</h2>
          <div className="structure-content">
            <pre className="structure-tree">{`
src/
├── components/
│   ├── UserMenu.tsx           # Account avatar with login/logout
│   ├── chat/                  # Claude chat components
│   │   ├── Chat.tsx           # Main chat orchestrator
│   │   ├── ChatMessage.tsx    # Message display
│   │   ├── ChatInput.tsx      # Message input with image upload
│   │   └── ChatSidebar.tsx    # Conversation sidebar
│   └── DevDashboard.tsx       # This component!
├── lib/
│   ├── claude.ts              # Claude SDK wrapper
│   └── storage.ts             # Claude conversation storage
├── pages/
│   ├── api/                   # API routes
│   │   ├── chat/*             # Claude endpoints
│   │   └── system/*           # System endpoints
│   ├── dashboard/
│   │   ├── index.astro        # User dashboard
│   │   ├── dev.astro          # Developer dashboard (this page)
│   │   └── profile.astro      # User profile
│   ├── sign-in.astro          # Authentication pages
│   ├── sign-up.astro
│   ├── chat.astro             # Claude chat UI
│   └── index.astro            # Home page
└── types/
    └── chat.ts                # TypeScript definitions

data/
└── conversations/             # Claude conversations (JSON files)
            `}</pre>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dev-section">
          <h2 className="section-title">⚡ Quick Actions</h2>
          <div className="quick-actions">
            <a href="/chat" className="action-btn primary">
              🤖 Open Claude Chat
            </a>
            <a href="/dashboard" className="action-btn tertiary">
              👤 User Dashboard
            </a>
            <button onClick={() => window.location.reload()} className="action-btn refresh">
              🔄 Reload Page
            </button>
          </div>
        </section>

        {/* Troubleshooting Tips */}
        <section className="dev-section">
          <h2 className="section-title">🔧 Troubleshooting Tips</h2>
          <div className="tips-content">
            <div className="tip-card">
              <h4>⚠️ Missing Environment Variables</h4>
              <p>Check your <code>.env</code> file and ensure all required variables are set. See <code>CLAUDE.md</code> for details.</p>
            </div>
            <div className="tip-card">
              <h4>🔒 Authentication Issues</h4>
              <p>Verify Clerk configuration in the dashboard at <a href="https://dashboard.clerk.com" target="_blank">dashboard.clerk.com</a></p>
            </div>
            <div className="tip-card">
              <h4>💾 Storage Issues</h4>
              <p>Check if <code>data/conversations/</code> directory exists and has write permissions.</p>
            </div>
            <div className="tip-card">
              <h4>🐛 API Errors</h4>
              <p>Check browser console for errors. Verify API keys are valid and have sufficient credits/quota.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
