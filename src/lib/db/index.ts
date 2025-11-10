/**
 * Database Module
 * Export all database functionality
 */

export {
  initializeDatabase,
  getPool,
  query,
  getClient,
  transaction,
  testConnection,
  closeDatabase,
} from './client';

export type { DatabaseConfig } from './config';
export { getDatabaseConfig } from './config';

// Document repository
export {
  createDocument,
  getDocumentById,
  getDocumentsByUserId,
  getDocumentsByStatus,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  getRecentDocuments,
} from './repositories/documents';

export type {
  ProcessedDocument,
  CreateDocumentInput,
  UpdateDocumentInput,
} from './repositories/documents';
