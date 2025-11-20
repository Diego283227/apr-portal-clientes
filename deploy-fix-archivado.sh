#!/bin/bash

# Script de despliegue para la corrección del sistema de archivado
# Ejecutar en el VPS: bash deploy-fix-archivado.sh

echo "🚀 Iniciando despliegue de corrección de archivado..."
echo "=================================================="
echo ""

# 1. Ir al directorio del proyecto
cd /opt/portal-online || exit 1
echo "✅ Directorio: /opt/portal-online"
echo ""

# 2. Pull de los últimos cambios
echo "📥 Descargando últimos cambios desde GitHub..."
git pull origin master
if [ $? -ne 0 ]; then
    echo "❌ Error al hacer git pull"
    exit 1
fi
echo "✅ Cambios descargados"
echo ""

# 3. Rebuild del backend sin caché
echo "🔨 Construyendo imagen del backend (sin caché)..."
docker-compose build --no-cache backend
if [ $? -ne 0 ]; then
    echo "❌ Error al construir backend"
    exit 1
fi
echo "✅ Backend construido"
echo ""

# 4. Reiniciar el contenedor backend
echo "♻️  Reiniciando contenedor backend..."
docker-compose up -d backend
if [ $? -ne 0 ]; then
    echo "❌ Error al reiniciar backend"
    exit 1
fi
echo "✅ Backend reiniciado"
echo ""

# 5. Ver logs para verificar inicio
echo "📋 Mostrando logs del backend (últimas 20 líneas)..."
docker-compose logs --tail=20 backend
echo ""

# 6. Verificar estado
echo "🔍 Verificando estado de los contenedores..."
docker-compose ps
echo ""

echo "=================================================="
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📊 Próximos pasos:"
echo "1. Verificar en el admin que la morosidad muestra 38.89%"
echo "2. Intentar archivar una boleta vencida (debe dar error)"
echo "3. Archivar una boleta pagada (debe funcionar)"
echo ""
echo "🔗 URL: http://145.223.26.119"
echo "=================================================="
