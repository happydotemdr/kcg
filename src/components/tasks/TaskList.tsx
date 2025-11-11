/**
 * TaskList Component
 * Displays tasks with checkboxes, due dates, and actions
 */

import React, { useState, useEffect } from 'react';
import TaskDetailModal from './TaskDetailModal';

interface Task {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  due?: string;
  notes?: string;
  parent?: string;
}

interface TaskListProps {
  tasklistId: string;
  googleAccountEmail?: string;
}

type FilterTab = 'all' | 'active' | 'completed';

export default function TaskList({ tasklistId, googleAccountEmail }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ tasklistId });
      if (googleAccountEmail) {
        params.append('googleAccountEmail', googleAccountEmail);
      }

      const response = await fetch(`/api/tasks/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [tasklistId, googleAccountEmail]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setDeletingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeletingId(null);
    }
  };

  const getDueDateColor = (dueDate?: string): string => {
    if (!dueDate) return 'text-gray-400';

    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (due < today) return 'text-red-600';
    if (due.getTime() === today.getTime()) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatDueDate = (dueDate?: string): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return task.status === 'needsAction';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const isSubtask = (task: Task): boolean => !!task.parent;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ({tasks.filter((t) => t.status === 'needsAction').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({tasks.filter((t) => t.status === 'completed').length})
        </button>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tasks yet
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-md hover:border-gray-300 transition-colors ${
                isSubtask(task) ? 'ml-6' : ''
              }`}
            >
              {/* Subtask Indicator */}
              {isSubtask(task) && (
                <svg
                  className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}

              {/* Checkbox */}
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() => handleToggleStatus(task)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`text-left text-sm font-medium hover:text-blue-600 transition-colors ${
                    task.status === 'completed'
                      ? 'line-through text-gray-400'
                      : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </button>

                {task.due && (
                  <div className={`text-xs mt-1 ${getDueDateColor(task.due)}`}>
                    Due: {formatDueDate(task.due)}
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(task.id)}
                disabled={deletingId === task.id}
                className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label="Delete task"
              >
                {deletingId === task.id ? (
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          taskId={selectedTaskId}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
