#!/usr/bin/env node
/**
 * Database Initialization Script
 * Run this script to initialize the database with the schema
 */

import 'dotenv/config';
import { initializeDatabase, testConnection, closeDatabase } from '../src/lib/db';
import { runInitialMigration } from '../src/lib/db/migrations';

async function main() {
  console.log('🚀 Initializing Keep Choosing Good database...\n');

  try {
    // Initialize connection pool
    console.log('📡 Connecting to database...');
    initializeDatabase();

    // Test connection
    console.log('\n🔍 Testing database connection...');
    const isConnected = await testConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run migrations
    console.log('\n📦 Running database migrations...');
    await runInitialMigration();

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Configure Clerk.com webhook endpoints');
    console.log('   2. Set up user synchronization');
    console.log('   3. Test with sample data using npm run db:seed');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
