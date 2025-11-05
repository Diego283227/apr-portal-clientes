#!/bin/bash

# Force Frontend Rebuild Script
# This script forces a complete rebuild of the frontend container

echo "🚀 Starting forced frontend rebuild..."

# Navigate to project directory
cd /opt/portal-online || exit 1

# Pull latest changes
echo "📥 Pulling latest changes from master..."
git pull origin master

# Show current commit
echo "📝 Current commit:"
git log -1 --oneline

# Stop frontend container
echo "🛑 Stopping frontend container..."
docker-compose stop frontend

# Remove frontend container completely
echo "🗑️ Removing old frontend container..."
docker-compose rm -f frontend

# Remove dangling images
echo "🧹 Cleaning up Docker system..."
docker system prune -f

# Remove old frontend image specifically
echo "🗑️ Removing old frontend image..."
docker rmi portal-online-frontend || true

# Clear npm cache in case that's causing issues
echo "🧹 Clearing npm build cache..."
docker-compose run --rm --no-deps frontend sh -c "rm -rf node_modules/.vite" || true

# Rebuild frontend without cache
echo "🔨 Rebuilding frontend without cache..."
docker-compose build --no-cache --pull frontend

# Start all services
echo "🚀 Starting all containers..."
docker-compose up -d

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready (30 seconds)..."
sleep 30

# Show container status
echo "📊 Container status:"
docker-compose ps

# Show frontend logs
echo "📋 Recent frontend logs:"
docker-compose logs --tail=50 frontend

echo "✅ Forced frontend rebuild completed!"
echo "🌐 Please visit your website and hard refresh (Ctrl+Shift+F5)"
echo "🔍 Check browser DevTools → Network tab to see new bundle hash"
