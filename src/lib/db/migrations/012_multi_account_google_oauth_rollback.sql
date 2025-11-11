-- Rollback for Multi-Account Google OAuth Migration
-- Rollback: 012_multi_account_google_oauth
-- Created: 2025-11-11
-- Description: Remove account_label and is_primary columns from google_oauth_tokens

-- ============================================================================
-- 1. Drop unique constraint for one primary per user
-- ============================================================================

DROP INDEX IF EXISTS google_oauth_tokens_one_primary_per_user;

-- ============================================================================
-- 2. Drop primary account lookup index
-- ============================================================================

DROP INDEX IF EXISTS idx_oauth_tokens_user_primary;

-- ============================================================================
-- 3. Drop is_primary column
-- ============================================================================

ALTER TABLE google_oauth_tokens
DROP COLUMN IF EXISTS is_primary;

-- ============================================================================
-- 4. Drop account_label column
-- ============================================================================

ALTER TABLE google_oauth_tokens
DROP COLUMN IF EXISTS account_label;

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Multi-Account Google OAuth Rollback (012_multi_account_google_oauth_rollback) completed';
  RAISE NOTICE 'Removed account_label and is_primary columns';
  RAISE NOTICE 'Removed associated indexes and constraints';
END $$;
