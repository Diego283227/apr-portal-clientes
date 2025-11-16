#!/bin/bash
# Script para verificar el estado del deployment

echo "🔍 Verificando estado de contenedores..."
docker ps -a | grep portal

echo ""
echo "📋 Logs de nginx (últimas 50 líneas)..."
docker logs portal-nginx --tail 50

echo ""
echo "📋 Logs de backend (últimas 30 líneas)..."
docker logs portal-backend --tail 30

echo ""
echo "📋 Logs de frontend (últimas 30 líneas)..."
docker logs portal-frontend --tail 30

echo ""
echo "🌐 Verificando conectividad..."
echo "Health check backend:"
curl -s http://localhost:5000/health || echo "Backend no responde"

echo ""
echo "Health check nginx:"
curl -s http://localhost:80/health || echo "Nginx no responde"
