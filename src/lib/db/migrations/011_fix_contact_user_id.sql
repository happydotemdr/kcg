-- Migration 011: Fix email_contacts user_id to use UUID instead of TEXT
-- This makes it consistent with gmail_accounts and other tables

BEGIN;

-- Drop views that depend on user_id columns
DROP VIEW IF EXISTS active_verified_contacts;
DROP VIEW IF EXISTS pending_verifications_summary;

-- Drop existing foreign key constraint
ALTER TABLE email_contacts
DROP CONSTRAINT IF EXISTS fk_contact_user;

-- Change user_id from TEXT to UUID
ALTER TABLE email_contacts
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add new foreign key constraint referencing users.id (UUID)
ALTER TABLE email_contacts
ADD CONSTRAINT fk_contact_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Update contact_verification_queue.user_id as well (if it exists)
-- This table also uses user_id TEXT and should be UUID
ALTER TABLE contact_verification_queue
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add foreign key for contact_verification_queue
ALTER TABLE contact_verification_queue
ADD CONSTRAINT fk_verification_queue_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Recreate views with UUID user_id
CREATE VIEW active_verified_contacts AS
SELECT
  ec.id,
  ec.user_id,
  ec.email,
  ec.display_name,
  ec.organization,
  ec.domain,
  ec.source_type,
  ec.tags,
  ec.confidence_score,
  ec.email_count,
  ec.verified_at,
  ec.phone_numbers,
  ec.linked_calendar_events
FROM email_contacts ec
WHERE ec.verification_status = 'verified';

CREATE VIEW pending_verifications_summary AS
SELECT
  cvq.user_id,
  COUNT(*) AS pending_count,
  AVG(cvq.confidence) AS avg_confidence,
  MIN(cvq.created_at) AS oldest_pending
FROM contact_verification_queue cvq
WHERE cvq.status = 'pending'
GROUP BY cvq.user_id;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Migration 011: Fixed email_contacts and contact_verification_queue to use UUID for user_id';
END $$;
