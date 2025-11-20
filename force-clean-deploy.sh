#!/bin/bash
# Script para forzar limpieza total y redeploy

echo "🧹 Limpiando contenedores..."
docker-compose down

echo "🗑️ Eliminando volúmenes y cache de Docker..."
docker system prune -af --volumes

echo "📥 Actualizando código..."
git fetch origin
git reset --hard origin/master

echo "🧹 Limpiando node_modules y dist del frontend..."
cd portal-web
rm -rf node_modules dist .vite
npm cache clean --force

echo "📦 Instalando dependencias..."
npm install

echo "🔨 Construyendo frontend..."
npm run build

echo "🐳 Volviendo al directorio raíz..."
cd ..

echo "🔨 Reconstruyendo todas las imágenes sin cache..."
docker-compose build --no-cache

echo "🚀 Levantando servicios..."
docker-compose up -d

echo "📋 Mostrando logs del frontend..."
docker-compose logs -f frontend
