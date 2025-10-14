#!/bin/bash

echo "🔐 Testing admin functionality..."

# Login as admin and get token
echo "Login as admin..."
ADMIN_TOKEN=$(curl -s -X POST http://localhost:7781/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@apr.cl","password":"password123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Admin token received"

# Get boletas and find test user's boletas
echo "📋 Getting test user boletas..."
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:7781/api/boletas" | \
  grep -o '"id":"[^"]*"' | head -2

echo "✅ Test completed - check server logs for admin functionality"