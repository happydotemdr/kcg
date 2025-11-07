#!/usr/bin/env node
/**
 * Clerk Webhook Handler Test Script
 *
 * Tests the webhook handler by simulating Clerk webhook events and verifying
 * that they are processed correctly and synced to the database.
 *
 * Usage:
 *   npm run test:webhook
 *
 * Environment Requirements:
 *   - PostgreSQL database running and initialized
 *   - CLERK_WEBHOOK_SECRET set in .env (for signature verification)
 *   - Or use TEST_SKIP_SIGNATURE_VERIFICATION=true to skip verification
 *
 * Tests:
 *   1. user.created - Creates a new user in database
 *   2. user.updated - Updates existing user data
 *   3. user.deleted - Removes user from database
 *   4. session.created - Logs session event
 */

import 'dotenv/config';
import { Webhook } from 'svix';
import { initializeDatabase, closeDatabase, query } from '../src/lib/db';
import { findUserByClerkId } from '../src/lib/db/repositories/users';

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_TEST_URL || 'http://localhost:4321/api/webhooks/clerk';
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || 'whsec_test_secret_for_testing';
const SKIP_SIGNATURE = process.env.TEST_SKIP_SIGNATURE_VERIFICATION === 'true';

// Test data
const TEST_USER_ID = 'user_test_' + Date.now();
const TEST_SESSION_ID = 'sess_test_' + Date.now();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

/**
 * Generate mock Clerk webhook payload
 */
function generateMockWebhook(eventType: string, data: any) {
  return {
    object: 'event',
    type: eventType,
    data: data,
  };
}

/**
 * Generate Svix signature headers for webhook verification
 */
function generateSvixHeaders(payload: string): Record<string, string> {
  if (SKIP_SIGNATURE) {
    // For testing without signature verification
    return {
      'svix-id': `msg_${Date.now()}`,
      'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
      'svix-signature': 'v1,test_signature_skipped',
    };
  }

  try {
    const webhook = new Webhook(WEBHOOK_SECRET);
    const msgId = `msg_${Date.now()}`;
    const timestamp = new Date();

    // Create signature
    const signature = webhook.sign(msgId, timestamp, payload);

    return {
      'svix-id': msgId,
      'svix-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
      'svix-signature': signature,
    };
  } catch (error) {
    console.warn('⚠️  Unable to generate Svix signature:', error);
    return {
      'svix-id': `msg_${Date.now()}`,
      'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
      'svix-signature': 'v1,test_signature',
    };
  }
}

/**
 * Send webhook event to endpoint
 */
async function sendWebhookEvent(eventType: string, payload: any): Promise<Response> {
  const webhookPayload = generateMockWebhook(eventType, payload);
  const payloadString = JSON.stringify(webhookPayload);

  const headers = generateSvixHeaders(payloadString);

  console.log(`   → Sending ${eventType} event...`);

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: payloadString,
  });

  return response;
}

/**
 * Test: user.created event
 */
async function testUserCreated(): Promise<TestResult> {
  const testName = 'user.created event';
  console.log(`\n📝 Testing ${testName}...`);

  try {
    // Create mock user data matching Clerk's format
    const userData = {
      id: TEST_USER_ID,
      email_addresses: [
        {
          id: 'email_' + Date.now(),
          email_address: `test.user.${Date.now()}@example.com`,
          verification: {
            status: 'verified',
          },
        },
      ],
      first_name: 'Test',
      last_name: 'User',
      username: `testuser_${Date.now()}`,
      profile_image_url: 'https://example.com/avatar.jpg',
      created_at: Date.now(),
      updated_at: Date.now(),
      last_sign_in_at: Date.now(),
      banned: false,
      public_metadata: {
        plan: 'free',
      },
      private_metadata: {},
      unsafe_metadata: {},
    };

    // Send webhook
    const response = await sendWebhookEvent('user.created', userData);
    const responseData = await response.json();

    console.log(`   ← Response status: ${response.status}`);

    if (response.status !== 200) {
      return {
        name: testName,
        passed: false,
        error: `Expected status 200, got ${response.status}`,
        details: responseData,
      };
    }

    // Wait a bit for database operations
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify user was created in database
    const dbUser = await findUserByClerkId(TEST_USER_ID);

    if (!dbUser) {
      return {
        name: testName,
        passed: false,
        error: 'User not found in database after webhook',
      };
    }

    // Verify user data
    const checks = [
      { name: 'email', match: dbUser.email === userData.email_addresses[0].email_address },
      { name: 'first_name', match: dbUser.first_name === userData.first_name },
      { name: 'last_name', match: dbUser.last_name === userData.last_name },
      { name: 'username', match: dbUser.username === userData.username },
      { name: 'email_verified', match: dbUser.email_verified === true },
    ];

    const failedChecks = checks.filter(c => !c.match);

    if (failedChecks.length > 0) {
      return {
        name: testName,
        passed: false,
        error: `Data mismatch: ${failedChecks.map(c => c.name).join(', ')}`,
        details: { expected: userData, actual: dbUser },
      };
    }

    // Verify webhook event was logged
    const webhookEvent = await query(
      `SELECT * FROM clerk_webhook_events WHERE object_id = $1 AND event_type = 'user.created'`,
      [TEST_USER_ID]
    );

    if (webhookEvent.rows.length === 0) {
      return {
        name: testName,
        passed: false,
        error: 'Webhook event not logged in clerk_webhook_events table',
      };
    }

    console.log(`   ✅ User created successfully in database`);
    console.log(`   ✅ Webhook event logged`);

    return {
      name: testName,
      passed: true,
      details: { userId: dbUser.id, clerkUserId: dbUser.clerk_user_id },
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test: user.updated event
 */
async function testUserUpdated(): Promise<TestResult> {
  const testName = 'user.updated event';
  console.log(`\n📝 Testing ${testName}...`);

  try {
    // Get existing user
    const existingUser = await findUserByClerkId(TEST_USER_ID);

    if (!existingUser) {
      return {
        name: testName,
        passed: false,
        error: 'Test user not found (user.created must run first)',
      };
    }

    // Create updated user data
    const updatedData = {
      id: TEST_USER_ID,
      email_addresses: [
        {
          id: 'email_' + Date.now(),
          email_address: existingUser.email, // Keep same email
          verification: {
            status: 'verified',
          },
        },
      ],
      first_name: 'Updated',
      last_name: 'Name',
      username: existingUser.username,
      profile_image_url: 'https://example.com/new-avatar.jpg',
      created_at: Date.now() - 10000,
      updated_at: Date.now(),
      last_sign_in_at: Date.now(),
      banned: false,
      public_metadata: {
        plan: 'premium',
      },
      private_metadata: {},
      unsafe_metadata: {},
    };

    // Send webhook
    const response = await sendWebhookEvent('user.updated', updatedData);
    const responseData = await response.json();

    console.log(`   ← Response status: ${response.status}`);

    if (response.status !== 200) {
      return {
        name: testName,
        passed: false,
        error: `Expected status 200, got ${response.status}`,
        details: responseData,
      };
    }

    // Wait for database update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify user was updated
    const dbUser = await findUserByClerkId(TEST_USER_ID);

    if (!dbUser) {
      return {
        name: testName,
        passed: false,
        error: 'User not found in database',
      };
    }

    // Verify updated data
    const checks = [
      { name: 'first_name', match: dbUser.first_name === 'Updated' },
      { name: 'last_name', match: dbUser.last_name === 'Name' },
    ];

    const failedChecks = checks.filter(c => !c.match);

    if (failedChecks.length > 0) {
      return {
        name: testName,
        passed: false,
        error: `Data not updated: ${failedChecks.map(c => c.name).join(', ')}`,
        details: { expected: updatedData, actual: dbUser },
      };
    }

    console.log(`   ✅ User updated successfully in database`);

    return {
      name: testName,
      passed: true,
      details: { userId: dbUser.id },
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test: session.created event
 */
async function testSessionCreated(): Promise<TestResult> {
  const testName = 'session.created event';
  console.log(`\n📝 Testing ${testName}...`);

  try {
    // Create session data
    const sessionData = {
      id: TEST_SESSION_ID,
      user_id: TEST_USER_ID,
      status: 'active',
      created_at: Date.now(),
      updated_at: Date.now(),
      abandon_at: Date.now() + 3600000,
      expire_at: Date.now() + 86400000,
    };

    // Send webhook
    const response = await sendWebhookEvent('session.created', sessionData);
    const responseData = await response.json();

    console.log(`   ← Response status: ${response.status}`);

    if (response.status !== 200) {
      return {
        name: testName,
        passed: false,
        error: `Expected status 200, got ${response.status}`,
        details: responseData,
      };
    }

    // Wait for database operations
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify webhook event was logged
    const webhookEvent = await query(
      `SELECT * FROM clerk_webhook_events WHERE object_id = $1 AND event_type = 'session.created'`,
      [TEST_SESSION_ID]
    );

    if (webhookEvent.rows.length === 0) {
      return {
        name: testName,
        passed: false,
        error: 'Session webhook event not logged in clerk_webhook_events table',
      };
    }

    console.log(`   ✅ Session event logged successfully`);

    return {
      name: testName,
      passed: true,
      details: { sessionId: TEST_SESSION_ID },
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test: user.deleted event
 */
async function testUserDeleted(): Promise<TestResult> {
  const testName = 'user.deleted event';
  console.log(`\n📝 Testing ${testName}...`);

  try {
    // Verify user exists first
    const existingUser = await findUserByClerkId(TEST_USER_ID);

    if (!existingUser) {
      return {
        name: testName,
        passed: false,
        error: 'Test user not found (must run after user.created)',
      };
    }

    // Create deletion data
    const deleteData = {
      id: TEST_USER_ID,
      deleted: true,
    };

    // Send webhook
    const response = await sendWebhookEvent('user.deleted', deleteData);
    const responseData = await response.json();

    console.log(`   ← Response status: ${response.status}`);

    if (response.status !== 200) {
      return {
        name: testName,
        passed: false,
        error: `Expected status 200, got ${response.status}`,
        details: responseData,
      };
    }

    // Wait for deletion
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify user was deleted
    const dbUser = await findUserByClerkId(TEST_USER_ID);

    if (dbUser) {
      return {
        name: testName,
        passed: false,
        error: 'User still exists in database after deletion webhook',
      };
    }

    // Verify webhook event was logged
    const webhookEvent = await query(
      `SELECT * FROM clerk_webhook_events WHERE object_id = $1 AND event_type = 'user.deleted'`,
      [TEST_USER_ID]
    );

    if (webhookEvent.rows.length === 0) {
      return {
        name: testName,
        passed: false,
        error: 'Deletion webhook event not logged',
      };
    }

    console.log(`   ✅ User deleted successfully from database`);
    console.log(`   ✅ Deletion webhook event logged`);

    return {
      name: testName,
      passed: true,
    };

  } catch (error) {
    return {
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Print test results summary
 */
function printTestSummary(results: TestResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`\n${index + 1}. ${icon} ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    } else if (result.details) {
      console.log(`   ${JSON.stringify(result.details)}`);
    }
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  return failed === 0;
}

/**
 * Check prerequisites
 */
async function checkPrerequisites(): Promise<boolean> {
  console.log('🔍 Checking prerequisites...\n');

  // Check database connection
  try {
    await query('SELECT NOW()');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('\n💡 Make sure PostgreSQL is running and DATABASE_URL or DATABASE_* variables are set');
    return false;
  }

  // Check if tables exist
  try {
    const tables = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'clerk_webhook_events')
    `);

    if (tables.rows.length < 2) {
      console.error('❌ Required tables not found');
      console.error('💡 Run "npm run db:init" to initialize the database schema');
      return false;
    }

    console.log('✅ Database tables exist');
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return false;
  }

  // Check webhook secret
  if (!SKIP_SIGNATURE) {
    if (!process.env.CLERK_WEBHOOK_SECRET) {
      console.warn('⚠️  CLERK_WEBHOOK_SECRET not set in .env');
      console.warn('💡 Set TEST_SKIP_SIGNATURE_VERIFICATION=true to skip signature verification');
      console.warn('   Or add CLERK_WEBHOOK_SECRET to .env for full testing\n');
    } else {
      console.log('✅ CLERK_WEBHOOK_SECRET configured');
    }
  } else {
    console.log('⚠️  Signature verification SKIPPED (TEST_SKIP_SIGNATURE_VERIFICATION=true)');
  }

  // Check if webhook endpoint would be accessible
  console.log(`\n🔗 Webhook endpoint: ${WEBHOOK_URL}`);
  console.log('💡 Make sure the Astro dev server is running: npm run dev\n');

  return true;
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Clerk Webhook Handler Test Suite');
  console.log('='.repeat(60));

  try {
    // Initialize database
    initializeDatabase();

    // Check prerequisites
    const prereqsPassed = await checkPrerequisites();

    if (!prereqsPassed) {
      console.error('\n❌ Prerequisites check failed. Fix the issues above and try again.');
      process.exit(1);
    }

    console.log('✅ All prerequisites met\n');
    console.log('='.repeat(60));
    console.log('🧪 Running tests...');
    console.log('='.repeat(60));

    // Run tests in sequence (order matters)
    testResults.push(await testUserCreated());
    testResults.push(await testUserUpdated());
    testResults.push(await testSessionCreated());
    testResults.push(await testUserDeleted());

    // Print summary
    const allPassed = printTestSummary(testResults);

    if (allPassed) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. See details above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run tests
main();
