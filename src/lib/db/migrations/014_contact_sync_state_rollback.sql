-- Rollback for Contact Sync State Migration
-- Rollback: 014_contact_sync_state
-- Created: 2025-11-11
-- Description: Remove contact_sync_state table and helper functions

-- ============================================================================
-- 1. Drop helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS get_accounts_needing_sync(INTEGER);

-- ============================================================================
-- 2. Drop trigger
-- ============================================================================
DROP TRIGGER IF EXISTS contact_sync_state_updated_at ON contact_sync_state;

-- ============================================================================
-- 3. Drop indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_contact_sync_last_synced;
DROP INDEX IF EXISTS idx_contact_sync_status;
DROP INDEX IF EXISTS idx_contact_sync_user_account;

-- ============================================================================
-- 4. Drop table
-- ============================================================================
DROP TABLE IF EXISTS contact_sync_state;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Contact Sync State Rollback (014_contact_sync_state_rollback) completed';
  RAISE NOTICE 'Removed contact_sync_state table, indexes, and helper functions';
END $$;
