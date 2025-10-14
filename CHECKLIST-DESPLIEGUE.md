# ✅ CHECKLIST DE DESPLIEGUE

## 📋 Pre-Despliegue (En tu PC)

- [ ] **Archivo .env configurado**
  ```bash
  cd C:\Users\diego\Escritorio\portal-online
  cp .env.example .env
  # Editar con tus valores reales
  ```

- [ ] **Variables críticas configuradas en .env:**
  - [ ] `MONGO_ROOT_USERNAME` y `MONGO_ROOT_PASSWORD`
  - [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` (generados con `openssl rand -base64 32`)
  - [ ] `FRONTEND_URL` (tu dominio o IP del VPS)
  - [ ] `VITE_API_BASE_URL` (tu dominio/api)

- [ ] **Servicios externos configurados (si aplica):**
  - [ ] PayPal: `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`
  - [ ] MercadoPago: `MERCADOPAGO_ACCESS_TOKEN`
  - [ ] Cloudinary: `CLOUDINARY_*`
  - [ ] Email: `EMAIL_*`
  - [ ] Twilio: `TWILIO_*`

- [ ] **Código en Git (recomendado)**
  ```bash
  git add .
  git commit -m "Preparar para producción"
  git push
  ```

---

## 🖥️ En el VPS

### Paso 1: Acceso y Preparación
- [ ] **Conectado al VPS por SSH**
  ```bash
  ssh usuario@tu-ip-vps
  ```

- [ ] **Sistema actualizado** (opcional pero recomendado)
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

### Paso 2: Subir el Proyecto

**Opción A: Git**
- [ ] Proyecto clonado en `/opt/portal-online`
  ```bash
  cd /opt
  sudo git clone https://tu-repositorio.git portal-online
  cd portal-online
  sudo chown -R $USER:$USER .
  ```

**Opción B: SCP**
- [ ] Archivo comprimido y subido
  ```bash
  # En PC: tar --exclude=node_modules -czf portal-online.tar.gz portal-online/
  # En PC: scp portal-online.tar.gz usuario@vps:/tmp/
  cd /opt
  sudo tar -xzf /tmp/portal-online.tar.gz
  sudo chown -R $USER:$USER portal-online
  cd portal-online
  ```

### Paso 3: Despliegue Automático
- [ ] **Script ejecutado**
  ```bash
  cd /opt/portal-online
  bash quick-deploy.sh
  ```

- [ ] **Respuestas a las preguntas del script:**
  - [ ] ¿Editar .env? → NO (ya lo editaste antes)
  - [ ] ¿Configurar Nginx? → SÍ
  - [ ] Dominio: → Escribe tu dominio o presiona Enter
  - [ ] ¿SSL? → SÍ (si tienes dominio)

---

## 🔍 Verificación Post-Despliegue

### Servicios Activos
- [ ] **Contenedores corriendo**
  ```bash
  docker-compose ps
  ```
  Deberías ver:
  - `portal-mongodb` → Up
  - `portal-backend` → Up
  - `portal-frontend` → Up

- [ ] **Sin errores en los logs**
  ```bash
  docker-compose logs --tail=50
  ```

### Conectividad
- [ ] **Backend responde**
  ```bash
  curl http://localhost:5000/api/health
  ```

- [ ] **Frontend responde**
  ```bash
  curl http://localhost:80
  ```

- [ ] **MongoDB funciona**
  ```bash
  docker exec portal-mongodb mongosh -u admin -p TU_PASSWORD --eval "db.version()"
  ```

### Acceso desde Navegador
- [ ] **Frontend accesible desde navegador**
  - URL: `http://tu-ip` o `https://tu-dominio.com`
  - [ ] Página de inicio carga correctamente
  - [ ] Formularios de login/registro visibles

- [ ] **Backend API accesible**
  - URL: `http://tu-ip:5000/api` o `https://tu-dominio.com/api`
  - [ ] Swagger docs: `http://tu-ip:5000/api-docs`

---

## 🔒 Seguridad (Recomendado)

- [ ] **Firewall configurado**
  ```bash
  sudo ufw status
  ```
  Debería mostrar:
  - 22/tcp (SSH) → ALLOW
  - 80/tcp (HTTP) → ALLOW
  - 443/tcp (HTTPS) → ALLOW

- [ ] **SSL configurado** (si tienes dominio)
  ```bash
  sudo certbot certificates
  ```

- [ ] **Cambiar secretos por defecto**
  - [ ] Contraseña de MongoDB no es "changeme"
  - [ ] JWT secrets generados aleatoriamente

- [ ] **Backup configurado** (opcional)
  ```bash
  # Ver sección de backups en DEPLOYMENT.md
  ```

---

## 🔄 Mantenimiento Regular

### Diario
- [ ] **Verificar logs de errores**
  ```bash
  docker-compose logs --tail=100 | grep -i error
  ```

### Semanal
- [ ] **Actualizar sistema**
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] **Verificar espacio en disco**
  ```bash
  df -h
  docker system df
  ```

### Mensual
- [ ] **Backup de base de datos**
  ```bash
  docker exec portal-mongodb mongodump --out /data/backup -u admin -p PASSWORD
  docker cp portal-mongodb:/data/backup ./backup-$(date +%Y%m%d)
  ```

- [ ] **Limpiar imágenes Docker sin usar**
  ```bash
  docker system prune -a
  ```

---

## 🆘 Troubleshooting Rápido

### ❌ No puedo acceder desde el navegador

**Verificar:**
```bash
# 1. ¿Contenedores corriendo?
docker-compose ps

# 2. ¿Nginx funcionando?
sudo systemctl status nginx
sudo nginx -t

# 3. ¿Firewall permite conexiones?
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# 4. ¿IP correcta?
curl ifconfig.me
```

### ❌ Error 502 Bad Gateway

**Verificar backend:**
```bash
docker-compose logs backend
docker-compose restart backend
```

### ❌ No se conecta a MongoDB

**Verificar credenciales:**
```bash
cat .env | grep MONGO
docker-compose logs mongodb
docker-compose restart mongodb
```

### ❌ Cambios no se reflejan

**Redesplegar:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Comandos de Diagnóstico

```bash
# Estado completo del sistema
docker-compose ps
docker stats
df -h
free -h

# Logs en tiempo real
docker-compose logs -f

# Último error
docker-compose logs --tail=50 | grep -i error

# Conectividad
curl http://localhost:5000/api/health
curl http://localhost:80

# Procesos en puertos
sudo lsof -i :80
sudo lsof -i :5000
sudo lsof -i :27017
```

---

## ✅ Despliegue Exitoso

Si todos los checks están marcados, tu aplicación está:
- ✅ Desplegada correctamente
- ✅ Accesible desde internet
- ✅ Con base de datos funcionando
- ✅ Con seguridad básica configurada
- ✅ Con SSL (si configuraste dominio)

**¡Felicitaciones! 🎉**

Tu Portal Online está en producción y listo para usarse.

---

## 📞 Próximos Pasos

1. **Probar funcionalidades principales**
   - Registrar un usuario
   - Login
   - Probar dashboard
   - Verificar notificaciones

2. **Configurar monitoreo** (opcional)
   - Grafana + Prometheus
   - Logs centralizados
   - Alertas

3. **Optimizar rendimiento** (opcional)
   - Configurar CDN
   - Habilitar caching
   - Optimizar imágenes

4. **Documentar**
   - URL de acceso
   - Credenciales de servicios
   - Procedimientos de backup
   - Contactos de soporte
