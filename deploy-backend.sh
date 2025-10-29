#!/bin/bash
echo "🚀 Deploying backend changes..."
ssh root@159.223.152.210 << 'ENDSSH'
cd /opt/portal-online
echo "📥 Pulling latest changes..."
git pull origin master
cd server
echo "📦 Installing dependencies (if any)..."
npm install --production
echo "♻️  Restarting server..."
pm2 restart portal-server
echo "📋 Showing logs..."
pm2 logs portal-server --lines 20 --nostream
echo "✅ Deployment complete!"
ENDSSH
