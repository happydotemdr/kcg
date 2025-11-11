/**
 * Admin endpoint for backfilling usage aggregations
 *
 * This should be protected and only accessible to admin users.
 *
 * Query params:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 *
 * Example: /api/admin/backfill-aggregations?start_date=2025-01-01&end_date=2025-01-31
 */

import type { APIRoute } from 'astro';
import { backfillAggregations } from '../../../lib/jobs/aggregate-daily-usage.js';

export const POST: APIRoute = async ({ request, locals }) => {
  // Authentication: Require Clerk admin user
  try {
    const auth = await locals.auth();
    if (!auth.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Add admin role check via Clerk metadata
    // const user = await clerkClient.users.getUser(auth.userId);
    // if (!user.publicMetadata.isAdmin) {
    //   return new Response(
    //     JSON.stringify({ error: 'Forbidden - admin access required' }),
    //     { status: 403, headers: { 'Content-Type': 'application/json' } }
    //   );
    // }

  } catch (error) {
    console.error('[Backfill] Auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Parse date parameters
  const url = new URL(request.url);
  const startDateParam = url.searchParams.get('start_date');
  const endDateParam = url.searchParams.get('end_date');

  if (!startDateParam || !endDateParam) {
    return new Response(
      JSON.stringify({
        error: 'Missing required parameters: start_date and end_date (YYYY-MM-DD format)'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const startDate = new Date(startDateParam + 'T00:00:00Z');
  const endDate = new Date(endDateParam + 'T00:00:00Z');

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response(
      JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (startDate > endDate) {
    return new Response(
      JSON.stringify({ error: 'start_date must be before or equal to end_date' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Limit to reasonable range (e.g., 90 days)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    return new Response(
      JSON.stringify({
        error: 'Date range too large. Maximum 90 days allowed.'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`[Backfill] Starting backfill from ${startDateParam} to ${endDateParam}`);

  try {
    const result = await backfillAggregations(startDate, endDate);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfilled ${result.totalDays} days of usage data`,
        ...result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[Backfill] Failed:', error);

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
