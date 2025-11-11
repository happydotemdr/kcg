-- Rollback for Contacts Sync Metadata Migration
-- Rollback: 016_contacts_sync_metadata
-- Created: 2025-11-11
-- Description: Remove Google sync columns from email_contacts table

-- ============================================================================
-- 1. Drop helper function
-- ============================================================================

DROP FUNCTION IF EXISTS get_contacts_pending_google_sync(TEXT, INTEGER);

-- ============================================================================
-- 2. Drop index
-- ============================================================================

DROP INDEX IF EXISTS idx_email_contacts_sync_enabled;

-- ============================================================================
-- 3. Drop columns from email_contacts
-- ============================================================================

ALTER TABLE email_contacts
DROP COLUMN IF EXISTS sync_enabled;

ALTER TABLE email_contacts
DROP COLUMN IF EXISTS last_synced_to_google;

ALTER TABLE email_contacts
DROP COLUMN IF EXISTS google_contact_resource_name;

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Contacts Sync Metadata Rollback (016_contacts_sync_metadata_rollback) completed';
  RAISE NOTICE 'Removed google_contact_resource_name, last_synced_to_google, sync_enabled columns';
  RAISE NOTICE 'Removed index and helper function';
END $$;
