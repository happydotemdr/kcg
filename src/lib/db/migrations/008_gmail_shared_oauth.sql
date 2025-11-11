-- Gmail Shared OAuth Migration
-- Migration: 008_gmail_shared_oauth
-- Created: 2025-11-11
-- Description: Refactor gmail_accounts to use shared google_oauth_tokens instead of duplicate token storage

-- ============================================================================
-- 1. Add google_account_email column to gmail_accounts
-- ============================================================================

ALTER TABLE gmail_accounts
ADD COLUMN IF NOT EXISTS google_account_email TEXT;

-- ============================================================================
-- 2. Migrate existing Gmail token data to google_oauth_tokens (if any)
-- ============================================================================

-- Insert existing Gmail tokens into google_oauth_tokens
-- This handles existing gmail_accounts that have tokens stored
INSERT INTO google_oauth_tokens (user_id, access_token, refresh_token, token_type, expiry_date, scope, google_account_email)
SELECT
  (SELECT id FROM users WHERE clerk_user_id = ga.user_id LIMIT 1) as user_id,
  ga.gmail_access_token as access_token,
  ga.gmail_refresh_token as refresh_token,
  ga.gmail_token_type as token_type,
  ga.gmail_expiry_date as expiry_date,
  ga.gmail_scope as scope,
  ga.email as google_account_email
FROM gmail_accounts ga
WHERE ga.gmail_access_token IS NOT NULL
  AND NOT EXISTS (
    -- Avoid duplicates if token already exists for this user+email
    SELECT 1 FROM google_oauth_tokens got
    WHERE got.user_id = (SELECT id FROM users WHERE clerk_user_id = ga.user_id LIMIT 1)
      AND got.google_account_email = ga.email
  );

-- Update gmail_accounts to reference the shared tokens
UPDATE gmail_accounts
SET google_account_email = email
WHERE google_account_email IS NULL;

-- ============================================================================
-- 3. Drop duplicate Gmail token columns from gmail_accounts
-- ============================================================================

ALTER TABLE gmail_accounts
DROP COLUMN IF EXISTS gmail_access_token,
DROP COLUMN IF EXISTS gmail_refresh_token,
DROP COLUMN IF EXISTS gmail_token_type,
DROP COLUMN IF EXISTS gmail_expiry_date,
DROP COLUMN IF EXISTS gmail_scope;

-- ============================================================================
-- 4. Make google_account_email NOT NULL after data migration
-- ============================================================================

ALTER TABLE gmail_accounts
ALTER COLUMN google_account_email SET NOT NULL;

-- ============================================================================
-- 5. Create indexes for foreign key lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gmail_accounts_google_email ON gmail_accounts(user_id, google_account_email);

-- ============================================================================
-- 6. Add CHECK constraint to ensure consistency
-- ============================================================================

-- Add check constraint to ensure email matches google_account_email
-- (Both should be the same Gmail address)
ALTER TABLE gmail_accounts
ADD CONSTRAINT gmail_accounts_email_consistency CHECK (email = google_account_email);

-- ============================================================================
-- 7. Update comments
-- ============================================================================

COMMENT ON COLUMN gmail_accounts.google_account_email IS 'References google_account_email in google_oauth_tokens (shared OAuth tokens with Calendar)';

-- ============================================================================
-- 8. Update is_gmail_token_expired function to use shared tokens
-- ============================================================================

-- Drop old function
DROP FUNCTION IF EXISTS is_gmail_token_expired(UUID);

-- Create new function that references google_oauth_tokens
CREATE OR REPLACE FUNCTION is_gmail_token_expired(account_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiry BIGINT;
  current_time_ms BIGINT;
BEGIN
  -- Look up token expiry from google_oauth_tokens via gmail_accounts
  SELECT got.expiry_date INTO expiry
  FROM gmail_accounts ga
  JOIN users u ON ga.user_id = u.clerk_user_id
  JOIN google_oauth_tokens got ON got.user_id = u.id AND got.google_account_email = ga.google_account_email
  WHERE ga.id = account_id_param;

  IF expiry IS NULL THEN
    RETURN FALSE; -- No expiry set, assume valid
  END IF;

  current_time_ms := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000; -- Convert to milliseconds
  RETURN current_time_ms >= expiry;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Gmail Shared OAuth Migration (008_gmail_shared_oauth) completed successfully';
  RAISE NOTICE 'Migrated Gmail tokens to google_oauth_tokens table';
  RAISE NOTICE 'Removed duplicate token columns from gmail_accounts';
  RAISE NOTICE 'gmail_accounts now references google_oauth_tokens via google_account_email';
END $$;
