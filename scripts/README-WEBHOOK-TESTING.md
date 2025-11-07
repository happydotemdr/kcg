# Clerk Webhook Handler Testing

This directory contains a comprehensive test script for the Clerk webhook handler that verifies the webhook endpoint processes events correctly and syncs data to PostgreSQL.

## Test Script

**File**: `test-webhook.ts`

**Purpose**: Tests the Clerk webhook handler at `/api/webhooks/clerk` by simulating webhook events and verifying database synchronization.

## What Gets Tested

The script tests four webhook event types:

1. **`user.created`** - Creates a new user record in the database
   - Verifies user data is correctly inserted
   - Checks all fields are mapped properly (email, name, username, etc.)
   - Confirms webhook event is logged to `clerk_webhook_events` table

2. **`user.updated`** - Updates existing user data
   - Verifies user record is updated with new data
   - Checks updated fields reflect changes
   - Confirms update webhook event is logged

3. **`session.created`** - Logs session creation event
   - Verifies webhook event is logged to `clerk_webhook_events` table
   - Confirms session data is stored in payload

4. **`user.deleted`** - Removes user from database
   - Verifies user record is deleted
   - Confirms deletion webhook event is logged

## Prerequisites

Before running the tests, ensure:

### 1. Database Setup
- PostgreSQL 17 is running
- Database is initialized with schema: `npm run db:init`
- Database connection configured in `.env`:
  ```bash
  DATABASE_URL=postgresql://user:password@localhost:5432/kcg_db
  # OR
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_NAME=kcg_db
  DATABASE_USER=postgres
  DATABASE_PASSWORD=your_password
  ```

### 2. Astro Dev Server
- Start the development server: `npm run dev`
- The webhook endpoint must be accessible at `http://localhost:4321/api/webhooks/clerk`

### 3. Webhook Secret (Optional)
For full signature verification testing:
```bash
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**OR** skip signature verification for local testing:
```bash
TEST_SKIP_SIGNATURE_VERIFICATION=true
```

## Running the Tests

### Quick Start

```bash
# 1. Start PostgreSQL (if not already running)
# 2. Initialize database (if not done)
npm run db:init

# 3. Start Astro dev server in one terminal
npm run dev

# 4. Run tests in another terminal
npm run test:webhook
```

### Expected Output

```
🚀 Clerk Webhook Handler Test Suite
============================================================
🔍 Checking prerequisites...

✅ Database connection successful
✅ Database tables exist
✅ CLERK_WEBHOOK_SECRET configured

✅ All prerequisites met

============================================================
🧪 Running tests...
============================================================

📝 Testing user.created event...
   → Sending user.created event...
   ← Response status: 200
   ✅ User created successfully in database
   ✅ Webhook event logged

📝 Testing user.updated event...
   → Sending user.updated event...
   ← Response status: 200
   ✅ User updated successfully in database

📝 Testing session.created event...
   → Sending session.created event...
   ← Response status: 200
   ✅ Session event logged successfully

📝 Testing user.deleted event...
   → Sending user.deleted event...
   ← Response status: 200
   ✅ User deleted successfully from database
   ✅ Deletion webhook event logged

============================================================
📊 TEST RESULTS SUMMARY
============================================================

1. ✅ user.created event
2. ✅ user.updated event
3. ✅ session.created event
4. ✅ user.deleted event

============================================================
Total: 4 | Passed: 4 | Failed: 0
============================================================

🎉 All tests passed!
```

## Environment Variables

Configure these in your `.env` file:

```bash
# Required: Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/kcg_db

# Optional: Webhook secret (get from Clerk dashboard)
CLERK_WEBHOOK_SECRET=whsec_your_secret

# Optional: Skip signature verification for local testing
TEST_SKIP_SIGNATURE_VERIFICATION=true

# Optional: Override webhook endpoint URL
WEBHOOK_TEST_URL=http://localhost:4321/api/webhooks/clerk
```

## Troubleshooting

### "Database connection failed"
- Ensure PostgreSQL is running: `pg_ctl status` or `sudo systemctl status postgresql`
- Check DATABASE_URL or DATABASE_* variables in `.env`
- Test connection: `npm run db:test`

### "Required tables not found"
- Initialize the database schema: `npm run db:init`

### "Connection refused" or 404 errors
- Make sure Astro dev server is running: `npm run dev`
- Verify webhook endpoint: `http://localhost:4321/api/webhooks/clerk`
- Check WEBHOOK_TEST_URL if using custom URL

### "Invalid webhook signature"
- Set `TEST_SKIP_SIGNATURE_VERIFICATION=true` in `.env` for local testing
- OR configure `CLERK_WEBHOOK_SECRET` with real secret from Clerk dashboard

### Tests fail intermittently
- The script waits 500ms between webhook send and database verification
- If your system is slow, the timing might need adjustment
- Check database logs for any errors

## How It Works

### 1. Mock Webhook Payloads
The script generates realistic Clerk webhook payloads matching their API format:

```typescript
{
  object: 'event',
  type: 'user.created',
  data: {
    id: 'user_xxx',
    email_addresses: [...],
    first_name: 'John',
    // ... other Clerk user fields
  }
}
```

### 2. Svix Signature Headers
For each webhook, the script generates proper Svix headers:
- `svix-id`: Unique message ID
- `svix-timestamp`: UNIX timestamp
- `svix-signature`: HMAC signature (if CLERK_WEBHOOK_SECRET is set)

### 3. HTTP POST Request
Sends the webhook payload to the endpoint with proper headers:
```typescript
POST http://localhost:4321/api/webhooks/clerk
Content-Type: application/json
svix-id: msg_xxx
svix-timestamp: 1234567890
svix-signature: v1,signature_hash
```

### 4. Database Verification
After each webhook, the script:
- Waits for async database operations to complete
- Queries the `users` table to verify data
- Checks the `clerk_webhook_events` table for audit logs
- Validates all fields match expected values

### 5. Test Results
Each test returns:
- ✅ **PASS**: Webhook processed successfully, data synced correctly
- ❌ **FAIL**: Error occurred, with details about what went wrong

## Database Tables Checked

### `users` table
- Verifies user records are created, updated, and deleted
- Checks field mapping (email, name, username, metadata, etc.)

### `clerk_webhook_events` table
- Confirms all webhook events are logged for audit
- Verifies `processed` flag is set to true
- Checks event metadata (type, object_id, payload)

## Integration with CI/CD

To use in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Webhook Tests
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    TEST_SKIP_SIGNATURE_VERIFICATION: true
  run: |
    npm run db:init
    npm run dev &
    sleep 5  # Wait for server to start
    npm run test:webhook
```

## Related Files

- **Webhook Handler**: `/src/pages/api/webhooks/clerk.ts`
- **Database Schema**: `/src/lib/db/schema.sql`
- **User Repository**: `/src/lib/db/repositories/users.ts`
- **Webhook Repository**: `/src/lib/db/repositories/webhooks.ts`

## Support

If you encounter issues:
1. Check the prerequisites section above
2. Review error messages carefully
3. Verify all environment variables are set
4. Check database logs: `tail -f /var/log/postgresql/*.log`
5. Enable verbose logging in the webhook handler

## Future Enhancements

Potential improvements:
- [ ] Test error scenarios (invalid data, malformed payloads)
- [ ] Test concurrent webhook processing
- [ ] Test webhook retry logic
- [ ] Add performance benchmarks
- [ ] Test with real Clerk webhook events (using Clerk CLI)
- [ ] Add integration tests with actual Clerk account
