/**
 * GET /api/usage/conversations/[id]
 * Get detailed breakdown of a single conversation with per-message costs and tool executions
 */

import type { APIRoute } from 'astro';
import { getConversationDetails } from '../../../../lib/db/repositories/claude-usage.js';
import { findUserByClerkId } from '../../../../lib/db/repositories/users.js';

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
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

    // Get conversation_id from params
    const conversationId = params.id;
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversation details
    const details = await getConversationDetails(user.id, conversationId);

    if (!details) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format response with ISO dates
    const response = {
      metadata: {
        ...details.metadata,
        first_message_at: details.metadata.first_message_at?.toISOString() || null,
        last_message_at: details.metadata.last_message_at?.toISOString() || null,
        deleted_at: details.metadata.deleted_at?.toISOString() || null,
      },
      messages: details.messages.map(msg => ({
        ...msg,
        created_at: msg.created_at.toISOString()
      })),
      tool_executions: details.tool_executions.map(tool => ({
        ...tool,
        created_at: tool.created_at.toISOString()
      })),
      summary: details.summary
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // 5 min cache
      }
    });

  } catch (error) {
    console.error('Error fetching conversation details:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch conversation details'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
