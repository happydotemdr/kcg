/**
 * Service layer for Claude API usage tracking
 *
 * This module provides high-level functions for tracking Claude API usage,
 * calculating costs, and orchestrating multi-step tracking operations.
 *
 * Usage:
 * ```typescript
 * import { trackApiCall, trackToolExecution } from './claude-usage-tracker.js';
 *
 * // In your Claude API integration
 * const response = await anthropic.messages.create(...);
 * const apiCallId = await trackApiCall(userId, conversationId, title, response);
 *
 * // If tools were used
 * await trackToolExecution(apiCallId, userId, 'get_calendar_events', input, result);
 * ```
 */

import {
  recordApiCall,
  recordToolExecution,
  upsertConversationMetadata,
  getModelPricing
} from './db/repositories/claude-usage.js';
import type { RecordApiCallInput } from '../types/usage.js';

/**
 * Calculate the cost of a Claude API call based on token usage and model pricing
 *
 * This function:
 * 1. Queries the database for current model pricing
 * 2. Applies different rates for input, output, cache write, and cache read tokens
 * 3. Falls back to Sonnet 4 pricing if model is not found in database
 *
 * Pricing tiers (as of Jan 2025):
 * - Input tokens: $3.00 per million
 * - Output tokens: $15.00 per million
 * - Cache write: $3.75 per million (25% premium)
 * - Cache read: $0.30 per million (90% discount)
 *
 * @param model Model identifier (e.g., "claude-sonnet-4-20250514")
 * @param input_tokens Number of input tokens consumed
 * @param output_tokens Number of output tokens generated
 * @param cache_creation_tokens Number of tokens written to cache (optional)
 * @param cache_read_tokens Number of tokens read from cache (optional)
 * @param effective_date Date to check pricing (defaults to current date)
 * @returns Total cost in USD
 */
export async function calculateCost(
  model: string,
  input_tokens: number,
  output_tokens: number,
  cache_creation_tokens: number = 0,
  cache_read_tokens: number = 0,
  effective_date?: Date
): Promise<number> {
  try {
    // Get pricing for the model from database
    const pricing = await getModelPricing(model, effective_date);

    if (!pricing) {
      console.warn(`No pricing found for model ${model}, using default Sonnet 4 rates`);
      // Fallback pricing (Claude Sonnet 4 rates)
      return (
        (input_tokens / 1_000_000) * 3.0 +
        (output_tokens / 1_000_000) * 15.0 +
        (cache_creation_tokens / 1_000_000) * 3.75 +
        (cache_read_tokens / 1_000_000) * 0.3
      );
    }

    // Calculate cost using database pricing
    const input_cost = (input_tokens / 1_000_000) * pricing.input_token_price_per_million;
    const output_cost = (output_tokens / 1_000_000) * pricing.output_token_price_per_million;
    const cache_write_cost = (cache_creation_tokens / 1_000_000) * pricing.cache_write_token_price_per_million;
    const cache_read_cost = (cache_read_tokens / 1_000_000) * pricing.cache_read_token_price_per_million;

    return input_cost + output_cost + cache_write_cost + cache_read_cost;
  } catch (error) {
    console.error('Error calculating cost, using fallback pricing:', error);
    // Fallback to Sonnet 4 pricing on error
    return (
      (input_tokens / 1_000_000) * 3.0 +
      (output_tokens / 1_000_000) * 15.0 +
      (cache_creation_tokens / 1_000_000) * 3.75 +
      (cache_read_tokens / 1_000_000) * 0.3
    );
  }
}

/**
 * Track a Claude API call with full usage metadata
 *
 * This is the primary function to call after each Claude API request.
 * It handles:
 * 1. Cost calculation based on token usage
 * 2. Recording the API call in the database
 * 3. Updating conversation-level aggregates (if applicable)
 *
 * @param user_id Clerk user ID
 * @param conversation_id Optional conversation ID (null for one-off requests)
 * @param conversation_title Optional conversation title
 * @param response Claude API response object
 * @param additional_data Optional metadata (request ID, tool counts, timing, errors)
 * @returns The database ID of the recorded API call
 *
 * @example
 * ```typescript
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: 4096,
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * const apiCallId = await trackApiCall(
 *   userId,
 *   conversationId,
 *   'My Conversation',
 *   response,
 *   {
 *     request_id: 'req_123',
 *     response_time_ms: 1500
 *   }
 * );
 * ```
 */
export async function trackApiCall(
  user_id: string,
  conversation_id: string | undefined,
  conversation_title: string | undefined,
  response: {
    id: string;
    model: string;
    stop_reason: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  },
  additional_data?: {
    request_id?: string;
    tool_calls_count?: number;
    response_time_ms?: number;
    error_type?: string;
  }
): Promise<string> {
  try {
    // Extract token counts with defaults for optional cache tokens
    const input_tokens = response.usage.input_tokens;
    const output_tokens = response.usage.output_tokens;
    const cache_creation_tokens = response.usage.cache_creation_input_tokens || 0;
    const cache_read_tokens = response.usage.cache_read_input_tokens || 0;

    // Calculate cost based on model pricing
    const cost = await calculateCost(
      response.model,
      input_tokens,
      output_tokens,
      cache_creation_tokens,
      cache_read_tokens
    );

    // Record API call in database
    const apiCall = await recordApiCall({
      user_id,
      conversation_id,
      conversation_title,
      message_id: response.id,
      model: response.model,
      input_tokens,
      output_tokens,
      cache_creation_tokens,
      cache_read_tokens,
      estimated_cost_usd: cost,
      stop_reason: response.stop_reason,
      ...additional_data
    });

    // Update conversation metadata if this is part of a conversation
    if (conversation_id && conversation_title) {
      await upsertConversationMetadata(
        user_id,
        conversation_id,
        conversation_title,
        response.model,
        cost,
        input_tokens,
        output_tokens
      );
    }

    return apiCall.id;
  } catch (error) {
    console.error('Failed to track API call:', error);
    throw new Error(`Failed to track API call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Track a tool execution linked to an API call
 *
 * Call this function for each tool that was executed during a Claude API call.
 * This enables analytics on tool usage, performance, and reliability.
 *
 * @param api_call_id Database ID from trackApiCall()
 * @param user_id Clerk user ID
 * @param tool_name Name of the tool that was executed
 * @param tool_input Input parameters passed to the tool
 * @param execution_result Execution metadata (success, timing, output, errors)
 *
 * @example
 * ```typescript
 * const apiCallId = await trackApiCall(...);
 *
 * // Track each tool execution
 * await trackToolExecution(
 *   apiCallId,
 *   userId,
 *   'get_calendar_events',
 *   { start_date: '2025-01-01', end_date: '2025-01-31' },
 *   {
 *     success: true,
 *     execution_time_ms: 250,
 *     output_summary: 'Retrieved 15 calendar events'
 *   }
 * );
 * ```
 */
export async function trackToolExecution(
  api_call_id: string,
  user_id: string,
  tool_name: string,
  tool_input: any,
  execution_result: {
    success: boolean;
    execution_time_ms?: number;
    output_summary?: string;
    error_message?: string;
  }
): Promise<void> {
  try {
    await recordToolExecution({
      api_call_id,
      user_id,
      tool_name,
      tool_input,
      success: execution_result.success,
      execution_time_ms: execution_result.execution_time_ms,
      tool_output_summary: execution_result.output_summary,
      error_message: execution_result.error_message
    });
  } catch (error) {
    console.error('Failed to track tool execution:', error);
    // Don't throw - tool tracking failure shouldn't break the main flow
    // Log the error and continue
  }
}
