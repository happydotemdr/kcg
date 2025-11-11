-- Multi-Account Google OAuth Migration
-- Migration: 012_multi_account_google_oauth
-- Created: 2025-11-11
-- Description: Add account_label and is_primary columns to support friendly multi-account management

-- ============================================================================
-- 1. Add account_label column
-- ============================================================================

ALTER TABLE google_oauth_tokens
ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary';

COMMENT ON COLUMN google_oauth_tokens.account_label IS 'User-friendly label for the Google account (e.g., "Work Email", "Personal", "Family Calendar")';

-- ============================================================================
-- 2. Add is_primary column
-- ============================================================================

ALTER TABLE google_oauth_tokens
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN google_oauth_tokens.is_primary IS 'Indicates if this is the user''s primary Google account (only one per user)';

-- ============================================================================
-- 3. Create index for fast primary account lookup
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_primary ON google_oauth_tokens(user_id, is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- 4. Update existing records - set first account per user as primary
-- ============================================================================

WITH first_accounts AS (
  SELECT DISTINCT ON (user_id)
    id
  FROM google_oauth_tokens
  ORDER BY user_id, created_at ASC
)
UPDATE google_oauth_tokens
SET is_primary = TRUE
WHERE id IN (SELECT id FROM first_accounts);

-- ============================================================================
-- 5. Add constraint to ensure only one primary account per user
-- ============================================================================

-- Create unique partial index to enforce one primary per user
CREATE UNIQUE INDEX IF NOT EXISTS google_oauth_tokens_one_primary_per_user
ON google_oauth_tokens(user_id)
WHERE is_primary = TRUE;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Multi-Account Google OAuth Migration (012_multi_account_google_oauth) completed successfully';
  RAISE NOTICE 'Added account_label and is_primary columns';
  RAISE NOTICE 'Set first account per user as primary';
  RAISE NOTICE 'Created indexes for fast primary account lookup';
END $$;
