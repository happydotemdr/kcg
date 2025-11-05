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
