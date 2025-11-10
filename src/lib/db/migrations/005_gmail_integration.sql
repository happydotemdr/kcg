-- Gmail Integration Schema
-- Migration: 004_gmail_integration
-- Created: 2025-11-10
-- Description: Tables for Gmail agent with multi-account support and intelligent email processing

-- ============================================================================
-- 1. Gmail Accounts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID
  email VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('family', 'personal', 'work', 'school', 'kids')),

  -- Gmail-specific OAuth tokens (separate from calendar tokens)
  gmail_access_token TEXT NOT NULL,
  gmail_refresh_token TEXT,
  gmail_token_type VARCHAR(50) DEFAULT 'Bearer',
  gmail_expiry_date BIGINT, -- Unix timestamp in milliseconds
  gmail_scope TEXT,

  -- Sync settings (stored as JSONB for flexibility)
  sync_settings JSONB DEFAULT '{
    "autoSync": false,
    "syncFrequency": "daily",
    "lookbackPeriod": 30,
    "categories": []
  }'::jsonb,

  -- Metadata
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(email),
  UNIQUE(user_id, email),

  -- Indexes
  CONSTRAINT fk_gmail_user FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

-- Indexes for gmail_accounts
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_email ON gmail_accounts(email);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_type ON gmail_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_last_sync ON gmail_accounts(last_synced_at);

-- ============================================================================
-- 2. Email Metadata Table (Lightweight storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,

  -- Gmail identifiers
  gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
  gmail_thread_id VARCHAR(255) NOT NULL,

  -- Email headers (searchable fields)
  sender VARCHAR(500) NOT NULL,
  sender_domain VARCHAR(255),
  recipients TEXT[], -- Array of recipient emails
  subject TEXT,
  sent_date TIMESTAMP NOT NULL,

  -- Preview/snippet (first ~100 chars)
  snippet TEXT,

  -- Gmail labels
  labels TEXT[],

  -- Classification
  category TEXT[], -- e.g., ['calendar', 'important']
  importance VARCHAR(20) CHECK (importance IN ('critical', 'high', 'medium', 'low')),

  -- Extracted intelligence (without storing full body)
  extracted_dates TIMESTAMP[], -- Dates found in email
  extracted_actions JSONB, -- e.g., {"actions": ["RSVP needed", "Payment due"], "deadline": "2025-11-15"}

  -- Attachment info (metadata only, not content)
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_info JSONB, -- e.g., [{"filename": "invoice.pdf", "size": 12345, "mimeType": "application/pdf"}]

  -- Processing metadata
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_analyzed_at TIMESTAMP,
  calendar_events_created TEXT[], -- Array of calendar event IDs created from this email

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email_metadata (optimized for search)
CREATE INDEX IF NOT EXISTS idx_email_metadata_account ON email_metadata(account_id);
CREATE INDEX IF NOT EXISTS idx_email_metadata_thread ON email_metadata(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_email_metadata_sender ON email_metadata(sender);
CREATE INDEX IF NOT EXISTS idx_email_metadata_domain ON email_metadata(sender_domain);
CREATE INDEX IF NOT EXISTS idx_email_metadata_date ON email_metadata(sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_metadata_category ON email_metadata USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_email_metadata_labels ON email_metadata USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_email_metadata_importance ON email_metadata(importance);
CREATE INDEX IF NOT EXISTS idx_email_metadata_subject ON email_metadata USING GIN(to_tsvector('english', subject));

-- ============================================================================
-- 3. Email Intelligence Table (Learned patterns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,

  -- Time period for this intelligence snapshot
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Learned patterns (JSONB for flexibility)
  important_senders JSONB DEFAULT '[]'::jsonb, -- [{"email": "...", "name": "...", "category": "...", "averageImportance": 0.9}]
  recurring_patterns JSONB DEFAULT '[]'::jsonb, -- [{"pattern": "Soccer practice reminder", "frequency": "weekly", "lastSeen": "...", "confidence": 0.95}]
  upcoming_deadlines JSONB DEFAULT '[]'::jsonb, -- [{"subject": "...", "deadline": "...", "emailId": "...", "actionRequired": "..."}]

  -- Statistics
  total_emails_analyzed INTEGER DEFAULT 0,
  categories_distribution JSONB, -- {"calendar": 15, "invoice": 5, "announcement": 20}

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email_intelligence
CREATE INDEX IF NOT EXISTS idx_email_intelligence_account ON email_intelligence(account_id);
CREATE INDEX IF NOT EXISTS idx_email_intelligence_period ON email_intelligence(period_start, period_end);

-- ============================================================================
-- 4. Email Processing Log (Audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES gmail_accounts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Action details
  action VARCHAR(100) NOT NULL, -- 'sync', 'search', 'classify', 'create_calendar_event', etc.
  email_ids TEXT[], -- Array of affected email IDs

  -- Results
  results JSONB, -- Flexible results storage
  ai_confidence FLOAT, -- AI confidence score (0-1) if applicable
  user_confirmed BOOLEAN, -- Whether user confirmed AI action

  -- Error handling
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  -- Metadata
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email_processing_log
CREATE INDEX IF NOT EXISTS idx_processing_log_account ON email_processing_log(account_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_user ON email_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_action ON email_processing_log(action);
CREATE INDEX IF NOT EXISTS idx_processing_log_date ON email_processing_log(created_at DESC);

-- ============================================================================
-- 5. Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gmail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS gmail_accounts_updated_at ON gmail_accounts;
CREATE TRIGGER gmail_accounts_updated_at
  BEFORE UPDATE ON gmail_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

DROP TRIGGER IF EXISTS email_metadata_updated_at ON email_metadata;
CREATE TRIGGER email_metadata_updated_at
  BEFORE UPDATE ON email_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

DROP TRIGGER IF EXISTS email_intelligence_updated_at ON email_intelligence;
CREATE TRIGGER email_intelligence_updated_at
  BEFORE UPDATE ON email_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to clean up old email metadata (data retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_email_metadata(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete email metadata older than retention period
  -- EXCEPT those with calendar events created (keep forever for reference)
  DELETE FROM email_metadata
  WHERE processed_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days
    AND (calendar_events_created IS NULL OR array_length(calendar_events_created, 1) IS NULL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if Gmail token is expired
CREATE OR REPLACE FUNCTION is_gmail_token_expired(account_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiry BIGINT;
  current_time_ms BIGINT;
BEGIN
  SELECT gmail_expiry_date INTO expiry
  FROM gmail_accounts
  WHERE id = account_id_param;

  IF expiry IS NULL THEN
    RETURN FALSE; -- No expiry set, assume valid
  END IF;

  current_time_ms := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000; -- Convert to milliseconds
  RETURN current_time_ms >= expiry;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Views for Common Queries
-- ============================================================================

-- View: Recent important emails per account
CREATE OR REPLACE VIEW recent_important_emails AS
SELECT
  em.*,
  ga.email as account_email,
  ga.account_type
FROM email_metadata em
JOIN gmail_accounts ga ON em.account_id = ga.id
WHERE em.importance IN ('critical', 'high')
  AND em.sent_date > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY em.sent_date DESC;

-- View: Emails with pending actions
CREATE OR REPLACE VIEW emails_with_pending_actions AS
SELECT
  em.*,
  ga.email as account_email,
  em.extracted_actions->>'actions' as pending_actions
FROM email_metadata em
JOIN gmail_accounts ga ON em.account_id = ga.id
WHERE em.extracted_actions IS NOT NULL
  AND jsonb_array_length(COALESCE(em.extracted_actions->'actions', '[]'::jsonb)) > 0
ORDER BY em.sent_date DESC;

-- ============================================================================
-- 8. Grants (if using specific database users)
-- ============================================================================

-- Grant permissions to application user (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Gmail Integration Schema (004_gmail_integration) created successfully';
  RAISE NOTICE 'Tables created: gmail_accounts, email_metadata, email_intelligence, email_processing_log';
  RAISE NOTICE 'Indexes, triggers, functions, and views created';
END $$;
