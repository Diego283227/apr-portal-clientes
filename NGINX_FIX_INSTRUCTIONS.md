# Instrucciones para Solucionar Bad Gateway

## Problema
El error "Bad Gateway" ocurre porque nginx no puede conectarse a los servicios backend/frontend.

## Solución

Conectarse al VPS y ejecutar los siguientes comandos:

```bash
# 1. Conectarse al VPS
ssh root@159.223.152.210

# 2. Ir al directorio del proyecto
cd /opt/portal-online

# 3. Verificar estado de contenedores
docker ps -a | grep portal

# 4. Verificar logs de nginx
docker logs portal-nginx --tail 50

# 5. Verificar el archivo .env
cat .env | grep VITE_API_BASE_URL

# 6. SI el VITE_API_BASE_URL tiene una URL absoluta (ej: http://145.223.26.119:5000/api)
#    CAMBIARLO a una ruta relativa:
nano .env
# Cambiar: VITE_API_BASE_URL=http://145.223.26.119:5000/api
# Por:     VITE_API_BASE_URL=/api

# 7. Reconstruir los contenedores con la nueva configuración
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 8. Verificar que todos los contenedores estén corriendo
docker ps -a | grep portal

# 9. Ver logs de nginx para verificar conectividad
docker logs portal-nginx -f

# 10. Probar el health check
curl http://localhost/health
```

## Verificaciones Adicionales

### Verificar que nginx puede resolver los nombres de host:
```bash
docker exec portal-nginx ping -c 2 backend
docker exec portal-nginx ping -c 2 frontend
```

### Ver configuración de nginx cargada:
```bash
docker exec portal-nginx cat /etc/nginx/nginx.conf
```

### Verificar red de Docker:
```bash
docker network inspect portal-online_portal-network
```

## URLs Esperadas

Después de la corrección:
- **Frontend**: `http://145.223.26.119/` (puerto 80)
- **Backend API**: `http://145.223.26.119/api/` (a través de nginx)
- **WebSocket**: `http://145.223.26.119/socket.io/` (a través de nginx)

## Comandos Útiles de Diagnóstico

```bash
# Ver todos los logs en tiempo real
docker-compose logs -f

# Ver solo logs de nginx
docker logs portal-nginx -f

# Ver solo logs de backend
docker logs portal-backend -f

# Ver solo logs de frontend
docker logs portal-frontend -f

# Reiniciar solo nginx
docker-compose restart nginx

# Reconstruir y reiniciar todo
docker-compose down && docker-compose up -d --build
```
