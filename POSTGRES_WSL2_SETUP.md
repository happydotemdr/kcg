# PostgreSQL + Astro + WSL2 Setup Guide

## Problem Summary
PostgreSQL authentication failures when connecting from Astro/Node.js on WSL2, despite working with `psql` command line.

## Root Causes Identified

### 1. Astro Doesn't Auto-Load .env for Node.js Server Code
**Problem**: Astro (via Vite) only loads environment variables for bundled code, not for Node.js server adapter code that runs outside Vite's context.

**Solution**: Explicitly load dotenv at the top of `src/lib/db/config.ts`:

```typescript
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
```

### 2. WSL2 Networking Requires Explicit IP
**Problem**: Using `localhost` in WSL2 can cause connection routing issues.

**Solution**: Use `127.0.0.1` explicitly instead of `localhost`:

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5433
```

### 3. Special Characters in Passwords Break Node.js pg Library
**Problem**: Passwords with `@` and `!` characters fail authentication with Node.js `pg` library, even though they work with `psql`.

**Solution**: Use alphanumeric passwords without special characters for database connections:

```env
# ❌ BAD - Special chars cause auth failures
DATABASE_PASSWORD=KCG_Dev_P@ss2025!

# ✅ GOOD - Alphanumeric only
DATABASE_PASSWORD=kcgdev2025
```

### 4. PostgreSQL pg_hba.conf Authentication Method
**Problem**: Conflicting authentication rules in `pg_hba.conf` causing inconsistent behavior.

**Solution**: Ensure consistent `scram-sha-256` authentication for network connections:

```bash
# Update pg_hba.conf to use scram-sha-256 for 127.0.0.1
docker exec kcg-postgres bash -c "sed -i 's/host.*127.0.0.1\/32.*trust/host    all             all             127.0.0.1\/32            scram-sha-256/' /var/lib/postgresql/data/pg_hba.conf"

# Reload PostgreSQL config
docker exec kcg-postgres psql -U kcg_user -d kcg_db -c "SELECT pg_reload_conf();"
```

## Final Working Configuration

### Docker Container
```bash
docker run -d \
  --name kcg-postgres \
  -e POSTGRES_USER=kcg_user \
  -e POSTGRES_PASSWORD=kcgdev2025 \
  -e POSTGRES_DB=kcg_db \
  -p 5433:5432 \
  -v kcg-postgres-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:17
```

### .env File
```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5433
DATABASE_NAME=kcg_db
DATABASE_USER=kcg_user
DATABASE_PASSWORD=kcgdev2025
DATABASE_SSL=false
DATABASE_POOL_MAX=20
```

### Connection Test
```bash
# Test with psql
PGPASSWORD='kcgdev2025' psql -h 127.0.0.1 -p 5433 -U kcg_user -d kcg_db -c "SELECT version();"

# Test with Node.js
npm run db:test
```

## Key Takeaways

1. **Astro + Node adapter**: Must explicitly load .env files in server-side code
2. **WSL2**: Always use `127.0.0.1` instead of `localhost` for database connections
3. **Passwords**: Avoid special characters (`@`, `!`, `$`, etc.) in database passwords when using Node.js pg library
4. **Authentication**: Use consistent scram-sha-256 authentication across all connection types

## Troubleshooting Commands

```bash
# Check if container is running
docker ps | grep kcg-postgres

# View PostgreSQL logs
docker logs kcg-postgres --tail 50

# Test connection from host
PGPASSWORD='kcgdev2025' psql -h 127.0.0.1 -p 5433 -U kcg_user -d kcg_db

# List database tables
PGPASSWORD='kcgdev2025' psql -h 127.0.0.1 -p 5433 -U kcg_user -d kcg_db -c "\dt"

# Check what env vars Node.js sees
node -e "require('dotenv').config(); console.log(process.env.DATABASE_HOST);"
```
