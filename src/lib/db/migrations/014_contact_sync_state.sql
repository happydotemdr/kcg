-- Contact Sync State Migration
-- Migration: 014_contact_sync_state
-- Created: 2025-11-11
-- Description: Track Google sync tokens for incremental contact sync per account

-- ============================================================================
-- 1. Contact Sync State Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  google_account_email TEXT NOT NULL,

  -- Google People API sync token for incremental sync
  sync_token TEXT, -- Opaque token from Google People API

  -- Sync timestamps
  last_full_sync_at TIMESTAMP,
  last_incremental_sync_at TIMESTAMP,

  -- Sync status tracking
  sync_status TEXT NOT NULL DEFAULT 'never_synced' CHECK (sync_status IN ('never_synced', 'syncing', 'completed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, google_account_email),

  -- Foreign key to users table
  CONSTRAINT fk_contact_sync_user FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

COMMENT ON TABLE contact_sync_state IS 'Tracks Google sync tokens for incremental contact sync per user account';
COMMENT ON COLUMN contact_sync_state.sync_token IS 'Opaque sync token from Google People API for incremental updates';
COMMENT ON COLUMN contact_sync_state.last_full_sync_at IS 'Timestamp of last full contact sync (no sync token)';
COMMENT ON COLUMN contact_sync_state.last_incremental_sync_at IS 'Timestamp of last incremental sync using sync token';
COMMENT ON COLUMN contact_sync_state.sync_status IS 'Current sync status: never_synced, syncing, completed, or failed';
COMMENT ON COLUMN contact_sync_state.error_message IS 'Error message if sync_status is failed';

-- ============================================================================
-- 2. Indexes for contact_sync_state
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contact_sync_user_account ON contact_sync_state(user_id, google_account_email);
CREATE INDEX IF NOT EXISTS idx_contact_sync_status ON contact_sync_state(sync_status);
CREATE INDEX IF NOT EXISTS idx_contact_sync_last_synced ON contact_sync_state(last_incremental_sync_at);

-- ============================================================================
-- 3. Trigger for updated_at timestamps
-- ============================================================================
DROP TRIGGER IF EXISTS contact_sync_state_updated_at ON contact_sync_state;
CREATE TRIGGER contact_sync_state_updated_at
  BEFORE UPDATE ON contact_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

-- ============================================================================
-- 4. Helper Function: Get accounts needing sync
-- ============================================================================
CREATE OR REPLACE FUNCTION get_accounts_needing_sync(sync_interval_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  user_id TEXT,
  google_account_email TEXT,
  last_sync_at TIMESTAMP,
  has_sync_token BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    css.user_id,
    css.google_account_email,
    GREATEST(css.last_full_sync_at, css.last_incremental_sync_at) as last_sync_at,
    (css.sync_token IS NOT NULL) as has_sync_token
  FROM contact_sync_state css
  WHERE css.sync_status != 'syncing'
    AND (
      css.sync_status = 'never_synced'
      OR GREATEST(css.last_full_sync_at, css.last_incremental_sync_at) < CURRENT_TIMESTAMP - INTERVAL '1 hour' * sync_interval_hours
    )
  ORDER BY last_sync_at NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_accounts_needing_sync IS 'Returns Google accounts that need contact sync based on interval';

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Contact Sync State Migration (014_contact_sync_state) completed successfully';
  RAISE NOTICE 'Created contact_sync_state table for tracking Google sync tokens';
  RAISE NOTICE 'Added helper function get_accounts_needing_sync()';
END $$;
