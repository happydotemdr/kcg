# Usage Summary API Documentation

## Endpoint: GET /api/usage/summary

Provides aggregated Claude API usage and cost data with time-series breakdown.

### Authentication

Requires valid Clerk session. Returns `401 Unauthorized` if not authenticated.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | string | No | 30 days ago | Start of date range (ISO 8601: YYYY-MM-DD) |
| `end_date` | string | No | Today | End of date range (ISO 8601: YYYY-MM-DD) |
| `group_by` | string | No | `day` | Time series grouping: `day`, `week`, or `month` |

### Response Format

```json
{
  "summary": {
    "total_cost": 0.0234,
    "total_tokens": 12450,
    "total_input_tokens": 8230,
    "total_output_tokens": 4220,
    "api_calls_count": 15,
    "unique_conversations": 3,
    "tool_calls_count": 7,
    "average_cost_per_call": 0.00156,
    "average_response_time_ms": 1234.5
  },
  "time_series": [
    {
      "period": "2025-11-01",
      "cost": 0.0089,
      "tokens": 4500,
      "api_calls": 5
    },
    {
      "period": "2025-11-02",
      "cost": 0.0145,
      "tokens": 7950,
      "api_calls": 10
    }
  ],
  "date_range": {
    "start_date": "2025-11-01",
    "end_date": "2025-11-10",
    "group_by": "day"
  }
}
```

### Response Fields

#### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| `total_cost` | number | Total estimated cost in USD |
| `total_tokens` | number | Total tokens (input + output + cache) |
| `total_input_tokens` | number | Total input tokens sent to Claude |
| `total_output_tokens` | number | Total output tokens received from Claude |
| `api_calls_count` | number | Total number of API calls made |
| `unique_conversations` | number | Number of distinct conversations |
| `tool_calls_count` | number | Total number of tool/function calls |
| `average_cost_per_call` | number | Average cost per API call in USD |
| `average_response_time_ms` | number | Average response time in milliseconds |

#### Time Series Array

| Field | Type | Description |
|-------|------|-------------|
| `period` | string | ISO date representing the period (YYYY-MM-DD) |
| `cost` | number | Total cost for this period in USD |
| `tokens` | number | Total tokens for this period |
| `api_calls` | number | Number of API calls in this period |

**Note**: For `group_by=week`, the period represents the Monday start of the ISO week. For `group_by=month`, it represents the first day of the month.

### Grouping Behavior

#### Daily (`group_by=day`)
Returns one entry per calendar day with activity.

#### Weekly (`group_by=week`)
Groups data by ISO week (Monday-Sunday). The `period` field shows the Monday date of each week.

#### Monthly (`group_by=month`)
Groups data by calendar month. The `period` field shows the first day of each month.

### Caching

Response includes `Cache-Control` headers for efficient caching:

- **Historical data** (end_date is in the past): `private, max-age=3600` (1 hour)
- **Current data** (end_date includes today): `private, max-age=300` (5 minutes)

This ensures fresh data for ongoing usage while reducing load for historical queries.

### Error Responses

#### 400 Bad Request

Invalid query parameters:

```json
{
  "error": "Invalid date format: invalid-date. Expected YYYY-MM-DD"
}
```

```json
{
  "error": "Invalid group_by parameter. Must be: day, week, or month"
}
```

```json
{
  "error": "start_date must be before or equal to end_date"
}
```

#### 401 Unauthorized

No valid Clerk session:

```json
{
  "error": "Unauthorized"
}
```

#### 404 Not Found

User authenticated but not found in database (rare edge case):

```json
{
  "error": "User not found in database"
}
```

#### 500 Internal Server Error

Database or server error:

```json
{
  "error": "Failed to get usage summary"
}
```

### Example Requests

#### Default (Last 30 Days by Day)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/usage/summary
```

#### Last 7 Days by Day
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/usage/summary?start_date=2025-11-03&end_date=2025-11-10"
```

#### Last 3 Months by Week
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/usage/summary?start_date=2025-08-10&end_date=2025-11-10&group_by=week"
```

#### Last 12 Months by Month
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.com/api/usage/summary?start_date=2024-11-10&end_date=2025-11-10&group_by=month"
```

### Implementation Details

- **Repository Function**: Uses `getUserUsageSummary()` from `/src/lib/db/repositories/claude-usage.ts`
- **Time Series Aggregation**: Time series grouping (week/month) is performed in the API route layer, not the database
- **Performance**: Efficient database queries with pre-computed aggregates
- **Type Safety**: Full TypeScript type coverage with `UsageSummaryResult` interface

### Related Endpoints

- `POST /api/usage/track` - Record new usage data (internal)
- Future endpoints:
  - `GET /api/usage/conversations` - Per-conversation cost breakdown
  - `GET /api/usage/tools` - Tool usage analytics
  - `GET /api/usage/models` - Model usage breakdown

### Testing

Use the provided test script:

```bash
# Without authentication (will see 401s)
./test-usage-summary.sh

# With authentication
./test-usage-summary.sh http://localhost:4321 "your-clerk-session-token"
```

### Frontend Integration Example

```typescript
async function fetchUsageSummary(
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  params.set('group_by', groupBy);

  const response = await fetch(`/api/usage/summary?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch usage summary');
  }

  return await response.json();
}

// Usage
const summary = await fetchUsageSummary('2025-11-01', '2025-11-10', 'day');
console.log(`Total cost: $${summary.summary.total_cost.toFixed(4)}`);
console.log(`Total tokens: ${summary.summary.total_tokens.toLocaleString()}`);
```

### Notes

- All dates are treated as UTC midnight (00:00:00)
- ISO week definition: Monday is the first day of the week
- Empty time periods (no API calls) are not included in `time_series` array
- Cost calculations are estimates based on Claude model pricing in the database
- Response times are averaged across all API calls in the period
