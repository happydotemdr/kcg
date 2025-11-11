/**
 * GET /api/usage/summary
 * Get aggregated usage and cost data with time-series breakdown
 *
 * Query Parameters:
 * - start_date: ISO date string (YYYY-MM-DD), defaults to 30 days ago
 * - end_date: ISO date string (YYYY-MM-DD), defaults to today
 * - group_by: 'day' | 'week' | 'month', defaults to 'day'
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users.js';
import { getUserUsageSummary } from '../../../lib/db/repositories/claude-usage.js';

export const prerender = false;

/**
 * Parse and validate ISO date string (YYYY-MM-DD)
 */
function parseDate(dateStr: string | null, defaultDate: Date): Date {
  if (!dateStr) return defaultDate;

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }

  return parsed;
}

/**
 * Group time series data by week
 * Week starts on Monday (ISO week)
 */
function groupByWeek(timeSeries: Array<{ period: string; cost: number; tokens: number; api_calls: number; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_creation_tokens: number }>) {
  const weekMap = new Map<string, { cost: number; tokens: number; api_calls: number; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_creation_tokens: number }>();

  for (const entry of timeSeries) {
    const date = new Date(entry.period);

    // Get ISO week start (Monday)
    const dayOfWeek = date.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // Adjust for Monday start
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekKey = weekStart.toISOString().split('T')[0];

    const existing = weekMap.get(weekKey) || { cost: 0, tokens: 0, api_calls: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
    weekMap.set(weekKey, {
      cost: existing.cost + entry.cost,
      tokens: existing.tokens + entry.tokens,
      api_calls: existing.api_calls + entry.api_calls,
      input_tokens: existing.input_tokens + entry.input_tokens,
      output_tokens: existing.output_tokens + entry.output_tokens,
      cache_read_tokens: existing.cache_read_tokens + entry.cache_read_tokens,
      cache_creation_tokens: existing.cache_creation_tokens + entry.cache_creation_tokens
    });
  }

  return Array.from(weekMap.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Group time series data by month
 */
function groupByMonth(timeSeries: Array<{ period: string; cost: number; tokens: number; api_calls: number; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_creation_tokens: number }>) {
  const monthMap = new Map<string, { cost: number; tokens: number; api_calls: number; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_creation_tokens: number }>();

  for (const entry of timeSeries) {
    const date = new Date(entry.period);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthKey = monthStart.toISOString().split('T')[0];

    const existing = monthMap.get(monthKey) || { cost: 0, tokens: 0, api_calls: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_creation_tokens: 0 };
    monthMap.set(monthKey, {
      cost: existing.cost + entry.cost,
      tokens: existing.tokens + entry.tokens,
      api_calls: existing.api_calls + entry.api_calls,
      input_tokens: existing.input_tokens + entry.input_tokens,
      output_tokens: existing.output_tokens + entry.output_tokens,
      cache_read_tokens: existing.cache_read_tokens + entry.cache_read_tokens,
      cache_creation_tokens: existing.cache_creation_tokens + entry.cache_creation_tokens
    });
  }

  return Array.from(monthMap.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Determine if the date range is entirely in the past (for caching)
 */
function isHistoricalData(endDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  return end < today;
}

export const GET: APIRoute = async ({ locals, request }) => {
  // 1. Check authentication
  const auth = await locals.auth();
  if (!auth.userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 2. Parse and validate query parameters
    const url = new URL(request.url);

    // Default to last 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = parseDate(url.searchParams.get('start_date'), thirtyDaysAgo);
    const endDate = parseDate(url.searchParams.get('end_date'), today);
    const groupBy = url.searchParams.get('group_by') || 'day';

    // Validate group_by
    if (!['day', 'week', 'month'].includes(groupBy)) {
      return new Response(
        JSON.stringify({ error: 'Invalid group_by parameter. Must be: day, week, or month' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate date range
    if (startDate > endDate) {
      return new Response(
        JSON.stringify({ error: 'start_date must be before or equal to end_date' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Convert Clerk user ID to database user ID
    const user = await findUserByClerkId(auth.userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Fetch usage summary data
    const summaryData = await getUserUsageSummary(user.id, startDate, endDate);

    // 5. Group time series based on group_by parameter
    let timeSeries = summaryData.time_series;

    if (groupBy === 'week') {
      timeSeries = groupByWeek(timeSeries);
    } else if (groupBy === 'month') {
      timeSeries = groupByMonth(timeSeries);
    }
    // For 'day', use the data as-is from the repository

    // 6. Build response
    const response = {
      summary: {
        total_cost: summaryData.total_cost,
        total_tokens: summaryData.total_tokens,
        total_input_tokens: summaryData.total_input_tokens,
        total_output_tokens: summaryData.total_output_tokens,
        api_calls_count: summaryData.api_calls_count,
        unique_conversations: summaryData.unique_conversations,
        tool_calls_count: summaryData.tool_calls_count,
        average_cost_per_call: summaryData.average_cost_per_call,
        average_response_time_ms: summaryData.average_response_time_ms
      },
      time_series: timeSeries,
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        group_by: groupBy
      }
    };

    // 7. Determine cache headers
    const isHistorical = isHistoricalData(endDate);
    const cacheControl = isHistorical
      ? 'private, max-age=3600' // 1 hour cache for historical data
      : 'private, max-age=300'; // 5 minute cache for current data

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl
      }
    });
  } catch (error) {
    console.error('Failed to get usage summary:', error);

    // Check if it's a validation error (400) or server error (500)
    const is400Error = error instanceof Error && error.message.includes('Invalid date format');

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get usage summary'
      }),
      {
        status: is400Error ? 400 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
