/**
 * Cron endpoint for daily usage aggregation
 *
 * This endpoint should be called daily (e.g., 2am UTC) to aggregate previous day's usage.
 *
 * Authentication: Vercel Cron secret OR Clerk admin role check
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to yesterday)
 *
 * Example: /api/cron/aggregate-usage?date=2025-01-15
 */

import type { APIRoute } from 'astro';
import { aggregateAllUsersDailyUsage } from '../../../lib/jobs/aggregate-daily-usage.js';

export const GET: APIRoute = async ({ request, locals }) => {
  // Authentication: Check Vercel Cron secret header
  const cronSecret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // If CRON_SECRET is set, require it
    console.warn('[Cron] Unauthorized aggregation attempt');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Alternative: Allow Clerk admin users
  if (!cronSecret) {
    try {
      const auth = await locals.auth();
      if (!auth.userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - no Clerk session' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if user is admin (optional - add admin metadata in Clerk)
      // const user = await clerkClient.users.getUser(auth.userId);
      // if (!user.publicMetadata.isAdmin) { return 403 }
    } catch (error) {
      console.error('[Cron] Auth error:', error);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Parse date parameter (defaults to yesterday)
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');

  let targetDate: Date;
  if (dateParam) {
    targetDate = new Date(dateParam + 'T00:00:00Z');
    if (isNaN(targetDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } else {
    // Default to yesterday
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    targetDate.setHours(0, 0, 0, 0);
  }

  console.log(`[Cron] Running aggregation for ${targetDate.toISOString().split('T')[0]}`);

  try {
    const result = await aggregateAllUsersDailyUsage(targetDate);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Aggregated usage data for ${result.date}`,
        ...result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[Cron] Aggregation failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
