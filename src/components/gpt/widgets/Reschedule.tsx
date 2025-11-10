/**
 * Reschedule Widget
 * Quick time adjustments for existing events
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
}

interface RescheduleProps {
  onClose: () => void;
  onSuccess: (eventId: string) => void;
}

export default function Reschedule({ onClose, onSuccess }: RescheduleProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [adjustment, setAdjustment] = useState<string>('custom');
  const [customDate, setCustomDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch upcoming events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoadingEvents(true);
    setError(null);

    try {
      const response = await fetch('/api/chatkit/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_events',
          maxResults: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      setEvents(data.result || []);

      // Select first event by default
      if (data.result && data.result.length > 0) {
        setSelectedEventId(data.result[0].id);
        updateCustomFields(data.result[0]);
      }
    } catch (err) {
      console.error('[Reschedule] Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const updateCustomFields = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const startDate = new Date(event.start.dateTime);
      setCustomDate(startDate.toISOString().split('T')[0]);
      setCustomStartTime(startDate.toTimeString().substring(0, 5));
    }

    if (event.end.dateTime) {
      const endDate = new Date(event.end.dateTime);
      setCustomEndTime(endDate.toTimeString().substring(0, 5));
    }
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    const event = events.find(e => e.id === eventId);
    if (event) {
      updateCustomFields(event);
    }
  };

  const calculateNewTimes = (): { newStart: string; newEnd: string } | null => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (!selectedEvent || !selectedEvent.start.dateTime || !selectedEvent.end.dateTime) {
      return null;
    }

    const originalStart = new Date(selectedEvent.start.dateTime);
    const originalEnd = new Date(selectedEvent.end.dateTime);
    const duration = originalEnd.getTime() - originalStart.getTime();

    let newStart: Date;

    if (adjustment === 'custom') {
      if (!customDate || !customStartTime) return null;
      newStart = new Date(`${customDate}T${customStartTime}:00`);
    } else {
      const [amount, unit] = adjustment.split('_');
      const minutes = parseInt(amount);
      newStart = new Date(originalStart.getTime() + minutes * 60000);
    }

    const newEnd = new Date(newStart.getTime() + duration);

    return {
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (!selectedEventId) {
        throw new Error('Please select an event');
      }

      const newTimes = calculateNewTimes();
      if (!newTimes) {
        throw new Error('Please specify valid start date and time');
      }

      // Validate times
      if (new Date(newTimes.newStart) >= new Date(newTimes.newEnd)) {
        throw new Error('End time must be after start time');
      }

      // Call actions API
      const response = await fetch('/api/chatkit/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          eventId: selectedEventId,
          newStartTime: newTimes.newStart,
          newEndTime: newTimes.newEnd,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reschedule event');
      }

      // Success!
      const event = events.find(e => e.id === selectedEventId);
      setSuccessMessage(`Event "${event?.summary}" rescheduled successfully!`);

      // Refresh events
      setTimeout(() => {
        fetchEvents();
        setSuccessMessage(null);
        onSuccess(selectedEventId);
      }, 2000);

    } catch (err) {
      console.error('[Reschedule] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reschedule event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const newTimes = selectedEvent ? calculateNewTimes() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="w-full max-w-md mx-4" style={{
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{
          borderBottom: '1px solid var(--color-border)',
        }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            🔄 Reschedule Event
          </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {isLoadingEvents ? (
            <div className="text-center py-4">
              <div className="animate-spin mb-2" style={{ fontSize: '1.5rem' }}>⏳</div>
              <p style={{ color: 'var(--color-text-secondary)' }}>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-4">
              <p style={{ color: 'var(--color-text)' }}>No upcoming events to reschedule</p>
            </div>
          ) : (
            <>
              {/* Event Selection */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Select Event *
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => handleEventChange(e.target.value)}
                  required
                  className="w-full px-3 py-2"
                  style={{
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.summary} - {formatDateTime(event.start.dateTime || event.start.date || '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Adjustments */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Adjustment *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustment('30_minutes')}
                    className="px-3 py-2 text-sm"
                    style={{
                      background: adjustment === '30_minutes' ? 'var(--color-primary)' : 'var(--color-background)',
                      color: adjustment === '30_minutes' ? 'var(--color-background)' : 'var(--color-text)',
                      border: `1px solid ${adjustment === '30_minutes' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    +30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustment('60_minutes')}
                    className="px-3 py-2 text-sm"
                    style={{
                      background: adjustment === '60_minutes' ? 'var(--color-primary)' : 'var(--color-background)',
                      color: adjustment === '60_minutes' ? 'var(--color-background)' : 'var(--color-text)',
                      border: `1px solid ${adjustment === '60_minutes' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    +1 hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustment('-30_minutes')}
                    className="px-3 py-2 text-sm"
                    style={{
                      background: adjustment === '-30_minutes' ? 'var(--color-primary)' : 'var(--color-background)',
                      color: adjustment === '-30_minutes' ? 'var(--color-background)' : 'var(--color-text)',
                      border: `1px solid ${adjustment === '-30_minutes' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    -30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustment('custom')}
                    className="px-3 py-2 text-sm"
                    style={{
                      background: adjustment === 'custom' ? 'var(--color-primary)' : 'var(--color-background)',
                      color: adjustment === 'custom' ? 'var(--color-background)' : 'var(--color-text)',
                      border: `1px solid ${adjustment === 'custom' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Custom Time Fields */}
              {adjustment === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      New Date *
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      required
                      className="w-full px-3 py-2"
                      style={{
                        background: 'var(--color-background)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                        New Start Time *
                      </label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        required
                        className="w-full px-3 py-2"
                        style={{
                          background: 'var(--color-background)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                        New End Time
                      </label>
                      <input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        className="w-full px-3 py-2"
                        style={{
                          background: 'var(--color-background)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Preview */}
              {newTimes && (
                <div className="px-4 py-3" style={{
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    Preview:
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong>From:</strong> {formatDateTime(selectedEvent?.start.dateTime || '')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>
                    <strong>To:</strong> {formatDateTime(newTimes.newStart)}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="px-4 py-3" style={{
                  background: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error)',
                  color: 'var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {error}
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="px-4 py-3" style={{
                  background: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success)',
                  color: 'var(--color-success-text)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {successMessage}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 font-medium"
                  style={{
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 font-medium"
                  style={{
                    background: isSubmitting ? 'var(--color-text-light)' : 'var(--color-primary)',
                    color: 'var(--color-background)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = 'var(--color-primary-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = 'var(--color-primary)';
                    }
                  }}
                >
                  {isSubmitting ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
