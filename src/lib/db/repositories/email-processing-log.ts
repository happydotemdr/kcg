/**
 * Email Processing Log Repository
 * Database operations for email_processing_log table
 */

import { query } from '../client';
import type { EmailProcessingLog, CreateEmailProcessingLog } from '../types';

/**
 * Create processing log entry
 */
export async function createProcessingLog(data: CreateEmailProcessingLog): Promise<EmailProcessingLog> {
  const result = await query<EmailProcessingLog>(
    `INSERT INTO email_processing_log (
      account_id, user_id, action, email_ids,
      results, ai_confidence, user_confirmed,
      success, error_message, processing_time_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.account_id || null,
      data.user_id,
      data.action,
      data.email_ids,
      JSON.stringify(data.results),
      data.ai_confidence || null,
      data.user_confirmed || null,
      data.success,
      data.error_message || null,
      data.processing_time_ms || null,
    ]
  );
  return result.rows[0];
}

/**
 * Find logs by user ID
 */
export async function findLogsByUserId(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EmailProcessingLog[]> {
  const result = await query<EmailProcessingLog>(
    `SELECT * FROM email_processing_log
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

/**
 * Find logs by account ID
 */
export async function findLogsByAccountId(
  accountId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EmailProcessingLog[]> {
  const result = await query<EmailProcessingLog>(
    `SELECT * FROM email_processing_log
    WHERE account_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );
  return result.rows;
}

/**
 * Find logs by action type
 */
export async function findLogsByAction(
  action: string,
  limit: number = 50,
  offset: number = 0
): Promise<EmailProcessingLog[]> {
  const result = await query<EmailProcessingLog>(
    `SELECT * FROM email_processing_log
    WHERE action = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [action, limit, offset]
  );
  return result.rows;
}

/**
 * Find failed logs
 */
export async function findFailedLogs(
  limit: number = 50,
  offset: number = 0
): Promise<EmailProcessingLog[]> {
  const result = await query<EmailProcessingLog>(
    `SELECT * FROM email_processing_log
    WHERE success = false
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

/**
 * Get logs for specific email IDs
 */
export async function findLogsByEmailIds(emailIds: string[]): Promise<EmailProcessingLog[]> {
  const result = await query<EmailProcessingLog>(
    `SELECT * FROM email_processing_log
    WHERE email_ids && $1::text[]
    ORDER BY created_at DESC`,
    [emailIds]
  );
  return result.rows;
}

/**
 * Get processing statistics for a user
 */
export interface ProcessingStats {
  totalProcessed: number;
  successRate: number;
  averageConfidence: number;
  averageProcessingTime: number;
  actionBreakdown: Record<string, number>;
}

export async function getProcessingStatsByUserId(userId: string): Promise<ProcessingStats> {
  const result = await query<{
    total: string;
    successful: string;
    avg_confidence: string | null;
    avg_time: string | null;
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
      AVG(ai_confidence) as avg_confidence,
      AVG(processing_time_ms) as avg_time
    FROM email_processing_log
    WHERE user_id = $1`,
    [userId]
  );

  const stats = result.rows[0];
  const total = parseInt(stats.total, 10);
  const successful = parseInt(stats.successful, 10);

  // Get action breakdown
  const actionResult = await query<{ action: string; count: string }>(
    `SELECT action, COUNT(*) as count
    FROM email_processing_log
    WHERE user_id = $1
    GROUP BY action
    ORDER BY count DESC`,
    [userId]
  );

  const actionBreakdown: Record<string, number> = {};
  actionResult.rows.forEach(row => {
    actionBreakdown[row.action] = parseInt(row.count, 10);
  });

  return {
    totalProcessed: total,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    averageConfidence: stats.avg_confidence ? parseFloat(stats.avg_confidence) : 0,
    averageProcessingTime: stats.avg_time ? parseFloat(stats.avg_time) : 0,
    actionBreakdown,
  };
}

/**
 * Delete old logs (data retention)
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<number> {
  const result = await query(
    `DELETE FROM email_processing_log
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1`,
    [retentionDays]
  );
  return result.rowCount || 0;
}

/**
 * Delete logs by user ID
 */
export async function deleteLogsByUserId(userId: string): Promise<number> {
  const result = await query(
    'DELETE FROM email_processing_log WHERE user_id = $1',
    [userId]
  );
  return result.rowCount || 0;
}

/**
 * Delete logs by account ID
 */
export async function deleteLogsByAccountId(accountId: string): Promise<number> {
  const result = await query(
    'DELETE FROM email_processing_log WHERE account_id = $1',
    [accountId]
  );
  return result.rowCount || 0;
}
