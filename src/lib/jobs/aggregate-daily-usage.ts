/**
 * Daily Usage Aggregation Job
 *
 * This module provides functions for aggregating Claude API usage data into
 * pre-computed daily summaries for faster dashboard queries.
 *
 * Designed to be called from:
 * - Scheduled cron jobs (e.g., nightly at 2 AM UTC)
 * - Manual backfill operations via admin API
 */

import { aggregateDailySummary } from '../db/repositories/claude-usage.js';
import { getPool } from '../db/client.js';

const pool = getPool();

/**
 * Aggregates usage data for a specific user and date
 *
 * @param userId - Database user ID (UUID)
 * @param date - Date to aggregate (defaults to yesterday)
 * @returns Summary of aggregated data
 */
export async function aggregateUserDailyUsage(
  userId: string,
  date: Date = getYesterday()
): Promise<{
  userId: string;
  date: string;
  success: boolean;
  error?: string;
}> {
  try {
    await aggregateDailySummary(userId, date);

    return {
      userId,
      date: date.toISOString().split('T')[0],
      success: true
    };
  } catch (error) {
    console.error('[Aggregation Error] User:', userId, 'Date:', date, error);
    return {
      userId,
      date: date.toISOString().split('T')[0],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Aggregates usage for all active users for a given date
 *
 * @param date - Date to aggregate (defaults to yesterday)
 * @returns Summary of aggregation results
 */
export async function aggregateAllUsersDailyUsage(
  date: Date = getYesterday()
): Promise<{
  date: string;
  totalUsers: number;
  successCount: number;
  failureCount: number;
  failures: Array<{ userId: string; error: string }>;
  durationMs: number;
}> {
  const startTime = Date.now();
  const dateStr = date.toISOString().split('T')[0];

  console.log(`[Aggregation] Starting daily aggregation for ${dateStr}`);

  // Get all users who have API calls on this date
  const result = await pool.query<{ user_id: string }>(
    `
    SELECT DISTINCT user_id
    FROM claude_api_calls
    WHERE created_at >= $1::date
      AND created_at < ($1::date + interval '1 day')
    ORDER BY user_id
    `,
    [date]
  );

  const users = result.rows.map(row => row.user_id);

  if (users.length === 0) {
    console.log(`[Aggregation] No users found with activity on ${dateStr}`);
    return {
      date: dateStr,
      totalUsers: 0,
      successCount: 0,
      failureCount: 0,
      failures: [],
      durationMs: Date.now() - startTime
    };
  }

  console.log(`[Aggregation] Found ${users.length} users with activity on ${dateStr}`);

  // Aggregate for each user (sequential to avoid overwhelming DB)
  const results = [];
  for (const userId of users) {
    const result = await aggregateUserDailyUsage(userId, date);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const failures = results
    .filter(r => !r.success)
    .map(r => ({ userId: r.userId, error: r.error || 'Unknown error' }));

  const durationMs = Date.now() - startTime;

  console.log(`[Aggregation] Completed for ${dateStr}:`, {
    totalUsers: users.length,
    successCount,
    failureCount,
    durationMs
  });

  return {
    date: dateStr,
    totalUsers: users.length,
    successCount,
    failureCount,
    failures,
    durationMs
  };
}

/**
 * Backfills aggregations for a date range
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Summary of backfill operation
 */
export async function backfillAggregations(
  startDate: Date,
  endDate: Date
): Promise<{
  startDate: string;
  endDate: string;
  totalDays: number;
  results: Array<{
    date: string;
    totalUsers: number;
    successCount: number;
    failureCount: number;
  }>;
  totalDurationMs: number;
}> {
  const startTime = Date.now();
  const results = [];

  console.log(`[Backfill] Starting aggregation backfill from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Generate date range
  const currentDate = new Date(startDate);
  const dates: Date[] = [];

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[Backfill] Processing ${dates.length} days`);

  // Process each date sequentially
  for (const date of dates) {
    const result = await aggregateAllUsersDailyUsage(date);
    results.push({
      date: result.date,
      totalUsers: result.totalUsers,
      successCount: result.successCount,
      failureCount: result.failureCount
    });
  }

  const totalDurationMs = Date.now() - startTime;

  console.log(`[Backfill] Completed in ${totalDurationMs}ms`);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalDays: dates.length,
    results,
    totalDurationMs
  };
}

/**
 * Helper: Get yesterday's date (for default aggregation)
 */
function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0); // Start of day
  return yesterday;
}
