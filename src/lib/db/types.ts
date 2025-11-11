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
  google_account_email: string | null;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expiry_date: number | null; // Unix timestamp in milliseconds
  scope: string | null;
  account_label?: string; // User-friendly label (e.g., "Work Email", "Personal")
  is_primary?: boolean; // True if this is the user's primary Google account
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
 * Represents a connected Gmail account (tokens stored in google_oauth_tokens)
 */
export interface GmailAccount {
  id: string;
  user_id: string;
  email: string;
  account_type: GmailAccountType;
  google_account_email: string; // References google_account_email in google_oauth_tokens

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

/**
 * Contact Verification Queue Item
 * AI suggestions for contact classification awaiting user verification
 */
export interface VerificationQueueItem {
  id: string;
  user_id: string;
  contact_id: string;

  // AI suggestions
  suggested_type: string | null; // 'coach', 'teacher', 'school_admin', 'team', 'club', 'therapist', 'medical', 'vendor', 'other'
  suggested_tags: string[] | null;
  reasoning: string | null;
  confidence: number | null; // 0-1

  // Supporting evidence
  sample_email_ids: string[] | null; // email_metadata IDs

  // Queue status
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  user_action_at: Date | null;

  // Timestamp
  created_at: Date;
}

export type CreateVerificationQueueItem = Omit<
  VerificationQueueItem,
  'id' | 'created_at' | 'status' | 'user_action_at'
> & {
  id?: string;
  created_at?: Date;
  status?: 'pending';
  user_action_at?: Date | null;
};

// ============================================================================
// Email Contacts Types
// ============================================================================

/**
 * Contact Source Type
 */
export type ContactSourceType = 'coach' | 'teacher' | 'school_admin' | 'team' | 'club' | 'therapist' | 'medical' | 'vendor' | 'other';

/**
 * Contact Verification Status
 */
export type ContactVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/**
 * Email Contact
 */
export interface EmailContact {
  id: string;
  user_id: string; // Clerk user ID

  // Contact information
  email: string;
  display_name: string | null;
  organization: string | null;
  domain: string | null;
  phone_numbers: string[];
  addresses: string[];

  // Classification
  source_type: ContactSourceType | null;
  tags: string[];

  // Verification workflow
  verification_status: ContactVerificationStatus;
  verification_method: string | null;
  verified_at: Date | null;
  verified_by: string | null;

  // Confidence and frequency
  confidence_score: number;
  email_count: number;

  // Temporal tracking
  first_seen: Date;
  last_seen: Date;

  // Relationships
  linked_calendar_events: string[];
  linked_family_members: string[];

  // Metadata
  extraction_metadata: Record<string, any> | null;
  notes: string | null;

  // Google Contacts sync fields
  google_contact_resource_name: string | null;
  last_synced_to_google: Date | null;
  sync_enabled: boolean;

  created_at: Date;
  updated_at: Date;
}

export type CreateEmailContact = Omit<EmailContact, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Contact Filters
 */
export interface ContactFilters {
  sourceType?: ContactSourceType;
  verificationStatus?: ContactVerificationStatus;
  tags?: string[];
  domain?: string;
  minConfidence?: number;
  minEmailCount?: number;
  limit?: number;
  offset?: number;
}

/**
 * Email Contact Association
 */
export type ContactAssociationRole = 'sender' | 'recipient' | 'mentioned';

export interface EmailContactAssociation {
  id: string;
  email_metadata_id: string;
  contact_id: string;
  role: ContactAssociationRole;
  extracted_at: Date;
  extraction_confidence: number;
}

export type CreateEmailContactAssociation = Omit<EmailContactAssociation, 'id' | 'extracted_at'> & {
  id?: string;
  extracted_at?: Date;
}

// ============================================================================
// Google Contacts Integration Types
// ============================================================================

/**
 * Contact Source
 * Maps email contacts to external contact sources (Google/Microsoft)
 */
export interface ContactSource {
  id: string;
  email_contact_id: string;
  provider: 'google_contacts' | 'microsoft_contacts';
  external_id: string;
  external_resource_name: string;
  account_email: string;
  etag: string | null;
  last_synced_at: Date | null;
  sync_direction: 'import' | 'export' | 'bidirectional';
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateContactSource = Omit<ContactSource, 'id' | 'created_at' | 'updated_at' | 'last_synced_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  last_synced_at?: Date | null;
};

/**
 * Contact Sync State
 * Tracks sync status for Google Contacts API
 */
export interface ContactSyncState {
  id: string;
  user_id: string;
  google_account_email: string;
  sync_token: string | null;
  last_full_sync_at: Date | null;
  last_incremental_sync_at: Date | null;
  sync_status: 'never_synced' | 'syncing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateContactSyncState = Omit<ContactSyncState, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

// ============================================================================
// Google Tasks Integration Types
// ============================================================================

/**
 * Task List
 * Represents a Google Tasks task list
 */
export interface TaskList {
  id: string;
  user_id: string;
  google_account_email: string;
  google_tasklist_id: string;
  title: string;
  is_default: boolean;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateTaskList = Omit<TaskList, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Task
 * Represents a Google Tasks task
 */
export interface Task {
  id: string;
  user_id: string;
  google_account_email: string;
  google_task_id: string;
  google_tasklist_id: string;
  title: string;
  notes: string | null;
  status: 'needsAction' | 'completed';
  due_date: Date | null;
  completed_date: Date | null;
  calendar_event_id: string | null;
  parent_task_id: string | null;
  position: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateTask = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_date'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  completed_date?: Date | null;
}
