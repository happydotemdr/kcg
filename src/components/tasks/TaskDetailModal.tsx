/**
 * TaskDetailModal Component
 * Modal for viewing and editing task details
 */

import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  calendar_event_id?: string;
  updated?: string;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onTaskUpdated?: () => void;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'needsAction' | 'completed'>('needsAction');
  const [editDue, setEditDue] = useState('');
  const [editCalendarEventId, setEditCalendarEventId] = useState('');

  const fetchTask = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch task');
      }

      const data = await response.json();
      setTask(data);

      // Initialize edit form
      setEditTitle(data.title || '');
      setEditNotes(data.notes || '');
      setEditStatus(data.status || 'needsAction');
      setEditDue(data.due || '');
      setEditCalendarEventId(data.calendar_event_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
    }
  }, [isOpen, taskId]);

  const handleSave = async () => {
    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          notes: editNotes.trim() || undefined,
          status: editStatus,
          due: editDue || undefined,
          calendar_event_id: editCalendarEventId.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }

      const updated = await response.json();
      setTask(updated);
      setIsEditMode(false);
      onTaskUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }

      onTaskUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              disabled={loading}
              className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
            >
              {isEditMode ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading task...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          ) : task ? (
            <div className="space-y-4">
              {isEditMode ? (
                // Edit Mode
                <>
                  {/* Title */}
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Status and Due Date (two columns) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="edit-status"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'needsAction' | 'completed')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="needsAction">Needs Action</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="edit-due" className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="edit-due"
                        value={editDue}
                        onChange={(e) => setEditDue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="edit-notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add notes or details"
                    />
                  </div>

                  {/* Calendar Event ID */}
                  <div>
                    <label htmlFor="edit-calendar-event" className="block text-sm font-medium text-gray-700 mb-1">
                      Calendar Event ID
                    </label>
                    <input
                      type="text"
                      id="edit-calendar-event"
                      value={editCalendarEventId}
                      onChange={(e) => setEditCalendarEventId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional calendar event ID"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editTitle.trim()}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  {/* Title */}
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">{task.title}</h3>
                  </div>

                  {/* Metadata (two columns) */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">Status</div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status === 'completed' ? 'Completed' : 'Needs Action'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">Due Date</div>
                      <div className="text-sm text-gray-900">{formatDate(task.due)}</div>
                    </div>
                  </div>

                  {/* Notes */}
                  {task.notes && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-2">Notes</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                        {task.notes}
                      </div>
                    </div>
                  )}

                  {/* Calendar Event Link */}
                  {task.calendar_event_id && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">Calendar Event</div>
                      <div className="text-sm text-blue-600 break-all">{task.calendar_event_id}</div>
                    </div>
                  )}

                  {/* Last Updated */}
                  {task.updated && (
                    <div className="text-xs text-gray-500">
                      Last updated: {formatDate(task.updated)}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer with Delete Button */}
        {!loading && !isEditMode && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete Task'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
