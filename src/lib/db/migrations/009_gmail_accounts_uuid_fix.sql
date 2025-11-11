-- Migration 009: Fix gmail_accounts.user_id to UUID with FK to users.id
-- Created: 2025-11-11
-- Description: Convert gmail_accounts.user_id from TEXT (Clerk ID) to UUID (users.id FK)
-- This aligns gmail_accounts with google_oauth_tokens and user_calendar_mappings pattern

-- ============================================================================
-- STEP 1: Add temporary UUID column
-- ============================================================================
ALTER TABLE gmail_accounts ADD COLUMN user_id_uuid UUID;

-- ============================================================================
-- STEP 2: Migrate existing data (Clerk ID → UUID)
-- ============================================================================
-- Convert existing TEXT user_id (clerk_user_id) to UUID by looking up users.id
UPDATE gmail_accounts
SET user_id_uuid = (
  SELECT u.id
  FROM users u
  WHERE u.clerk_user_id = gmail_accounts.user_id
);

-- Check for orphaned records (shouldn't exist due to FK, but verify)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM gmail_accounts
  WHERE user_id_uuid IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % gmail_accounts records with no matching user. These will be deleted.', orphan_count;
    DELETE FROM gmail_accounts WHERE user_id_uuid IS NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop old FK constraint and user_id column
-- ============================================================================
-- Drop the old FK constraint to users.clerk_user_id
ALTER TABLE gmail_accounts DROP CONSTRAINT IF EXISTS fk_gmail_user;

-- Drop the old TEXT user_id column
ALTER TABLE gmail_accounts DROP COLUMN user_id;

-- ============================================================================
-- STEP 4: Rename and constrain the new UUID column
-- ============================================================================
-- Rename user_id_uuid to user_id
ALTER TABLE gmail_accounts RENAME COLUMN user_id_uuid TO user_id;

-- Make NOT NULL
ALTER TABLE gmail_accounts ALTER COLUMN user_id SET NOT NULL;

-- Add FK constraint to users.id
ALTER TABLE gmail_accounts ADD CONSTRAINT fk_gmail_accounts_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: Update unique constraint
-- ============================================================================
-- Drop old unique constraint on (user_id, email) - it will be recreated automatically
ALTER TABLE gmail_accounts DROP CONSTRAINT IF EXISTS gmail_accounts_user_id_email_key;

-- Add new unique constraint
ALTER TABLE gmail_accounts ADD CONSTRAINT gmail_accounts_user_id_email_key
  UNIQUE(user_id, email);

-- ============================================================================
-- STEP 6: Recreate index
-- ============================================================================
-- Drop old index (if exists)
DROP INDEX IF EXISTS idx_gmail_accounts_user_id;

-- Create new index on UUID user_id
CREATE INDEX idx_gmail_accounts_user_id ON gmail_accounts(user_id);

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 009 complete: gmail_accounts.user_id is now UUID FK to users.id';
  RAISE NOTICE 'Pattern now matches google_oauth_tokens and user_calendar_mappings';
END $$;
