#!/bin/bash

# Script para desplegar fix de medidor al VPS
echo "🚀 Desplegando fix de eliminación de medidor..."

cd /opt/portal-online

echo "📥 Pulling latest code from GitHub..."
git pull origin master

echo "🔨 Building backend..."
cd server
npm run build

echo "🔄 Restarting backend container..."
cd ..
docker-compose restart portal-backend

echo "✅ Despliegue completado!"
echo "📋 Verificando logs..."
docker-compose logs --tail=20 portal-backend
