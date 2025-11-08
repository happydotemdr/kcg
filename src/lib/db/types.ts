/**
 * Database Type Definitions
 * TypeScript types for database tables
 */

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  profile_image_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_sign_in_at: Date | null;
  metadata: Record<string, any>;
  banned: boolean;
}

export interface UserSession {
  id: string;
  user_id: string;
  clerk_session_id: string;
  status: 'active' | 'expired' | 'revoked';
  last_active_at: Date;
  expires_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserMetadata {
  id: string;
  user_id: string;
  key: string;
  value: string | null;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  created_at: Date;
  updated_at: Date;
}

export interface ClerkWebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  object_type: string | null;
  object_id: string | null;
  payload: Record<string, any>;
  processed: boolean;
  processed_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

// Input types for creating records (omit auto-generated fields)
export type CreateUser = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type CreateUserSession = Omit<UserSession, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type CreateUserMetadata = Omit<UserMetadata, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type CreateClerkWebhookEvent = Omit<ClerkWebhookEvent, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export interface GoogleOAuthToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expiry_date: number | null; // Unix timestamp in milliseconds
  scope: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateGoogleOAuthToken = Omit<GoogleOAuthToken, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Calendar Entity Types
 * Represents different calendar categories for multi-calendar support
 */
export type CalendarEntityType = 'family' | 'personal' | 'work';

/**
 * User Calendar Mapping
 * Maps a user's Google Calendar to an entity type
 */
export interface UserCalendarMapping {
  id: string;
  user_id: string;
  google_calendar_id: string;
  calendar_name: string;
  entity_type: CalendarEntityType;
  is_default: boolean;
  calendar_time_zone: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateUserCalendarMapping = Omit<UserCalendarMapping, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};
