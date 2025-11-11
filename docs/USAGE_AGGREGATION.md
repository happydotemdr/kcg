# Usage Data Aggregation System

## Overview

The usage aggregation system pre-computes daily summaries of Claude API usage for faster dashboard queries. Instead of querying the raw `claude_api_calls` table (which can contain millions of rows), aggregated data in `claude_usage_daily_summary` provides instant access to daily metrics.

## Architecture

### Data Flow

```
Raw API Calls
    ↓
claude_api_calls (partitioned by month)
    ↓
Daily Aggregation Job (2 AM UTC)
    ↓
claude_usage_daily_summary (pre-computed)
    ↓
Dashboard API (fast queries)
```

### Key Components

- **Raw Data Table**: `claude_api_calls` (partitioned by month)
- **Aggregated Data Table**: `claude_usage_daily_summary` (daily summaries)
- **Job Logic**: `/src/lib/jobs/aggregate-daily-usage.ts`
- **Cron Endpoint**: `/api/cron/aggregate-usage`
- **Backfill Endpoint**: `/api/admin/backfill-aggregations`
- **Configuration**: `/vercel.json`

## Scheduled Execution

The aggregation runs automatically via Vercel Cron.

**Schedule**: `0 2 * * *` (Every day at 2:00 AM UTC)

**What it does**:
1. Queries all users with API activity from the previous day
2. Aggregates metrics per user (tokens, cost, API calls, tools, models)
3. Inserts/updates records in `claude_usage_daily_summary`
4. Returns execution summary (success count, duration, failures)

**Why 2 AM UTC?**:
- Ensures all previous day's data is captured
- Avoids peak usage times
- Gives time for any delayed data to arrive

## Manual Execution

### Aggregate Single Day

Use this to re-run aggregation for a specific date:

```bash
# Aggregate yesterday's data (default)
curl -X GET "https://your-domain.com/api/cron/aggregate-usage" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Aggregate specific date
curl -X GET "https://your-domain.com/api/cron/aggregate-usage?date=2025-01-15" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response**:
```json
{
  "success": true,
  "message": "Aggregated usage data for 2025-01-15",
  "date": "2025-01-15",
  "totalUsers": 42,
  "successCount": 42,
  "failureCount": 0,
  "failures": [],
  "durationMs": 2350
}
```

### Backfill Date Range

Use this to aggregate historical data in bulk:

```bash
# Backfill last 30 days
curl -X POST "https://your-domain.com/api/admin/backfill-aggregations?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Cookie: __session=YOUR_CLERK_SESSION"
```

**Response**:
```json
{
  "success": true,
  "message": "Backfilled 31 days of usage data",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "totalDays": 31,
  "results": [
    {
      "date": "2025-01-01",
      "totalUsers": 38,
      "successCount": 38,
      "failureCount": 0
    },
    // ... more days
  ],
  "totalDurationMs": 68500
}
```

**Limits**:
- Maximum 90 days per request
- Requires Clerk authentication
- Admin-only (TODO: add admin role check)

## Configuration

### Environment Variables

**`CRON_SECRET`** (optional):
- Secret token for Vercel Cron authentication
- Generate with: `openssl rand -base64 32`
- Set in Vercel dashboard: Settings → Environment Variables
- If not set, endpoints will require Clerk authentication

**Example**:
```bash
CRON_SECRET=abc123xyz789randomsecret
```

### Vercel Cron Setup

1. **Add Configuration**:
   - Already configured in `/vercel.json`
   - Defines cron path and schedule

2. **Deploy to Vercel**:
   ```bash
   vercel deploy --prod
   ```

3. **Set Environment Variable**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add `CRON_SECRET` with your generated secret
   - Redeploy for changes to take effect

4. **Verify Cron Job**:
   - Check Vercel Dashboard → Deployments → Functions
   - Look for `/api/cron/aggregate-usage` in function list
   - Check cron logs after 2 AM UTC

### Local Development

For local testing without Vercel Cron:

```bash
# Test aggregation endpoint locally
curl -X GET "http://localhost:4321/api/cron/aggregate-usage" \
  -H "Authorization: Bearer YOUR_LOCAL_SECRET"

# Or test without CRON_SECRET (uses Clerk auth)
# Visit http://localhost:4321/api/cron/aggregate-usage in browser
```

## Monitoring

### Success Metrics

**Check Recent Aggregations**:
```sql
SELECT * FROM claude_usage_daily_summary
ORDER BY date DESC
LIMIT 10;
```

**Verify Today's Aggregation**:
```sql
SELECT
  date,
  COUNT(*) as users_aggregated,
  SUM(api_calls_count) as total_api_calls,
  SUM(total_cost_usd) as total_cost
FROM claude_usage_daily_summary
WHERE date = CURRENT_DATE - INTERVAL '1 day'
GROUP BY date;
```

### Failure Detection

**Vercel Function Logs**:
1. Go to Vercel Dashboard
2. Navigate to Deployments → Functions
3. Click on `/api/cron/aggregate-usage`
4. Check invocation logs and error messages

**Database Query for Missing Days**:
```sql
-- Find dates with API calls but no aggregation
SELECT DISTINCT DATE(created_at) as missing_date
FROM claude_api_calls
WHERE DATE(created_at) NOT IN (
  SELECT date FROM claude_usage_daily_summary
)
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY missing_date DESC;
```

### Alerting (Recommended)

Set up alerts for:
- **Cron Failures**: 500 errors from `/api/cron/aggregate-usage`
- **Missing Aggregations**: Daily check for missing summaries
- **Performance Degradation**: Aggregation taking >5 minutes
- **Data Consistency**: Mismatch between raw calls and summaries

## Troubleshooting

### Aggregation Not Running

**Symptoms**:
- No new rows in `claude_usage_daily_summary`
- Vercel cron logs empty

**Solutions**:
1. Check `/vercel.json` configuration is deployed
2. Verify `CRON_SECRET` environment variable is set
3. Review Vercel function logs for errors
4. Test endpoint manually with curl

### Aggregation Failing

**Symptoms**:
- 500 errors in Vercel logs
- Aggregation returns `success: false`

**Solutions**:
1. **Database Connection**: Check `DATABASE_URL` is correct
2. **Migration Status**: Verify Phase 1 migrations are applied
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM information_schema.tables WHERE table_name = 'claude_usage_daily_summary';"
   ```
3. **Data Consistency**: Check for NULL values or invalid data
   ```sql
   SELECT COUNT(*) FROM claude_api_calls WHERE user_id IS NULL;
   ```
4. **Memory/Timeout**: Check Vercel function limits (10s default, 60s max)

### Backfilling Historical Data

**Scenario**: Need to aggregate past 30 days after initial deployment

**Steps**:
1. Determine date range (e.g., 2025-01-01 to 2025-01-31)
2. Call backfill endpoint:
   ```bash
   curl -X POST "https://your-domain.com/api/admin/backfill-aggregations?start_date=2025-01-01&end_date=2025-01-31" \
     -H "Cookie: __session=YOUR_CLERK_SESSION"
   ```
3. Monitor progress in response (shows per-day results)
4. Verify in database:
   ```sql
   SELECT COUNT(*) FROM claude_usage_daily_summary
   WHERE date >= '2025-01-01' AND date <= '2025-01-31';
   ```

### Data Mismatch

**Scenario**: Aggregated data doesn't match raw data

**Diagnosis**:
```sql
-- Compare aggregated vs raw for a specific date
WITH raw_stats AS (
  SELECT
    user_id,
    COUNT(*) as api_calls,
    SUM(total_tokens) as tokens,
    SUM(estimated_cost_usd) as cost
  FROM claude_api_calls
  WHERE DATE(created_at) = '2025-01-15'
  GROUP BY user_id
),
agg_stats AS (
  SELECT
    user_id,
    api_calls_count as api_calls,
    total_tokens as tokens,
    total_cost_usd as cost
  FROM claude_usage_daily_summary
  WHERE date = '2025-01-15'
)
SELECT
  r.user_id,
  r.api_calls as raw_api_calls,
  a.api_calls as agg_api_calls,
  r.cost as raw_cost,
  a.cost as agg_cost
FROM raw_stats r
FULL OUTER JOIN agg_stats a ON r.user_id = a.user_id
WHERE r.api_calls != a.api_calls OR r.cost != a.cost;
```

**Resolution**:
- Re-run aggregation for affected date
- Check for timezone issues (use UTC consistently)
- Verify no data modifications after aggregation

## Performance

### Benchmarks

- **Single User**: ~50-100ms per day
- **100 Users**: ~5-10 seconds total
- **1000 Users**: ~50-100 seconds total

### Optimizations

**Sequential Processing**:
- Aggregation processes users sequentially
- Prevents overwhelming database connection pool
- Trade-off: Slower but more stable

**Date Partitioning**:
- `claude_api_calls` partitioned by month
- Aggregation queries only target relevant partition
- Improves query performance significantly

**Indexing**:
- Index on `(user_id, created_at)` for fast date filtering
- Index on `(user_id, date)` in summary table for dashboard queries

### Scaling Considerations

**Current Limits**:
- 20 DB connections max (configurable via `DATABASE_POOL_MAX`)
- 60s Vercel function timeout
- ~5000 users can be processed in 60s

**If You Exceed Limits**:
1. Increase `DATABASE_POOL_MAX` in `.env`
2. Split aggregation into batches (e.g., A-M, N-Z)
3. Use multiple cron jobs with user_id filters
4. Consider moving to background worker (e.g., Vercel Queue)

## Data Retention

**Aggregated Data**:
- No automatic deletion
- Summaries are small (~1-2 KB per row)
- Recommended retention: Indefinite (for historical analytics)

**Raw Data**:
- Partitioned by month for efficient pruning
- Recommended retention: 90-180 days
- Drop old partitions to save space:
  ```sql
  DROP TABLE claude_api_calls_y2024m01;
  ```

## Security

### Authentication

**Cron Endpoint** (`/api/cron/aggregate-usage`):
- Option 1: Bearer token via `CRON_SECRET`
- Option 2: Clerk authentication (fallback)
- Production: Always use `CRON_SECRET`

**Backfill Endpoint** (`/api/admin/backfill-aggregations`):
- Requires Clerk authentication
- TODO: Add admin role check via Clerk metadata
- Rate limiting recommended (not implemented)

### Best Practices

1. **Rotate CRON_SECRET**: Change periodically
2. **Monitor Logs**: Watch for unauthorized attempts
3. **Restrict Access**: Only admins can backfill
4. **Rate Limiting**: Add rate limits to backfill endpoint
5. **Audit Trail**: Log who triggers manual aggregations

## API Reference

### GET /api/cron/aggregate-usage

Aggregate usage data for a single date.

**Authentication**: Bearer token (CRON_SECRET) or Clerk session

**Query Parameters**:
- `date` (optional): Date in YYYY-MM-DD format (defaults to yesterday)

**Response**:
```json
{
  "success": true,
  "message": "Aggregated usage data for 2025-01-15",
  "date": "2025-01-15",
  "totalUsers": 42,
  "successCount": 42,
  "failureCount": 0,
  "failures": [],
  "durationMs": 2350
}
```

**Error Codes**:
- `401`: Unauthorized (missing or invalid token)
- `400`: Invalid date format
- `500`: Aggregation failed

### POST /api/admin/backfill-aggregations

Backfill aggregations for a date range.

**Authentication**: Clerk session (admin role recommended)

**Query Parameters**:
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format

**Validation**:
- Maximum 90 days per request
- start_date must be before or equal to end_date

**Response**:
```json
{
  "success": true,
  "message": "Backfilled 31 days of usage data",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "totalDays": 31,
  "results": [...],
  "totalDurationMs": 68500
}
```

**Error Codes**:
- `401`: Unauthorized (no Clerk session)
- `400`: Invalid parameters
- `500`: Backfill failed

## Future Enhancements

### Planned Features

1. **Admin Role Check**: Restrict backfill to admin users
2. **Progress Streaming**: Stream backfill progress via SSE
3. **Incremental Aggregation**: Update only changed data
4. **Parallel Processing**: Batch users for faster aggregation
5. **Alerting Integration**: Slack/email notifications on failures
6. **Dashboard UI**: Web interface for manual aggregation
7. **Data Validation**: Verify aggregations match raw data
8. **Retry Logic**: Auto-retry failed aggregations

### Known Limitations

1. **Sequential Processing**: Slower for large user bases
2. **No Progress Feedback**: Backfill runs blind until complete
3. **No Admin Check**: Any authenticated user can backfill
4. **No Rate Limiting**: Backfill endpoint can be abused
5. **Fixed Timezone**: Always uses UTC (no per-user timezones)

## Related Documentation

- [Usage Tracking Architecture](./USAGE_TRACKING_ARCHITECTURE.md)
- [Database Schema](./USAGE_TRACKING_SCHEMA.md)
- [API Integration Guide](./USAGE_TRACKING_INTEGRATION.md)
- [Dashboard Implementation](./USAGE_TRACKING_DASHBOARD.md)
