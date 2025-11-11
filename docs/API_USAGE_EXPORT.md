# Usage Export API Endpoint

## Overview

The `/api/usage/export` endpoint generates downloadable CSV or JSON exports of Claude API usage data for authenticated users. It supports flexible date ranges, multiple export formats, and selective data inclusion.

## Endpoint

```
GET /api/usage/export
```

**Authentication**: Required (Clerk session)

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | string (ISO 8601) | No | 30 days ago | Start of date range (inclusive) |
| `end_date` | string (ISO 8601) | No | Today | End of date range (inclusive) |
| `format` | `csv` \| `json` | No | `csv` | Export format |
| `include` | `all` \| `summary` \| `conversations` \| `tools` \| `models` | No | `all` | Which data sections to include |

### Date Format

Dates must be in ISO 8601 format: `YYYY-MM-DD`

**Examples**:
- `2025-01-01`
- `2025-01-31`

### Include Options

- **`all`**: Include all data sections (summary, daily breakdown, conversations, tools, models)
- **`summary`**: Only high-level aggregates and daily time series
- **`conversations`**: Only conversation-level cost breakdown
- **`tools`**: Only tool usage statistics
- **`models`**: Only model usage breakdown

## Response Headers

### CSV Export

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="usage-export-{start}-to-{end}.csv"
Content-Length: {size}
Cache-Control: no-cache, no-store, must-revalidate
```

### JSON Export

```http
Content-Type: application/json
Content-Disposition: attachment; filename="usage-export-{start}-to-{end}.json"
Content-Length: {size}
Cache-Control: no-cache, no-store, must-revalidate
```

## CSV Format

The CSV export is organized into sections with headers:

### Summary Section

```csv
=== SUMMARY ===
Metric,Value
Date Range,2025-01-01 to 2025-01-31
Total Cost,$123.45
Total Tokens,"1,234,567"
API Calls,450
Unique Conversations,25
Tool Calls,120
Avg Cost Per Call,$0.27
Avg Response Time (ms),1250
```

### Daily Breakdown Section

```csv
=== DAILY BREAKDOWN ===
Date,Cost,Tokens,API Calls
2025-01-01,$4.50,"15,000",15
2025-01-02,$5.75,"19,000",20
...
```

### Conversations Section

```csv
=== CONVERSATIONS ===
ID,Title,Cost,Tokens,Messages,First Message,Last Message
conv_123,"Chat about calendar integration",$2.50,"8,000",12,2025-01-01T10:00:00Z,2025-01-01T11:30:00Z
...
```

### Tools Section

```csv
=== TOOLS ===
Tool Name,Calls,Avg Execution Time (ms),Success Rate,Estimated Cost
get_calendar_events,45,150,98.5%,$1.25
create_calendar_event,30,200,100.0%,$0.95
...
```

### Models Section

```csv
=== MODELS ===
Model,API Calls,Input Tokens,Output Tokens,Cost,% of Total
claude-sonnet-4,"400","800,000","150,000",$120.00,97.2%
claude-haiku-3,"50","50,000","10,000",$3.45,2.8%
...
```

### CSV Escaping Rules

- Values containing commas, quotes, or newlines are wrapped in double quotes
- Internal double quotes are escaped as `""`
- Numbers are formatted with thousand separators (e.g., `1,234,567`)
- Currencies are formatted with dollar sign and 2 decimal places (e.g., `$123.45`)
- Percentages are formatted with 1 decimal place and % symbol (e.g., `97.5%`)

## JSON Format

The JSON export provides a structured object:

```json
{
  "export_info": {
    "generated_at": "2025-01-31T12:00:00Z",
    "date_range": {
      "start_date": "2025-01-01",
      "end_date": "2025-01-31"
    },
    "format": "json"
  },
  "summary": {
    "total_cost": 123.45,
    "total_tokens": 1234567,
    "total_input_tokens": 800000,
    "total_output_tokens": 150000,
    "api_calls_count": 450,
    "unique_conversations": 25,
    "tool_calls_count": 120,
    "average_cost_per_call": 0.274,
    "average_response_time_ms": 1250
  },
  "daily_breakdown": [
    {
      "period": "2025-01-01",
      "cost": 4.50,
      "tokens": 15000,
      "api_calls": 15
    },
    ...
  ],
  "conversations": {
    "items": [
      {
        "conversation_id": "conv_123",
        "title": "Chat about calendar integration",
        "total_cost": 2.50,
        "total_tokens": 8000,
        "message_count": 12,
        "first_message_at": "2025-01-01T10:00:00Z",
        "last_message_at": "2025-01-01T11:30:00Z",
        "deleted_at": null
      },
      ...
    ],
    "total_count": 25
  },
  "tools": [
    {
      "tool_name": "get_calendar_events",
      "call_count": 45,
      "total_execution_time_ms": 6750,
      "average_execution_time_ms": 150,
      "success_rate": 0.985,
      "estimated_associated_cost": 1.25
    },
    ...
  ],
  "models": [
    {
      "model": "claude-sonnet-4",
      "api_calls_count": 400,
      "total_input_tokens": 800000,
      "total_output_tokens": 150000,
      "total_cost": 120.00,
      "percentage_of_total_cost": 97.2
    },
    ...
  ]
}
```

## Error Responses

### 400 Bad Request

Invalid query parameters:

```json
{
  "error": "Bad Request",
  "message": "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
}
```

**Possible validation errors**:
- Invalid date format
- `start_date` is after `end_date`
- Invalid `format` parameter
- Invalid `include` parameter

### 401 Unauthorized

Missing or invalid authentication:

```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found

User record not found in database:

```json
{
  "error": "User not found"
}
```

### 413 Payload Too Large

Export exceeds 10MB size limit:

```json
{
  "error": "Export too large",
  "message": "Export size (12.45 MB) exceeds maximum allowed size (10 MB). Try narrowing the date range or using a more specific include filter."
}
```

**Solutions**:
- Narrow the date range (e.g., request 1 month instead of 1 year)
- Use a specific `include` filter (e.g., `include=summary` instead of `include=all`)
- Export data in smaller chunks and combine locally

### 500 Internal Server Error

Database or server error:

```json
{
  "error": "Failed to generate export",
  "message": "Database connection failed"
}
```

## Usage Examples

### cURL Examples

#### Basic CSV Export (Last 30 Days)

```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export" \
  --output usage-export.csv
```

#### CSV Export with Date Range

```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export?start_date=2025-01-01&end_date=2025-01-31&format=csv" \
  --output january-usage.csv
```

#### JSON Export (All Data)

```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export?format=json&include=all" \
  --output usage-export.json
```

#### JSON Export (Summary Only)

```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export?format=json&include=summary" \
  --output usage-summary.json
```

#### JSON Export (Conversations Only)

```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export?format=json&include=conversations&start_date=2025-01-01&end_date=2025-01-15" \
  --output conversations-export.json
```

### JavaScript/TypeScript Example

```typescript
async function downloadUsageExport(
  startDate: string,
  endDate: string,
  format: 'csv' | 'json',
  include: 'all' | 'summary' | 'conversations' | 'tools' | 'models'
) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    format,
    include
  });

  const response = await fetch(`/api/usage/export?${params}`, {
    credentials: 'include' // Include authentication cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Export failed');
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition
    ?.match(/filename="(.+)"/)?.[1]
    || `usage-export.${format}`;

  // Download file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Usage
await downloadUsageExport('2025-01-01', '2025-01-31', 'csv', 'all');
```

### React Component Example

```tsx
import { useState } from 'react';

export function UsageExportButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json') => {
    setLoading(true);
    setError(null);

    try {
      // Export last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        format,
        include: 'all'
      });

      const response = await fetch(`/api/usage/export?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-export-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => handleExport('csv')}
        disabled={loading}
      >
        {loading ? 'Exporting...' : 'Export CSV'}
      </button>
      <button
        onClick={() => handleExport('json')}
        disabled={loading}
      >
        {loading ? 'Exporting...' : 'Export JSON'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
```

## Performance Considerations

### Export Size Limits

- **Maximum size**: 10MB
- **Typical CSV size**: ~50KB per 100 conversations
- **Typical JSON size**: ~100KB per 100 conversations

### Large Exports

For datasets approaching the 10MB limit:

1. **Narrow the date range**
   - Export 1 month at a time instead of 1 year
   - Combine exports locally if needed

2. **Use selective includes**
   - `include=summary` for high-level overview
   - `include=conversations` for conversation details only
   - `include=tools` or `include=models` for analytics

3. **Pagination alternative**
   - Use `/api/usage/conversations` with pagination for conversation lists
   - Use `/api/usage/summary` for time-series data

### Streaming

The endpoint buffers the entire export in memory before sending. For very large exports near the 10MB limit, this may cause memory pressure. Future enhancements could add true streaming support for CSV generation.

## Security

### Authentication

- **Required**: All requests must include valid Clerk session cookie
- **User isolation**: Users can only export their own data
- **No API key auth**: This endpoint is designed for web browser use only

### Data Privacy

- **No PII exposure**: Conversation titles and tool names may contain user data
- **Date filtering**: Users control what date range to export
- **Soft-deleted conversations**: Included in exports (check `deleted_at` field)

## Testing

A test script is provided at `/test-usage-export.sh`:

```bash
# Start dev server
npm run dev

# Run tests
./test-usage-export.sh
```

The script tests:
1. Default CSV export
2. CSV with date range
3. JSON export (all data)
4. JSON export (summary only)
5. Invalid format (400 error)
6. Invalid date (400 error)
7. Unauthenticated request (401 error)

## Future Enhancements

Potential improvements for future versions:

1. **True streaming**: Stream CSV rows as they're generated for very large exports
2. **Excel format**: Support `.xlsx` format with formatted sheets
3. **Email delivery**: Schedule exports and email download links
4. **Custom columns**: Allow users to select specific fields to include
5. **Charts/graphs**: Include visualizations in exports (PDF format)
6. **Compression**: Gzip large exports before sending
7. **Scheduled exports**: Automated daily/weekly/monthly exports
8. **Multi-format archives**: Single download with CSV + JSON + Excel
