-- Rollback for Contact Sources Migration
-- Rollback: 013_contact_sources
-- Created: 2025-11-11
-- Description: Remove contact_sources table

-- ============================================================================
-- 1. Drop trigger
-- ============================================================================
DROP TRIGGER IF EXISTS contact_sources_updated_at ON contact_sources;

-- ============================================================================
-- 2. Drop indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_contact_sources_last_synced;
DROP INDEX IF EXISTS idx_contact_sources_account_email;
DROP INDEX IF EXISTS idx_contact_sources_provider_external;
DROP INDEX IF EXISTS idx_contact_sources_email_contact;

-- ============================================================================
-- 3. Drop table
-- ============================================================================
DROP TABLE IF EXISTS contact_sources;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Contact Sources Rollback (013_contact_sources_rollback) completed';
  RAISE NOTICE 'Removed contact_sources table and all associated indexes';
END $$;
