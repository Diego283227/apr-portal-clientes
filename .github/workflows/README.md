# GitHub Actions - Deployment Automático

Este proyecto tiene configurado CI/CD automático para desplegar en el VPS.

## Workflows disponibles

### 1. `deploy.yml` - Deploy Completo (Automático)
- **Se ejecuta:** Automáticamente cuando haces `git push` a `master`
- **Qué hace:**
  - Descarga los últimos cambios en el VPS
  - Detecta si hay cambios en `Dockerfile` o `package.json`
  - Si hay cambios: Reconstruye las imágenes Docker
  - Si NO hay cambios: Solo reinicia los contenedores (más rápido)
  - Limpia imágenes antiguas

### 2. `deploy-fast.yml` - Reinicio Rápido (Manual)
- **Se ejecuta:** Manualmente desde GitHub
- **Qué hace:**
  - Solo hace `git pull` y reinicia los contenedores
  - Útil para cambios pequeños de código

## Cómo usar

### Deploy automático (recomendado)
```bash
# En tu PC
git add .
git commit -m "Tu mensaje"
git push origin master

# ¡Listo! En 2-3 minutos estará desplegado en el VPS
```

### Deploy manual rápido
1. Ve a: https://github.com/Diego283227/apr-portal-clientes/actions
2. Click en "Fast Deploy (Restart Only)"
3. Click en "Run workflow"
4. Click en "Run workflow" (verde)

## Ver el progreso

1. Ve a: https://github.com/Diego283227/apr-portal-clientes/actions
2. Verás el estado del deployment en tiempo real
3. ✅ Verde = Exitoso
4. ❌ Rojo = Falló (revisa los logs)

## Secretos necesarios en GitHub

Estos secretos deben estar configurados en Settings → Secrets and variables → Actions:

- `VPS_HOST` - IP del servidor (145.223.26.119)
- `VPS_USER` - Usuario SSH (root)
- `VPS_SSH_KEY` - Clave privada SSH
- `MONGODB_URI` - Cadena de conexión a MongoDB
- `JWT_SECRET` - Secret para JWT
- `JWT_REFRESH_SECRET` - Secret para refresh tokens

## Tiempos estimados

- **Deploy completo** (con rebuild): 3-5 minutos
- **Deploy rápido** (solo restart): 30-60 segundos
- **Deploy sin cambios en deps**: 1-2 minutos

## Troubleshooting

Si el deploy falla:
1. Revisa los logs en GitHub Actions
2. Conéctate al VPS manualmente: `ssh root@145.223.26.119`
3. Revisa logs de Docker: `docker logs portal-backend`
4. Revisa el estado: `docker ps`
