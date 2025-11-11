-- Unified Google OAuth Migration
-- Migration: 007_unified_google_oauth
-- Created: 2025-11-11
-- Description: Add google_account_email to google_oauth_tokens to support both Calendar and Gmail

-- ============================================================================
-- 1. Add google_account_email column to google_oauth_tokens
-- ============================================================================

ALTER TABLE google_oauth_tokens
ADD COLUMN IF NOT EXISTS google_account_email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_email ON google_oauth_tokens(google_account_email);

-- ============================================================================
-- 2. Update UNIQUE constraint to allow multiple accounts per user
-- ============================================================================

-- Drop existing unique constraint (one token per user)
ALTER TABLE google_oauth_tokens
DROP CONSTRAINT IF EXISTS google_oauth_tokens_user_id_key;

-- Add new unique constraint (one token per user per Google account email)
-- This allows users to connect multiple Google accounts
ALTER TABLE google_oauth_tokens
ADD CONSTRAINT google_oauth_tokens_user_email_unique UNIQUE(user_id, google_account_email);

-- ============================================================================
-- 3. Update comments
-- ============================================================================

COMMENT ON TABLE google_oauth_tokens IS 'Stores OAuth2 tokens for Google Calendar AND Gmail API access (unified OAuth)';
COMMENT ON COLUMN google_oauth_tokens.google_account_email IS 'Google account email address (e.g., user@gmail.com) - allows multi-account support';
COMMENT ON COLUMN google_oauth_tokens.scope IS 'Space-separated list of granted scopes (calendar + gmail)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Unified Google OAuth Migration (007_unified_google_oauth) completed successfully';
  RAISE NOTICE 'Added google_account_email column to google_oauth_tokens';
  RAISE NOTICE 'Updated constraints to support multi-account OAuth';
END $$;
