/**
 * Integration tests for Claude usage repository layer
 *
 * Tests database operations with actual PostgreSQL queries.
 * Requires DATABASE_URL to be set in environment.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  recordApiCall,
  recordToolExecution,
  upsertConversationMetadata,
  getUserUsageSummary,
  getDailySummaries,
  getConversationCosts,
  getToolUsageBreakdown,
  getModelUsageBreakdown,
  aggregateDailySummary,
  getModelPricing
} from '../lib/db/repositories/claude-usage.js';
import { getPool } from '../lib/db/client.js';

// Get pool instance
const pool = getPool();
import type { RecordApiCallInput } from '../types/usage.js';

// Test data constants
const TEST_USER_ID = 'test_user_integration_' + Date.now();
const TEST_CONVERSATION_ID = 'conv_test_' + Date.now();
const TEST_API_CALL_ID_PREFIX = 'api_call_test_';

describe('Claude Usage Repository Integration Tests', () => {
  // Cleanup function to remove test data
  async function cleanupTestData() {
    try {
      await pool.query('DELETE FROM claude_tool_executions WHERE user_id = $1', [TEST_USER_ID]);
      await pool.query('DELETE FROM claude_api_calls WHERE user_id = $1', [TEST_USER_ID]);
      await pool.query('DELETE FROM claude_conversation_metadata WHERE user_id = $1', [TEST_USER_ID]);
      await pool.query('DELETE FROM claude_usage_daily_summary WHERE user_id = $1', [TEST_USER_ID]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  beforeAll(async () => {
    // Ensure database connection is ready
    await pool.query('SELECT 1');
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupTestData();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
    await pool.end();
  });

  describe('recordApiCall', () => {
    it('should record an API call with all fields', async () => {
      const input: RecordApiCallInput = {
        user_id: TEST_USER_ID,
        conversation_id: TEST_CONVERSATION_ID,
        conversation_title: 'Test Conversation',
        request_id: 'req_123',
        message_id: 'msg_456',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 100,
        cache_read_tokens: 200,
        estimated_cost_usd: 0.0245,
        stop_reason: 'end_turn',
        tool_calls_count: 2,
        response_time_ms: 1500
      };

      const result = await recordApiCall(input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(TEST_USER_ID);
      expect(result.conversation_id).toBe(TEST_CONVERSATION_ID);
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.input_tokens).toBe(1000);
      expect(result.output_tokens).toBe(500);
      expect(result.cache_creation_tokens).toBe(100);
      expect(result.cache_read_tokens).toBe(200);
      expect(result.total_tokens).toBe(1800); // Auto-calculated
      expect(result.estimated_cost_usd).toBeCloseTo(0.0245, 4);
      expect(result.tool_calls_count).toBe(2);
      expect(result.response_time_ms).toBe(1500);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should record an API call with minimal fields', async () => {
      const input: RecordApiCallInput = {
        user_id: TEST_USER_ID,
        message_id: 'msg_minimal',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 100,
        output_tokens: 50,
        estimated_cost_usd: 0.0015
      };

      const result = await recordApiCall(input);

      expect(result).toBeDefined();
      expect(result.conversation_id).toBeNull();
      expect(result.conversation_title).toBeNull();
      expect(result.cache_creation_tokens).toBe(0);
      expect(result.cache_read_tokens).toBe(0);
      expect(result.total_tokens).toBe(150);
      expect(result.tool_calls_count).toBe(0);
      expect(result.response_time_ms).toBeNull();
    });

    it('should record an API call with error tracking', async () => {
      const input: RecordApiCallInput = {
        user_id: TEST_USER_ID,
        message_id: 'msg_error',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 100,
        output_tokens: 0,
        estimated_cost_usd: 0.0003,
        error_type: 'rate_limit_error'
      };

      const result = await recordApiCall(input);

      expect(result.error_type).toBe('rate_limit_error');
    });
  });

  describe('recordToolExecution', () => {
    it('should record a successful tool execution', async () => {
      // First create an API call
      const apiCall = await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_with_tool',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 500,
        output_tokens: 200,
        estimated_cost_usd: 0.012,
        tool_calls_count: 1
      });

      // Record tool execution
      await recordToolExecution({
        api_call_id: apiCall.id,
        user_id: TEST_USER_ID,
        tool_name: 'get_calendar_events',
        tool_input: { start_date: '2025-01-01', end_date: '2025-01-31' },
        tool_output_summary: 'Retrieved 15 events',
        execution_time_ms: 250,
        success: true
      });

      // Verify it was recorded
      const result = await pool.query(
        'SELECT * FROM claude_tool_executions WHERE api_call_id = $1',
        [apiCall.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tool_name).toBe('get_calendar_events');
      expect(result.rows[0].success).toBe(true);
      expect(result.rows[0].execution_time_ms).toBe(250);
    });

    it('should record a failed tool execution with error message', async () => {
      const apiCall = await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_tool_fail',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 300,
        output_tokens: 100,
        estimated_cost_usd: 0.009,
        tool_calls_count: 1
      });

      await recordToolExecution({
        api_call_id: apiCall.id,
        user_id: TEST_USER_ID,
        tool_name: 'create_calendar_event',
        tool_input: { title: 'Meeting', date: 'invalid-date' },
        success: false,
        error_message: 'Invalid date format'
      });

      const result = await pool.query(
        'SELECT * FROM claude_tool_executions WHERE api_call_id = $1',
        [apiCall.id]
      );

      expect(result.rows[0].success).toBe(false);
      expect(result.rows[0].error_message).toBe('Invalid date format');
    });
  });

  describe('upsertConversationMetadata', () => {
    it('should create new conversation metadata', async () => {
      await upsertConversationMetadata(
        TEST_USER_ID,
        TEST_CONVERSATION_ID,
        'My First Conversation',
        'claude-sonnet-4-20250514',
        0.05,
        1000,
        500
      );

      const result = await pool.query(
        'SELECT * FROM claude_conversation_metadata WHERE user_id = $1 AND conversation_id = $2',
        [TEST_USER_ID, TEST_CONVERSATION_ID]
      );

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row.title).toBe('My First Conversation');
      expect(row.message_count).toBe(1);
      expect(row.total_input_tokens).toBe(1000);
      expect(row.total_output_tokens).toBe(500);
      expect(parseFloat(row.total_cost_usd)).toBeCloseTo(0.05, 4);
    });

    it('should update existing conversation metadata', async () => {
      // Create initial metadata
      await upsertConversationMetadata(
        TEST_USER_ID,
        TEST_CONVERSATION_ID,
        'Conversation',
        'claude-sonnet-4-20250514',
        0.02,
        500,
        250
      );

      // Update with second message
      await upsertConversationMetadata(
        TEST_USER_ID,
        TEST_CONVERSATION_ID,
        'Conversation', // Title doesn't change
        'claude-sonnet-4-20250514',
        0.03,
        600,
        300
      );

      const result = await pool.query(
        'SELECT * FROM claude_conversation_metadata WHERE user_id = $1 AND conversation_id = $2',
        [TEST_USER_ID, TEST_CONVERSATION_ID]
      );

      const row = result.rows[0];
      expect(row.message_count).toBe(2);
      expect(row.total_input_tokens).toBe(1100); // 500 + 600
      expect(row.total_output_tokens).toBe(550); // 250 + 300
      expect(parseFloat(row.total_cost_usd)).toBeCloseTo(0.05, 4); // 0.02 + 0.03
    });
  });

  describe('getUserUsageSummary', () => {
    beforeEach(async () => {
      // Create test data for summary queries
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Today's API calls
      await recordApiCall({
        user_id: TEST_USER_ID,
        conversation_id: TEST_CONVERSATION_ID,
        conversation_title: 'Test Conv',
        message_id: 'msg_today_1',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 1000,
        output_tokens: 500,
        estimated_cost_usd: 0.0105,
        response_time_ms: 1000,
        tool_calls_count: 1
      });

      await recordApiCall({
        user_id: TEST_USER_ID,
        conversation_id: TEST_CONVERSATION_ID,
        conversation_title: 'Test Conv',
        message_id: 'msg_today_2',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 800,
        output_tokens: 400,
        estimated_cost_usd: 0.0084,
        response_time_ms: 800
      });

      // Force yesterday's date by updating created_at
      const yesterdayCall = await recordApiCall({
        user_id: TEST_USER_ID,
        conversation_id: 'conv_yesterday',
        conversation_title: 'Yesterday Conv',
        message_id: 'msg_yesterday',
        model: 'claude-haiku-3-20240307',
        input_tokens: 500,
        output_tokens: 250,
        estimated_cost_usd: 0.0035,
        response_time_ms: 500
      });

      await pool.query(
        'UPDATE claude_api_calls SET created_at = $1 WHERE id = $2',
        [yesterday, yesterdayCall.id]
      );
    });

    it('should calculate usage summary correctly', async () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const summary = await getUserUsageSummary(TEST_USER_ID, weekAgo, today);

      expect(summary.total_cost).toBeGreaterThan(0);
      expect(summary.api_calls_count).toBe(3);
      expect(summary.total_tokens).toBe(3450); // 1000+500+800+400+500+250
      expect(summary.unique_conversations).toBe(2);
      expect(summary.tool_calls_count).toBe(1);
      expect(summary.average_response_time_ms).toBeGreaterThan(0);
      expect(summary.time_series).toHaveLength(2); // Today and yesterday
    });

    it('should return empty summary for user with no data', async () => {
      const summary = await getUserUsageSummary('nonexistent_user', new Date(), new Date());

      expect(summary.total_cost).toBe(0);
      expect(summary.api_calls_count).toBe(0);
      expect(summary.time_series).toHaveLength(0);
    });
  });

  describe('getConversationCosts', () => {
    beforeEach(async () => {
      // Create conversations with different costs
      await upsertConversationMetadata(
        TEST_USER_ID,
        'conv_expensive',
        'Expensive Conversation',
        'claude-sonnet-4-20250514',
        1.50,
        50000,
        25000
      );

      await upsertConversationMetadata(
        TEST_USER_ID,
        'conv_cheap',
        'Cheap Conversation',
        'claude-haiku-3-20240307',
        0.05,
        5000,
        2500
      );

      await upsertConversationMetadata(
        TEST_USER_ID,
        'conv_medium',
        'Medium Conversation',
        'claude-sonnet-4-20250514',
        0.50,
        15000,
        7500
      );
    });

    it('should return conversations sorted by cost descending', async () => {
      const result = await getConversationCosts({
        user_id: TEST_USER_ID,
        sort_by: 'cost',
        sort_order: 'desc'
      });

      expect(result.conversations).toHaveLength(3);
      expect(result.total_count).toBe(3);
      expect(result.conversations[0].conversation_id).toBe('conv_expensive');
      expect(result.conversations[1].conversation_id).toBe('conv_medium');
      expect(result.conversations[2].conversation_id).toBe('conv_cheap');
    });

    it('should support pagination', async () => {
      const page1 = await getConversationCosts({
        user_id: TEST_USER_ID,
        sort_by: 'cost',
        sort_order: 'desc',
        limit: 2,
        offset: 0
      });

      const page2 = await getConversationCosts({
        user_id: TEST_USER_ID,
        sort_by: 'cost',
        sort_order: 'desc',
        limit: 2,
        offset: 2
      });

      expect(page1.conversations).toHaveLength(2);
      expect(page2.conversations).toHaveLength(1);
      expect(page1.total_count).toBe(3);
      expect(page2.total_count).toBe(3);
    });
  });

  describe('getToolUsageBreakdown', () => {
    beforeEach(async () => {
      const apiCall1 = await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_tool_1',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 500,
        output_tokens: 200,
        estimated_cost_usd: 0.015,
        tool_calls_count: 2
      });

      await recordToolExecution({
        api_call_id: apiCall1.id,
        user_id: TEST_USER_ID,
        tool_name: 'get_calendar_events',
        tool_input: {},
        execution_time_ms: 200,
        success: true
      });

      await recordToolExecution({
        api_call_id: apiCall1.id,
        user_id: TEST_USER_ID,
        tool_name: 'create_calendar_event',
        tool_input: {},
        execution_time_ms: 300,
        success: false,
        error_message: 'Calendar not found'
      });

      const apiCall2 = await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_tool_2',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 400,
        output_tokens: 150,
        estimated_cost_usd: 0.012,
        tool_calls_count: 1
      });

      await recordToolExecution({
        api_call_id: apiCall2.id,
        user_id: TEST_USER_ID,
        tool_name: 'get_calendar_events',
        tool_input: {},
        execution_time_ms: 250,
        success: true
      });
    });

    it('should return tool usage breakdown with success rates', async () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const breakdown = await getToolUsageBreakdown(TEST_USER_ID, weekAgo, today);

      expect(breakdown).toHaveLength(2);

      const getEvents = breakdown.find(t => t.tool_name === 'get_calendar_events');
      expect(getEvents).toBeDefined();
      expect(getEvents!.call_count).toBe(2);
      expect(getEvents!.success_rate).toBe(1.0); // 100% success

      const createEvent = breakdown.find(t => t.tool_name === 'create_calendar_event');
      expect(createEvent).toBeDefined();
      expect(createEvent!.call_count).toBe(1);
      expect(createEvent!.success_rate).toBe(0.0); // 0% success
    });
  });

  describe('getModelUsageBreakdown', () => {
    beforeEach(async () => {
      await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_sonnet_1',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 1000,
        output_tokens: 500,
        estimated_cost_usd: 0.0105
      });

      await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_sonnet_2',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 800,
        output_tokens: 400,
        estimated_cost_usd: 0.0084
      });

      await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_haiku_1',
        model: 'claude-haiku-3-20240307',
        input_tokens: 500,
        output_tokens: 250,
        estimated_cost_usd: 0.00194
      });
    });

    it('should return model usage breakdown with cost percentages', async () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const breakdown = await getModelUsageBreakdown(TEST_USER_ID, weekAgo, today);

      expect(breakdown).toHaveLength(2);

      const sonnet = breakdown.find(m => m.model === 'claude-sonnet-4-20250514');
      expect(sonnet).toBeDefined();
      expect(sonnet!.api_calls_count).toBe(2);
      expect(sonnet!.total_input_tokens).toBe(1800);
      expect(sonnet!.total_output_tokens).toBe(900);
      expect(sonnet!.percentage_of_total_cost).toBeGreaterThan(85); // Should be ~90%

      const haiku = breakdown.find(m => m.model === 'claude-haiku-3-20240307');
      expect(haiku).toBeDefined();
      expect(haiku!.api_calls_count).toBe(1);
      expect(haiku!.percentage_of_total_cost).toBeLessThan(15); // Should be ~10%
    });
  });

  describe('aggregateDailySummary', () => {
    it('should aggregate daily summary for a specific date', async () => {
      // Create test data for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await recordApiCall({
        user_id: TEST_USER_ID,
        conversation_id: TEST_CONVERSATION_ID,
        message_id: 'msg_agg_1',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 1000,
        output_tokens: 500,
        estimated_cost_usd: 0.0105,
        tool_calls_count: 1
      });

      await recordApiCall({
        user_id: TEST_USER_ID,
        conversation_id: TEST_CONVERSATION_ID,
        message_id: 'msg_agg_2',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 800,
        output_tokens: 400,
        estimated_cost_usd: 0.0084
      });

      // Aggregate the data
      await aggregateDailySummary(TEST_USER_ID, today);

      // Verify aggregation
      const result = await pool.query(
        'SELECT * FROM claude_usage_daily_summary WHERE user_id = $1 AND date = $2',
        [TEST_USER_ID, today]
      );

      expect(result.rows).toHaveLength(1);
      const summary = result.rows[0];
      expect(summary.api_calls_count).toBe(2);
      expect(summary.total_input_tokens).toBe(1800);
      expect(summary.total_output_tokens).toBe(900);
      expect(summary.unique_conversations).toBe(1);
      expect(summary.tool_calls_count).toBe(1);
      expect(summary.models_used).toBeDefined();
    });

    it('should update existing daily summary on re-aggregation', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_first',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 500,
        output_tokens: 250,
        estimated_cost_usd: 0.005
      });

      await aggregateDailySummary(TEST_USER_ID, today);

      // Add more data
      await recordApiCall({
        user_id: TEST_USER_ID,
        message_id: 'msg_second',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 600,
        output_tokens: 300,
        estimated_cost_usd: 0.006
      });

      // Re-aggregate
      await aggregateDailySummary(TEST_USER_ID, today);

      const result = await pool.query(
        'SELECT * FROM claude_usage_daily_summary WHERE user_id = $1 AND date = $2',
        [TEST_USER_ID, today]
      );

      expect(result.rows).toHaveLength(1);
      const summary = result.rows[0];
      expect(summary.api_calls_count).toBe(2); // Updated count
    });
  });

  describe('getModelPricing', () => {
    it('should retrieve current pricing for Sonnet 4', async () => {
      const pricing = await getModelPricing('claude-sonnet-4-20250514');

      expect(pricing).toBeDefined();
      expect(pricing!.model_name).toBe('claude-sonnet-4-20250514');
      expect(pricing!.input_token_price_per_million).toBe(3.0);
      expect(pricing!.output_token_price_per_million).toBe(15.0);
    });

    it('should return null for non-existent model', async () => {
      const pricing = await getModelPricing('nonexistent-model-xyz');

      expect(pricing).toBeNull();
    });

    it('should retrieve pricing for specific effective date', async () => {
      const effectiveDate = new Date('2025-01-15');
      const pricing = await getModelPricing('claude-sonnet-4-20250514', effectiveDate);

      expect(pricing).toBeDefined();
      expect(pricing!.effective_from).toBeLessThanOrEqual(effectiveDate);
      if (pricing!.effective_until) {
        expect(pricing!.effective_until).toBeGreaterThanOrEqual(effectiveDate);
      }
    });
  });
});
