-- ============================================================================
-- DOWN MIGRATION (Rollback for 006_claude_usage_tracking)
-- ============================================================================
-- This script cleanly removes all tables, functions, and objects created
-- by the Claude usage tracking migration

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
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Claude Usage Tracking Schema (006_claude_usage_tracking) rolled back successfully';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'All tables, partitions, functions, indexes, and triggers removed';
  RAISE NOTICE '=============================================================================';
END $$;
