/**
 * Quick Add Widget
 * Fast event creation form with minimal inputs
 */

import React, { useState } from 'react';

interface QuickAddProps {
  onClose: () => void;
  onSuccess: (eventId: string) => void;
}

export default function QuickAdd({ onClose, onSuccess }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [entityType, setEntityType] = useState<'family' | 'personal' | 'work'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Set default date to tomorrow
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!title.trim()) {
        throw new Error('Event title is required');
      }

      if (!date) {
        throw new Error('Event date is required');
      }

      // Validate time consistency if both are provided
      if (startTime && endTime && startTime >= endTime) {
        throw new Error('End time must be after start time');
      }

      // Parse attendees (comma or space separated emails)
      const attendeeList = attendees
        .split(/[,\s]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of attendeeList) {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid email address: ${email}`);
        }
      }

      // Call actions API
      const response = await fetch('/api/chatkit/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_add',
          title: title.trim(),
          date,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          location: location.trim() || undefined,
          attendees: attendeeList.length > 0 ? attendeeList : undefined,
          entityType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create event');
      }

      // Success!
      setSuccessMessage(`Event "${title}" created successfully!`);

      // Clear form
      setTimeout(() => {
        setTitle('');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setAttendees('');
        setSuccessMessage(null);
        onSuccess(data.result.id);
      }, 2000);

    } catch (err) {
      console.error('[QuickAdd] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            📅 Quick Add Event
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team meeting, Dentist appointment, etc."
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

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
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
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
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

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office, Zoom link, etc."
              className="w-full px-3 py-2"
              style={{
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Attendees
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="w-full px-3 py-2"
              style={{
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Comma or space separated email addresses
            </p>
          </div>

          {/* Calendar Selection */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Calendar
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as any)}
              className="w-full px-3 py-2"
              style={{
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <option value="personal">📱 Personal</option>
              <option value="family">👨‍👩‍👧‍👦 Family</option>
              <option value="work">💼 Work</option>
            </select>
          </div>

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
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
