/**
 * TypeScript types for Claude API usage tracking and cost analysis
 *
 * This module defines all database table types, input/output types,
 * and query interfaces for the token usage tracking system.
 */

// ============================================================================
// Database Table Types (matching schema from Phase 1)
// ============================================================================

/**
 * Core API call tracking record
 * Maps to: claude_api_calls table (partitioned by created_at)
 */
export interface ClaudeApiCall {
  id: string;
  user_id: string;
  conversation_id: string | null;
  conversation_title: string | null;
  request_id: string | null;
  message_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  stop_reason: string | null;
  tool_calls_count: number;
  response_time_ms: number | null;
  error_type: string | null;
  created_at: Date;
}

/**
 * Tool execution tracking record
 * Maps to: claude_tool_executions table
 */
export interface ClaudeToolExecution {
  id: string;
  api_call_id: string;
  user_id: string;
  tool_name: string;
  tool_input: any;
  tool_output_summary: string | null;
  execution_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: Date;
}

/**
 * Conversation-level metadata and aggregates
 * Maps to: claude_conversation_metadata table
 */
export interface ClaudeConversationMetadata {
  id: string;
  user_id: string;
  conversation_id: string;
  title: string;
  model: string;
  message_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  first_message_at: Date | null;
  last_message_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Pre-aggregated daily usage statistics
 * Maps to: claude_usage_daily_summary table
 */
export interface ClaudeUsageDailySummary {
  id: string;
  user_id: string;
  date: Date;
  api_calls_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  unique_conversations: number;
  tool_calls_count: number;
  average_response_time_ms: number | null;
  models_used: Record<string, number>;
  tools_used: Record<string, number>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Model pricing configuration
 * Maps to: claude_model_pricing table
 */
export interface ClaudeModelPricing {
  id: string;
  model_name: string;
  input_token_price_per_million: number;
  output_token_price_per_million: number;
  cache_write_token_price_per_million: number;
  cache_read_token_price_per_million: number;
  effective_from: Date;
  effective_until: Date | null;
  notes: string | null;
  created_at: Date;
}

// ============================================================================
// Input Types (for creating/updating records)
// ============================================================================

/**
 * Input data for recording a new API call
 */
export interface RecordApiCallInput {
  user_id: string;
  conversation_id?: string;
  conversation_title?: string;
  request_id?: string;
  message_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  estimated_cost_usd: number;
  stop_reason?: string;
  tool_calls_count?: number;
  response_time_ms?: number;
  error_type?: string;
}

/**
 * Input data for recording a tool execution
 */
export interface RecordToolExecutionInput {
  api_call_id: string;
  user_id: string;
  tool_name: string;
  tool_input: any;
  tool_output_summary?: string;
  execution_time_ms?: number;
  success: boolean;
  error_message?: string;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Parameters for querying usage summary with time-based grouping
 */
export interface UsageSummaryQuery {
  user_id: string;
  start_date: Date;
  end_date: Date;
  group_by?: 'day' | 'week' | 'month';
}

/**
 * Parameters for querying conversation costs with filtering and pagination
 */
export interface ConversationCostQuery {
  user_id: string;
  start_date?: Date;
  end_date?: Date;
  sort_by?: 'cost' | 'tokens' | 'date';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  include_deleted?: boolean;
}

// ============================================================================
// Response/Result Types
// ============================================================================

/**
 * Aggregated usage summary with time series breakdown
 */
export interface UsageSummaryResult {
  total_cost: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  api_calls_count: number;
  unique_conversations: number;
  tool_calls_count: number;
  average_cost_per_call: number;
  average_response_time_ms: number;
  time_series: Array<{
    period: string;
    cost: number;
    tokens: number;
    api_calls: number;
  }>;
}

/**
 * Individual conversation cost breakdown
 */
export interface ConversationCostResult {
  conversation_id: string;
  title: string;
  total_cost: number;
  total_tokens: number;
  message_count: number;
  first_message_at: Date;
  last_message_at: Date;
  deleted_at: Date | null;
}

/**
 * Tool usage analytics with performance metrics
 */
export interface ToolUsageBreakdown {
  tool_name: string;
  call_count: number;
  total_execution_time_ms: number;
  average_execution_time_ms: number;
  success_rate: number;
  estimated_associated_cost: number;
}

/**
 * Model usage analytics with cost attribution
 */
export interface ModelUsageBreakdown {
  model: string;
  api_calls_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  percentage_of_total_cost: number;
}
