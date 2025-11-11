-- Contact Intelligence System Rollback
-- Migration Rollback: 010_contact_intelligence
-- Created: 2025-11-11
-- Description: Rolls back contact intelligence tables, views, and functions

-- ============================================================================
-- 1. Drop Views
-- ============================================================================

DROP VIEW IF EXISTS pending_verifications_summary;
DROP VIEW IF EXISTS active_verified_contacts;

-- ============================================================================
-- 2. Drop Helper Functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_high_confidence_unverified_contacts(TEXT, FLOAT);
DROP FUNCTION IF EXISTS increment_contact_email_count(UUID);

-- ============================================================================
-- 3. Drop Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS email_contacts_updated_at ON email_contacts;

-- ============================================================================
-- 4. Drop Tables (in reverse order of dependencies)
-- ============================================================================

DROP TABLE IF EXISTS contact_verification_queue;
DROP TABLE IF EXISTS email_contact_associations;
DROP TABLE IF EXISTS email_contacts;

-- ============================================================================
-- Rollback Complete
-- ============================================================================

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE 'Contact Intelligence System Schema (010_contact_intelligence) rolled back successfully';
  RAISE NOTICE 'Tables dropped: contact_verification_queue, email_contact_associations, email_contacts';
  RAISE NOTICE 'Views, functions, and triggers removed';
END $$;
