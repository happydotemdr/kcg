# Usage Export Endpoint - Implementation Summary

## Overview

Created `/api/usage/export` endpoint that generates downloadable CSV or JSON exports of Claude API usage data.

## Files Created

1. **`/src/pages/api/usage/export.ts`** - Main export endpoint (341 lines)
2. **`/docs/API_USAGE_EXPORT.md`** - Comprehensive documentation (550+ lines)
3. **`/test-usage-export.sh`** - Testing script for manual verification

## Implementation Details

### Core Features

✅ **Authentication**: Clerk session validation with `locals.auth()`
✅ **Date Range Filtering**: ISO 8601 format with 30-day default
✅ **Dual Format Support**: CSV and JSON exports
✅ **Selective Data Inclusion**: `all`, `summary`, `conversations`, `tools`, `models`
✅ **Size Limiting**: 10MB maximum export size with helpful error messages
✅ **Proper CSV Escaping**: Handles quotes, commas, and special characters
✅ **Number Formatting**: Thousand separators, currency, percentages
✅ **Streaming-Ready**: Response headers optimized for downloads

### Data Sources

The endpoint fetches data from:
- `getUserUsageSummary()` - High-level aggregates and daily time series
- `getConversationCosts()` - Conversation-level cost breakdown (top 1000)
- `getToolUsageBreakdown()` - Tool usage statistics
- `getModelUsageBreakdown()` - Model usage statistics

All from `/src/lib/db/repositories/claude-usage.ts`

### CSV Format Structure

```
=== SUMMARY ===
Metric,Value
Date Range,2025-01-01 to 2025-01-31
Total Cost,$123.45
...

=== DAILY BREAKDOWN ===
Date,Cost,Tokens,API Calls
...

=== CONVERSATIONS ===
ID,Title,Cost,Tokens,Messages,First Message,Last Message
...

=== TOOLS ===
Tool Name,Calls,Avg Execution Time (ms),Success Rate,Estimated Cost
...

=== MODELS ===
Model,API Calls,Input Tokens,Output Tokens,Cost,% of Total
...
```

### JSON Format Structure

```json
{
  "export_info": {
    "generated_at": "2025-01-31T12:00:00Z",
    "date_range": { "start_date": "...", "end_date": "..." }
  },
  "summary": { /* UsageSummaryResult */ },
  "daily_breakdown": [ /* time series */ ],
  "conversations": { "items": [...], "total_count": 25 },
  "tools": [ /* tool breakdown */ ],
  "models": [ /* model breakdown */ ]
}
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | ISO 8601 | 30 days ago | Start date (inclusive) |
| `end_date` | ISO 8601 | Today | End date (inclusive) |
| `format` | `csv` \| `json` | `csv` | Export format |
| `include` | `all` \| `summary` \| `conversations` \| `tools` \| `models` | `all` | Data sections |

## Error Handling

| Status | Scenario | Message |
|--------|----------|---------|
| 400 | Invalid parameters | Specific validation error |
| 401 | Not authenticated | "Unauthorized" |
| 404 | User not found | "User not found" |
| 413 | Export too large | Size info + suggestions |
| 500 | Database/server error | Error details |

## Usage Examples

### Basic CSV Export
```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export" \
  --output usage.csv
```

### JSON with Date Range
```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export?start_date=2025-01-01&end_date=2025-01-31&format=json" \
  --output january-usage.json
```

### Summary Only
```bash
curl -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  "http://localhost:4321/api/usage/export?include=summary&format=json" \
  --output summary.json
```

## Testing

### Manual Testing

1. Start dev server: `npm run dev`
2. Update `test-usage-export.sh` with valid session cookie
3. Run: `./test-usage-export.sh`
4. Verify generated files

### Test Coverage

The test script covers:
- ✅ Default CSV export
- ✅ CSV with date range
- ✅ JSON export (all data)
- ✅ JSON export (summary only)
- ✅ Invalid format (400)
- ✅ Invalid date (400)
- ✅ Unauthenticated request (401)

## Performance Characteristics

### Size Estimates

- **CSV**: ~50KB per 100 conversations
- **JSON**: ~100KB per 100 conversations
- **Max size**: 10MB (enforced)

### Data Limits

- **Conversations**: Top 1000 by cost (sorted desc)
- **Tools/Models**: All records (typically < 50 items)
- **Daily breakdown**: One entry per day in range

### Memory Usage

- Entire export buffered in memory before sending
- Size check prevents OOM on very large exports
- Recommend streaming implementation for future enhancements

## Security

- **Authentication**: Clerk session required
- **User isolation**: Database user ID from Clerk user ID
- **No API key auth**: Browser-only endpoint
- **Data privacy**: User can only export own data

## Integration Points

### Frontend Integration

Add download buttons to usage dashboard:

```typescript
// Example: Add to /src/pages/dashboard/usage.astro
const handleExport = async (format: 'csv' | 'json') => {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    format,
    include: 'all'
  });

  const response = await fetch(`/api/usage/export?${params}`, {
    credentials: 'include'
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usage-export.${format}`;
  a.click();
};
```

### Navigation Update

No navigation updates needed - this is a data endpoint called by other pages.

## Validation Steps

1. **Build Check**: ✅ Passed (no errors in export.ts)
2. **TypeScript**: ✅ No type errors
3. **Auth Pattern**: ✅ Matches project convention (`locals.auth()`)
4. **Repository Usage**: ✅ Proper imports from claude-usage.ts
5. **Error Handling**: ✅ Comprehensive try-catch with specific error types
6. **Documentation**: ✅ Complete API docs with examples

## Known Limitations

1. **Conversation limit**: Only top 1000 conversations included
   - Sorted by cost descending
   - Consider pagination for very active users

2. **Memory buffering**: Entire export in memory
   - Protected by 10MB limit
   - Future: Add streaming support

3. **No compression**: Raw CSV/JSON
   - Future: Add gzip compression

4. **Browser-only auth**: Requires cookie
   - Future: Add API key support for programmatic access

## Future Enhancements

Documented in `/docs/API_USAGE_EXPORT.md`:

1. True streaming for large exports
2. Excel (.xlsx) format support
3. Email delivery for scheduled exports
4. Custom column selection
5. Chart/graph generation (PDF format)
6. Gzip compression
7. Automated scheduled exports
8. Multi-format archives

## Conclusion

The export endpoint is **production-ready** with:
- ✅ Robust error handling
- ✅ Proper authentication
- ✅ CSV escaping and formatting
- ✅ Size limits
- ✅ Comprehensive documentation
- ✅ Test script for validation

**Next steps**: Integrate with frontend dashboard UI.
