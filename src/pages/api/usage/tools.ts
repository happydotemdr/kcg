/**
 * Tool Usage Breakdown API Endpoint
 * Returns tool usage analytics with performance metrics and cost attribution
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users.js';
import { getToolUsageBreakdown } from '../../../lib/db/repositories/claude-usage.js';

export const prerender = false;

/**
 * Parse and validate date parameter
 */
function parseDate(dateStr: string | null, defaultDate: Date): Date {
  if (!dateStr) return defaultDate;

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return parsed;
}

/**
 * GET /api/usage/tools
 *
 * Query Parameters:
 * - start_date: ISO date string (default: 30 days ago)
 * - end_date: ISO date string (default: today)
 *
 * Returns tool usage breakdown with performance metrics
 */
export const GET: APIRoute = async ({ locals, request }) => {
  // Authentication
  const { userId: clerkUserId } = locals.auth();
  if (!clerkUserId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Convert Clerk user ID to database user ID
    const user = await findUserByClerkId(clerkUserId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');

    // Default to last 30 days
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const startDate = parseDate(startDateParam, defaultStartDate);
    const endDate = parseDate(endDateParam, defaultEndDate);

    // Get tool usage breakdown
    const toolsData = await getToolUsageBreakdown(user.id, startDate, endDate);

    // Sort by call count descending
    const sortedTools = toolsData.sort((a, b) => b.call_count - a.call_count);

    // Calculate summary statistics
    const totalToolCalls = sortedTools.reduce((sum, tool) => sum + tool.call_count, 0);
    const totalExecutionTime = sortedTools.reduce((sum, tool) => sum + tool.total_execution_time_ms, 0);
    const totalSuccesses = sortedTools.reduce((sum, tool) => sum + (tool.call_count * tool.success_rate), 0);
    const averageSuccessRate = totalToolCalls > 0 ? totalSuccesses / totalToolCalls : 0;

    const response = {
      tools: sortedTools,
      summary: {
        total_tool_calls: totalToolCalls,
        total_execution_time_ms: totalExecutionTime,
        average_success_rate: averageSuccessRate
      },
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Error fetching tool usage breakdown:', error);

    // Handle specific error types
    if (error instanceof Error && error.message.includes('Invalid date')) {
      return new Response(JSON.stringify({
        error: 'Invalid date format',
        message: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Failed to fetch tool usage breakdown',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
