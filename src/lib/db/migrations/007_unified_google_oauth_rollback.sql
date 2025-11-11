-- Rollback for Unified Google OAuth Migration
-- Rollback: 007_unified_google_oauth
-- Created: 2025-11-11
-- Description: Revert google_oauth_tokens changes to pre-unified state

-- ============================================================================
-- 1. Drop new unique constraint
-- ============================================================================

ALTER TABLE google_oauth_tokens
DROP CONSTRAINT IF EXISTS google_oauth_tokens_user_email_unique;

-- ============================================================================
-- 2. Restore original unique constraint (one token per user)
-- ============================================================================

-- Note: This will fail if there are multiple Google accounts per user
-- Users must manually clean up duplicate accounts before rollback
ALTER TABLE google_oauth_tokens
ADD CONSTRAINT google_oauth_tokens_user_id_key UNIQUE(user_id);

-- ============================================================================
-- 3. Drop google_account_email column
-- ============================================================================

DROP INDEX IF EXISTS idx_oauth_tokens_email;

ALTER TABLE google_oauth_tokens
DROP COLUMN IF EXISTS google_account_email;

-- ============================================================================
-- 4. Restore original comments
-- ============================================================================

COMMENT ON TABLE google_oauth_tokens IS 'Stores OAuth2 tokens for Google Calendar API access';
COMMENT ON COLUMN google_oauth_tokens.scope IS 'Space-separated list of granted scopes';

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Unified Google OAuth Rollback (007_unified_google_oauth_rollback) completed';
  RAISE NOTICE 'Reverted google_oauth_tokens to single-account mode';
  RAISE NOTICE 'Removed google_account_email column';
END $$;
