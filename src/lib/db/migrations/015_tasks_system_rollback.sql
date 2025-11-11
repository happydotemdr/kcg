-- Rollback for Tasks System Migration
-- Rollback: 015_tasks_system
-- Created: 2025-11-11
-- Description: Remove task_lists and tasks tables with all associated objects

-- ============================================================================
-- 1. Drop views
-- ============================================================================
DROP VIEW IF EXISTS overdue_tasks;
DROP VIEW IF EXISTS active_tasks_with_lists;

-- ============================================================================
-- 2. Drop helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS complete_task(UUID);
DROP FUNCTION IF EXISTS get_subtasks(UUID);
DROP FUNCTION IF EXISTS get_upcoming_tasks(TEXT, INTEGER);

-- ============================================================================
-- 3. Drop triggers
-- ============================================================================
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS task_lists_updated_at ON task_lists;

-- ============================================================================
-- 4. Drop indexes for tasks
-- ============================================================================
DROP INDEX IF EXISTS idx_tasks_account;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_parent;
DROP INDEX IF EXISTS idx_tasks_calendar_event;
DROP INDEX IF EXISTS idx_tasks_tasklist;
DROP INDEX IF EXISTS idx_tasks_google_id;
DROP INDEX IF EXISTS idx_tasks_user_status;

-- ============================================================================
-- 5. Drop indexes for task_lists
-- ============================================================================
DROP INDEX IF EXISTS idx_task_lists_account;
DROP INDEX IF EXISTS idx_task_lists_google_id;
DROP INDEX IF EXISTS idx_task_lists_user_default;
DROP INDEX IF EXISTS idx_task_lists_user;

-- ============================================================================
-- 6. Drop tables (tasks first due to FK dependency on task_lists)
-- ============================================================================
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS task_lists;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Tasks System Rollback (015_tasks_system_rollback) completed';
  RAISE NOTICE 'Removed task_lists and tasks tables with all indexes, functions, and views';
END $$;
