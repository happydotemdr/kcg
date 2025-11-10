/**
 * Email Metadata Repository
 * Database operations for email_metadata table
 */

import { query, transaction } from '../client';
import type { EmailMetadata, CreateEmailMetadata, EmailImportance } from '../types';
import type { PoolClient } from 'pg';

/**
 * Find email metadata by ID
 */
export async function findEmailMetadataById(id: string): Promise<EmailMetadata | null> {
  const result = await query<EmailMetadata>(
    'SELECT * FROM email_metadata WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find email metadata by Gmail message ID
 */
export async function findEmailMetadataByGmailId(gmailMessageId: string): Promise<EmailMetadata | null> {
  const result = await query<EmailMetadata>(
    'SELECT * FROM email_metadata WHERE gmail_message_id = $1',
    [gmailMessageId]
  );
  return result.rows[0] || null;
}

/**
 * Find emails by account ID
 */
export async function findEmailsByAccountId(
  accountId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EmailMetadata[]> {
  const result = await query<EmailMetadata>(
    `SELECT * FROM email_metadata
    WHERE account_id = $1
    ORDER BY sent_date DESC
    LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );
  return result.rows;
}

/**
 * Find emails by thread ID
 */
export async function findEmailsByThreadId(threadId: string): Promise<EmailMetadata[]> {
  const result = await query<EmailMetadata>(
    `SELECT * FROM email_metadata
    WHERE gmail_thread_id = $1
    ORDER BY sent_date ASC`,
    [threadId]
  );
  return result.rows;
}

/**
 * Search emails with filters
 */
export interface EmailSearchFilters {
  accountId?: string;
  sender?: string;
  senderDomain?: string;
  recipients?: string[];
  subject?: string;
  category?: string[];
  importance?: EmailImportance;
  hasAttachments?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  labels?: string[];
  limit?: number;
  offset?: number;
}

export async function searchEmails(filters: EmailSearchFilters): Promise<EmailMetadata[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.accountId) {
    conditions.push(`account_id = $${paramIndex++}`);
    params.push(filters.accountId);
  }

  if (filters.sender) {
    conditions.push(`sender ILIKE $${paramIndex++}`);
    params.push(`%${filters.sender}%`);
  }

  if (filters.senderDomain) {
    conditions.push(`sender_domain = $${paramIndex++}`);
    params.push(filters.senderDomain);
  }

  if (filters.recipients && filters.recipients.length > 0) {
    conditions.push(`recipients && $${paramIndex++}::text[]`);
    params.push(filters.recipients);
  }

  if (filters.subject) {
    conditions.push(`subject ILIKE $${paramIndex++}`);
    params.push(`%${filters.subject}%`);
  }

  if (filters.category && filters.category.length > 0) {
    conditions.push(`category && $${paramIndex++}::text[]`);
    params.push(filters.category);
  }

  if (filters.importance) {
    conditions.push(`importance = $${paramIndex++}`);
    params.push(filters.importance);
  }

  if (filters.hasAttachments !== undefined) {
    conditions.push(`has_attachments = $${paramIndex++}`);
    params.push(filters.hasAttachments);
  }

  if (filters.dateFrom) {
    conditions.push(`sent_date >= $${paramIndex++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`sent_date <= $${paramIndex++}`);
    params.push(filters.dateTo);
  }

  if (filters.labels && filters.labels.length > 0) {
    conditions.push(`labels && $${paramIndex++}::text[]`);
    params.push(filters.labels);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const sql = `
    SELECT * FROM email_metadata
    ${whereClause}
    ORDER BY sent_date DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);

  const result = await query<EmailMetadata>(sql, params);
  return result.rows;
}

/**
 * Create email metadata
 */
export async function createEmailMetadata(data: CreateEmailMetadata): Promise<EmailMetadata> {
  const result = await query<EmailMetadata>(
    `INSERT INTO email_metadata (
      account_id, gmail_message_id, gmail_thread_id,
      sender, sender_domain, recipients, subject, sent_date,
      snippet, labels, category, importance,
      extracted_dates, extracted_actions, has_attachments, attachment_info,
      last_analyzed_at, calendar_events_created
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *`,
    [
      data.account_id,
      data.gmail_message_id,
      data.gmail_thread_id,
      data.sender,
      data.sender_domain || null,
      data.recipients,
      data.subject || null,
      data.sent_date,
      data.snippet || null,
      data.labels,
      data.category,
      data.importance || null,
      data.extracted_dates,
      data.extracted_actions ? JSON.stringify(data.extracted_actions) : null,
      data.has_attachments,
      data.attachment_info ? JSON.stringify(data.attachment_info) : null,
      data.last_analyzed_at || null,
      data.calendar_events_created,
    ]
  );
  return result.rows[0];
}

/**
 * Upsert email metadata (create or update based on Gmail message ID)
 */
export async function upsertEmailMetadata(data: CreateEmailMetadata): Promise<EmailMetadata> {
  return await transaction(async (client: PoolClient) => {
    const existing = await findEmailMetadataByGmailId(data.gmail_message_id);

    if (existing) {
      // Update existing email
      const result = await client.query<EmailMetadata>(
        `UPDATE email_metadata SET
          sender = $1,
          sender_domain = $2,
          recipients = $3,
          subject = $4,
          sent_date = $5,
          snippet = $6,
          labels = $7,
          category = $8,
          importance = $9,
          extracted_dates = $10,
          extracted_actions = $11,
          has_attachments = $12,
          attachment_info = $13,
          last_analyzed_at = $14,
          calendar_events_created = $15,
          updated_at = CURRENT_TIMESTAMP
        WHERE gmail_message_id = $16
        RETURNING *`,
        [
          data.sender,
          data.sender_domain || null,
          data.recipients,
          data.subject || null,
          data.sent_date,
          data.snippet || null,
          data.labels,
          data.category,
          data.importance || null,
          data.extracted_dates,
          data.extracted_actions ? JSON.stringify(data.extracted_actions) : null,
          data.has_attachments,
          data.attachment_info ? JSON.stringify(data.attachment_info) : null,
          data.last_analyzed_at || null,
          data.calendar_events_created,
          data.gmail_message_id,
        ]
      );
      return result.rows[0];
    } else {
      // Create new email
      return await createEmailMetadata(data);
    }
  });
}

/**
 * Update email classification
 */
export async function updateEmailClassification(
  emailId: string,
  category: string[],
  importance: EmailImportance
): Promise<EmailMetadata> {
  const result = await query<EmailMetadata>(
    `UPDATE email_metadata SET
      category = $1,
      importance = $2,
      last_analyzed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *`,
    [category, importance, emailId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Email ${emailId} not found`);
  }

  return result.rows[0];
}

/**
 * Add calendar event to email
 */
export async function addCalendarEventToEmail(
  emailId: string,
  calendarEventId: string
): Promise<void> {
  await query(
    `UPDATE email_metadata
    SET calendar_events_created = array_append(calendar_events_created, $1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2`,
    [calendarEventId, emailId]
  );
}

/**
 * Delete email metadata
 */
export async function deleteEmailMetadata(emailId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM email_metadata WHERE id = $1',
    [emailId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete emails by account ID
 */
export async function deleteEmailsByAccountId(accountId: string): Promise<number> {
  const result = await query(
    'DELETE FROM email_metadata WHERE account_id = $1',
    [accountId]
  );
  return result.rowCount || 0;
}

/**
 * Get recent important emails
 */
export async function getRecentImportantEmails(
  accountId: string,
  days: number = 7,
  limit: number = 20
): Promise<EmailMetadata[]> {
  const result = await query<EmailMetadata>(
    `SELECT * FROM email_metadata
    WHERE account_id = $1
      AND importance IN ('critical', 'high')
      AND sent_date > CURRENT_TIMESTAMP - INTERVAL '1 day' * $2
    ORDER BY sent_date DESC
    LIMIT $3`,
    [accountId, days, limit]
  );
  return result.rows;
}

/**
 * Get emails with pending actions
 */
export async function getEmailsWithPendingActions(
  accountId: string,
  limit: number = 20
): Promise<EmailMetadata[]> {
  const result = await query<EmailMetadata>(
    `SELECT * FROM email_metadata
    WHERE account_id = $1
      AND extracted_actions IS NOT NULL
      AND jsonb_array_length(COALESCE(extracted_actions->'actions', '[]'::jsonb)) > 0
    ORDER BY sent_date DESC
    LIMIT $2`,
    [accountId, limit]
  );
  return result.rows;
}

/**
 * Count emails by account
 */
export async function countEmailsByAccountId(accountId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM email_metadata WHERE account_id = $1',
    [accountId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get category distribution for account
 */
export async function getCategoryDistribution(accountId: string): Promise<Record<string, number>> {
  const result = await query<{ category: string; count: string }>(
    `SELECT unnest(category) as category, COUNT(*) as count
    FROM email_metadata
    WHERE account_id = $1
    GROUP BY category`,
    [accountId]
  );

  const distribution: Record<string, number> = {};
  result.rows.forEach(row => {
    distribution[row.category] = parseInt(row.count, 10);
  });

  return distribution;
}

/**
 * Clean up old email metadata (data retention)
 */
export async function cleanupOldEmails(retentionDays: number = 90): Promise<number> {
  const result = await query(
    `DELETE FROM email_metadata
    WHERE processed_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
      AND (calendar_events_created IS NULL OR array_length(calendar_events_created, 1) IS NULL)`,
    [retentionDays]
  );
  return result.rowCount || 0;
}
