#!/bin/bash
# Script para configurar nginx del sistema como proxy a contenedores Docker

set -e

echo "🚀 Configurando Nginx del Sistema como Reverse Proxy"
echo "====================================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: No se encuentra docker-compose.yml"
    echo "Este script debe ejecutarse desde /opt/portal-online"
    exit 1
fi

echo "1️⃣ Verificando nginx del sistema..."
if ! command -v nginx &> /dev/null; then
    echo "⚠️ Nginx no está instalado en el sistema"
    read -p "¿Deseas instalarlo ahora? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        sudo apt update
        sudo apt install -y nginx
        echo "✅ Nginx instalado"
    else
        echo "❌ Nginx es necesario para continuar"
        exit 1
    fi
else
    echo "✅ Nginx está instalado"
fi
echo ""

echo "2️⃣ Modificando docker-compose.yml para usar puerto 8888..."
# Hacer backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Cambiar puerto de 80:80 a 8888:80 en nginx
sed -i 's/"80:80"/"8888:80"/g' docker-compose.yml
sed -i 's/"8080:80"/"8888:80"/g' docker-compose.yml

echo "✅ docker-compose.yml actualizado (puerto 8888)"
grep -A 2 "portal-nginx" docker-compose.yml | grep ports
echo ""

echo "3️⃣ Creando configuración de nginx del sistema..."
sudo tee /etc/nginx/sites-available/portal-online > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    access_log /var/log/nginx/portal-access.log;
    error_log /var/log/nginx/portal-error.log;

    # Proxy a contenedor nginx
    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

echo "✅ Configuración creada en /etc/nginx/sites-available/portal-online"
echo ""

echo "4️⃣ Deshabilitando configuración default de nginx..."
sudo rm -f /etc/nginx/sites-enabled/default
echo "✅ Default deshabilitado"
echo ""

echo "5️⃣ Activando configuración de portal-online..."
sudo ln -sf /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/
echo "✅ Configuración activada"
echo ""

echo "6️⃣ Verificando sintaxis de nginx..."
if sudo nginx -t; then
    echo "✅ Configuración válida"
else
    echo "❌ Error en configuración de nginx"
    exit 1
fi
echo ""

echo "7️⃣ Recargando nginx del sistema..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "8️⃣ Deteniendo contenedores actuales..."
docker-compose down
echo ""

echo "9️⃣ Limpiando recursos Docker..."
docker system prune -f
echo ""

echo "🔟 Iniciando contenedores con nueva configuración..."
docker-compose up -d
echo ""

echo "⏳ Esperando 15 segundos para que los servicios inicien..."
sleep 15
echo ""

echo "1️⃣1️⃣ Verificando estado de contenedores..."
docker ps -a | grep portal
echo ""

echo "1️⃣2️⃣ Probando conectividad..."
echo ""
echo "Health check desde localhost:"
if curl -s http://localhost/health > /dev/null; then
    echo "✅ Health check exitoso!"
    echo ""
    curl -s http://localhost/health | jq . 2>/dev/null || curl -s http://localhost/health
else
    echo "❌ Health check falló"
    echo ""
    echo "Verificando logs..."
    echo ""
    echo "=== Nginx del sistema ==="
    sudo tail -20 /var/log/nginx/portal-error.log
    echo ""
    echo "=== Contenedor nginx ==="
    docker logs portal-nginx --tail 20
fi
echo ""

echo "🎉 CONFIGURACIÓN COMPLETADA"
echo "==========================="
echo ""
echo "Arquitectura actual:"
echo "  Internet (puerto 80)"
echo "      ↓"
echo "  Nginx Sistema (puerto 80) → Contenedor Nginx (puerto 8080)"
echo "      ↓                           ↓"
echo "  Usuarios                    Frontend + Backend"
echo ""
echo "El sitio está disponible en:"
echo "  http://145.223.26.119/"
echo ""
echo "Logs útiles:"
echo "  sudo tail -f /var/log/nginx/portal-access.log"
echo "  sudo tail -f /var/log/nginx/portal-error.log"
echo "  docker logs portal-nginx -f"
echo ""
echo "Para revertir cambios, restaurar backup:"
echo "  cp docker-compose.yml.backup.* docker-compose.yml"
