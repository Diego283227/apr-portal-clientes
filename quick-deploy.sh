#!/bin/bash

# Quick Deploy - Instalación y despliegue en UN SOLO COMANDO
# Uso: bash quick-deploy.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
log_step() { echo -e "\n${BLUE}▶${NC} $1"; }

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PORTAL ONLINE - QUICK DEPLOY          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Detectar si ya está configurado
ALREADY_CONFIGURED=false
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null && command -v nginx &> /dev/null; then
    ALREADY_CONFIGURED=true
    log_info "Dependencias ya instaladas, saltando instalación..."
fi

SUDO=""
[ "$EUID" -ne 0 ] && SUDO="sudo"

# ============================================
# INSTALACIÓN DE DEPENDENCIAS (si es necesario)
# ============================================
if [ "$ALREADY_CONFIGURED" = false ]; then
    log_step "Instalando dependencias del sistema..."

    # Actualizar
    $SUDO apt update -qq

    # Docker
    if ! command -v docker &> /dev/null; then
        log_info "Instalando Docker..."
        $SUDO apt install -y -qq apt-transport-https ca-certificates curl software-properties-common
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
        $SUDO apt update -qq
        $SUDO apt install -y -qq docker-ce docker-ce-cli containerd.io
        $SUDO systemctl enable docker
        $SUDO systemctl start docker
        [ "$EUID" -ne 0 ] && $SUDO usermod -aG docker $USER
    fi

    # Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_info "Instalando Docker Compose..."
        $SUDO curl -sL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        $SUDO chmod +x /usr/local/bin/docker-compose
    fi

    # Nginx
    if ! command -v nginx &> /dev/null; then
        log_info "Instalando Nginx..."
        $SUDO apt install -y -qq nginx
        $SUDO systemctl enable nginx
        $SUDO systemctl start nginx
    fi

    # Utilidades
    $SUDO apt install -y -qq git curl wget nano ufw certbot python3-certbot-nginx

    # Firewall
    $SUDO ufw --force enable 2>/dev/null || true
    $SUDO ufw allow OpenSSH 2>/dev/null || true
    $SUDO ufw allow 'Nginx Full' 2>/dev/null || true

    log_info "Dependencias instaladas ✓"
fi

# ============================================
# CONFIGURACIÓN DEL PROYECTO
# ============================================
log_step "Configurando proyecto..."

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    log_error "No se encuentra docker-compose.yml. Asegúrate de estar en el directorio del proyecto."
fi

# Crear archivo .env si no existe
if [ ! -f ".env" ]; then
    log_info "Creando archivo .env..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}"
        echo "╔════════════════════════════════════════════════════════╗"
        echo "║  ⚠️  ACCIÓN REQUERIDA                                  ║"
        echo "╚════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo "El archivo .env ha sido creado desde .env.example"
        echo "DEBES editarlo y configurar tus variables antes de continuar."
        echo ""
        echo "Edita ahora? [s/N]: "
        read -r response
        if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
            nano .env
        else
            echo ""
            echo "Por favor, edita .env manualmente y luego ejecuta:"
            echo "  ${GREEN}./quick-deploy.sh${NC}"
            exit 0
        fi
    else
        log_error "No se encuentra .env.example"
    fi
fi

# Verificar que .env tiene configuraciones básicas
if grep -q "changeme" .env || grep -q "your_" .env; then
    log_error "El archivo .env aún contiene valores de ejemplo. Por favor configúralo correctamente."
fi

# Crear directorios necesarios
mkdir -p server/uploads
mkdir -p server/backups

# ============================================
# DESPLIEGUE CON DOCKER
# ============================================
log_step "Desplegando aplicación con Docker..."

# Detener contenedores anteriores si existen
if [ "$(docker ps -aq -f name=portal-)" ]; then
    log_info "Deteniendo contenedores anteriores..."
    docker-compose down 2>/dev/null || true
fi

# Construir imágenes
log_info "Construyendo imágenes Docker (esto puede tomar varios minutos)..."
docker-compose build --no-cache

# Iniciar servicios
log_info "Iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
log_info "Esperando a que los servicios estén listos..."
sleep 15

# Verificar estado
log_step "Verificando estado de los servicios..."
docker-compose ps

# ============================================
# CONFIGURAR NGINX
# ============================================
log_step "Configurando Nginx..."

if [ -f "nginx-proxy.conf" ]; then
    echo ""
    echo "¿Deseas configurar Nginx como proxy reverso? [s/N]: "
    read -r response
    if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
        $SUDO cp nginx-proxy.conf /etc/nginx/sites-available/portal-online

        echo "Ingresa tu dominio (o presiona Enter para usar la IP del servidor): "
        read -r domain

        if [ -n "$domain" ]; then
            $SUDO sed -i "s/tu-dominio.com/$domain/g" /etc/nginx/sites-available/portal-online
            log_info "Dominio configurado: $domain"
        fi

        # Habilitar sitio
        $SUDO ln -sf /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/
        $SUDO rm -f /etc/nginx/sites-enabled/default

        # Verificar configuración
        if $SUDO nginx -t 2>/dev/null; then
            $SUDO systemctl reload nginx
            log_info "Nginx configurado correctamente ✓"

            # Ofrecer configurar SSL
            if [ -n "$domain" ]; then
                echo ""
                echo "¿Deseas configurar SSL con Let's Encrypt? [s/N]: "
                read -r ssl_response
                if [[ "$ssl_response" =~ ^([sS][iI]|[sS])$ ]]; then
                    log_info "Configurando SSL..."
                    $SUDO certbot --nginx -d "$domain" --non-interactive --agree-tos --register-unsafely-without-email || log_error "Error al configurar SSL"
                fi
            fi
        else
            log_error "Error en la configuración de Nginx"
        fi
    fi
fi

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        ✓✓✓ DESPLIEGUE COMPLETADO ✓✓✓                 ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo "Estado de los servicios:"
docker-compose ps

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Tu aplicación está funcionando!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Obtener IP del servidor
SERVER_IP=$(curl -s ifconfig.me || echo "tu-ip")

echo "Accede a tu aplicación en:"
if [ -n "$domain" ]; then
    echo "  🌐 https://$domain"
else
    echo "  🌐 http://$SERVER_IP"
fi
echo ""
echo "Backend API:"
echo "  📡 http://$SERVER_IP:5000/api"
echo ""
echo "MongoDB:"
echo "  🗄️  localhost:27017"
echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo "  Ver logs:       ${GREEN}docker-compose logs -f${NC}"
echo "  Reiniciar:      ${GREEN}docker-compose restart${NC}"
echo "  Detener:        ${GREEN}docker-compose down${NC}"
echo "  Estado:         ${GREEN}docker-compose ps${NC}"
echo ""
log_info "¡Despliegue exitoso! 🚀"
