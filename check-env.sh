#!/bin/bash
echo "🔍 Checking .env.local file..."
echo ""
if [ -f .env.local ]; then
  echo "✅ .env.local exists"
  echo "📏 File size: $(wc -c < .env.local) bytes"
  echo ""
  echo "🔑 Checking for required keys (showing first 20 chars only)..."
  grep "^ANTHROPIC_API_KEY=" .env.local | cut -c1-35 || echo "❌ ANTHROPIC_API_KEY not set"
  grep "^PUBLIC_CLERK_PUBLISHABLE_KEY=" .env.local | cut -c1-40 || echo "❌ PUBLIC_CLERK_PUBLISHABLE_KEY not set"
  grep "^CLERK_SECRET_KEY=" .env.local | cut -c1-35 || echo "❌ CLERK_SECRET_KEY not set"
else
  echo "❌ .env.local does not exist!"
fi
