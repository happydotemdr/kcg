-- Rollback Migration 009: Revert gmail_accounts.user_id back to TEXT (Clerk ID)
-- Created: 2025-11-11
-- Description: Rollback UUID user_id change back to TEXT clerk_user_id

-- ============================================================================
-- STEP 1: Add temporary TEXT column
-- ============================================================================
ALTER TABLE gmail_accounts ADD COLUMN user_id_text TEXT;

-- ============================================================================
-- STEP 2: Migrate data back (UUID → Clerk ID)
-- ============================================================================
-- Convert UUID user_id back to TEXT clerk_user_id
UPDATE gmail_accounts
SET user_id_text = (
  SELECT u.clerk_user_id
  FROM users u
  WHERE u.id = gmail_accounts.user_id
);

-- Check for orphaned records
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM gmail_accounts
  WHERE user_id_text IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % gmail_accounts records with no matching user. These will be deleted.', orphan_count;
    DELETE FROM gmail_accounts WHERE user_id_text IS NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop UUID FK constraint and column
-- ============================================================================
-- Drop FK to users.id
ALTER TABLE gmail_accounts DROP CONSTRAINT IF EXISTS fk_gmail_accounts_user;

-- Drop UUID user_id column
ALTER TABLE gmail_accounts DROP COLUMN user_id;

-- ============================================================================
-- STEP 4: Rename and constrain TEXT column
-- ============================================================================
-- Rename user_id_text to user_id
ALTER TABLE gmail_accounts RENAME COLUMN user_id_text TO user_id;

-- Make NOT NULL
ALTER TABLE gmail_accounts ALTER COLUMN user_id SET NOT NULL;

-- Add old FK constraint to users.clerk_user_id
ALTER TABLE gmail_accounts ADD CONSTRAINT fk_gmail_user
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: Update unique constraint
-- ============================================================================
-- Drop UUID-based unique constraint
ALTER TABLE gmail_accounts DROP CONSTRAINT IF EXISTS gmail_accounts_user_id_email_key;

-- Add TEXT-based unique constraint
ALTER TABLE gmail_accounts ADD CONSTRAINT gmail_accounts_user_id_email_key
  UNIQUE(user_id, email);

-- ============================================================================
-- STEP 6: Recreate index
-- ============================================================================
-- Drop UUID index
DROP INDEX IF EXISTS idx_gmail_accounts_user_id;

-- Create TEXT index
CREATE INDEX idx_gmail_accounts_user_id ON gmail_accounts(user_id);

-- ============================================================================
-- Rollback Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Rollback 009 complete: gmail_accounts.user_id reverted to TEXT (Clerk ID)';
END $$;
