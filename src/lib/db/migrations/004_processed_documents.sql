-- Processed Documents Table
-- Stores uploaded documents and their calendar extraction metadata
CREATE TABLE IF NOT EXISTS processed_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL, -- image/jpeg, image/png, application/pdf, etc.
    file_size BIGINT, -- File size in bytes
    file_url TEXT, -- S3/cloud storage URL (optional for MVP, can store base64 in payload)

    -- Processing status
    status VARCHAR(50) DEFAULT 'uploading', -- uploading, processing, completed, failed
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,

    -- Extraction results
    extracted_events_count INTEGER DEFAULT 0,
    confidence_score INTEGER, -- 0-100
    warnings JSONB DEFAULT '[]'::jsonb, -- Array of warning messages

    -- Event tracking
    events_added INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_skipped INTEGER DEFAULT 0,

    -- Full data payload
    extracted_data JSONB DEFAULT '{}'::jsonb, -- Full extraction results
    user_modifications JSONB DEFAULT '[]'::jsonb, -- Track user changes

    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

-- Create indexes for document queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON processed_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON processed_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON processed_documents(user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON processed_documents(status, processing_started_at)
    WHERE status IN ('uploading', 'processing');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON processed_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE processed_documents IS 'Stores uploaded documents with calendar extraction metadata and processing status';
COMMENT ON COLUMN processed_documents.extracted_data IS 'Full extraction results including events, dates, locations';
COMMENT ON COLUMN processed_documents.user_modifications IS 'Track user edits to extracted events before adding to calendar';
COMMENT ON COLUMN processed_documents.confidence_score IS 'AI confidence in extraction accuracy (0-100)';
COMMENT ON COLUMN processed_documents.status IS 'Processing status: uploading, processing, completed, failed';
