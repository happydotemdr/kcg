-- PostgreSQL 17 Database Schema
-- Keep Choosing Good (KCG) - Clerk.com Integration

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
-- Stores user data synced from Clerk.com
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL, -- Clerk's user ID (e.g., user_xxx)
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(100) UNIQUE,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional user metadata
    banned BOOLEAN DEFAULT FALSE,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- User Sessions Table
-- Track active user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clerk_session_id VARCHAR(255) UNIQUE NOT NULL, -- Clerk's session ID
    status VARCHAR(50) DEFAULT 'active', -- active, expired, revoked
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_clerk_id ON user_sessions(clerk_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- User Metadata Table
-- Store additional custom user data
CREATE TABLE IF NOT EXISTS user_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    value_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key)
);

-- Create indexes for metadata
CREATE INDEX IF NOT EXISTS idx_metadata_user_id ON user_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_key ON user_metadata(key);

-- Clerk Webhook Events Table
-- Log all webhook events from Clerk for audit and debugging
CREATE TABLE IF NOT EXISTS clerk_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL, -- Clerk's event ID (evt_xxx)
    event_type VARCHAR(100) NOT NULL, -- user.created, user.updated, session.created, etc.
    object_type VARCHAR(50), -- user, session, organization, etc.
    object_id VARCHAR(255), -- The ID of the affected object
    payload JSONB NOT NULL, -- Full webhook payload
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON clerk_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_object ON clerk_webhook_events(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON clerk_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON clerk_webhook_events(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metadata_updated_at BEFORE UPDATE ON user_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE user_sessions
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user data synchronized from Clerk.com authentication service';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions from Clerk.com';
COMMENT ON TABLE user_metadata IS 'Stores additional custom metadata for users';
COMMENT ON TABLE clerk_webhook_events IS 'Logs all webhook events received from Clerk.com for audit and debugging';

COMMENT ON COLUMN users.clerk_user_id IS 'Unique user ID from Clerk.com (format: user_xxx)';
COMMENT ON COLUMN users.metadata IS 'JSON object for storing additional user attributes';
COMMENT ON COLUMN user_sessions.clerk_session_id IS 'Unique session ID from Clerk.com (format: sess_xxx)';
COMMENT ON COLUMN clerk_webhook_events.event_id IS 'Unique event ID from Clerk.com (format: evt_xxx)';

-- Google OAuth Tokens Table
-- Store OAuth tokens for Google Calendar integration
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expiry_date BIGINT, -- Unix timestamp in milliseconds
    scope TEXT, -- Space-separated list of granted scopes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- One token per user
);

-- Create indexes for OAuth tokens
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON google_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expiry ON google_oauth_tokens(expiry_date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON google_oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE google_oauth_tokens IS 'Stores OAuth2 tokens for Google Calendar API access';
COMMENT ON COLUMN google_oauth_tokens.expiry_date IS 'Token expiration time in Unix milliseconds';

-- User Calendar Mappings Table
-- Maps user's Google Calendars to entity types (family, personal, work)
-- MVP: One-to-one mapping (one calendar per entity type per user)
CREATE TABLE IF NOT EXISTS user_calendar_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_calendar_id VARCHAR(255) NOT NULL, -- Google Calendar ID (e.g., primary or custom calendar ID)
    calendar_name VARCHAR(255) NOT NULL, -- Display name from Google Calendar
    entity_type VARCHAR(50) NOT NULL, -- 'family', 'personal', 'work'
    is_default BOOLEAN DEFAULT FALSE, -- Default calendar for this user
    calendar_time_zone VARCHAR(100), -- Calendar timezone (e.g., 'America/New_York')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, entity_type), -- One calendar per entity type per user (MVP scope)
    UNIQUE(user_id, google_calendar_id), -- Can't map same calendar twice for same user
    CHECK (entity_type IN ('family', 'personal', 'work')) -- Only allowed entity types
);

-- Create indexes for calendar mappings
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_user_id ON user_calendar_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_entity_type ON user_calendar_mappings(user_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_default ON user_calendar_mappings(user_id, is_default) WHERE is_default = TRUE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calendar_mappings_updated_at BEFORE UPDATE ON user_calendar_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_calendar_mappings IS 'Maps user Google Calendars to entity types (family, personal, work) for multi-calendar support';
COMMENT ON COLUMN user_calendar_mappings.google_calendar_id IS 'Google Calendar identifier from Google Calendar API';
COMMENT ON COLUMN user_calendar_mappings.entity_type IS 'Entity type: family (default for MVP), personal, or work';
COMMENT ON COLUMN user_calendar_mappings.is_default IS 'Whether this is the default calendar for the user (typically family calendar)';

-- Function to ensure only one default calendar per user
CREATE OR REPLACE FUNCTION ensure_single_default_calendar()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        -- Unset any other default calendars for this user
        UPDATE user_calendar_mappings
        SET is_default = FALSE
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default calendar
CREATE TRIGGER enforce_single_default_calendar BEFORE INSERT OR UPDATE ON user_calendar_mappings
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_calendar();
