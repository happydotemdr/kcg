/**
 * Document Repository
 * CRUD operations for processed documents
 */

import { query } from '../client';
import type { QueryResult } from 'pg';

/**
 * ProcessedDocument type matching the database schema
 */
export interface ProcessedDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_url: string | null;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  extracted_events_count: number;
  confidence_score: number | null;
  warnings: any[];
  events_added: number;
  events_updated: number;
  events_skipped: number;
  extracted_data: any;
  user_modifications: any[];
  uploaded_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input type for creating a new document
 */
export interface CreateDocumentInput {
  user_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  file_url?: string;
  status?: 'uploading' | 'processing';
}

/**
 * Input type for updating document status and extraction results
 */
export interface UpdateDocumentInput {
  status?: 'uploading' | 'processing' | 'completed' | 'failed';
  processing_started_at?: Date;
  processing_completed_at?: Date;
  extracted_events_count?: number;
  confidence_score?: number;
  warnings?: any[];
  events_added?: number;
  events_updated?: number;
  events_skipped?: number;
  extracted_data?: any;
  user_modifications?: any[];
}

/**
 * Create a new processed document record
 */
export async function createDocument(input: CreateDocumentInput): Promise<ProcessedDocument> {
  const result: QueryResult<ProcessedDocument> = await query(
    `INSERT INTO processed_documents
      (user_id, file_name, file_type, file_size, file_url, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      input.user_id,
      input.file_name,
      input.file_type,
      input.file_size || null,
      input.file_url || null,
      input.status || 'uploading',
    ]
  );

  return result.rows[0];
}

/**
 * Get a document by ID
 */
export async function getDocumentById(documentId: string, userId: string): Promise<ProcessedDocument | null> {
  const result: QueryResult<ProcessedDocument> = await query(
    'SELECT * FROM processed_documents WHERE id = $1 AND user_id = $2',
    [documentId, userId]
  );

  return result.rows[0] || null;
}

/**
 * Get all documents for a user, ordered by most recent first
 */
export async function getDocumentsByUserId(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ProcessedDocument[]> {
  const result: QueryResult<ProcessedDocument> = await query(
    `SELECT * FROM processed_documents
    WHERE user_id = $1
    ORDER BY uploaded_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

/**
 * Get documents by status for a user
 */
export async function getDocumentsByStatus(
  userId: string,
  status: 'uploading' | 'processing' | 'completed' | 'failed',
  limit: number = 50
): Promise<ProcessedDocument[]> {
  const result: QueryResult<ProcessedDocument> = await query(
    `SELECT * FROM processed_documents
    WHERE user_id = $1 AND status = $2
    ORDER BY uploaded_at DESC
    LIMIT $3`,
    [userId, status, limit]
  );

  return result.rows;
}

/**
 * Update a document's processing status and results
 */
export async function updateDocument(
  documentId: string,
  userId: string,
  updates: UpdateDocumentInput
): Promise<ProcessedDocument | null> {
  // Build dynamic UPDATE query based on provided fields
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    updateFields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (updates.processing_started_at !== undefined) {
    updateFields.push(`processing_started_at = $${paramIndex++}`);
    values.push(updates.processing_started_at);
  }

  if (updates.processing_completed_at !== undefined) {
    updateFields.push(`processing_completed_at = $${paramIndex++}`);
    values.push(updates.processing_completed_at);
  }

  if (updates.extracted_events_count !== undefined) {
    updateFields.push(`extracted_events_count = $${paramIndex++}`);
    values.push(updates.extracted_events_count);
  }

  if (updates.confidence_score !== undefined) {
    updateFields.push(`confidence_score = $${paramIndex++}`);
    values.push(updates.confidence_score);
  }

  if (updates.warnings !== undefined) {
    updateFields.push(`warnings = $${paramIndex++}`);
    values.push(JSON.stringify(updates.warnings));
  }

  if (updates.events_added !== undefined) {
    updateFields.push(`events_added = $${paramIndex++}`);
    values.push(updates.events_added);
  }

  if (updates.events_updated !== undefined) {
    updateFields.push(`events_updated = $${paramIndex++}`);
    values.push(updates.events_updated);
  }

  if (updates.events_skipped !== undefined) {
    updateFields.push(`events_skipped = $${paramIndex++}`);
    values.push(updates.events_skipped);
  }

  if (updates.extracted_data !== undefined) {
    updateFields.push(`extracted_data = $${paramIndex++}`);
    values.push(JSON.stringify(updates.extracted_data));
  }

  if (updates.user_modifications !== undefined) {
    updateFields.push(`user_modifications = $${paramIndex++}`);
    values.push(JSON.stringify(updates.user_modifications));
  }

  if (updateFields.length === 0) {
    // No updates provided
    return getDocumentById(documentId, userId);
  }

  // Add documentId and userId to values
  values.push(documentId, userId);

  const result: QueryResult<ProcessedDocument> = await query(
    `UPDATE processed_documents
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
    RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM processed_documents WHERE id = $1 AND user_id = $2',
    [documentId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get document statistics for a user
 */
export async function getDocumentStats(userId: string): Promise<{
  total: number;
  completed: number;
  processing: number;
  failed: number;
  total_events_added: number;
}> {
  const result = await query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(events_added) as total_events_added
    FROM processed_documents
    WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total) || 0,
    completed: parseInt(row.completed) || 0,
    processing: parseInt(row.processing) || 0,
    failed: parseInt(row.failed) || 0,
    total_events_added: parseInt(row.total_events_added) || 0,
  };
}

/**
 * Get recent document activity (last 7 days)
 */
export async function getRecentDocuments(userId: string, days: number = 7): Promise<ProcessedDocument[]> {
  const result: QueryResult<ProcessedDocument> = await query(
    `SELECT * FROM processed_documents
    WHERE user_id = $1
    AND uploaded_at >= NOW() - INTERVAL '1 day' * $2
    ORDER BY uploaded_at DESC`,
    [userId, days]
  );

  return result.rows;
}
