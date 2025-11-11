#!/bin/bash

# Test script for /api/usage/summary endpoint
# Usage: ./test-usage-summary.sh [BASE_URL] [AUTH_TOKEN]

BASE_URL="${1:-http://localhost:4321}"
AUTH_TOKEN="${2:-}"

echo "Testing /api/usage/summary endpoint"
echo "====================================="
echo ""

# Helper function to make authenticated requests
make_request() {
  local endpoint="$1"
  local description="$2"

  echo "Test: $description"
  echo "Endpoint: GET $endpoint"

  if [ -n "$AUTH_TOKEN" ]; then
    curl -s -w "\nHTTP Status: %{http_code}\n" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "${BASE_URL}${endpoint}" | jq . || echo "Response is not JSON"
  else
    curl -s -w "\nHTTP Status: %{http_code}\n" \
      "${BASE_URL}${endpoint}" | jq . || echo "Response is not JSON"
  fi

  echo ""
  echo "---"
  echo ""
}

# Test 1: Default parameters (last 30 days, grouped by day)
make_request "/api/usage/summary" "Default parameters (last 30 days, grouped by day)"

# Test 2: Custom date range
START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)
make_request "/api/usage/summary?start_date=${START_DATE}&end_date=${END_DATE}" \
  "Last 7 days with explicit dates"

# Test 3: Group by week
make_request "/api/usage/summary?group_by=week" "Last 30 days grouped by week"

# Test 4: Group by month
START_DATE=$(date -d "90 days ago" +%Y-%m-%d)
make_request "/api/usage/summary?start_date=${START_DATE}&group_by=month" \
  "Last 90 days grouped by month"

# Test 5: Invalid group_by parameter
make_request "/api/usage/summary?group_by=year" \
  "Invalid group_by parameter (should return 400)"

# Test 6: Invalid date format
make_request "/api/usage/summary?start_date=invalid-date" \
  "Invalid date format (should return 400)"

# Test 7: Start date after end date
make_request "/api/usage/summary?start_date=2025-12-31&end_date=2025-01-01" \
  "Start date after end date (should return 400)"

echo "Testing complete!"
echo ""
echo "Note: If AUTH_TOKEN is not provided, you may see 401 Unauthorized responses."
echo "To test with authentication, run:"
echo "  ./test-usage-summary.sh http://localhost:4321 'your-clerk-session-token'"
