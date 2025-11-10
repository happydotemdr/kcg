/**
 * Database Migration Runner
 * Handles initialization and schema migrations
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, transaction } from './client';
import type { PoolClient } from 'pg';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration tracking table
 */
const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * Check if a migration has been executed
 */
async function isMigrationExecuted(version: string): Promise<boolean> {
  const result = await query(
    'SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)',
    [version]
  );
  return result.rows[0].exists;
}

/**
 * Record a migration as executed
 */
async function recordMigration(client: PoolClient, version: string, name: string): Promise<void> {
  await client.query(
    'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
    [version, name]
  );
}

/**
 * Execute the initial schema migration
 */
export async function runInitialMigration(): Promise<void> {
  try {
    console.log('Running database migrations...');

    // Create migrations tracking table
    await query(CREATE_MIGRATIONS_TABLE);
    console.log('Migration tracking table ready');

    // Check if initial schema has been applied
    const migrationVersion = '001';
    const migrationName = 'initial_schema';

    const isExecuted = await isMigrationExecuted(migrationVersion);

    if (isExecuted) {
      console.log(`Migration ${migrationVersion} (${migrationName}) already executed, skipping...`);
      return;
    }

    // Read and execute the schema SQL file
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');

    await transaction(async (client) => {
      console.log('Executing initial schema...');
      await client.query(schemaSql);
      await recordMigration(client, migrationVersion, migrationName);
      console.log('Initial schema applied successfully');
    });

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Get list of executed migrations
 */
export async function getExecutedMigrations(): Promise<Array<{ version: string; name: string; executed_at: Date }>> {
  try {
    const result = await query('SELECT version, name, executed_at FROM schema_migrations ORDER BY executed_at DESC');
    return result.rows;
  } catch (error) {
    // If table doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Rollback the last migration (use with caution!)
 */
export async function rollbackLastMigration(): Promise<void> {
  console.warn('⚠️  Rolling back the last migration. This operation should only be used in development.');

  await transaction(async (client) => {
    const result = await client.query(
      'SELECT version, name FROM schema_migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const { version, name } = result.rows[0];
    console.log(`Rolling back migration ${version} (${name})...`);

    // Drop all tables (in reverse order of dependencies)
    await client.query('DROP TABLE IF EXISTS clerk_webhook_events CASCADE');
    await client.query('DROP TABLE IF EXISTS user_metadata CASCADE');
    await client.query('DROP TABLE IF EXISTS user_sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    await client.query('DROP FUNCTION IF EXISTS cleanup_expired_sessions CASCADE');

    // Remove migration record
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [version]);

    console.log('Migration rolled back successfully');
  });
}

/**
 * Run specific migration file
 * Used for sequential migrations after initial schema
 */
export async function runMigrationFile(version: string, name: string, filePath: string): Promise<void> {
  try {
    console.log(`Checking migration ${version} (${name})...`);

    // Check if migration has been executed
    const isExecuted = await isMigrationExecuted(version);

    if (isExecuted) {
      console.log(`Migration ${version} (${name}) already executed, skipping...`);
      return;
    }

    // Read migration file
    const migrationSql = readFileSync(filePath, 'utf-8');

    await transaction(async (client) => {
      console.log(`Executing migration ${version} (${name})...`);
      await client.query(migrationSql);
      await recordMigration(client, version, name);
      console.log(`Migration ${version} (${name}) completed successfully`);
    });
  } catch (error) {
    console.error(`Migration ${version} (${name}) failed:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 * Executes migration files in order
 */
export async function runAllMigrations(): Promise<void> {
  try {
    console.log('Running all pending migrations...');

    // Create migrations tracking table
    await query(CREATE_MIGRATIONS_TABLE);

    // Run initial schema first (001)
    await runInitialMigration();

    // Define additional migrations
    const migrations = [
      {
        version: '003',
        name: 'user_calendar_mappings',
        file: join(__dirname, 'migrations', '003_user_calendar_mappings.sql'),
      },
      {
        version: '004',
        name: 'processed_documents',
        file: join(__dirname, 'migrations', '004_processed_documents.sql'),
      },
      {
        version: '005',
        name: 'gmail_integration',
        file: join(__dirname, 'migrations', '005_gmail_integration.sql'),
      },
      // Add more migrations here as needed
    ];

    // Run each migration in sequence
    for (const migration of migrations) {
      await runMigrationFile(migration.version, migration.name, migration.file);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    throw error;
  }
}
