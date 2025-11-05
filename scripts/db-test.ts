#!/usr/bin/env node
/**
 * Database Connection Test Script
 * Test the database connection and display configuration
 */

import 'dotenv/config';
import { initializeDatabase, testConnection, closeDatabase, query } from '../src/lib/db';
import { getDatabaseConfig } from '../src/lib/db/config';

async function main() {
  console.log('🔍 Testing PostgreSQL 17 database connection...\n');

  try {
    // Show configuration (masked password)
    const config = getDatabaseConfig();
    console.log('📋 Database Configuration:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    console.log(`   SSL: ${config.ssl ? 'enabled' : 'disabled'}`);
    console.log(`   Pool Size: ${config.max}`);
    console.log('');

    // Initialize connection
    initializeDatabase();

    // Test connection
    const isConnected = await testConnection();

    if (!isConnected) {
      throw new Error('Connection test failed');
    }

    // Check for tables
    console.log('\n📊 Checking database tables...');
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  No tables found. Run "npm run db:init" to initialize the schema.');
    } else {
      console.log('   ✅ Found tables:');
      tablesResult.rows.forEach((row: any) => {
        console.log(`      - ${row.table_name}`);
      });
    }

    console.log('\n✅ Database connection test successful!');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
