# PostgreSQL 17 Database Setup

This document describes the PostgreSQL 17 database integration for the Keep Choosing Good (KCG) project, including setup for Clerk.com authentication integration.

## Overview

The database layer provides:
- **PostgreSQL 17** connection with connection pooling
- **Clerk.com integration** tables for user management and authentication
- **Type-safe** database operations with TypeScript
- **Migration system** for schema versioning
- **Repository pattern** for clean data access

## Database Schema

### Tables

#### `users`
Stores user data synchronized from Clerk.com.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| clerk_user_id | VARCHAR(255) | Clerk's user ID (unique) |
| email | VARCHAR(255) | User email (unique) |
| email_verified | BOOLEAN | Email verification status |
| first_name | VARCHAR(100) | User's first name |
| last_name | VARCHAR(100) | User's last name |
| username | VARCHAR(100) | Unique username |
| profile_image_url | TEXT | Profile image URL |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |
| last_sign_in_at | TIMESTAMP | Last sign-in time |
| metadata | JSONB | Additional user metadata |
| banned | BOOLEAN | Ban status |

#### `user_sessions`
Tracks active user sessions from Clerk.com.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to users table |
| clerk_session_id | VARCHAR(255) | Clerk's session ID (unique) |
| status | VARCHAR(50) | Session status (active/expired/revoked) |
| last_active_at | TIMESTAMP | Last activity timestamp |
| expires_at | TIMESTAMP | Session expiration time |
| ip_address | INET | Client IP address |
| user_agent | TEXT | Client user agent |
| created_at | TIMESTAMP | Session creation time |
| updated_at | TIMESTAMP | Last update time |

#### `user_metadata`
Stores additional custom user data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to users table |
| key | VARCHAR(100) | Metadata key |
| value | TEXT | Metadata value |
| value_type | VARCHAR(50) | Value type (string/number/boolean/json) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

#### `clerk_webhook_events`
Logs all webhook events from Clerk.com for audit and debugging.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | VARCHAR(255) | Clerk's event ID (unique) |
| event_type | VARCHAR(100) | Event type (e.g., user.created) |
| object_type | VARCHAR(50) | Object type (user/session/etc) |
| object_id | VARCHAR(255) | Affected object ID |
| payload | JSONB | Full webhook payload |
| processed | BOOLEAN | Processing status |
| processed_at | TIMESTAMP | Processing time |
| error_message | TEXT | Error message if failed |
| created_at | TIMESTAMP | Event reception time |

## Setup Instructions

### Prerequisites

1. **PostgreSQL 17** installed and running
2. **Node.js 18+** installed
3. Database created (e.g., `kcg_db`)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Choose ONE of these connection methods:

   **Option A: Single DATABASE_URL (Recommended for production)**
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/kcg_db
   ```

   **Option B: Individual parameters (Good for development)**
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=kcg_db
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your_password
   DATABASE_SSL=false
   DATABASE_POOL_MAX=20
   ```

3. **Test the connection:**
   ```bash
   npm run db:test
   ```

4. **Initialize the database schema:**
   ```bash
   npm run db:init
   ```

5. **Seed with sample data (optional):**
   ```bash
   npm run db:seed
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:test` | Test database connection and show configuration |
| `npm run db:init` | Initialize database with schema (runs migrations) |
| `npm run db:seed` | Populate database with sample data |

## Usage Examples

### Importing the Database Module

```typescript
import { query, transaction, initializeDatabase } from '@/lib/db';
```

### Basic Query

```typescript
import { query } from '@/lib/db';

const result = await query('SELECT * FROM users WHERE email = $1', ['user@example.com']);
const user = result.rows[0];
```

### Using Repositories

```typescript
import { findUserByEmail, createUser } from '@/lib/db/repositories/users';

// Find a user
const user = await findUserByEmail('user@example.com');

// Create a user
const newUser = await createUser({
  clerk_user_id: 'user_2abc123',
  email: 'newuser@example.com',
  email_verified: true,
  first_name: 'John',
  last_name: 'Doe',
  username: 'johndoe',
  metadata: {},
  banned: false,
});
```

### Transactions

```typescript
import { transaction } from '@/lib/db';

await transaction(async (client) => {
  await client.query('INSERT INTO users (...) VALUES (...)');
  await client.query('INSERT INTO user_metadata (...) VALUES (...)');
  // Both queries succeed or both fail
});
```

### Webhook Event Handling

```typescript
import { storeWebhookEvent, markWebhookProcessed } from '@/lib/db/repositories/webhooks';

// Store incoming webhook
const event = await storeWebhookEvent({
  event_id: 'evt_2abc123',
  event_type: 'user.created',
  object_type: 'user',
  object_id: 'user_2abc123',
  payload: webhookData,
  processed: false,
});

// Mark as processed
await markWebhookProcessed(event.event_id);
```

## Clerk.com Integration

### Setting Up Webhooks

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Webhooks** section
3. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `session.created`
   - `session.ended`

5. Copy the webhook secret and add to `.env`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Syncing Users from Clerk

When you receive a webhook from Clerk, use the `upsertUser` function:

```typescript
import { upsertUser } from '@/lib/db/repositories/users';

const clerkUser = webhookPayload.data;

const user = await upsertUser({
  clerk_user_id: clerkUser.id,
  email: clerkUser.email_addresses[0].email_address,
  email_verified: clerkUser.email_addresses[0].verified,
  first_name: clerkUser.first_name,
  last_name: clerkUser.last_name,
  username: clerkUser.username,
  profile_image_url: clerkUser.image_url,
  last_sign_in_at: new Date(clerkUser.last_sign_in_at),
  metadata: clerkUser.public_metadata,
  banned: false,
});
```

## Database Module Structure

```
src/lib/db/
├── index.ts                    # Main exports
├── config.ts                   # Database configuration
├── client.ts                   # Connection pool & query functions
├── types.ts                    # TypeScript type definitions
├── schema.sql                  # Database schema (PostgreSQL)
├── migrations.ts               # Migration runner
└── repositories/
    ├── users.ts               # User CRUD operations
    └── webhooks.ts            # Webhook event operations
```

## Connection Pooling

The database uses connection pooling for optimal performance:
- **Default pool size:** 20 connections
- **Idle timeout:** 30 seconds
- **Connection timeout:** 10 seconds

Configure via environment variables:
```env
DATABASE_POOL_MAX=20
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection:
   ```typescript
   // ✅ Good
   query('SELECT * FROM users WHERE id = $1', [userId]);

   // ❌ Bad
   query(`SELECT * FROM users WHERE id = '${userId}'`);
   ```

2. **Use transactions for multi-step operations:**
   ```typescript
   await transaction(async (client) => {
     // Multiple related operations
   });
   ```

3. **Use repository functions** instead of raw queries when available

4. **Close the database connection** when your application shuts down:
   ```typescript
   import { closeDatabase } from '@/lib/db';

   process.on('SIGTERM', async () => {
     await closeDatabase();
     process.exit(0);
   });
   ```

## Troubleshooting

### Connection Issues

1. **Verify PostgreSQL is running:**
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. **Check environment variables:**
   ```bash
   npm run db:test
   ```

3. **Test direct connection:**
   ```bash
   psql postgresql://username:password@localhost:5432/kcg_db
   ```

### Migration Issues

If migrations fail:
1. Check database permissions
2. Ensure the database exists
3. Review error messages in console

### Common Errors

**Error: "password authentication failed"**
- Check `DATABASE_USER` and `DATABASE_PASSWORD` in `.env`

**Error: "database does not exist"**
- Create the database: `createdb kcg_db`

**Error: "relation does not exist"**
- Run migrations: `npm run db:init`

## Security Considerations

1. **Never commit `.env` file** to version control
2. **Use SSL in production** (`DATABASE_SSL=true`)
3. **Rotate database credentials** regularly
4. **Limit database user permissions** to only what's needed
5. **Validate and sanitize** webhook payloads
6. **Use Clerk webhook signatures** to verify authenticity

## Production Deployment

For production environments:

1. Use a managed PostgreSQL service (AWS RDS, Supabase, Railway, etc.)
2. Enable SSL connections
3. Use connection pooling (PgBouncer recommended)
4. Set up automated backups
5. Monitor database performance
6. Use read replicas for scaling reads

Example production `.env`:
```env
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/kcg_db?sslmode=require
DATABASE_SSL=true
DATABASE_POOL_MAX=50
```

## Support

For issues or questions:
- Check the [PostgreSQL documentation](https://www.postgresql.org/docs/17/)
- Review [Clerk.com documentation](https://clerk.com/docs)
- Open an issue in the project repository
