#!/bin/bash
# Test script for /api/usage/export endpoint
# Run after starting dev server: npm run dev

BASE_URL="http://localhost:4321"

echo "Testing /api/usage/export endpoint"
echo "===================================="
echo ""

# Test 1: CSV export (default)
echo "Test 1: CSV Export (default, last 30 days)"
curl -s "${BASE_URL}/api/usage/export" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  --output test-export-default.csv
echo "✓ Saved to: test-export-default.csv"
echo ""

# Test 2: CSV with date range
echo "Test 2: CSV Export with date range"
curl -s "${BASE_URL}/api/usage/export?start_date=2025-01-01&end_date=2025-01-31&format=csv" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  --output test-export-january.csv
echo "✓ Saved to: test-export-january.csv"
echo ""

# Test 3: JSON export (all)
echo "Test 3: JSON Export (all data)"
curl -s "${BASE_URL}/api/usage/export?format=json&include=all" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  --output test-export-all.json
echo "✓ Saved to: test-export-all.json"
echo ""

# Test 4: JSON export (summary only)
echo "Test 4: JSON Export (summary only)"
curl -s "${BASE_URL}/api/usage/export?format=json&include=summary" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  --output test-export-summary.json
echo "✓ Saved to: test-export-summary.json"
echo ""

# Test 5: Invalid format
echo "Test 5: Invalid format (should return 400)"
curl -s "${BASE_URL}/api/usage/export?format=xml" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  | jq .
echo ""

# Test 6: Invalid date
echo "Test 6: Invalid date format (should return 400)"
curl -s "${BASE_URL}/api/usage/export?start_date=not-a-date" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  | jq .
echo ""

# Test 7: Unauthenticated request
echo "Test 7: Unauthenticated request (should return 401)"
curl -s "${BASE_URL}/api/usage/export" | jq .
echo ""

echo "===================================="
echo "Test complete!"
echo ""
echo "Check the generated files:"
echo "  - test-export-default.csv"
echo "  - test-export-january.csv"
echo "  - test-export-all.json"
echo "  - test-export-summary.json"
