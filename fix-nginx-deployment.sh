#!/bin/bash
# Script automático para diagnosticar y arreglar el deployment con nginx

set -e  # Salir si hay error

echo "🔍 DIAGNÓSTICO DEL DEPLOYMENT CON NGINX"
echo "========================================"
echo ""

cd /opt/portal-online

echo "1️⃣ Estado actual de contenedores:"
docker ps -a | grep portal || echo "No hay contenedores de portal"
echo ""

echo "2️⃣ Verificando archivo .env:"
if [ -f .env ]; then
    echo "VITE_API_BASE_URL actual:"
    grep VITE_API_BASE_URL .env || echo "VITE_API_BASE_URL no encontrado en .env"
else
    echo "⚠️ No existe archivo .env"
fi
echo ""

echo "3️⃣ Últimos logs de nginx:"
docker logs portal-nginx --tail 20 2>&1 || echo "Nginx no está corriendo"
echo ""

echo "🔧 APLICANDO CORRECCIONES"
echo "========================="
echo ""

echo "4️⃣ Actualizando VITE_API_BASE_URL a ruta relativa..."
if [ -f .env ]; then
    # Backup del .env original
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

    # Actualizar o agregar VITE_API_BASE_URL
    if grep -q "VITE_API_BASE_URL" .env; then
        sed -i 's|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=/api|g' .env
        echo "✅ VITE_API_BASE_URL actualizado a /api"
    else
        echo "VITE_API_BASE_URL=/api" >> .env
        echo "✅ VITE_API_BASE_URL agregado como /api"
    fi

    echo "Nuevo valor:"
    grep VITE_API_BASE_URL .env
else
    echo "⚠️ Creando .env con configuración mínima..."
    cat > .env << 'EOF'
# Configuración básica
VITE_API_BASE_URL=/api
NODE_ENV=production
EOF
fi
echo ""

echo "5️⃣ Deteniendo contenedores actuales..."
docker-compose down
echo ""

echo "6️⃣ Limpiando imágenes antiguas..."
docker system prune -f
echo ""

echo "7️⃣ Reconstruyendo contenedores con nueva configuración..."
docker-compose build --no-cache
echo ""

echo "8️⃣ Iniciando contenedores..."
docker-compose up -d
echo ""

echo "9️⃣ Esperando 10 segundos para que los servicios inicien..."
sleep 10
echo ""

echo "🔟 Verificando estado final:"
docker ps -a | grep portal
echo ""

echo "1️⃣1️⃣ Probando conectividad:"
echo "Health check (debe retornar JSON):"
curl -s http://localhost/health || echo "❌ Health check falló"
echo ""
echo ""

echo "1️⃣2️⃣ Últimos logs de nginx:"
docker logs portal-nginx --tail 30
echo ""

echo "✅ PROCESO COMPLETADO"
echo "===================="
echo ""
echo "Si todo está correcto, el sitio debería estar disponible en:"
echo "http://145.223.26.119/"
echo ""
echo "Para ver logs en tiempo real:"
echo "  docker-compose logs -f"
echo ""
echo "Para ver logs de un servicio específico:"
echo "  docker logs portal-nginx -f"
echo "  docker logs portal-backend -f"
echo "  docker logs portal-frontend -f"
