-- Migration: Add user_calendar_mappings table
-- Version: 003
-- Description: Adds multi-calendar support with entity type mapping
-- Date: 2025-11-08

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
