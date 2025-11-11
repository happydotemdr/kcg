import { useState, useEffect } from 'react';

interface GoogleStatusResponse {
  connected: boolean;
  email: string | null;
  hasCalendar: boolean;
  hasGmail: boolean;
}

interface DisconnectResponse {
  success: boolean;
  message: string;
}

export default function GoogleIntegrationCard() {
  const [status, setStatus] = useState<GoogleStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/google/status');
      if (!response.ok) {
        throw new Error('Failed to fetch Google connection status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google account? This will remove all calendar and email configurations.')) {
      return;
    }

    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/google/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Google account');
      }

      const data: DisconnectResponse = await response.json();

      if (data.success) {
        // Refresh status after successful disconnect
        await fetchStatus();
      } else {
        throw new Error(data.message || 'Disconnect failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="google-actions-container">
        <p className="text-muted">Loading Google connection status...</p>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="google-actions-container">
        <p className="text-muted" style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Not connected - show connect banner
  if (!status.connected) {
    return (
      <div className="google-actions-container">
        <div className="google-status-banner">
          <div className="google-status-content">
            <svg className="google-status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="google-status-text">Google account not connected</span>
          </div>
          <a href="/integrations" className="google-connect-btn">Connect Google</a>
        </div>
      </div>
    );
  }

  // Connected - show config options and disconnect button
  return (
    <div className="google-actions-container">
      {error && (
        <div className="google-error-banner">
          {error}
        </div>
      )}

      {/* Subtle status line */}
      <div className="google-status-line">
        <div className="google-status-indicator">
          <svg className="status-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span className="status-text status-email">Connected as {status.email}</span>
        </div>
        <button onClick={handleDisconnect} disabled={disconnecting} className="disconnect-link">
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>

      {/* Grid of actions */}
      <div className="google-actions-grid">
        <a href="/integrations" className="google-action-item">
          <svg className="action-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <div className="action-item-content">
            <span className="action-item-title">Calendar</span>
            <span className="action-item-status">
              {status.hasCalendar ? ' Active' : ' Not configured'}
            </span>
          </div>
        </a>

        <a href="/integrations" className="google-action-item">
          <svg className="action-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <div className="action-item-content">
            <span className="action-item-title">Email</span>
            <span className="action-item-status">
              {status.hasGmail ? ' Active' : ' Not configured'}
            </span>
          </div>
        </a>
      </div>
    </div>
  );
}
