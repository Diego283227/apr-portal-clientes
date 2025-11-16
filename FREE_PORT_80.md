# Solución: Puerto 80 ya está en uso

## Problema
```
failed to bind host port for 0.0.0.0:80: address already in use
```

El puerto 80 está siendo usado por otro servicio.

## Diagnóstico

Ejecuta estos comandos en el VPS para ver qué está usando el puerto 80:

```bash
# Ver qué proceso está usando el puerto 80
sudo lsof -i :80
# O alternativamente:
sudo netstat -tlnp | grep :80
# O con ss:
sudo ss -tlnp | grep :80
```

## Solución 1: Detener el servicio que usa el puerto 80

Si es Apache:
```bash
sudo systemctl stop apache2
sudo systemctl disable apache2  # Para que no inicie automáticamente
```

Si es Nginx del sistema (no Docker):
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx  # Para que no inicie automáticamente
```

Si es otro contenedor Docker:
```bash
# Ver contenedores corriendo
docker ps

# Detener el contenedor que usa puerto 80
docker stop <container_name_or_id>
```

## Solución 2: Usar un puerto diferente

Si no quieres detener el servicio del puerto 80, puedes cambiar nginx a otro puerto:

### Editar docker-compose.yml:
```yaml
nginx:
  ports:
    - "8080:80"  # Cambiar de 80:80 a 8080:80
```

Luego:
```bash
docker-compose down
docker-compose up -d
```

El sitio estaría disponible en: `http://145.223.26.119:8080`

## Solución 3: Usar el Nginx del sistema como reverse proxy

Si ya tienes Nginx instalado en el sistema, puedes configurarlo para hacer proxy al contenedor:

1. No exponer puerto 80 en docker-compose (dejarlo interno)
2. Configurar Nginx del sistema para hacer proxy a `http://localhost:8080`

## Pasos Recomendados

**Opción más simple (recomendada):**

```bash
# 1. Ver qué está usando el puerto 80
sudo lsof -i :80

# 2. Si es Apache, detenerlo
sudo systemctl stop apache2
sudo systemctl disable apache2

# 3. Si es Nginx del sistema, detenerlo
sudo systemctl stop nginx
sudo systemctl disable nginx

# 4. Reiniciar los contenedores
cd /opt/portal-online
docker-compose down
docker-compose up -d

# 5. Verificar que todo esté corriendo
docker ps -a | grep portal
```

## Verificación Final

Después de liberar el puerto 80:

```bash
# Verificar que nginx esté corriendo
docker ps | grep portal-nginx

# Probar el health check
curl http://localhost/health

# Ver logs de nginx
docker logs portal-nginx --tail 50
```
