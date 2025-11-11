-- Contacts Sync Metadata Migration
-- Migration: 016_contacts_sync_metadata
-- Created: 2025-11-11
-- Description: Extend email_contacts table for Google sync capabilities

-- ============================================================================
-- 1. Add Google sync columns to email_contacts
-- ============================================================================

ALTER TABLE email_contacts
ADD COLUMN IF NOT EXISTS google_contact_resource_name TEXT;

COMMENT ON COLUMN email_contacts.google_contact_resource_name IS 'Google People API resourceName if this contact was exported to Google Contacts';

ALTER TABLE email_contacts
ADD COLUMN IF NOT EXISTS last_synced_to_google TIMESTAMP;

COMMENT ON COLUMN email_contacts.last_synced_to_google IS 'Timestamp of last successful sync to Google Contacts';

ALTER TABLE email_contacts
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN email_contacts.sync_enabled IS 'Whether this contact should be synced to Google Contacts';

-- ============================================================================
-- 2. Create index for sync-enabled contacts
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_contacts_sync_enabled
ON email_contacts(user_id, sync_enabled) WHERE sync_enabled = TRUE;

COMMENT ON INDEX idx_email_contacts_sync_enabled IS 'Fast lookup for contacts that should be synced to Google Contacts';

-- ============================================================================
-- 3. Helper Function: Get contacts pending Google sync
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contacts_pending_google_sync(user_id_param TEXT, sync_interval_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  display_name VARCHAR,
  google_contact_resource_name TEXT,
  last_synced_to_google TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.email,
    ec.display_name,
    ec.google_contact_resource_name,
    ec.last_synced_to_google
  FROM email_contacts ec
  WHERE ec.user_id = user_id_param
    AND ec.sync_enabled = TRUE
    AND (
      ec.last_synced_to_google IS NULL
      OR ec.last_synced_to_google < CURRENT_TIMESTAMP - INTERVAL '1 hour' * sync_interval_hours
      OR ec.updated_at > ec.last_synced_to_google -- Contact was updated since last sync
    )
  ORDER BY ec.last_synced_to_google NULLS FIRST, ec.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contacts_pending_google_sync IS 'Returns email_contacts that need to be synced to Google Contacts';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Contacts Sync Metadata Migration (016_contacts_sync_metadata) completed successfully';
  RAISE NOTICE 'Added google_contact_resource_name, last_synced_to_google, sync_enabled columns to email_contacts';
  RAISE NOTICE 'Created index for sync-enabled contacts lookup';
  RAISE NOTICE 'Added helper function get_contacts_pending_google_sync()';
END $$;
