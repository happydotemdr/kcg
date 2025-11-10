/**
 * What's Next Widget
 * Shows upcoming events for the next 24 hours with quick actions
 */

import React, { useState, useEffect } from 'react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink: string;
  status: string;
}

interface WhatsNextProps {
  onClose: () => void;
}

export default function WhatsNext({ onClose }: WhatsNextProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chatkit/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'whats_next',
          hours: 24,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      setEvents(data.result || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[WhatsNext] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const hasConferenceLink = (event: CalendarEvent) => {
    return event.location && (
      event.location.includes('zoom.us') ||
      event.location.includes('meet.google.com') ||
      event.location.includes('teams.microsoft.com')
    );
  };

  const extractConferenceLink = (event: CalendarEvent): string | null => {
    if (!event.location) return null;

    // Extract URL from location
    const urlMatch = event.location.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  };

  const handleJoin = (event: CalendarEvent) => {
    const link = extractConferenceLink(event);
    if (link) {
      window.open(link, '_blank');
    }
  };

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const eventTime = new Date(dateString);
    const diffMs = eventTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) {
      return 'In progress';
    } else if (diffMins < 60) {
      return `In ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffMins / 60);
      return `In ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="w-full max-w-lg mx-4" style={{
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              🕐 What's Next
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Events in the next 24 hours
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{
              color: 'var(--color-text-secondary)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin mb-2" style={{ fontSize: '2rem' }}>⏳</div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading events...</p>
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-3" style={{
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
            }}>
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>
                No upcoming events
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Enjoy your free time!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4"
                  style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Event Time Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1" style={{
                      background: 'var(--color-primary)',
                      color: 'var(--color-background)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '600',
                    }}>
                      {getTimeUntil(event.start.dateTime || event.start.date || '')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(event.start.dateTime || event.start.date || '')}
                    </span>
                  </div>

                  {/* Event Title */}
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {event.summary}
                  </h3>

                  {/* Event Details */}
                  <div className="flex items-center gap-4 text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>
                      🕐 {formatTime(event.start.dateTime || event.start.date || '')}
                      {event.end.dateTime && ` - ${formatTime(event.end.dateTime)}`}
                    </span>
                    {event.location && !hasConferenceLink(event) && (
                      <span>📍 {event.location}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {hasConferenceLink(event) && (
                      <button
                        onClick={() => handleJoin(event)}
                        className="flex-1 px-3 py-2 text-sm font-medium"
                        style={{
                          background: 'var(--color-success)',
                          color: 'var(--color-background)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          transition: 'all var(--transition-base)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-success-dark)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-success)'}
                      >
                        🎥 Join Meeting
                      </button>
                    )}
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 text-sm font-medium text-center"
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        transition: 'all var(--transition-base)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                    >
                      View Details
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 flex items-center justify-between" style={{
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="text-sm px-3 py-1"
            style={{
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              transition: 'all var(--transition-base)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'var(--color-surface)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'var(--color-background)';
              }
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
