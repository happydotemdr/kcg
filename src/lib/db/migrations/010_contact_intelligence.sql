-- Contact Intelligence System Schema
-- Migration: 010_contact_intelligence
-- Created: 2025-11-11
-- Description: Tables for email contact management with AI-powered verification and relationship tracking

-- ============================================================================
-- 1. Email Contacts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID

  -- Contact information
  email VARCHAR(500) NOT NULL,
  display_name VARCHAR(255),
  organization VARCHAR(255),
  domain VARCHAR(255),
  phone_numbers TEXT[], -- Array of phone numbers extracted from emails
  addresses TEXT[], -- Array of physical addresses extracted from emails

  -- Classification
  source_type VARCHAR(50) CHECK (source_type IN ('coach', 'teacher', 'school_admin', 'team', 'club', 'therapist', 'medical', 'vendor', 'other')),
  tags TEXT[], -- User-defined or AI-suggested tags (e.g., ['soccer', 'urgent'])

  -- Verification workflow
  verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verification_method VARCHAR(50), -- 'user', 'ai_auto', 'calendar_link', etc.
  verified_at TIMESTAMP,
  verified_by TEXT, -- Clerk user ID who verified

  -- Confidence and frequency
  confidence_score FLOAT DEFAULT 0.5, -- AI confidence in classification (0-1)
  email_count INTEGER DEFAULT 0, -- Number of emails from/to this contact

  -- Temporal tracking
  first_seen TIMESTAMP NOT NULL,
  last_seen TIMESTAMP NOT NULL,

  -- Relationships
  linked_calendar_events TEXT[], -- Array of calendar event IDs related to this contact
  linked_family_members TEXT[], -- Array of family member identifiers

  -- Metadata
  extraction_metadata JSONB, -- AI extraction details, reasoning, etc.
  notes TEXT, -- User notes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, email),

  -- Foreign key
  CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

-- Indexes for email_contacts (optimized for search and filtering)
CREATE INDEX IF NOT EXISTS idx_email_contacts_user_id ON email_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_email ON email_contacts(email);
CREATE INDEX IF NOT EXISTS idx_email_contacts_domain ON email_contacts(domain);
CREATE INDEX IF NOT EXISTS idx_email_contacts_source_type ON email_contacts(source_type);
CREATE INDEX IF NOT EXISTS idx_email_contacts_verification_status ON email_contacts(verification_status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_confidence ON email_contacts(confidence_score DESC);

-- ============================================================================
-- 2. Email Contact Associations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_contact_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  email_metadata_id UUID NOT NULL REFERENCES email_metadata(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,

  -- Association details
  role VARCHAR(20) NOT NULL CHECK (role IN ('sender', 'recipient', 'mentioned')),

  -- Extraction metadata
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  extraction_confidence FLOAT DEFAULT 0.5, -- AI confidence for this specific extraction

  -- Constraints
  UNIQUE(email_metadata_id, contact_id, role)
);

-- Indexes for email_contact_associations
CREATE INDEX IF NOT EXISTS idx_contact_assoc_email ON email_contact_associations(email_metadata_id);
CREATE INDEX IF NOT EXISTS idx_contact_assoc_contact ON email_contact_associations(contact_id);

-- ============================================================================
-- 3. Contact Verification Queue Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Contact reference
  contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,

  -- AI suggestions
  suggested_type VARCHAR(50),
  suggested_tags TEXT[],
  reasoning TEXT, -- AI explanation for suggestion
  confidence FLOAT, -- AI confidence in suggestion

  -- Supporting evidence
  sample_email_ids UUID[], -- Array of email_metadata IDs supporting this classification

  -- Queue status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
  user_action_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(contact_id) -- Each contact can only be in queue once
);

-- Indexes for contact_verification_queue
CREATE INDEX IF NOT EXISTS idx_verification_queue_user_status ON contact_verification_queue(user_id, status);

-- ============================================================================
-- 4. Triggers for updated_at timestamps
-- ============================================================================

-- Reuse existing trigger function (update_gmail_updated_at) for consistency
DROP TRIGGER IF EXISTS email_contacts_updated_at ON email_contacts;
CREATE TRIGGER email_contacts_updated_at
  BEFORE UPDATE ON email_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to increment email count for a contact
CREATE OR REPLACE FUNCTION increment_contact_email_count(contact_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE email_contacts
  SET email_count = email_count + 1,
      last_seen = CURRENT_TIMESTAMP
  WHERE id = contact_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get unverified contacts above confidence threshold
CREATE OR REPLACE FUNCTION get_high_confidence_unverified_contacts(user_id_param TEXT, threshold FLOAT DEFAULT 0.75)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  display_name VARCHAR,
  confidence_score FLOAT,
  email_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.email,
    ec.display_name,
    ec.confidence_score,
    ec.email_count
  FROM email_contacts ec
  WHERE ec.user_id = user_id_param
    AND ec.verification_status = 'unverified'
    AND ec.confidence_score >= threshold
  ORDER BY ec.confidence_score DESC, ec.email_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Views for Common Queries
-- ============================================================================

-- View: Verified contacts with recent activity
CREATE OR REPLACE VIEW active_verified_contacts AS
SELECT
  ec.*,
  COUNT(eca.id) as recent_email_count
FROM email_contacts ec
LEFT JOIN email_contact_associations eca ON ec.id = eca.contact_id
LEFT JOIN email_metadata em ON eca.email_metadata_id = em.id
  AND em.sent_date > CURRENT_TIMESTAMP - INTERVAL '30 days'
WHERE ec.verification_status = 'verified'
GROUP BY ec.id
ORDER BY recent_email_count DESC, ec.last_seen DESC;

-- View: Pending verification queue summary
CREATE OR REPLACE VIEW pending_verifications_summary AS
SELECT
  cvq.user_id,
  COUNT(*) as pending_count,
  AVG(cvq.confidence) as avg_confidence,
  MIN(cvq.created_at) as oldest_pending
FROM contact_verification_queue cvq
WHERE cvq.status = 'pending'
GROUP BY cvq.user_id;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Contact Intelligence System Schema (010_contact_intelligence) created successfully';
  RAISE NOTICE 'Tables created: email_contacts, email_contact_associations, contact_verification_queue';
  RAISE NOTICE 'Indexes, triggers, functions, and views created';
END $$;
