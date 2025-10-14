# Guía de Despliegue - Portal Online en VPS Ubuntu

Esta guía te ayudará a desplegar tu aplicación Portal Online en un VPS con Ubuntu usando Docker y Docker Compose.

---

## 🚀 DESPLIEGUE RÁPIDO - UN SOLO COMANDO

### Método 1: Con Git (Recomendado)

```bash
# 1. Conectarse al VPS
ssh usuario@tu-ip-vps

# 2. Clonar y desplegar
cd /opt
sudo git clone https://tu-repositorio.git portal-online
cd portal-online
sudo chown -R $USER:$USER .
bash quick-deploy.sh
```

### Método 2: Subir archivos manualmente

```bash
# En tu máquina local (Windows)
cd C:\Users\diego\Escritorio
tar --exclude=node_modules --exclude=.git -czf portal-online.tar.gz portal-online/
scp portal-online.tar.gz usuario@tu-ip-vps:/opt/

# En el VPS
ssh usuario@tu-ip-vps
cd /opt
tar -xzf portal-online.tar.gz
cd portal-online
bash quick-deploy.sh
```

**¡Eso es todo!** El script `quick-deploy.sh` hará:
- ✅ Instalar Docker y Docker Compose automáticamente
- ✅ Instalar Nginx
- ✅ Configurar firewall
- ✅ Construir las imágenes con las versiones exactas de tus package.json
- ✅ Iniciar todos los servicios (MongoDB, Backend, Frontend)
- ✅ Configurar proxy reverso (opcional)
- ✅ Configurar SSL (opcional)

**NOTA IMPORTANTE:** Las versiones de Node, Express, React, etc. están en tus `package.json`. Docker las usará automáticamente, no necesitas especificarlas manualmente.

---

## 📋 Requisitos Previos

### En tu máquina local:
- Git instalado (opcional)
- Acceso SSH al VPS

### En el VPS Ubuntu:
- Ubuntu 20.04 o superior
- Acceso root o sudo
- Puerto 80 y 443 abiertos
- Al menos 2GB de RAM
- 20GB de espacio en disco

---

## 📖 GUÍA DETALLADA (Instalación Manual Paso a Paso)

Si prefieres instalar manualmente en lugar de usar `quick-deploy.sh`:

## 🚀 Paso 1: Preparar el VPS

### 1.1 Conectarse al VPS
```bash
ssh root@tu-ip-del-vps
# O si tienes un usuario específico:
ssh usuario@tu-ip-del-vps
```

### 1.2 Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Instalar Docker
```bash
# Instalar dependencias
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Agregar repositorio de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Verificar instalación
docker --version
```

### 1.4 Instalar Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 1.5 Configurar usuario para Docker (opcional pero recomendado)
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 1.6 Instalar Nginx (para proxy reverso)
```bash
sudo apt install -y nginx
```

## 📤 Paso 2: Subir el Proyecto al VPS

### Opción A: Usando Git (Recomendado)

#### 2.1 En tu máquina local, commitea y pushea los cambios
```bash
# En tu máquina local
cd /c/Users/diego/Escritorio/portal-online
git add .
git commit -m "Preparar para despliegue"
git push origin main
```

#### 2.2 En el VPS, clona el repositorio
```bash
# En el VPS
cd /opt
sudo git clone https://github.com/tu-usuario/tu-repositorio.git portal-online
cd portal-online
sudo chown -R $USER:$USER .
```

### Opción B: Usando SCP/RSYNC

#### 2.1 Desde tu máquina local (Windows), usar rsync o scp
```bash
# Comprimir el proyecto primero (en tu máquina local)
cd /c/Users/diego/Escritorio
tar -czf portal-online.tar.gz portal-online/ --exclude=node_modules --exclude=.git

# Subir al VPS
scp portal-online.tar.gz usuario@tu-ip-vps:/opt/

# En el VPS, descomprimir
ssh usuario@tu-ip-vps
cd /opt
tar -xzf portal-online.tar.gz
cd portal-online
```

### Opción C: Usando FileZilla o WinSCP (Windows)
1. Abre FileZilla o WinSCP
2. Conecta a tu VPS usando SFTP
3. Navega a `/opt/` en el servidor
4. Sube la carpeta `portal-online` (excluyendo node_modules)

## ⚙️ Paso 3: Configurar Variables de Entorno

### 3.1 Copiar el archivo de ejemplo
```bash
cd /opt/portal-online
cp .env.example .env
```

### 3.2 Editar el archivo .env
```bash
nano .env
```

### 3.3 Configurar las variables importantes:
```env
# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=TU_PASSWORD_SEGURA_AQUI

# JWT Secrets (genera con: openssl rand -base64 32)
JWT_SECRET=tu_secret_jwt_generado
JWT_REFRESH_SECRET=tu_secret_refresh_generado

# URLs (reemplaza con tu dominio o IP)
FRONTEND_URL=https://tu-dominio.com
VITE_API_BASE_URL=https://tu-dominio.com/api

# Servicios externos (configura según necesites)
CLOUDINARY_CLOUD_NAME=tu_cloudinary
MERCADOPAGO_ACCESS_TOKEN=tu_token
PAYPAL_CLIENT_ID=tu_paypal_id
# ... etc
```

### 3.4 Generar secrets seguros
```bash
# Generar JWT secrets
openssl rand -base64 32
openssl rand -base64 32
```

## 🐳 Paso 4: Desplegar con Docker

### 4.1 Dar permisos al script de despliegue
```bash
chmod +x deploy.sh
```

### 4.2 Ejecutar instalación inicial
```bash
./deploy.sh
# Selecciona opción 1 (Instalación inicial)
```

### 4.3 Verificar que los contenedores están corriendo
```bash
docker-compose ps
```

Deberías ver algo como:
```
NAME                COMMAND                  SERVICE     STATUS              PORTS
portal-backend      "node dist/server.js"    backend     Up About a minute   0.0.0.0:5000->5000/tcp
portal-frontend     "nginx -g 'daemon of…"   frontend    Up About a minute   0.0.0.0:80->80/tcp
portal-mongodb      "docker-entrypoint.s…"   mongodb     Up About a minute   0.0.0.0:27017->27017/tcp
```

## 🌐 Paso 5: Configurar Nginx como Proxy Reverso

### 5.1 Copiar la configuración de Nginx
```bash
sudo cp nginx-proxy.conf /etc/nginx/sites-available/portal-online
```

### 5.2 Editar la configuración con tu dominio
```bash
sudo nano /etc/nginx/sites-available/portal-online
```

Busca y reemplaza `tu-dominio.com` con tu dominio real o IP del VPS.

### 5.3 Habilitar el sitio
```bash
sudo ln -s /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/
```

### 5.4 Eliminar la configuración por defecto (opcional)
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 5.5 Verificar la configuración
```bash
sudo nginx -t
```

### 5.6 Reiniciar Nginx
```bash
sudo systemctl restart nginx
```

## 🔒 Paso 6: Configurar SSL con Let's Encrypt (Opcional pero Recomendado)

### 6.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtener certificado SSL
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Sigue las instrucciones en pantalla.

### 6.3 Configurar renovación automática
```bash
sudo systemctl status certbot.timer
```

## 🔥 Configurar Firewall

```bash
# Permitir SSH
sudo ufw allow OpenSSH

# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Habilitar firewall
sudo ufw enable

# Verificar estado
sudo ufw status
```

## 🎯 Paso 7: Verificar el Despliegue

### 7.1 Verificar servicios
```bash
# Ver logs del backend
docker-compose logs -f backend

# Ver logs del frontend
docker-compose logs -f frontend

# Ver logs de MongoDB
docker-compose logs -f mongodb
```

### 7.2 Acceder a la aplicación
Abre tu navegador y visita:
- `http://tu-dominio.com` o `http://tu-ip-vps`

## 🔄 Comandos Útiles

### Ver logs en tiempo real
```bash
./deploy.sh
# Selecciona opción 4
```

### Reiniciar servicios
```bash
./deploy.sh
# Selecciona opción 5
```

### Actualizar la aplicación
```bash
# Si usas Git
git pull origin main

# Luego ejecuta
./deploy.sh
# Selecciona opción 2
```

### Detener servicios
```bash
./deploy.sh
# Selecciona opción 3
```

### Backup de la base de datos
```bash
# Backup
docker exec portal-mongodb mongodump --out /data/backup --authenticationDatabase admin -u admin -p TU_PASSWORD

# Copiar backup a local
docker cp portal-mongodb:/data/backup ./backup-$(date +%Y%m%d)
```

### Restaurar base de datos
```bash
docker exec portal-mongodb mongorestore /data/backup --authenticationDatabase admin -u admin -p TU_PASSWORD
```

## 🐛 Solución de Problemas

### Los contenedores no inician
```bash
# Ver logs detallados
docker-compose logs

# Verificar el estado
docker-compose ps
```

### Error de conexión a MongoDB
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que el contenedor de MongoDB está corriendo:
  ```bash
  docker-compose restart mongodb
  ```

### Error 502 Bad Gateway en Nginx
- Verifica que el backend está corriendo:
  ```bash
  docker-compose logs backend
  ```
- Verifica la configuración de Nginx:
  ```bash
  sudo nginx -t
  ```

### Puerto ya en uso
```bash
# Ver qué está usando el puerto
sudo lsof -i :80
sudo lsof -i :5000

# Detener el proceso o cambiar el puerto en docker-compose.yml
```

## 📊 Monitoreo

### Ver uso de recursos
```bash
# CPU y memoria de contenedores
docker stats

# Espacio en disco
df -h

# Logs de Nginx
sudo tail -f /var/log/nginx/portal-online-access.log
sudo tail -f /var/log/nginx/portal-online-error.log
```

## 🔐 Seguridad Adicional

### 1. Cambiar puerto SSH (recomendado)
```bash
sudo nano /etc/ssh/sshd_config
# Cambiar Port 22 a otro puerto (ej: 2222)
sudo systemctl restart sshd
```

### 2. Deshabilitar login root
```bash
sudo nano /etc/ssh/sshd_config
# Cambiar PermitRootLogin yes a no
sudo systemctl restart sshd
```

### 3. Instalar fail2ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `docker-compose logs`
2. Verifica las variables de entorno en `.env`
3. Asegúrate de que todos los puertos estén abiertos
4. Consulta la documentación de Docker y Nginx

## 🎉 ¡Listo!

Tu aplicación Portal Online ahora debería estar corriendo en tu VPS Ubuntu. Puedes acceder a ella desde tu navegador usando tu dominio o IP del servidor.

### Próximos pasos recomendados:
- ✅ Configurar SSL con Let's Encrypt
- ✅ Configurar backups automáticos de MongoDB
- ✅ Configurar monitoreo con herramientas como Grafana/Prometheus
- ✅ Configurar CI/CD para despliegues automáticos
