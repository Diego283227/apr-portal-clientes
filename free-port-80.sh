#!/bin/bash
# Script para liberar el puerto 80 y reiniciar los contenedores

set -e

echo "🔍 Verificando qué está usando el puerto 80..."
echo "=============================================="
echo ""

# Ver qué está usando el puerto 80
echo "Procesos usando puerto 80:"
sudo lsof -i :80 2>/dev/null || sudo netstat -tlnp | grep :80 || sudo ss -tlnp | grep :80 || echo "No se pudo determinar qué usa el puerto 80"
echo ""

# Preguntar si debe continuar
read -p "¿Deseas detener los servicios que usan el puerto 80 y continuar? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

echo ""
echo "🛑 Deteniendo servicios comunes en puerto 80..."
echo "================================================"
echo ""

# Detener Apache si está corriendo
if systemctl is-active --quiet apache2 2>/dev/null; then
    echo "Deteniendo Apache2..."
    sudo systemctl stop apache2
    sudo systemctl disable apache2
    echo "✅ Apache2 detenido y deshabilitado"
elif systemctl is-active --quiet httpd 2>/dev/null; then
    echo "Deteniendo httpd..."
    sudo systemctl stop httpd
    sudo systemctl disable httpd
    echo "✅ httpd detenido y deshabilitado"
else
    echo "ℹ️ Apache no está corriendo"
fi
echo ""

# Detener Nginx del sistema si está corriendo
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "Deteniendo Nginx del sistema..."
    sudo systemctl stop nginx
    sudo systemctl disable nginx
    echo "✅ Nginx del sistema detenido y deshabilitado"
else
    echo "ℹ️ Nginx del sistema no está corriendo"
fi
echo ""

# Verificar si el puerto 80 está libre ahora
echo "🔍 Verificando si el puerto 80 está libre..."
if sudo lsof -i :80 2>/dev/null || sudo netstat -tlnp | grep :80 2>/dev/null || sudo ss -tlnp | grep :80 2>/dev/null; then
    echo "⚠️ ADVERTENCIA: El puerto 80 todavía está en uso"
    echo "Verifica manualmente qué proceso lo está usando:"
    echo "  sudo lsof -i :80"
    echo ""
    read -p "¿Deseas continuar de todos modos? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        echo "❌ Operación cancelada"
        exit 1
    fi
else
    echo "✅ Puerto 80 está libre"
fi
echo ""

echo "🐳 Reiniciando contenedores Docker..."
echo "======================================"
echo ""

cd /opt/portal-online

# Detener contenedores
echo "Deteniendo contenedores..."
docker-compose down
echo ""

# Limpiar recursos no usados
echo "Limpiando recursos Docker..."
docker system prune -f
echo ""

# Iniciar contenedores
echo "Iniciando contenedores..."
docker-compose up -d
echo ""

# Esperar a que los servicios inicien
echo "⏳ Esperando 15 segundos para que los servicios inicien..."
sleep 15
echo ""

echo "✅ Verificando estado de contenedores..."
docker ps -a | grep portal
echo ""

echo "🏥 Probando health check..."
if curl -s http://localhost/health > /dev/null 2>&1; then
    echo "✅ Health check exitoso!"
    echo ""
    echo "Respuesta del servidor:"
    curl -s http://localhost/health | jq . || curl -s http://localhost/health
else
    echo "❌ Health check falló"
    echo ""
    echo "Ver logs de nginx:"
    docker logs portal-nginx --tail 30
fi
echo ""

echo "🎉 PROCESO COMPLETADO"
echo "====================="
echo ""
echo "El sitio debería estar disponible en:"
echo "  http://145.223.26.119/"
echo ""
echo "Para ver logs en tiempo real:"
echo "  docker logs portal-nginx -f"
echo "  docker logs portal-backend -f"
echo "  docker logs portal-frontend -f"
