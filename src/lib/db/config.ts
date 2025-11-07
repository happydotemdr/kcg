/**
 * Database Configuration
 * PostgreSQL 17 connection settings
 */

// Load environment variables from .env file
// This is critical for Astro/Node adapter to read .env files
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local first (higher priority), then .env
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath, override: false });
}
if (existsSync(envPath)) {
  loadEnv({ path: envPath, override: false });
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
  };
  max?: number; // Maximum pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Support both DATABASE_URL and individual environment variables
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Parse connection string format: postgresql://user:password@host:port/database
    const url = new URL(databaseUrl);
    const password = url.password ? decodeURIComponent(url.password) : '';
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading slash
      user: decodeURIComponent(url.username),
      password: password !== '' ? password : undefined as any,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  // Fallback to individual environment variables
  const password = process.env.DATABASE_PASSWORD;
  const config = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'kcg_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: password !== undefined && password !== '' ? password : undefined as any,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  return config;
}
