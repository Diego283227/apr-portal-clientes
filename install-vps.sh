#!/bin/bash

# Script de instalación automatizada para VPS Ubuntu
# Ejecutar con: curl -sSL https://tu-servidor.com/install-vps.sh | bash
# O: wget -qO- https://tu-servidor.com/install-vps.sh | bash
# O simplemente: bash install-vps.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        PORTAL ONLINE - INSTALACIÓN AUTOMÁTICA        ║
║              VPS Ubuntu Setup Script                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}[➜]${NC} $1\n"
}

# Verificar que se está ejecutando en Ubuntu
if [ ! -f /etc/os-release ]; then
    log_error "No se puede determinar el sistema operativo"
    exit 1
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
    log_error "Este script está diseñado para Ubuntu. Sistema detectado: $ID"
    exit 1
fi

log_info "Sistema operativo: Ubuntu $VERSION_ID"

# Verificar privilegios
if [ "$EUID" -eq 0 ]; then
    log_warning "Ejecutando como root"
    SUDO=""
else
    SUDO="sudo"
    log_info "Ejecutando con sudo"
fi

# ============================================
# PASO 1: Actualizar sistema
# ============================================
log_step "PASO 1/8: Actualizando sistema..."
$SUDO apt update -qq
$SUDO apt upgrade -y -qq
log_info "Sistema actualizado"

# ============================================
# PASO 2: Instalar Docker
# ============================================
log_step "PASO 2/8: Instalando Docker..."

if command -v docker &> /dev/null; then
    log_info "Docker ya está instalado ($(docker --version))"
else
    log_info "Instalando Docker..."

    # Remover versiones antiguas
    $SUDO apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Instalar dependencias
    $SUDO apt install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common

    # Agregar repositorio oficial de Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Instalar Docker
    $SUDO apt update -qq
    $SUDO apt install -y -qq docker-ce docker-ce-cli containerd.io

    # Habilitar Docker
    $SUDO systemctl enable docker
    $SUDO systemctl start docker

    log_info "Docker instalado correctamente"
fi

# ============================================
# PASO 3: Instalar Docker Compose
# ============================================
log_step "PASO 3/8: Instalando Docker Compose..."

if command -v docker-compose &> /dev/null; then
    log_info "Docker Compose ya está instalado ($(docker-compose --version))"
else
    log_info "Instalando Docker Compose..."
    $SUDO curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    log_info "Docker Compose instalado correctamente"
fi

# ============================================
# PASO 4: Configurar usuario para Docker
# ============================================
log_step "PASO 4/8: Configurando permisos de Docker..."

if [ "$EUID" -ne 0 ]; then
    if groups $USER | grep -q docker; then
        log_info "Usuario ya pertenece al grupo docker"
    else
        $SUDO usermod -aG docker $USER
        log_warning "Usuario agregado al grupo docker. Necesitarás cerrar sesión y volver a entrar para aplicar los cambios"
    fi
fi

# ============================================
# PASO 5: Instalar Nginx
# ============================================
log_step "PASO 5/8: Instalando Nginx..."

if command -v nginx &> /dev/null; then
    log_info "Nginx ya está instalado ($(nginx -v 2>&1))"
else
    $SUDO apt install -y -qq nginx
    $SUDO systemctl enable nginx
    $SUDO systemctl start nginx
    log_info "Nginx instalado correctamente"
fi

# ============================================
# PASO 6: Instalar utilidades adicionales
# ============================================
log_step "PASO 6/8: Instalando utilidades adicionales..."

$SUDO apt install -y -qq \
    git \
    curl \
    wget \
    unzip \
    htop \
    nano \
    ufw \
    certbot \
    python3-certbot-nginx

log_info "Utilidades instaladas"

# ============================================
# PASO 7: Configurar Firewall
# ============================================
log_step "PASO 7/8: Configurando Firewall..."

if $SUDO ufw status | grep -q "Status: active"; then
    log_info "Firewall ya está activo"
else
    # Configurar reglas
    $SUDO ufw --force enable
    $SUDO ufw default deny incoming
    $SUDO ufw default allow outgoing
    $SUDO ufw allow OpenSSH
    $SUDO ufw allow 'Nginx Full'
    $SUDO ufw allow 80/tcp
    $SUDO ufw allow 443/tcp

    log_info "Firewall configurado"
fi

# ============================================
# PASO 8: Verificar instalación
# ============================================
log_step "PASO 8/8: Verificando instalación..."

echo ""
echo "Versiones instaladas:"
echo "--------------------"
docker --version
docker-compose --version
nginx -v 2>&1
git --version
echo ""

# ============================================
# RESUMEN Y PRÓXIMOS PASOS
# ============================================
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║           ✓ INSTALACIÓN COMPLETADA                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info "Todas las dependencias instaladas correctamente"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "1. Sube tu proyecto al servidor:"
echo "   ${GREEN}cd /opt${NC}"
echo "   ${GREEN}git clone tu-repositorio portal-online${NC}"
echo "   O usa SCP/SFTP para subir los archivos"
echo ""
echo "2. Configura las variables de entorno:"
echo "   ${GREEN}cd /opt/portal-online${NC}"
echo "   ${GREEN}cp .env.example .env${NC}"
echo "   ${GREEN}nano .env${NC}"
echo ""
echo "3. Despliega la aplicación:"
echo "   ${GREEN}chmod +x deploy.sh${NC}"
echo "   ${GREEN}./deploy.sh${NC}"
echo "   Selecciona opción 1 (Instalación inicial)"
echo ""
echo "4. Configura Nginx:"
echo "   ${GREEN}sudo cp nginx-proxy.conf /etc/nginx/sites-available/portal-online${NC}"
echo "   ${GREEN}sudo nano /etc/nginx/sites-available/portal-online${NC} (edita tu dominio)"
echo "   ${GREEN}sudo ln -s /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/${NC}"
echo "   ${GREEN}sudo nginx -t${NC}"
echo "   ${GREEN}sudo systemctl reload nginx${NC}"
echo ""
echo "5. (Opcional) Configura SSL:"
echo "   ${GREEN}sudo certbot --nginx -d tu-dominio.com${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    log_warning "IMPORTANTE: Si agregamos tu usuario al grupo docker, necesitas cerrar sesión y volver a entrar"
    echo "   Ejecuta: ${GREEN}exit${NC} y vuelve a conectarte por SSH"
fi

echo ""
log_info "¡Listo para desplegar! 🚀"
