-- Rollback Migration 011: Revert email_contacts user_id back to TEXT

BEGIN;

-- Revert contact_verification_queue
ALTER TABLE contact_verification_queue
DROP CONSTRAINT IF EXISTS fk_verification_queue_user;

ALTER TABLE contact_verification_queue
ALTER COLUMN user_id TYPE text USING user_id::text;

-- Revert email_contacts
ALTER TABLE email_contacts
DROP CONSTRAINT IF EXISTS fk_contact_user;

ALTER TABLE email_contacts
ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE email_contacts
ADD CONSTRAINT fk_contact_user
FOREIGN KEY (user_id)
REFERENCES users(clerk_user_id)
ON DELETE CASCADE;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Migration 011: Rolled back user_id changes';
END $$;
