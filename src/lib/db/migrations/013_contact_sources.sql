-- Contact Sources Migration
-- Migration: 013_contact_sources
-- Created: 2025-11-11
-- Description: Junction table linking email_contacts to external providers (Google Contacts, Microsoft Contacts)

-- ============================================================================
-- 1. Contact Sources Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,

  -- Provider information
  provider TEXT NOT NULL CHECK (provider IN ('google_contacts', 'microsoft_contacts')),
  external_id TEXT NOT NULL, -- Google's resourceName or Microsoft's ID
  external_resource_name TEXT, -- Full Google People API resourceName (e.g., people/c1234567890)
  account_email TEXT NOT NULL, -- Which Google/MS account this contact came from

  -- Sync metadata
  etag TEXT, -- For conflict resolution (Google uses person.metadata.sources[].etag)
  last_synced_at TIMESTAMP,
  sync_direction TEXT NOT NULL DEFAULT 'import' CHECK (sync_direction IN ('import', 'export', 'bidirectional')),

  -- Flexible metadata storage
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(provider, external_id, account_email)
);

COMMENT ON TABLE contact_sources IS 'Junction table linking email_contacts to external contact providers (Google, Microsoft)';
COMMENT ON COLUMN contact_sources.provider IS 'External contact provider: google_contacts or microsoft_contacts';
COMMENT ON COLUMN contact_sources.external_id IS 'Provider-specific contact identifier (Google resourceName or MS ID)';
COMMENT ON COLUMN contact_sources.external_resource_name IS 'Full Google People API resourceName for direct API calls';
COMMENT ON COLUMN contact_sources.account_email IS 'Email address of the Google/MS account this contact belongs to';
COMMENT ON COLUMN contact_sources.etag IS 'Entity tag for conflict resolution during sync (Google: person.metadata.sources[].etag)';
COMMENT ON COLUMN contact_sources.sync_direction IS 'Sync direction: import (provider -> app), export (app -> provider), or bidirectional';

-- ============================================================================
-- 2. Indexes for contact_sources
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contact_sources_email_contact ON contact_sources(email_contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_sources_provider_external ON contact_sources(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_contact_sources_account_email ON contact_sources(account_email);
CREATE INDEX IF NOT EXISTS idx_contact_sources_last_synced ON contact_sources(last_synced_at);

-- ============================================================================
-- 3. Trigger for updated_at timestamps
-- ============================================================================
DROP TRIGGER IF EXISTS contact_sources_updated_at ON contact_sources;
CREATE TRIGGER contact_sources_updated_at
  BEFORE UPDATE ON contact_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Contact Sources Migration (013_contact_sources) completed successfully';
  RAISE NOTICE 'Created contact_sources table for multi-provider contact sync';
  RAISE NOTICE 'Supports Google Contacts and Microsoft Contacts with etag-based conflict resolution';
END $$;
