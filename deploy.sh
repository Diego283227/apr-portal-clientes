#!/bin/bash

# Script de despliegue para Portal Online en VPS Ubuntu
# Asegúrate de dar permisos de ejecución: chmod +x deploy.sh

set -e  # Detener el script si hay errores

echo "======================================"
echo "  PORTAL ONLINE - DEPLOYMENT SCRIPT"
echo "======================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    log_error "Archivo .env no encontrado. Copia .env.example a .env y configúralo."
    exit 1
fi

# Preguntar qué operación realizar
echo ""
echo "Selecciona una opción:"
echo "1) Instalación inicial (primera vez)"
echo "2) Actualizar y redesplegar"
echo "3) Detener servicios"
echo "4) Ver logs"
echo "5) Restart servicios"
echo "6) Limpiar todo (CUIDADO: elimina volúmenes)"
read -p "Opción [1-6]: " option

case $option in
    1)
        log_info "Iniciando instalación inicial..."

        # Crear directorios necesarios
        log_info "Creando directorios..."
        mkdir -p server/uploads
        mkdir -p server/backups

        # Construir imágenes
        log_info "Construyendo imágenes Docker..."
        docker-compose build --no-cache

        # Iniciar servicios
        log_info "Iniciando servicios..."
        docker-compose up -d

        # Esperar a que los servicios estén listos
        log_info "Esperando a que los servicios estén listos..."
        sleep 10

        # Mostrar estado
        docker-compose ps

        log_info "✓ Instalación completada!"
        log_warning "Recuerda configurar Nginx con el archivo nginx-proxy.conf"
        ;;

    2)
        log_info "Actualizando y redesplegando..."

        # Detener servicios
        log_info "Deteniendo servicios..."
        docker-compose down

        # Pull de cambios (si estás usando git)
        if [ -d .git ]; then
            log_info "Obteniendo últimos cambios..."
            git pull
        fi

        # Reconstruir imágenes
        log_info "Reconstruyendo imágenes..."
        docker-compose build

        # Iniciar servicios
        log_info "Iniciando servicios..."
        docker-compose up -d

        log_info "✓ Actualización completada!"
        ;;

    3)
        log_info "Deteniendo servicios..."
        docker-compose down
        log_info "✓ Servicios detenidos"
        ;;

    4)
        echo "Selecciona el servicio:"
        echo "1) Backend"
        echo "2) Frontend"
        echo "3) MongoDB"
        echo "4) Todos"
        read -p "Opción [1-4]: " log_option

        case $log_option in
            1) docker-compose logs -f backend ;;
            2) docker-compose logs -f frontend ;;
            3) docker-compose logs -f mongodb ;;
            4) docker-compose logs -f ;;
            *) log_error "Opción inválida" ;;
        esac
        ;;

    5)
        log_info "Reiniciando servicios..."
        docker-compose restart
        log_info "✓ Servicios reiniciados"
        ;;

    6)
        log_warning "ADVERTENCIA: Esto eliminará todos los contenedores, imágenes y VOLÚMENES."
        read -p "¿Estás seguro? (escribe 'SI' para confirmar): " confirm

        if [ "$confirm" = "SI" ]; then
            log_info "Limpiando todo..."
            docker-compose down -v
            docker system prune -af --volumes
            log_info "✓ Limpieza completada"
        else
            log_info "Operación cancelada"
        fi
        ;;

    *)
        log_error "Opción inválida"
        exit 1
        ;;
esac

echo ""
log_info "Operación finalizada"
echo "======================================"
