# 🚀 QUICK START - Despliegue en VPS Ubuntu

## ⚡ EN 3 PASOS (5 minutos)

### 📝 PASO 1: Preparar en tu PC (Windows)

```bash
cd C:\Users\diego\Escritorio\portal-online

# Configurar variables de entorno
cp .env.example .env
nano .env  # O edita con notepad
```

**Edita estas variables mínimas en `.env`:**
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=MiPasswordSegura123!
JWT_SECRET=genera-con-comando-abajo
JWT_REFRESH_SECRET=genera-otro-diferente
FRONTEND_URL=http://tu-ip-o-dominio.com
VITE_API_BASE_URL=http://tu-ip-o-dominio.com/api
```

**Generar secrets seguros:**
```bash
# En Git Bash o terminal
openssl rand -base64 32
openssl rand -base64 32
```

### 📤 PASO 2: Subir al VPS

**Opción A: Con Git (Recomendado)**
```bash
# En tu PC
git add .
git commit -m "Preparar para producción"
git push

# En el VPS
ssh usuario@tu-ip-vps
cd /opt
sudo git clone https://tu-repositorio.git portal-online
cd portal-online
sudo chown -R $USER:$USER .
```

**Opción B: Con SCP (Sin Git)**
```bash
# En tu PC (Git Bash)
cd C:\Users\diego\Escritorio
tar --exclude=node_modules --exclude=.git -czf portal-online.tar.gz portal-online/
scp portal-online.tar.gz usuario@tu-ip-vps:/tmp/

# En el VPS
ssh usuario@tu-ip-vps
cd /opt
sudo tar -xzf /tmp/portal-online.tar.gz
sudo chown -R $USER:$USER portal-online
cd portal-online
```

**Opción C: Con FileZilla/WinSCP (Windows)**
1. Abre FileZilla o WinSCP
2. Conecta con SFTP: `sftp://tu-ip-vps`
3. Sube la carpeta `portal-online` a `/opt/`

### 🚀 PASO 3: Desplegar (UN COMANDO)

```bash
# En el VPS
cd /opt/portal-online
bash quick-deploy.sh
```

**El script te preguntará:**
1. ¿Editar .env? → Ya lo editaste, di "No"
2. ¿Configurar Nginx? → Di "Sí"
3. ¿Tu dominio? → Escribe tu dominio o presiona Enter para usar IP
4. ¿Configurar SSL? → Di "Sí" si tienes dominio

## ✅ ¡LISTO!

Tu aplicación estará en:
- **Frontend**: `http://tu-ip` o `https://tu-dominio.com`
- **Backend API**: `http://tu-ip:5000/api`

---

## 📊 Comandos Útiles Post-Despliegue

```bash
# Ver estado de servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend

# Ver logs solo del frontend
docker-compose logs -f frontend

# Reiniciar todo
docker-compose restart

# Detener todo
docker-compose down

# Actualizar código y redesplegar
git pull  # Si usas git
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 🔍 Verificar que Todo Funciona

```bash
# Verificar contenedores
docker-compose ps
# Deberías ver: portal-mongodb, portal-backend, portal-frontend (Up)

# Verificar backend
curl http://localhost:5000/api/health

# Verificar frontend
curl http://localhost:80

# Verificar MongoDB
docker exec portal-mongodb mongosh -u admin -p TU_PASSWORD --eval "db.version()"
```

---

## 🐛 Solución Rápida de Problemas

**No puedo conectar por SSH:**
```bash
# Verificar que el puerto 22 está abierto en tu VPS
# En el panel de control del VPS, abre el firewall
```

**Error: "docker: command not found":**
```bash
# El script debería instalarlo, pero si falla:
bash install-vps.sh
```

**Los contenedores no inician:**
```bash
# Ver logs detallados
docker-compose logs

# Verificar .env
cat .env | grep -v "^#" | grep .
```

**Error 502 en el navegador:**
```bash
# Verificar que el backend está corriendo
docker-compose logs backend

# Reiniciar servicios
docker-compose restart
```

**No puedo acceder desde mi navegador:**
```bash
# Verificar firewall del VPS
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## 🎯 ¿Qué hace `quick-deploy.sh`?

1. **Detecta** si Docker/Nginx ya están instalados
2. **Instala** dependencias faltantes automáticamente
3. **Verifica** tu archivo .env
4. **Construye** las imágenes Docker con las versiones de tus package.json
5. **Inicia** MongoDB, Backend y Frontend
6. **Configura** Nginx (opcional)
7. **Configura** SSL con Let's Encrypt (opcional)

**Todo automático. Cero configuración manual de versiones.**

---

## 🔐 Seguridad Post-Instalación (Opcional)

```bash
# Cambiar puerto SSH (recomendado)
sudo nano /etc/ssh/sshd_config
# Cambiar: Port 22 → Port 2222
sudo systemctl restart sshd

# Instalar fail2ban (protección contra ataques)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configurar backups automáticos de MongoDB
# Ver DEPLOYMENT.md sección "Backup de la base de datos"
```

---

## 📞 ¿Necesitas Ayuda?

1. Revisa los logs: `docker-compose logs`
2. Verifica el archivo .env
3. Consulta [DEPLOYMENT.md](DEPLOYMENT.md) para guía detallada
4. Verifica que todos los puertos estén abiertos en el firewall

---

## ✨ Funcionalidades Disponibles

Una vez desplegado, tendrás acceso a:

- ✅ Sistema de autenticación con JWT
- ✅ Panel de administración
- ✅ Gestión de usuarios
- ✅ Sistema de pagos (MercadoPago y PayPal)
- ✅ Notificaciones en tiempo real
- ✅ Carga de archivos
- ✅ API REST documentada (Swagger)
- ✅ Dashboard con métricas
- ✅ Sistema de roles y permisos

**Accede a la documentación API en:**
`http://tu-ip:5000/api-docs`
