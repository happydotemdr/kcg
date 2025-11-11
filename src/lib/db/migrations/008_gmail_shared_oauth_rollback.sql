-- Rollback for Gmail Shared OAuth Migration
-- Rollback: 008_gmail_shared_oauth
-- Created: 2025-11-11
-- Description: Restore gmail_accounts to have its own OAuth token columns

-- ============================================================================
-- 1. Restore Gmail token columns to gmail_accounts
-- ============================================================================

ALTER TABLE gmail_accounts
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_type VARCHAR(50) DEFAULT 'Bearer',
ADD COLUMN IF NOT EXISTS gmail_expiry_date BIGINT,
ADD COLUMN IF NOT EXISTS gmail_scope TEXT;

-- ============================================================================
-- 2. Migrate tokens back from google_oauth_tokens to gmail_accounts
-- ============================================================================

-- Copy token data back to gmail_accounts
UPDATE gmail_accounts ga
SET
  gmail_access_token = got.access_token,
  gmail_refresh_token = got.refresh_token,
  gmail_token_type = got.token_type,
  gmail_expiry_date = got.expiry_date,
  gmail_scope = got.scope
FROM google_oauth_tokens got
JOIN users u ON got.user_id = u.id
WHERE ga.user_id = u.clerk_user_id
  AND ga.google_account_email = got.google_account_email;

-- ============================================================================
-- 3. Make gmail_access_token NOT NULL after migration
-- ============================================================================

-- Note: This will fail if any accounts don't have tokens
-- Manual cleanup required before rollback
ALTER TABLE gmail_accounts
ALTER COLUMN gmail_access_token SET NOT NULL;

-- ============================================================================
-- 4. Drop constraints and indexes related to google_account_email
-- ============================================================================

ALTER TABLE gmail_accounts
DROP CONSTRAINT IF EXISTS gmail_accounts_email_consistency;

DROP INDEX IF EXISTS idx_gmail_accounts_google_email;

-- ============================================================================
-- 5. Drop google_account_email column
-- ============================================================================

ALTER TABLE gmail_accounts
DROP COLUMN IF EXISTS google_account_email;

-- ============================================================================
-- 6. Restore original is_gmail_token_expired function
-- ============================================================================

DROP FUNCTION IF EXISTS is_gmail_token_expired(UUID);

CREATE OR REPLACE FUNCTION is_gmail_token_expired(account_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiry BIGINT;
  current_time_ms BIGINT;
BEGIN
  SELECT gmail_expiry_date INTO expiry
  FROM gmail_accounts
  WHERE id = account_id_param;

  IF expiry IS NULL THEN
    RETURN FALSE; -- No expiry set, assume valid
  END IF;

  current_time_ms := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000; -- Convert to milliseconds
  RETURN current_time_ms >= expiry;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Restore original comments
-- ============================================================================

COMMENT ON TABLE gmail_accounts IS 'Gmail accounts with separate OAuth token storage';

-- ============================================================================
-- 8. Clean up Gmail tokens from google_oauth_tokens (optional)
-- ============================================================================

-- This is optional - you may want to keep the tokens in google_oauth_tokens
-- DELETE FROM google_oauth_tokens
-- WHERE google_account_email IN (SELECT email FROM gmail_accounts);

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Gmail Shared OAuth Rollback (008_gmail_shared_oauth_rollback) completed';
  RAISE NOTICE 'Restored Gmail token columns to gmail_accounts';
  RAISE NOTICE 'Migrated tokens back from google_oauth_tokens';
  RAISE NOTICE 'Removed google_account_email column';
END $$;
