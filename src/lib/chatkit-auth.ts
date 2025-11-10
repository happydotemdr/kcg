/**
 * ChatKit Authentication Helpers
 *
 * Provides token validation and generation for self-hosted ChatKit backend.
 * Uses a JWT-style approach with HMAC signatures and expiry timestamps.
 *
 * Token Format: chatkit_${userId}_${timestamp}_${expiry}_${signature}
 * - userId: Clerk user ID
 * - timestamp: Token creation timestamp (ms)
 * - expiry: Token expiration timestamp (ms)
 * - signature: HMAC-SHA256 signature to prevent tampering
 */

import { createHmac } from 'crypto';

// Token validity duration: 1 hour
const TOKEN_VALIDITY_MS = 60 * 60 * 1000;

// Secret key for HMAC signing (should be in env var in production)
const SIGNING_SECRET = process.env.CHATKIT_SIGNING_SECRET || 'development-secret-key-change-in-production';

/**
 * Generate HMAC signature for token components
 */
function generateSignature(userId: string, timestamp: number, expiry: number): string {
  const payload = `${userId}_${timestamp}_${expiry}`;
  return createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for brevity
}

/**
 * Generate a new client_secret with expiry
 */
export function generateClientSecret(userId: string): { clientSecret: string; expiresAt: string } {
  const timestamp = Date.now();
  const expiry = timestamp + TOKEN_VALIDITY_MS;
  const signature = generateSignature(userId, timestamp, expiry);

  const clientSecret = `chatkit_${userId}_${timestamp}_${expiry}_${signature}`;
  const expiresAt = new Date(expiry).toISOString();

  return { clientSecret, expiresAt };
}

/**
 * Validate an existing client_secret
 */
export function validateClientSecret(
  clientSecret: string,
  expectedUserId: string
): { valid: boolean; reason?: string } {
  // Parse token format
  const parts = clientSecret.split('_');

  // Expected format: chatkit_userId_timestamp_expiry_signature (5 parts)
  if (parts.length !== 5 || parts[0] !== 'chatkit') {
    return { valid: false, reason: 'invalid_format' };
  }

  const [, userId, timestampStr, expiryStr, signature] = parts;

  // Verify user ID matches
  if (userId !== expectedUserId) {
    return { valid: false, reason: 'user_mismatch' };
  }

  // Parse timestamps
  const timestamp = parseInt(timestampStr, 10);
  const expiry = parseInt(expiryStr, 10);

  if (isNaN(timestamp) || isNaN(expiry)) {
    return { valid: false, reason: 'invalid_timestamp' };
  }

  // Check expiry
  if (Date.now() > expiry) {
    return { valid: false, reason: 'expired' };
  }

  // Verify signature
  const expectedSignature = generateSignature(userId, timestamp, expiry);
  if (signature !== expectedSignature) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true };
}

/**
 * Extract expiry timestamp from client_secret without full validation
 * Used for frontend expiry warnings
 */
export function getTokenExpiry(clientSecret: string): number | null {
  try {
    const parts = clientSecret.split('_');
    if (parts.length !== 5 || parts[0] !== 'chatkit') {
      return null;
    }
    const expiry = parseInt(parts[3], 10);
    return isNaN(expiry) ? null : expiry;
  } catch {
    return null;
  }
}

/**
 * Check if a token is approaching expiry (within 5 minutes)
 */
export function isTokenApproachingExpiry(clientSecret: string): boolean {
  const expiry = getTokenExpiry(clientSecret);
  if (!expiry) return true; // Treat invalid tokens as expired

  const fiveMinutesMs = 5 * 60 * 1000;
  return Date.now() > (expiry - fiveMinutesMs);
}
