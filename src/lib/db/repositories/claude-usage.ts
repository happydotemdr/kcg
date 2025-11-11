/**
 * Repository layer for Claude API usage tracking
 *
 * This module provides data access functions for recording and querying
 * Claude API usage, token consumption, and cost analytics.
 */

import { getPool } from '../client.js';

// Get the pool instance
const pool = getPool();
import type {
  ClaudeApiCall,
  ClaudeToolExecution,
  ClaudeConversationMetadata,
  ClaudeUsageDailySummary,
  ClaudeModelPricing,
  RecordApiCallInput,
  RecordToolExecutionInput,
  ConversationCostQuery,
  UsageSummaryResult,
  ConversationCostResult,
  ToolUsageBreakdown,
  ModelUsageBreakdown
} from '../../../types/usage.js';

// ============================================================================
// Core Recording Functions
// ============================================================================

/**
 * Record a new Claude API call with usage metrics
 *
 * @param data API call metadata including tokens and cost
 * @returns The created API call record with generated ID
 */
export async function recordApiCall(data: RecordApiCallInput): Promise<ClaudeApiCall> {
  try {
    const cache_creation_tokens = data.cache_creation_tokens || 0;
    const cache_read_tokens = data.cache_read_tokens || 0;
    const total_tokens = data.input_tokens + data.output_tokens + cache_creation_tokens + cache_read_tokens;
    const tool_calls_count = data.tool_calls_count || 0;

    const result = await pool.query<ClaudeApiCall>(
      `INSERT INTO claude_api_calls (
        user_id,
        conversation_id,
        conversation_title,
        request_id,
        message_id,
        model,
        input_tokens,
        output_tokens,
        cache_creation_tokens,
        cache_read_tokens,
        total_tokens,
        estimated_cost_usd,
        stop_reason,
        tool_calls_count,
        response_time_ms,
        error_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.user_id,
        data.conversation_id || null,
        data.conversation_title || null,
        data.request_id || null,
        data.message_id,
        data.model,
        data.input_tokens,
        data.output_tokens,
        cache_creation_tokens,
        cache_read_tokens,
        total_tokens,
        data.estimated_cost_usd,
        data.stop_reason || null,
        tool_calls_count,
        data.response_time_ms || null,
        data.error_type || null
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Failed to record API call:', error);
    throw new Error(`Failed to record API call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Record a tool execution linked to an API call
 *
 * @param data Tool execution metadata including success/failure
 */
export async function recordToolExecution(data: RecordToolExecutionInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO claude_tool_executions (
        api_call_id,
        user_id,
        tool_name,
        tool_input,
        tool_output_summary,
        execution_time_ms,
        success,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.api_call_id,
        data.user_id,
        data.tool_name,
        JSON.stringify(data.tool_input),
        data.tool_output_summary || null,
        data.execution_time_ms || null,
        data.success,
        data.error_message || null
      ]
    );
  } catch (error) {
    console.error('Failed to record tool execution:', error);
    throw new Error(`Failed to record tool execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upsert conversation metadata (create or update aggregates)
 *
 * This function maintains running totals for a conversation:
 * - Increments message count
 * - Adds to total tokens and cost
 * - Updates first/last message timestamps
 *
 * @param user_id User ID
 * @param conversation_id Conversation ID
 * @param title Conversation title
 * @param model Model being used
 * @param cost_delta Cost to add to total
 * @param input_tokens_delta Input tokens to add
 * @param output_tokens_delta Output tokens to add
 */
export async function upsertConversationMetadata(
  user_id: string,
  conversation_id: string,
  title: string,
  model: string,
  cost_delta: number,
  input_tokens_delta: number,
  output_tokens_delta: number
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO claude_conversation_metadata (
        user_id,
        conversation_id,
        title,
        model,
        message_count,
        total_input_tokens,
        total_output_tokens,
        total_cost_usd,
        first_message_at,
        last_message_at
      ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (user_id, conversation_id)
      DO UPDATE SET
        message_count = claude_conversation_metadata.message_count + 1,
        total_input_tokens = claude_conversation_metadata.total_input_tokens + $5,
        total_output_tokens = claude_conversation_metadata.total_output_tokens + $6,
        total_cost_usd = claude_conversation_metadata.total_cost_usd + $7,
        last_message_at = NOW(),
        updated_at = NOW()`,
      [user_id, conversation_id, title, model, input_tokens_delta, output_tokens_delta, cost_delta]
    );
  } catch (error) {
    console.error('Failed to upsert conversation metadata:', error);
    throw new Error(`Failed to upsert conversation metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Query Functions - Usage Summaries
// ============================================================================

/**
 * Get comprehensive usage summary for a user over a date range
 *
 * Aggregates all API calls, tokens, costs, and performance metrics.
 * Includes time series breakdown by day.
 *
 * @param user_id User ID
 * @param start_date Start of date range (inclusive)
 * @param end_date End of date range (inclusive)
 * @returns Aggregated usage statistics with daily time series
 */
export async function getUserUsageSummary(
  user_id: string,
  start_date: Date,
  end_date: Date
): Promise<UsageSummaryResult> {
  try {
    // Get overall aggregates
    const aggregateResult = await pool.query<{
      total_cost: string;
      total_tokens: string;
      total_input_tokens: string;
      total_output_tokens: string;
      api_calls_count: string;
      unique_conversations: string;
      tool_calls_count: string;
      average_response_time_ms: string | null;
    }>(
      `SELECT
        COALESCE(SUM(estimated_cost_usd), 0) as total_cost,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens,
        COUNT(*) as api_calls_count,
        COUNT(DISTINCT conversation_id) as unique_conversations,
        COALESCE(SUM(tool_calls_count), 0) as tool_calls_count,
        AVG(response_time_ms) as average_response_time_ms
      FROM claude_api_calls
      WHERE user_id = $1
        AND created_at >= $2
        AND created_at < $3 + INTERVAL '1 day'`,
      [user_id, start_date, end_date]
    );

    const agg = aggregateResult.rows[0];
    const api_calls_count = parseInt(agg.api_calls_count);

    // Get daily time series
    const timeSeriesResult = await pool.query<{
      period: string;
      cost: string;
      tokens: string;
      api_calls: string;
    }>(
      `SELECT
        DATE(created_at) as period,
        COALESCE(SUM(estimated_cost_usd), 0) as cost,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COUNT(*) as api_calls
      FROM claude_api_calls
      WHERE user_id = $1
        AND created_at >= $2
        AND created_at < $3 + INTERVAL '1 day'
      GROUP BY DATE(created_at)
      ORDER BY period ASC`,
      [user_id, start_date, end_date]
    );

    return {
      total_cost: parseFloat(agg.total_cost),
      total_tokens: parseInt(agg.total_tokens),
      total_input_tokens: parseInt(agg.total_input_tokens),
      total_output_tokens: parseInt(agg.total_output_tokens),
      api_calls_count,
      unique_conversations: parseInt(agg.unique_conversations),
      tool_calls_count: parseInt(agg.tool_calls_count),
      average_cost_per_call: api_calls_count > 0 ? parseFloat(agg.total_cost) / api_calls_count : 0,
      average_response_time_ms: agg.average_response_time_ms ? parseFloat(agg.average_response_time_ms) : 0,
      time_series: timeSeriesResult.rows.map(row => ({
        period: row.period,
        cost: parseFloat(row.cost),
        tokens: parseInt(row.tokens),
        api_calls: parseInt(row.api_calls)
      }))
    };
  } catch (error) {
    console.error('Failed to get user usage summary:', error);
    throw new Error(`Failed to get user usage summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get pre-aggregated daily summaries for a user
 *
 * @param user_id User ID
 * @param start_date Start of date range
 * @param end_date End of date range
 * @returns Array of daily summary records
 */
export async function getDailySummaries(
  user_id: string,
  start_date: Date,
  end_date: Date
): Promise<ClaudeUsageDailySummary[]> {
  try {
    const result = await pool.query<ClaudeUsageDailySummary>(
      `SELECT * FROM claude_usage_daily_summary
      WHERE user_id = $1
        AND date >= $2
        AND date <= $3
      ORDER BY date ASC`,
      [user_id, start_date, end_date]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get daily summaries:', error);
    throw new Error(`Failed to get daily summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Query Functions - Conversation Analytics
// ============================================================================

/**
 * Get conversation costs with optional filtering, sorting, and pagination
 *
 * @param query Query parameters for filtering and pagination
 * @returns Paginated list of conversations with cost breakdown
 */
export async function getConversationCosts(
  query: ConversationCostQuery
): Promise<{ conversations: ConversationCostResult[]; total_count: number }> {
  try {
    const { user_id, start_date, end_date, sort_by = 'date', sort_order = 'desc', limit = 50, offset = 0, include_deleted = false } = query;

    // Build WHERE clause
    const whereConditions = ['user_id = $1'];
    if (!include_deleted) {
      whereConditions.push('deleted_at IS NULL');
    }
    const params: any[] = [user_id];
    let paramIndex = 2;

    if (start_date) {
      whereConditions.push(`first_message_at >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`last_message_at <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    let orderByColumn: string;
    switch (sort_by) {
      case 'cost':
        orderByColumn = 'total_cost_usd';
        break;
      case 'tokens':
        orderByColumn = 'total_input_tokens + total_output_tokens';
        break;
      case 'date':
      default:
        orderByColumn = 'last_message_at';
    }

    const orderDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM claude_conversation_metadata WHERE ${whereClause}`,
      params
    );

    const total_count = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await pool.query<{
      conversation_id: string;
      title: string;
      total_cost_usd: string;
      total_input_tokens: string;
      total_output_tokens: string;
      message_count: number;
      first_message_at: Date;
      last_message_at: Date;
      deleted_at: Date | null;
    }>(
      `SELECT
        conversation_id,
        title,
        total_cost_usd,
        total_input_tokens,
        total_output_tokens,
        message_count,
        first_message_at,
        last_message_at,
        deleted_at
      FROM claude_conversation_metadata
      WHERE ${whereClause}
      ORDER BY ${orderByColumn} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const conversations: ConversationCostResult[] = result.rows.map(row => ({
      conversation_id: row.conversation_id,
      title: row.title,
      total_cost: parseFloat(row.total_cost_usd),
      total_tokens: parseInt(row.total_input_tokens) + parseInt(row.total_output_tokens),
      message_count: row.message_count,
      first_message_at: row.first_message_at,
      last_message_at: row.last_message_at,
      deleted_at: row.deleted_at
    }));

    return { conversations, total_count };
  } catch (error) {
    console.error('Failed to get conversation costs:', error);
    throw new Error(`Failed to get conversation costs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Query Functions - Tool & Model Analytics
// ============================================================================

/**
 * Get tool usage breakdown with performance metrics
 *
 * @param user_id User ID
 * @param start_date Start of date range
 * @param end_date End of date range
 * @returns Array of tool usage statistics
 */
export async function getToolUsageBreakdown(
  user_id: string,
  start_date: Date,
  end_date: Date
): Promise<ToolUsageBreakdown[]> {
  try {
    const result = await pool.query<{
      tool_name: string;
      call_count: string;
      total_execution_time_ms: string;
      average_execution_time_ms: string;
      success_rate: string;
      estimated_associated_cost: string;
    }>(
      `WITH tool_stats AS (
        SELECT
          te.tool_name,
          COUNT(*) as call_count,
          COALESCE(SUM(te.execution_time_ms), 0) as total_execution_time_ms,
          AVG(te.execution_time_ms) as average_execution_time_ms,
          SUM(CASE WHEN te.success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate,
          SUM(ac.estimated_cost_usd) as estimated_associated_cost
        FROM claude_tool_executions te
        JOIN claude_api_calls ac ON te.api_call_id = ac.id
        WHERE te.user_id = $1
          AND te.created_at >= $2
          AND te.created_at < $3 + INTERVAL '1 day'
        GROUP BY te.tool_name
      )
      SELECT * FROM tool_stats
      ORDER BY call_count DESC`,
      [user_id, start_date, end_date]
    );

    return result.rows.map(row => ({
      tool_name: row.tool_name,
      call_count: parseInt(row.call_count),
      total_execution_time_ms: parseFloat(row.total_execution_time_ms),
      average_execution_time_ms: parseFloat(row.average_execution_time_ms),
      success_rate: parseFloat(row.success_rate),
      estimated_associated_cost: parseFloat(row.estimated_associated_cost)
    }));
  } catch (error) {
    console.error('Failed to get tool usage breakdown:', error);
    throw new Error(`Failed to get tool usage breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get model usage breakdown with cost attribution
 *
 * @param user_id User ID
 * @param start_date Start of date range
 * @param end_date End of date range
 * @returns Array of model usage statistics with cost percentages
 */
export async function getModelUsageBreakdown(
  user_id: string,
  start_date: Date,
  end_date: Date
): Promise<ModelUsageBreakdown[]> {
  try {
    const result = await pool.query<{
      model: string;
      api_calls_count: string;
      total_input_tokens: string;
      total_output_tokens: string;
      total_cost: string;
      percentage_of_total_cost: string;
    }>(
      `WITH model_stats AS (
        SELECT
          model,
          COUNT(*) as api_calls_count,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(estimated_cost_usd) as total_cost
        FROM claude_api_calls
        WHERE user_id = $1
          AND created_at >= $2
          AND created_at < $3 + INTERVAL '1 day'
        GROUP BY model
      ),
      total_cost_all AS (
        SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM claude_api_calls
        WHERE user_id = $1
          AND created_at >= $2
          AND created_at < $3 + INTERVAL '1 day'
      )
      SELECT
        ms.*,
        CASE
          WHEN tca.total > 0 THEN (ms.total_cost / tca.total * 100)
          ELSE 0
        END as percentage_of_total_cost
      FROM model_stats ms
      CROSS JOIN total_cost_all tca
      ORDER BY ms.total_cost DESC`,
      [user_id, start_date, end_date]
    );

    return result.rows.map(row => ({
      model: row.model,
      api_calls_count: parseInt(row.api_calls_count),
      total_input_tokens: parseInt(row.total_input_tokens),
      total_output_tokens: parseInt(row.total_output_tokens),
      total_cost: parseFloat(row.total_cost),
      percentage_of_total_cost: parseFloat(row.percentage_of_total_cost)
    }));
  } catch (error) {
    console.error('Failed to get model usage breakdown:', error);
    throw new Error(`Failed to get model usage breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregate daily summary for a specific user and date
 *
 * This function computes and stores (or updates) pre-aggregated statistics
 * for a given day. Should be run via scheduled job (e.g., nightly cron).
 *
 * @param user_id User ID
 * @param date Date to aggregate (will aggregate all API calls on this date)
 */
export async function aggregateDailySummary(user_id: string, date: Date): Promise<void> {
  try {
    // Use a CTE to compute all aggregates in one query
    const result = await pool.query(
      `WITH daily_stats AS (
        SELECT
          COUNT(*) as api_calls_count,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(estimated_cost_usd) as total_cost_usd,
          COUNT(DISTINCT conversation_id) as unique_conversations,
          SUM(tool_calls_count) as tool_calls_count,
          AVG(response_time_ms) as average_response_time_ms,
          jsonb_object_agg(
            model,
            COUNT(*)
          ) FILTER (WHERE model IS NOT NULL) as models_used
        FROM claude_api_calls
        WHERE user_id = $1
          AND DATE(created_at) = $2
      ),
      tool_stats AS (
        SELECT
          jsonb_object_agg(
            tool_name,
            COUNT(*)
          ) as tools_used
        FROM claude_tool_executions
        WHERE user_id = $1
          AND DATE(created_at) = $2
      )
      INSERT INTO claude_usage_daily_summary (
        user_id,
        date,
        api_calls_count,
        total_input_tokens,
        total_output_tokens,
        total_tokens,
        total_cost_usd,
        unique_conversations,
        tool_calls_count,
        average_response_time_ms,
        models_used,
        tools_used
      )
      SELECT
        $1,
        $2,
        COALESCE(ds.api_calls_count, 0),
        COALESCE(ds.total_input_tokens, 0),
        COALESCE(ds.total_output_tokens, 0),
        COALESCE(ds.total_tokens, 0),
        COALESCE(ds.total_cost_usd, 0),
        COALESCE(ds.unique_conversations, 0),
        COALESCE(ds.tool_calls_count, 0),
        ds.average_response_time_ms,
        COALESCE(ds.models_used, '{}'::jsonb),
        COALESCE(ts.tools_used, '{}'::jsonb)
      FROM daily_stats ds
      CROSS JOIN tool_stats ts
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        api_calls_count = EXCLUDED.api_calls_count,
        total_input_tokens = EXCLUDED.total_input_tokens,
        total_output_tokens = EXCLUDED.total_output_tokens,
        total_tokens = EXCLUDED.total_tokens,
        total_cost_usd = EXCLUDED.total_cost_usd,
        unique_conversations = EXCLUDED.unique_conversations,
        tool_calls_count = EXCLUDED.tool_calls_count,
        average_response_time_ms = EXCLUDED.average_response_time_ms,
        models_used = EXCLUDED.models_used,
        tools_used = EXCLUDED.tools_used,
        updated_at = NOW()`,
      [user_id, date]
    );
  } catch (error) {
    console.error('Failed to aggregate daily summary:', error);
    throw new Error(`Failed to aggregate daily summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Pricing Functions
// ============================================================================

/**
 * Get model pricing for a specific model and effective date
 *
 * @param model_name Model identifier (e.g., "claude-sonnet-4-20250514")
 * @param effective_date Date to check pricing (defaults to current date)
 * @returns Pricing record or null if not found
 */
export async function getModelPricing(
  model_name: string,
  effective_date: Date = new Date()
): Promise<ClaudeModelPricing | null> {
  try {
    const result = await pool.query<ClaudeModelPricing>(
      `SELECT *
      FROM claude_model_pricing
      WHERE model_name = $1
        AND effective_from <= $2
        AND (effective_until IS NULL OR effective_until >= $2)
      ORDER BY effective_from DESC
      LIMIT 1`,
      [model_name, effective_date]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Failed to get model pricing:', error);
    throw new Error(`Failed to get model pricing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
