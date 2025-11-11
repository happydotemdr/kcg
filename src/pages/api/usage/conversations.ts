/**
 * GET /api/usage/conversations
 * List conversations with cost data, optionally including deleted conversations
 */

import type { APIRoute } from 'astro';
import { getConversationCosts } from '../../../lib/db/repositories/claude-usage.js';
import { findUserByClerkId } from '../../../lib/db/repositories/users.js';

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // Authentication check
    const { userId } = (locals as any).auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert Clerk user ID to database user ID
    const user = await findUserByClerkId(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);

    // Date filters (optional)
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');

    let start_date: Date | undefined;
    let end_date: Date | undefined;

    if (startDateParam) {
      start_date = new Date(startDateParam);
      if (isNaN(start_date.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid start_date format. Must be ISO 8601 date string.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (endDateParam) {
      end_date = new Date(endDateParam);
      if (isNaN(end_date.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid end_date format. Must be ISO 8601 date string.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Sort parameters
    const sortByParam = url.searchParams.get('sort_by') || 'cost';
    const sortOrderParam = url.searchParams.get('sort_order') || 'desc';

    // Validate sort_by
    const validSortBy = ['cost', 'tokens', 'date'];
    if (!validSortBy.includes(sortByParam)) {
      return new Response(
        JSON.stringify({
          error: `Invalid sort_by parameter. Must be one of: ${validSortBy.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sort_by = sortByParam as 'cost' | 'tokens' | 'date';

    // Validate sort_order
    const validSortOrder = ['asc', 'desc'];
    if (!validSortOrder.includes(sortOrderParam)) {
      return new Response(
        JSON.stringify({
          error: `Invalid sort_order parameter. Must be one of: ${validSortOrder.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sort_order = sortOrderParam as 'asc' | 'desc';

    // Pagination parameters
    const limitParam = url.searchParams.get('limit') || '50';
    const offsetParam = url.searchParams.get('offset') || '0';

    const limit = parseInt(limitParam);
    const offset = parseInt(offsetParam);

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid limit parameter. Must be between 1 and 100.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate offset
    if (isNaN(offset) || offset < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid offset parameter. Must be >= 0.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Include deleted parameter
    const includeDeletedParam = url.searchParams.get('include_deleted') || 'false';
    const include_deleted = includeDeletedParam === 'true';

    // Query conversation costs
    const result = await getConversationCosts({
      user_id: user.id,
      start_date,
      end_date,
      sort_by,
      sort_order,
      limit,
      offset,
      include_deleted
    });

    // Calculate pagination metadata
    const has_more = offset + result.conversations.length < result.total_count;

    // Format response with ISO timestamps
    const response = {
      conversations: result.conversations.map(conv => ({
        conversation_id: conv.conversation_id,
        title: conv.title,
        total_cost: conv.total_cost,
        total_tokens: conv.total_tokens,
        message_count: conv.message_count,
        first_message_at: conv.first_message_at.toISOString(),
        last_message_at: conv.last_message_at.toISOString(),
        deleted_at: conv.deleted_at ? conv.deleted_at.toISOString() : null
      })),
      pagination: {
        total_count: result.total_count,
        limit,
        offset,
        has_more
      },
      filters: {
        start_date: start_date?.toISOString() || null,
        end_date: end_date?.toISOString() || null,
        sort_by,
        sort_order,
        include_deleted
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // 5 minute cache
      }
    });

  } catch (error) {
    console.error('Error fetching conversation costs:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch conversation costs'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
