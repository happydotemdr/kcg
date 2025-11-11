-- Claude Token Usage Tracking Schema
-- Migration: 006_claude_usage_tracking
-- Created: 2025-11-10
-- Description: Comprehensive token usage and cost tracking for Claude AI API with partitioning

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- ============================================================================
-- 1. Claude Model Pricing Table
-- ============================================================================
-- Must be created first as other tables reference it for cost calculations

CREATE TABLE IF NOT EXISTS claude_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  input_token_price_per_million NUMERIC(10,6) NOT NULL,
  output_token_price_per_million NUMERIC(10,6) NOT NULL,
  cache_write_token_price_per_million NUMERIC(10,6) NOT NULL DEFAULT 0,
  cache_read_token_price_per_million NUMERIC(10,6) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE, -- nullable, null means currently effective
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (input_token_price_per_million >= 0),
  CHECK (output_token_price_per_million >= 0),
  CHECK (cache_write_token_price_per_million >= 0),
  CHECK (cache_read_token_price_per_million >= 0),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Indexes for pricing lookups
CREATE INDEX IF NOT EXISTS idx_pricing_model_dates ON claude_model_pricing(model_name, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_current ON claude_model_pricing(model_name) WHERE effective_until IS NULL;

-- Table comment
COMMENT ON TABLE claude_model_pricing IS 'Anthropic Claude model pricing history for accurate cost calculations';
COMMENT ON COLUMN claude_model_pricing.effective_from IS 'Start date when this pricing became effective';
COMMENT ON COLUMN claude_model_pricing.effective_until IS 'End date of pricing validity (NULL = currently active)';
COMMENT ON COLUMN claude_model_pricing.cache_write_token_price_per_million IS 'Cache write tokens are 25% more than base input price';
COMMENT ON COLUMN claude_model_pricing.cache_read_token_price_per_million IS 'Cache read tokens are 90% less than base input price';

-- ============================================================================
-- 2. Claude API Calls Table (PARTITIONED)
-- ============================================================================
-- Main table for tracking every Claude API call
-- Partitioned by month on created_at for efficient querying and archival

-- PARTITIONING STRATEGY:
-- - Monthly partitions based on created_at (RANGE partitioning)
-- - Naming convention: claude_api_calls_y{YYYY}m{MM} (e.g., claude_api_calls_y2025m11)
-- - Automated partition creation via create_monthly_partition_if_not_exists() function
-- - Retention: Keep 12 months of detailed data, older partitions can be archived/dropped
-- - Performance: Each partition is ~30 days of data, indexes on each partition
-- - Maintenance: Create partitions 2 months in advance to avoid gaps

CREATE TABLE IF NOT EXISTS claude_api_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References users(id), enforced at application level for partitioned tables
  conversation_id VARCHAR(255), -- nullable, file-based conversation ID from data/conversations/
  conversation_title VARCHAR(500), -- denormalized for retention when conversation deleted
  request_id VARCHAR(255), -- Anthropic request_id for debugging (from response headers)
  message_id VARCHAR(255) NOT NULL, -- Anthropic message.id from API response
  model VARCHAR(100) NOT NULL, -- e.g., claude-sonnet-4-20250514

  -- Token usage breakdown (direct from API response)
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens + cache_creation_input_tokens) STORED,

  -- Cost calculation
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,

  -- Response metadata
  stop_reason VARCHAR(50), -- end_turn, max_tokens, tool_use, stop_sequence
  tool_calls_count INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER, -- API latency in milliseconds

  -- Error tracking
  error_type VARCHAR(100), -- nullable, if call failed (rate_limit_error, invalid_request_error, etc.)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (input_tokens >= 0),
  CHECK (output_tokens >= 0),
  CHECK (cache_creation_input_tokens >= 0),
  CHECK (cache_read_input_tokens >= 0),
  CHECK (tool_calls_count >= 0),
  CHECK (estimated_cost_usd >= 0),
  CHECK (response_time_ms IS NULL OR response_time_ms >= 0),

  -- Primary key includes partition key
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Table and column comments
COMMENT ON TABLE claude_api_calls IS 'Partitioned table tracking all Claude API calls with token usage and cost (partitioned by month)';
COMMENT ON COLUMN claude_api_calls.user_id IS 'User who made the API call (FK to users.id validated at application level)';
COMMENT ON COLUMN claude_api_calls.conversation_id IS 'File-based conversation ID from data/conversations/ directory';
COMMENT ON COLUMN claude_api_calls.conversation_title IS 'Denormalized conversation title for retention after file deletion';
COMMENT ON COLUMN claude_api_calls.request_id IS 'Anthropic request ID from x-request-id response header for debugging';
COMMENT ON COLUMN claude_api_calls.message_id IS 'Anthropic message ID from API response';
COMMENT ON COLUMN claude_api_calls.cache_creation_input_tokens IS 'Tokens written to prompt cache (25% premium)';
COMMENT ON COLUMN claude_api_calls.cache_read_input_tokens IS 'Tokens read from prompt cache (90% discount)';
COMMENT ON COLUMN claude_api_calls.total_tokens IS 'Sum of input + output + cache creation tokens (computed column)';
COMMENT ON COLUMN claude_api_calls.estimated_cost_usd IS 'Calculated cost in USD based on model pricing';
COMMENT ON COLUMN claude_api_calls.stop_reason IS 'Why Claude stopped: end_turn, max_tokens, tool_use, stop_sequence';

-- Indexes for partitioned table (created on parent, inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_api_calls_user_date ON claude_api_calls(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_calls_conversation ON claude_api_calls(conversation_id, created_at DESC) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_calls_model_date ON claude_api_calls(model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_calls_request_id ON claude_api_calls(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_calls_message_id ON claude_api_calls(message_id);

-- ============================================================================
-- 3. Claude Tool Executions Table
-- ============================================================================
-- Tracks individual tool calls within Claude conversations

CREATE TABLE IF NOT EXISTS claude_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_call_id UUID NOT NULL, -- References claude_api_calls(id), validated at application level
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL, -- e.g., GET_CALENDAR_EVENTS, CREATE_EVENT, UPDATE_EVENT
  tool_input JSONB, -- Full tool parameters as JSON
  tool_output_summary TEXT, -- Truncated result for reference (first 500 chars)
  execution_time_ms INTEGER, -- Tool execution latency
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tool_exec_api_call ON claude_tool_executions(api_call_id);
CREATE INDEX IF NOT EXISTS idx_tool_exec_user_tool_date ON claude_tool_executions(user_id, tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_exec_tool_date ON claude_tool_executions(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_exec_success ON claude_tool_executions(success, created_at DESC) WHERE success = false;

-- Table comments
COMMENT ON TABLE claude_tool_executions IS 'Tracks individual tool calls during Claude conversations (calendar operations, etc.)';
COMMENT ON COLUMN claude_tool_executions.api_call_id IS 'References claude_api_calls(id) - validated at application level due to partitioning';
COMMENT ON COLUMN claude_tool_executions.tool_output_summary IS 'Truncated tool result (first 500 chars) for debugging without full storage';

-- ============================================================================
-- 4. Claude Conversation Metadata Table
-- ============================================================================
-- Aggregated metadata for each conversation (synced with file-based storage)

CREATE TABLE IF NOT EXISTS claude_conversation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(255) NOT NULL UNIQUE, -- File-based conversation ID
  title VARCHAR(500) NOT NULL,
  model VARCHAR(100) NOT NULL,

  -- Aggregated statistics
  message_count INTEGER NOT NULL DEFAULT 0,
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,

  -- Timestamps
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ, -- soft delete when conversation file is deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (message_count >= 0),
  CHECK (total_input_tokens >= 0),
  CHECK (total_output_tokens >= 0),
  CHECK (total_cost_usd >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_meta_user_date ON claude_conversation_metadata(user_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conv_meta_conversation ON claude_conversation_metadata(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_meta_user_deleted ON claude_conversation_metadata(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_meta_user_active ON claude_conversation_metadata(user_id, last_message_at DESC) WHERE deleted_at IS NULL;

-- Table comments
COMMENT ON TABLE claude_conversation_metadata IS 'Aggregated metadata for file-based Claude conversations with usage tracking';
COMMENT ON COLUMN claude_conversation_metadata.conversation_id IS 'Matches file-based conversation ID in data/conversations/ directory';
COMMENT ON COLUMN claude_conversation_metadata.deleted_at IS 'Soft delete timestamp when conversation file is deleted (for historical cost tracking)';

-- ============================================================================
-- 5. Claude Usage Daily Summary Table
-- ============================================================================
-- Pre-aggregated daily statistics for fast dashboard queries

CREATE TABLE IF NOT EXISTS claude_usage_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- API call statistics
  api_calls_count INTEGER NOT NULL DEFAULT 0,
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,

  -- Conversation statistics
  unique_conversations INTEGER NOT NULL DEFAULT 0,
  tool_calls_count INTEGER NOT NULL DEFAULT 0,
  average_response_time_ms INTEGER,

  -- Breakdown by model and tool
  models_used JSONB, -- {"claude-sonnet-4-20250514": 45, "claude-3-5-haiku-20241022": 12}
  tools_used JSONB, -- {"GET_CALENDAR_EVENTS": 8, "CREATE_EVENT": 4}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_user_date UNIQUE(user_id, date),
  CHECK (api_calls_count >= 0),
  CHECK (total_input_tokens >= 0),
  CHECK (total_output_tokens >= 0),
  CHECK (total_tokens >= 0),
  CHECK (total_cost_usd >= 0),
  CHECK (unique_conversations >= 0),
  CHECK (tool_calls_count >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date ON claude_usage_daily_summary(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON claude_usage_daily_summary(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summary_cost ON claude_usage_daily_summary(user_id, total_cost_usd DESC);

-- Table comments
COMMENT ON TABLE claude_usage_daily_summary IS 'Pre-aggregated daily usage statistics for fast dashboard queries and analytics';
COMMENT ON COLUMN claude_usage_daily_summary.models_used IS 'JSON object with model usage counts: {"model-name": count}';
COMMENT ON COLUMN claude_usage_daily_summary.tools_used IS 'JSON object with tool usage counts: {"tool-name": count}';

-- ============================================================================
-- 6. Insert Initial Pricing Data
-- ============================================================================
-- Current Anthropic pricing as of January 2025

INSERT INTO claude_model_pricing (model_name, input_token_price_per_million, output_token_price_per_million, cache_write_token_price_per_million, cache_read_token_price_per_million, effective_from, notes)
VALUES
  -- Claude Sonnet 4 (latest flagship model)
  (
    'claude-sonnet-4-20250514',
    3.00,
    15.00,
    3.75,  -- 25% premium on input (3.00 * 1.25)
    0.30,  -- 90% discount on input (3.00 * 0.10)
    '2025-01-15',
    'Claude Sonnet 4 - Most intelligent model, best for complex reasoning tasks'
  ),

  -- Claude 3.5 Sonnet (previous generation)
  (
    'claude-3-5-sonnet-20241022',
    3.00,
    15.00,
    3.75,
    0.30,
    '2024-10-22',
    'Claude 3.5 Sonnet - Balanced intelligence and speed'
  ),

  -- Claude 3.5 Haiku (fastest, most economical)
  (
    'claude-3-5-haiku-20241022',
    1.00,
    5.00,
    1.25,  -- 25% premium on input (1.00 * 1.25)
    0.10,  -- 90% discount on input (1.00 * 0.10)
    '2024-10-22',
    'Claude 3.5 Haiku - Fastest and most cost-effective model'
  ),

  -- Claude Opus 4 (future model, pricing announced)
  (
    'claude-opus-4-20250514',
    15.00,
    75.00,
    18.75, -- 25% premium on input (15.00 * 1.25)
    1.50,  -- 90% discount on input (15.00 * 0.10)
    '2025-01-15',
    'Claude Opus 4 - Most capable model (when available)'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. Partition Management Function
-- ============================================================================
-- Automatically creates monthly partitions for claude_api_calls table

CREATE OR REPLACE FUNCTION create_monthly_partition_if_not_exists(
  table_name TEXT,
  partition_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  partition_exists BOOLEAN;
BEGIN
  -- Generate partition name: claude_api_calls_y2025m11
  partition_name := table_name || '_y' ||
                    EXTRACT(YEAR FROM partition_date)::TEXT || 'm' ||
                    LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');

  -- Calculate partition boundaries (first day of month to first day of next month)
  start_date := DATE_TRUNC('month', partition_date)::DATE;
  end_date := (DATE_TRUNC('month', partition_date) + INTERVAL '1 month')::DATE;

  -- Check if partition already exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = partition_name
    AND n.nspname = 'public'
  ) INTO partition_exists;

  IF partition_exists THEN
    RAISE NOTICE 'Partition % already exists', partition_name;
    RETURN FALSE;
  END IF;

  -- Create partition
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    table_name,
    start_date,
    end_date
  );

  RAISE NOTICE 'Created partition % for date range % to %', partition_name, start_date, end_date;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_monthly_partition_if_not_exists IS 'Creates monthly partition for specified table if it does not exist. Returns TRUE if created, FALSE if already exists.';

-- ============================================================================
-- 8. Create Initial Partitions
-- ============================================================================
-- Create partitions for current month and next 2 months to ensure continuity

DO $$
DECLARE
  current_month DATE;
  next_month DATE;
  month_after DATE;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  next_month := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
  month_after := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months')::DATE;

  -- Create current month partition
  PERFORM create_monthly_partition_if_not_exists('claude_api_calls', current_month);

  -- Create next month partition
  PERFORM create_monthly_partition_if_not_exists('claude_api_calls', next_month);

  -- Create month after partition
  PERFORM create_monthly_partition_if_not_exists('claude_api_calls', month_after);

  RAISE NOTICE 'Initial partitions created for claude_api_calls table';
END $$;

-- ============================================================================
-- 9. Triggers for updated_at Timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_claude_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS claude_conversation_metadata_updated_at ON claude_conversation_metadata;
CREATE TRIGGER claude_conversation_metadata_updated_at
  BEFORE UPDATE ON claude_conversation_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_usage_updated_at();

DROP TRIGGER IF EXISTS claude_daily_summary_updated_at ON claude_usage_daily_summary;
CREATE TRIGGER claude_daily_summary_updated_at
  BEFORE UPDATE ON claude_usage_daily_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_claude_usage_updated_at();

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Claude Usage Tracking Schema (006_claude_usage_tracking) created successfully';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  1. claude_model_pricing - Model pricing history';
  RAISE NOTICE '  2. claude_api_calls - Partitioned API call tracking (monthly partitions)';
  RAISE NOTICE '  3. claude_tool_executions - Tool call tracking';
  RAISE NOTICE '  4. claude_conversation_metadata - Conversation aggregates';
  RAISE NOTICE '  5. claude_usage_daily_summary - Daily usage summaries';
  RAISE NOTICE '';
  RAISE NOTICE 'Partitions created: current month + next 2 months';
  RAISE NOTICE 'Functions created: create_monthly_partition_if_not_exists()';
  RAISE NOTICE 'Indexes, triggers, and constraints applied';
  RAISE NOTICE '=============================================================================';
END $$;

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
-- Uncomment the section below to rollback this migration

/*
-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS claude_usage_daily_summary CASCADE;
DROP TABLE IF EXISTS claude_conversation_metadata CASCADE;
DROP TABLE IF EXISTS claude_tool_executions CASCADE;
DROP TABLE IF EXISTS claude_api_calls CASCADE; -- CASCADE will drop all partitions
DROP TABLE IF EXISTS claude_model_pricing CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS create_monthly_partition_if_not_exists(TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS update_claude_usage_updated_at() CASCADE;

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE 'Claude Usage Tracking Schema (006_claude_usage_tracking) rolled back successfully';
  RAISE NOTICE 'All tables, partitions, functions, indexes, and triggers removed';
END $$;
*/
