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

// ============================================================================
// Gmail Integration Types
// ============================================================================

/**
 * Gmail Account Types
 */
export type GmailAccountType = 'family' | 'personal' | 'work' | 'school' | 'kids';

/**
 * Email Category
 */
export interface EmailCategory {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  keywords: string[];
  senders: string[];
  domains: string[];
}

/**
 * Gmail Account Sync Settings
 */
export interface GmailSyncSettings {
  autoSync: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  lookbackPeriod: number; // days
  categories: EmailCategory[];
}

/**
 * Gmail Account
 * Represents a connected Gmail account with OAuth tokens
 */
export interface GmailAccount {
  id: string;
  user_id: string;
  email: string;
  account_type: GmailAccountType;

  // OAuth tokens
  gmail_access_token: string;
  gmail_refresh_token: string | null;
  gmail_token_type: string;
  gmail_expiry_date: number | null;
  gmail_scope: string | null;

  // Sync settings
  sync_settings: GmailSyncSettings;

  // Metadata
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateGmailAccount = Omit<GmailAccount, 'id' | 'created_at' | 'updated_at' | 'last_synced_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  last_synced_at?: Date | null;
};

/**
 * Email Importance Level
 */
export type EmailImportance = 'critical' | 'high' | 'medium' | 'low';

/**
 * Attachment Info
 */
export interface AttachmentInfo {
  filename: string;
  size: number; // bytes
  mimeType: string;
  attachmentId?: string; // Gmail attachment ID
}

/**
 * Extracted Actions
 */
export interface ExtractedActions {
  actions: string[]; // e.g., ["RSVP needed", "Payment due"]
  deadline?: string; // ISO date string
  priority?: EmailImportance;
}

/**
 * Email Metadata
 * Lightweight storage of email metadata without full body content
 */
export interface EmailMetadata {
  id: string;
  account_id: string;

  // Gmail identifiers
  gmail_message_id: string;
  gmail_thread_id: string;

  // Email headers
  sender: string;
  sender_domain: string | null;
  recipients: string[];
  subject: string | null;
  sent_date: Date;

  // Preview
  snippet: string | null;

  // Gmail labels
  labels: string[];

  // Classification
  category: string[];
  importance: EmailImportance | null;

  // Extracted intelligence
  extracted_dates: Date[];
  extracted_actions: ExtractedActions | null;

  // Attachments
  has_attachments: boolean;
  attachment_info: AttachmentInfo[] | null;

  // Processing metadata
  processed_at: Date;
  last_analyzed_at: Date | null;
  calendar_events_created: string[];

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export type CreateEmailMetadata = Omit<EmailMetadata, 'id' | 'created_at' | 'updated_at' | 'processed_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  processed_at?: Date;
};

/**
 * Important Sender
 */
export interface ImportantSender {
  email: string;
  name: string;
  category: string;
  averageImportance: number;
  totalEmails: number;
}

/**
 * Recurring Pattern
 */
export interface RecurringPattern {
  pattern: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastSeen: Date;
  confidence: number; // 0-1
  exampleEmailIds: string[];
}

/**
 * Upcoming Deadline
 */
export interface UpcomingDeadline {
  subject: string;
  deadline: Date;
  emailId: string;
  actionRequired: string;
  importance: EmailImportance;
}

/**
 * Email Intelligence
 * Learned patterns and insights from email analysis
 */
export interface EmailIntelligence {
  id: string;
  account_id: string;

  // Time period
  period_start: Date;
  period_end: Date;

  // Learned patterns
  important_senders: ImportantSender[];
  recurring_patterns: RecurringPattern[];
  upcoming_deadlines: UpcomingDeadline[];

  // Statistics
  total_emails_analyzed: number;
  categories_distribution: Record<string, number>; // e.g., {"calendar": 15, "invoice": 5}

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export type CreateEmailIntelligence = Omit<EmailIntelligence, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Email Processing Log
 * Audit trail of email processing actions
 */
export interface EmailProcessingLog {
  id: string;
  account_id: string | null;
  user_id: string;

  // Action details
  action: string; // 'sync', 'search', 'classify', 'create_calendar_event', etc.
  email_ids: string[];

  // Results
  results: Record<string, any>;
  ai_confidence: number | null; // 0-1
  user_confirmed: boolean | null;

  // Error handling
  success: boolean;
  error_message: string | null;

  // Performance
  processing_time_ms: number | null;

  // Timestamp
  created_at: Date;
}

export type CreateEmailProcessingLog = Omit<EmailProcessingLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};
