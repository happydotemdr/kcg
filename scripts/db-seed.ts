#!/usr/bin/env node
/**
 * Database Seed Script
 * Populate database with sample data for testing
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables with .env.local taking priority
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

import { initializeDatabase, closeDatabase } from '../src/lib/db';
import { createUser, countUsers } from '../src/lib/db/repositories/users';
import { storeWebhookEvent } from '../src/lib/db/repositories/webhooks';
import type { CreateUser, CreateClerkWebhookEvent } from '../src/lib/db/types';

async function main() {
  console.log('🌱 Seeding Keep Choosing Good database with sample data...\n');

  try {
    initializeDatabase();

    // Check if database is already seeded
    const userCount = await countUsers();
    if (userCount > 0) {
      console.log(`⚠️  Database already contains ${userCount} user(s).`);
      console.log('   Skipping seed to avoid duplicates.');
      console.log('   To re-seed, first clear the database with npm run db:reset');
      return;
    }

    console.log('👥 Creating sample users...');

    // Sample users
    const sampleUsers: CreateUser[] = [
      {
        clerk_user_id: 'user_sample_1',
        email: 'john.doe@example.com',
        email_verified: true,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        profile_image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        last_sign_in_at: new Date(),
        metadata: { role: 'user', preferences: { theme: 'dark' } },
        banned: false,
      },
      {
        clerk_user_id: 'user_sample_2',
        email: 'jane.smith@example.com',
        email_verified: true,
        first_name: 'Jane',
        last_name: 'Smith',
        username: 'janesmith',
        profile_image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
        last_sign_in_at: new Date(),
        metadata: { role: 'admin', preferences: { theme: 'light' } },
        banned: false,
      },
      {
        clerk_user_id: 'user_sample_3',
        email: 'bob.wilson@example.com',
        email_verified: false,
        first_name: 'Bob',
        last_name: 'Wilson',
        username: 'bobwilson',
        profile_image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        last_sign_in_at: null,
        metadata: { role: 'user' },
        banned: false,
      },
    ];

    for (const userData of sampleUsers) {
      const user = await createUser(userData);
      console.log(`   ✅ Created user: ${user.email}`);
    }

    console.log('\n📡 Creating sample webhook events...');

    // Sample webhook events
    const sampleWebhooks: CreateClerkWebhookEvent[] = [
      {
        event_id: 'evt_sample_1',
        event_type: 'user.created',
        object_type: 'user',
        object_id: 'user_sample_1',
        payload: {
          data: { id: 'user_sample_1', email: 'john.doe@example.com' },
          object: 'event',
          type: 'user.created',
        },
        processed: true,
        processed_at: new Date(),
        error_message: null,
      },
      {
        event_id: 'evt_sample_2',
        event_type: 'user.updated',
        object_type: 'user',
        object_id: 'user_sample_2',
        payload: {
          data: { id: 'user_sample_2', email: 'jane.smith@example.com' },
          object: 'event',
          type: 'user.updated',
        },
        processed: true,
        processed_at: new Date(),
        error_message: null,
      },
    ];

    for (const webhookData of sampleWebhooks) {
      const webhook = await storeWebhookEvent(webhookData);
      console.log(`   ✅ Created webhook event: ${webhook.event_type}`);
    }

    const finalCount = await countUsers();
    console.log(`\n✅ Database seeded successfully!`);
    console.log(`   Total users: ${finalCount}`);
    console.log(`   Total webhook events: ${sampleWebhooks.length}`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
