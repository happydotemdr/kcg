/**
 * Model Usage Breakdown API Endpoint
 * Returns model usage analytics with token counts and cost attribution
 */

import type { APIRoute } from 'astro';
import { findUserByClerkId } from '../../../lib/db/repositories/users.js';
import { getModelUsageBreakdown } from '../../../lib/db/repositories/claude-usage.js';

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
 * GET /api/usage/models
 *
 * Query Parameters:
 * - start_date: ISO date string (default: 30 days ago)
 * - end_date: ISO date string (default: today)
 *
 * Returns model usage breakdown with cost attribution
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

    // Get model usage breakdown
    const modelsData = await getModelUsageBreakdown(user.id, startDate, endDate);

    // Sort by cost descending (already sorted by repository, but ensure it)
    const sortedModels = modelsData.sort((a, b) => b.total_cost - a.total_cost);

    // Calculate summary statistics
    const totalModelsUsed = sortedModels.length;
    const totalCost = sortedModels.reduce((sum, model) => sum + model.total_cost, 0);

    // Find most expensive and most used models
    const mostExpensiveModel = sortedModels.length > 0 ? sortedModels[0].model : null;
    const mostUsedModel = sortedModels.length > 0
      ? sortedModels.reduce((prev, current) =>
          current.api_calls_count > prev.api_calls_count ? current : prev
        ).model
      : null;

    const response = {
      models: sortedModels,
      summary: {
        total_models_used: totalModelsUsed,
        total_cost: totalCost,
        most_expensive_model: mostExpensiveModel,
        most_used_model: mostUsedModel
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
    console.error('Error fetching model usage breakdown:', error);

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
      error: 'Failed to fetch model usage breakdown',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
