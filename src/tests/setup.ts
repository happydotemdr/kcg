/**
 * Test setup file for vitest
 *
 * This file runs before all tests and sets up the testing environment.
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Ensure required environment variables are set for tests
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set in environment. Integration tests may fail.');
}
