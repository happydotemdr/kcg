/**
 * Google Tasks Integration
 * Handles Tasks API v1 operations for task management
 */

import { google } from 'googleapis';
import type { tasks_v1 } from 'googleapis';
import { createOAuth2Client } from './google-calendar';
import { findTokenByUserId } from './db/repositories/google-oauth';

/**
 * Task list metadata
 */
export interface TaskList {
  id: string;
  title: string;
  updated: string;
  selfLink?: string;
}

/**
 * Task data for create/update operations
 */
export interface TaskData {
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status?: 'needsAction' | 'completed';
  parent?: string; // Parent task ID for subtasks
  position?: string; // Google's opaque ordering string
  links?: Array<{
    type: string;
    description?: string;
    link: string;
  }>;
}

/**
 * Task response from Tasks API
 */
export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  updated: string;
  parent?: string;
  position: string;
  links?: TaskData['links'];
  selfLink?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
}

/**
 * Get authenticated Tasks API client
 */
export async function getTasksClient(userId: string, googleAccountEmail?: string) {
  const tokenData = await findTokenByUserId(userId, googleAccountEmail);

  if (!tokenData) {
    throw new Error('No Google connection found. Please connect your Google account first.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_type: tokenData.token_type,
    expiry_date: tokenData.expiry_date,
  });

  return google.tasks({ version: 'v1', auth: oauth2Client });
}

/**
 * List all task lists
 */
export async function listTaskLists(
  userId: string,
  googleAccountEmail?: string
): Promise<TaskList[]> {
  try {
    const tasks = await getTasksClient(userId, googleAccountEmail);

    const response = await tasks.tasklists.list();

    const items = response.data.items || [];

    return items.map((list: tasks_v1.Schema$TaskList) => ({
      id: list.id!,
      title: list.title!,
      updated: list.updated!,
      selfLink: list.selfLink,
    }));
  } catch (error: any) {
    console.error('[Tasks] Error listing task lists:', error);
    throw new Error(`Failed to list task lists: ${error.message || 'Unknown error'}`);
  }
}

/**
 * List tasks in a task list
 */
export async function listTasks(
  userId: string,
  tasklistId: string,
  opts?: {
    showCompleted?: boolean;
    showDeleted?: boolean;
    showHidden?: boolean;
    googleAccountEmail?: string;
  }
): Promise<Task[]> {
  try {
    const tasks = await getTasksClient(userId, opts?.googleAccountEmail);

    const response = await tasks.tasks.list({
      tasklist: tasklistId,
      showCompleted: opts?.showCompleted,
      showDeleted: opts?.showDeleted,
      showHidden: opts?.showHidden,
    });

    const items = response.data.items || [];

    return items.map((task: tasks_v1.Schema$Task) => ({
      id: task.id!,
      title: task.title!,
      notes: task.notes,
      due: task.due,
      status: task.status as 'needsAction' | 'completed',
      updated: task.updated!,
      parent: task.parent,
      position: task.position!,
      links: task.links,
      selfLink: task.selfLink,
      completed: task.completed,
      deleted: task.deleted,
      hidden: task.hidden,
    }));
  } catch (error: any) {
    console.error('[Tasks] Error listing tasks:', error);
    throw new Error(`Failed to list tasks: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  tasklistId: string,
  task: TaskData,
  googleAccountEmail?: string
): Promise<Task> {
  try {
    const tasks = await getTasksClient(userId, googleAccountEmail);

    const response = await tasks.tasks.insert({
      tasklist: tasklistId,
      parent: task.parent,
      requestBody: {
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status,
        links: task.links,
      },
    });

    const created = response.data;

    console.log(`[Tasks] Created task: ${created.id} in list ${tasklistId}`);

    return {
      id: created.id!,
      title: created.title!,
      notes: created.notes,
      due: created.due,
      status: created.status as 'needsAction' | 'completed',
      updated: created.updated!,
      parent: created.parent,
      position: created.position!,
      links: created.links,
      selfLink: created.selfLink,
      completed: created.completed,
      deleted: created.deleted,
      hidden: created.hidden,
    };
  } catch (error: any) {
    console.error('[Tasks] Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  userId: string,
  tasklistId: string,
  taskId: string,
  task: Partial<TaskData>,
  googleAccountEmail?: string
): Promise<Task> {
  try {
    const tasks = await getTasksClient(userId, googleAccountEmail);

    const response = await tasks.tasks.patch({
      tasklist: tasklistId,
      task: taskId,
      requestBody: {
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status,
        links: task.links,
      },
    });

    const updated = response.data;

    console.log(`[Tasks] Updated task: ${taskId} in list ${tasklistId}`);

    return {
      id: updated.id!,
      title: updated.title!,
      notes: updated.notes,
      due: updated.due,
      status: updated.status as 'needsAction' | 'completed',
      updated: updated.updated!,
      parent: updated.parent,
      position: updated.position!,
      links: updated.links,
      selfLink: updated.selfLink,
      completed: updated.completed,
      deleted: updated.deleted,
      hidden: updated.hidden,
    };
  } catch (error: any) {
    console.error('[Tasks] Error updating task:', error);
    throw new Error(`Failed to update task: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  userId: string,
  tasklistId: string,
  taskId: string,
  googleAccountEmail?: string
): Promise<void> {
  try {
    const tasks = await getTasksClient(userId, googleAccountEmail);

    await tasks.tasks.delete({
      tasklist: tasklistId,
      task: taskId,
    });

    console.log(`[Tasks] Deleted task: ${taskId} from list ${tasklistId}`);
  } catch (error: any) {
    console.error('[Tasks] Error deleting task:', error);
    throw new Error(`Failed to delete task: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Move a task to a different position in the list
 * @param position - New position: 'first' for top, task ID to insert after, or leave empty for end
 */
export async function moveTask(
  userId: string,
  tasklistId: string,
  taskId: string,
  position: string | undefined,
  googleAccountEmail?: string
): Promise<Task> {
  try {
    const tasks = await getTasksClient(userId, googleAccountEmail);

    // Handle 'first' convenience alias
    const params: tasks_v1.Params$Resource$Tasks$Move = {
      tasklist: tasklistId,
      task: taskId,
    };

    if (position && position !== 'last') {
      if (position === 'first') {
        // Move to top (no parent, no previous)
        params.parent = undefined;
        params.previous = undefined;
      } else {
        // Move after specific task
        params.previous = position;
      }
    }

    const response = await tasks.tasks.move(params);

    const moved = response.data;

    console.log(`[Tasks] Moved task: ${taskId} to position ${position || 'last'} in list ${tasklistId}`);

    return {
      id: moved.id!,
      title: moved.title!,
      notes: moved.notes,
      due: moved.due,
      status: moved.status as 'needsAction' | 'completed',
      updated: moved.updated!,
      parent: moved.parent,
      position: moved.position!,
      links: moved.links,
      selfLink: moved.selfLink,
      completed: moved.completed,
      deleted: moved.deleted,
      hidden: moved.hidden,
    };
  } catch (error: any) {
    console.error('[Tasks] Error moving task:', error);
    throw new Error(`Failed to move task: ${error.message || 'Unknown error'}`);
  }
}
