# Mejor Solución: Usar Nginx del Sistema como Proxy

## Por qué es mejor esta solución

En lugar de deshabilitar nginx del sistema, lo usaremos como reverse proxy a los contenedores Docker. Beneficios:

1. ✅ Nginx del sistema ya está configurado y funcionando
2. ✅ Más fácil agregar HTTPS en el futuro (Let's Encrypt)
3. ✅ Mejor rendimiento (nginx nativo vs contenedor)
4. ✅ No hay conflicto de puertos

## Pasos para Implementar

### 1. Cambiar puerto del contenedor nginx

Editar `docker-compose.yml` en el VPS:

```yaml
nginx:
  ports:
    - "8080:80"  # En lugar de "80:80"
```

### 2. Configurar Nginx del sistema

Crear archivo de configuración para el sitio:

```bash
sudo nano /etc/nginx/sites-available/portal-online
```

Contenido:

```nginx
server {
    listen 80;
    server_name 145.223.26.119;

    # Logs
    access_log /var/log/nginx/portal-access.log;
    error_log /var/log/nginx/portal-error.log;

    # Proxy a contenedor nginx
    location / {
        proxy_pass http://localhost:8080;
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
```

### 3. Activar la configuración

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

### 4. Reiniciar contenedores

```bash
cd /opt/portal-online
docker-compose down
docker-compose up -d
```

## Configuración Completa del VPS

```bash
# 1. Hacer pull de cambios
cd /opt/portal-online
git pull origin master

# 2. Editar docker-compose.yml
nano docker-compose.yml
# Cambiar línea 10:  - "80:80"  →  - "8080:80"

# 3. Configurar nginx del sistema
sudo tee /etc/nginx/sites-available/portal-online > /dev/null <<'EOF'
server {
    listen 80;
    server_name 145.223.26.119;

    client_max_body_size 10M;

    access_log /var/log/nginx/portal-access.log;
    error_log /var/log/nginx/portal-error.log;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 4. Activar configuración
sudo ln -sf /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/

# 5. Verificar sintaxis
sudo nginx -t

# 6. Recargar nginx
sudo systemctl reload nginx

# 7. Reiniciar contenedores
docker-compose down
docker-compose up -d

# 8. Verificar
docker ps -a | grep portal
curl http://localhost/health
```

## Ventajas de esta Arquitectura

```
Internet (puerto 80)
    ↓
Nginx del Sistema (puerto 80)
    ↓
Contenedor Nginx (puerto 8080)
    ↓
├── Frontend (puerto 80 interno)
└── Backend (puerto 5000 interno)
```

1. **Nginx del sistema**: Maneja SSL/TLS, compresión, caché
2. **Nginx contenedor**: Maneja routing entre frontend/backend
3. **Cookies funcionan**: Todo bajo el mismo dominio

## Para Agregar HTTPS en el Futuro

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado (cuando tengas dominio)
sudo certbot --nginx -d tudominio.com

# Certbot automáticamente configurará HTTPS
```

## Verificación

Después de configurar:

```bash
# Ver logs de nginx del sistema
sudo tail -f /var/log/nginx/portal-access.log

# Ver logs del contenedor
docker logs portal-nginx -f

# Probar desde fuera del servidor
curl http://145.223.26.119/health
```
