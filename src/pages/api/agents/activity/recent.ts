/**
 * GET /api/agents/activity/recent
 * Returns aggregated recent activity across all agents
 * Shows activity from last 24 hours
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/db/client';
import { findUserByClerkId } from '../../../../lib/db/repositories/users';

export const prerender = false;

interface AgentActivity {
  agentId: string;
  agentName: string;
  icon: string;
  action: string;
  timestamp: string;
  details: string;
}

interface ActivitySummary {
  totalActions: number;
  byAgent: {
    calendar: number;
    gmail: number;
    todos: number;
  };
}

interface RecentActivityResponse {
  activities: AgentActivity[];
  summary: ActivitySummary;
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

    // Fetch calendar activities
    const calendarActivities = await getCalendarActivities(dbUser.id);

    // Fetch Gmail activities (placeholder for future implementation)
    const gmailActivities = await getGmailActivities(clerkUserId);

    // Combine all activities
    const allActivities = [...calendarActivities, ...gmailActivities];

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to 20 most recent
    const limitedActivities = allActivities.slice(0, 20);

    // Calculate summary
    const summary: ActivitySummary = {
      totalActions: allActivities.length,
      byAgent: {
        calendar: calendarActivities.length,
        gmail: gmailActivities.length,
        todos: 0,
      },
    };

    const response: RecentActivityResponse = {
      activities: limitedActivities,
      summary,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch recent activity',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Get calendar agent activities from processed_documents table
 */
async function getCalendarActivities(userId: string): Promise<AgentActivity[]> {
  try {
    const result = await query(
      `SELECT
        id,
        file_name,
        events_added,
        events_updated,
        events_skipped,
        status,
        created_at
       FROM processed_documents
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'
       AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    return result.rows.map((row) => {
      // Build action description
      const actions: string[] = [];
      if (row.events_added > 0) {
        actions.push(`${row.events_added} ${row.events_added === 1 ? 'event' : 'events'} added`);
      }
      if (row.events_updated > 0) {
        actions.push(`${row.events_updated} updated`);
      }
      if (row.events_skipped > 0) {
        actions.push(`${row.events_skipped} skipped`);
      }

      const action = actions.length > 0 ? actions.join(', ') : 'Document processed';

      return {
        agentId: 'calendar',
        agentName: 'Calendar Agent',
        icon: '📅',
        action,
        timestamp: new Date(row.created_at).toISOString(),
        details: row.file_name,
      };
    });
  } catch (error) {
    console.error('Error fetching calendar activities:', error);
    return [];
  }
}

/**
 * Get Gmail agent activities from email_processing_log table
 * Note: Currently returns empty array as Gmail activity tracking is not yet implemented
 */
async function getGmailActivities(clerkUserId: string): Promise<AgentActivity[]> {
  try {
    const result = await query(
      `SELECT
        id,
        action,
        email_ids,
        success,
        created_at
       FROM email_processing_log
       WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'
       AND success = TRUE
       ORDER BY created_at DESC
       LIMIT 20`,
      [clerkUserId]
    );

    return result.rows.map((row) => {
      // Build action description
      let actionDescription = row.action;
      const emailCount = row.email_ids ? row.email_ids.length : 0;

      if (emailCount > 0) {
        actionDescription = `${actionDescription} (${emailCount} ${emailCount === 1 ? 'email' : 'emails'})`;
      }

      return {
        agentId: 'gmail',
        agentName: 'Gmail Agent',
        icon: '📧',
        action: actionDescription,
        timestamp: new Date(row.created_at).toISOString(),
        details: actionDescription,
      };
    });
  } catch (error) {
    // Gmail tables might not exist or no activities yet
    console.log('No Gmail activities found (table may not exist yet)');
    return [];
  }
}
