/**
 * GET /api/agents/status
 * Returns status and metadata for all available agents
 * Checks connection status based on OAuth tokens in database
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/db/client';
import { findUserByClerkId } from '../../../lib/db/repositories/users';

export const prerender = false;

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

interface AgentsStatusResponse {
  agents: AgentStatus[];
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    const { userId: clerkUserId } = locals.auth();

    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get database user ID
    const dbUser = await findUserByClerkId(clerkUserId);
    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check calendar agent status
    const calendarStatus = await getCalendarAgentStatus(dbUser.id);

    // Check Gmail agent status
    const gmailStatus = await getGmailAgentStatus(clerkUserId);

    // Todos agent (coming soon)
    const todosAgent: AgentStatus = {
      id: 'todos',
      name: 'Task Manager',
      icon: '✅',
      status: 'not-configured',
      capabilities: ['Coming Soon'],
      description: 'Manage tasks and to-do lists',
      uploadAction: null,
      settingsUrl: null,
      recentActivity: null,
    };

    const response: AgentsStatusResponse = {
      agents: [calendarStatus, gmailStatus, todosAgent],
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch agent status:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch agent status',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Get Calendar Agent status and recent activity
 */
async function getCalendarAgentStatus(userId: string): Promise<AgentStatus> {
  try {
    // Check if user has Google Calendar OAuth tokens
    const tokenResult = await query(
      'SELECT access_token FROM google_oauth_tokens WHERE user_id = $1',
      [userId]
    );

    const hasTokens = tokenResult.rows.length > 0 && tokenResult.rows[0].access_token;

    // Get recent activity from documents table (last 24 hours)
    const activityResult = await query(
      `SELECT COUNT(*) as count,
        SUM(events_added) as total_events_added
       FROM processed_documents
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'
       AND status = 'completed'`,
      [userId]
    );

    const activityCount = parseInt(activityResult.rows[0]?.count || '0');
    const totalEventsAdded = parseInt(activityResult.rows[0]?.total_events_added || '0');

    // Get most recent document with events added
    let recentActivity = null;
    if (activityCount > 0 && totalEventsAdded > 0) {
      const recentDocResult = await query(
        `SELECT file_name, events_added, created_at
         FROM processed_documents
         WHERE user_id = $1
         AND events_added > 0
         AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (recentDocResult.rows.length > 0) {
        const doc = recentDocResult.rows[0];
        recentActivity = {
          count: activityCount,
          lastAction: `${doc.events_added} ${doc.events_added === 1 ? 'event' : 'events'} added`,
          timestamp: new Date(doc.created_at).toISOString(),
        };
      }
    }

    return {
      id: 'calendar',
      name: 'Calendar Agent',
      icon: '📅',
      status: hasTokens ? 'connected' : 'not-configured',
      capabilities: ['Full CRUD', 'Multi-Calendar', 'Event Extraction'],
      description: 'Manage calendar events across multiple calendars',
      uploadAction: {
        label: 'Extract Events',
        prompt: "I've uploaded '{filename}'. Please analyze this document and extract any calendar events, including dates, times, locations, and descriptions. Check for duplicates and add the events to my calendar.",
        acceptedTypes: ['image/*', 'application/pdf'],
      },
      settingsUrl: '/integrations',
      recentActivity,
    };
  } catch (error) {
    console.error('Error fetching calendar agent status:', error);
    return {
      id: 'calendar',
      name: 'Calendar Agent',
      icon: '📅',
      status: 'error',
      capabilities: ['Full CRUD', 'Multi-Calendar', 'Event Extraction'],
      description: 'Manage calendar events across multiple calendars',
      uploadAction: {
        label: 'Extract Events',
        prompt: "I've uploaded '{filename}'. Please analyze this document and extract any calendar events, including dates, times, locations, and descriptions. Check for duplicates and add the events to my calendar.",
        acceptedTypes: ['image/*', 'application/pdf'],
      },
      settingsUrl: '/integrations',
      recentActivity: null,
    };
  }
}

/**
 * Get Gmail Agent status and recent activity
 */
async function getGmailAgentStatus(clerkUserId: string): Promise<AgentStatus> {
  try {
    // Get user UUID from Clerk ID
    const dbUser = await findUserByClerkId(clerkUserId);
    if (!dbUser) {
      return createGmailAgentStatus('not-configured');
    }

    // Check if user has Google OAuth tokens (shared for Gmail and Calendar)
    const tokenResult = await query(
      'SELECT access_token FROM google_oauth_tokens WHERE user_id = $1 LIMIT 1',
      [dbUser.id]
    );

    const hasTokens = tokenResult.rows.length > 0 && tokenResult.rows[0].access_token;

    return createGmailAgentStatus(hasTokens ? 'connected' : 'not-configured');
  } catch (error) {
    console.error('Error fetching Gmail agent status:', error);
    return createGmailAgentStatus('error');
  }
}

/**
 * Helper to create Gmail Agent status object
 */
function createGmailAgentStatus(
  status: 'connected' | 'needs-refresh' | 'error' | 'not-configured'
): AgentStatus {
  return {
    id: 'gmail',
    name: 'Gmail Agent',
    icon: '📧',
    status,
    capabilities: ['Multi-Account', 'Search', 'Classification'],
    description: 'Analyze and manage emails across multiple accounts',
    uploadAction: {
      label: 'Analyze Email',
      prompt: "Please analyze this email screenshot and extract key information including sender, subject, important dates, actions required, and classify its priority. Let me know if I need to take any action.",
      acceptedTypes: ['image/*'],
    },
    settingsUrl: '/integrations',
    recentActivity: null,
  };
}
