# 📁 Archivos de Despliegue - Guía Rápida

## 🎯 ¿Qué archivo usar?

### Para despliegue rápido: **QUICK-START.md** ⭐
- Instrucciones en 3 pasos simples
- Lo más rápido para poner en producción
- Incluye todos los comandos copy-paste

### Para seguir paso a paso: **CHECKLIST-DESPLIEGUE.md** ✅
- Lista de verificación completa
- Marca cada paso que completas
- Incluye troubleshooting

### Para información detallada: **DEPLOYMENT.md** 📖
- Guía completa con explicaciones
- Configuración avanzada
- SSL, seguridad, backups, etc.

---

## 📂 Estructura de Archivos Creados

```
portal-online/
│
├── 🚀 SCRIPTS DE DESPLIEGUE
│   ├── quick-deploy.sh          ⭐ UN COMANDO para instalar todo
│   ├── install-vps.sh            Solo instala dependencias (Docker, Nginx)
│   └── deploy.sh                 Gestión de contenedores (start/stop/logs)
│
├── 📖 DOCUMENTACIÓN
│   ├── QUICK-START.md           ⭐ EMPIEZA AQUÍ - 3 pasos para desplegar
│   ├── CHECKLIST-DESPLIEGUE.md  Lista de verificación completa
│   ├── DEPLOYMENT.md             Guía detallada paso a paso
│   ├── ARCHIVOS-DESPLIEGUE.md   Este archivo (guía de archivos)
│   └── README.md                 Documentación general del proyecto
│
├── 🐳 DOCKER
│   ├── docker-compose.yml       Orquestación (MongoDB, Backend, Frontend)
│   ├── server/Dockerfile        Imagen del backend
│   ├── portal-web/Dockerfile    Imagen del frontend
│   ├── server/.dockerignore     Archivos a ignorar en backend
│   └── portal-web/.dockerignore Archivos a ignorar en frontend
│
├── ⚙️ CONFIGURACIÓN
│   ├── .env.example             Template de variables de entorno
│   ├── nginx-proxy.conf         Configuración Nginx para el VPS
│   ├── portal-web/nginx.conf    Configuración Nginx del frontend
│   └── .gitignore               Archivos a ignorar en Git
│
└── 📦 PROYECTO
    ├── server/                  Backend (Node.js + TypeScript)
    └── portal-web/              Frontend (React + Vite)
```

---

## 🎬 Flujo de Trabajo Recomendado

### 1️⃣ Primera vez (Despliegue inicial)

```bash
# Lee esto primero:
QUICK-START.md

# Usa este script:
bash quick-deploy.sh

# Verifica con esto:
CHECKLIST-DESPLIEGUE.md
```

### 2️⃣ Si algo falla

```bash
# Consulta troubleshooting en:
CHECKLIST-DESPLIEGUE.md (sección 🆘)
DEPLOYMENT.md (sección "Solución de Problemas")

# Ver logs:
docker-compose logs -f
```

### 3️⃣ Actualizaciones posteriores

```bash
# Actualizar código:
git pull

# Redesplegar:
./deploy.sh
# Selecciona opción 2 (Actualizar y redesplegar)
```

### 4️⃣ Gestión diaria

```bash
# Ver estado:
docker-compose ps

# Ver logs:
./deploy.sh  # opción 4

# Reiniciar:
./deploy.sh  # opción 5
```

---

## 🔧 Descripción de Scripts

### `quick-deploy.sh` ⭐ RECOMENDADO

**¿Qué hace?**
1. Instala Docker, Docker Compose, Nginx automáticamente
2. Configura firewall
3. Verifica archivo .env
4. Construye imágenes con las versiones de tus package.json
5. Inicia todos los servicios
6. Configura proxy reverso (opcional)
7. Configura SSL (opcional)

**Cuándo usarlo:** Primera instalación en el VPS

**Comando:**
```bash
bash quick-deploy.sh
```

---

### `install-vps.sh`

**¿Qué hace?**
- Solo instala dependencias del sistema (Docker, Nginx, etc.)
- NO despliega la aplicación
- Útil si quieres instalar manualmente paso a paso

**Cuándo usarlo:** Si prefieres instalar dependencias por separado

**Comando:**
```bash
bash install-vps.sh
```

---

### `deploy.sh`

**¿Qué hace?**
Menú interactivo con opciones:
1. Instalación inicial
2. Actualizar y redesplegar
3. Detener servicios
4. Ver logs
5. Reiniciar servicios
6. Limpiar todo

**Cuándo usarlo:** Para gestión post-instalación

**Comando:**
```bash
./deploy.sh
```

---

## 📖 Descripción de Documentación

### `QUICK-START.md` ⭐

**Contenido:**
- Despliegue en 3 pasos
- Comandos copy-paste
- Solución rápida de problemas

**Para quién:** Todos (empezar aquí)

---

### `CHECKLIST-DESPLIEGUE.md` ✅

**Contenido:**
- Lista de verificación paso a paso
- Checkboxes para marcar progreso
- Comandos de diagnóstico
- Troubleshooting común

**Para quién:** Quien quiere asegurar que todo esté bien

---

### `DEPLOYMENT.md` 📖

**Contenido:**
- Guía completa con explicaciones
- Instalación manual paso a paso
- Configuración SSL avanzada
- Seguridad
- Backups
- Monitoreo

**Para quién:** Quien quiere entender cada paso en detalle

---

## 🐳 Descripción de Docker

### `docker-compose.yml`

**Define 3 servicios:**
1. **mongodb** - Base de datos
   - Puerto: 27017
   - Volumen persistente para datos

2. **backend** - API Node.js
   - Puerto: 5000
   - Variables de entorno desde .env
   - Depende de MongoDB

3. **frontend** - React + Nginx
   - Puerto: 80
   - Sirve archivos estáticos
   - Depende de backend

**Comando:**
```bash
docker-compose up -d    # Iniciar
docker-compose down     # Detener
docker-compose ps       # Ver estado
docker-compose logs -f  # Ver logs
```

---

### `server/Dockerfile`

**Imagen del Backend:**
- Base: node:20-alpine
- Etapa 1: Compilar TypeScript
- Etapa 2: Producción solo con archivos compilados
- Puerto: 5000

---

### `portal-web/Dockerfile`

**Imagen del Frontend:**
- Etapa 1: Build con Node.js y Vite
- Etapa 2: Servir con Nginx
- Puerto: 80

---

## ⚙️ Descripción de Configuración

### `.env.example`

**Template de variables de entorno:**
- Credenciales de MongoDB
- Secrets JWT
- URLs
- API keys de servicios externos

**Uso:**
```bash
cp .env.example .env
nano .env  # Editar con tus valores
```

---

### `nginx-proxy.conf`

**Configuración Nginx para el VPS:**
- Proxy reverso para backend (/api → :5000)
- Proxy reverso para frontend (/ → :80)
- WebSocket support para Socket.IO
- SSL/HTTPS (comentado, descomentar cuando tengas SSL)

**Uso:**
```bash
sudo cp nginx-proxy.conf /etc/nginx/sites-available/portal-online
sudo nano /etc/nginx/sites-available/portal-online  # Editar dominio
sudo ln -s /etc/nginx/sites-available/portal-online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│                   FLUJO DE DESPLIEGUE                   │
└─────────────────────────────────────────────────────────┘

1. Lee → QUICK-START.md

2. Prepara → .env (copia de .env.example)

3. Sube → Proyecto al VPS
          (Git, SCP, o FileZilla)

4. Ejecuta → bash quick-deploy.sh
             (instala todo automáticamente)

5. Verifica → CHECKLIST-DESPLIEGUE.md
              (marca todos los checks)

6. Listo! → Tu app en producción 🎉
```

---

## 🔑 Comandos Clave

```bash
# ═══════════════════════════════════════════════════════
# DESPLIEGUE INICIAL (UNA VEZ)
# ═══════════════════════════════════════════════════════
bash quick-deploy.sh

# ═══════════════════════════════════════════════════════
# USO DIARIO
# ═══════════════════════════════════════════════════════

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Actualizar código
git pull
docker-compose down
docker-compose build
docker-compose up -d

# ═══════════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════════

# Ver errores
docker-compose logs --tail=100 | grep -i error

# Reiniciar servicio específico
docker-compose restart backend

# Reconstruir desde cero
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Ver uso de recursos
docker stats
```

---

## ❓ FAQ Rápido

**P: ¿Necesito instalar Node.js en el VPS?**
R: NO. Docker maneja todo. Las versiones están en tus package.json

**P: ¿Qué script uso para desplegar?**
R: `quick-deploy.sh` - hace todo en un comando

**P: ¿Cómo actualizo mi código?**
R: `git pull` + `./deploy.sh` (opción 2)

**P: ¿Dónde están las versiones de Express/React/etc?**
R: En `server/package.json` y `portal-web/package.json`
   Docker las usa automáticamente al construir

**P: ¿Cómo veo si funciona?**
R: Abre `http://tu-ip` en el navegador

**P: ¿Puedo usar IP en vez de dominio?**
R: Sí, funciona perfectamente con IP

**P: ¿Cómo configuro SSL?**
R: El script `quick-deploy.sh` te lo pregunta automáticamente
   O manualmente: `sudo certbot --nginx -d tu-dominio.com`

---

## 🎉 ¡Todo Listo!

Ahora tienes:
- ✅ Scripts automáticos de despliegue
- ✅ Documentación completa
- ✅ Configuración Docker
- ✅ Configuración Nginx
- ✅ Guías paso a paso
- ✅ Checklists de verificación

**Empieza por:**
1. Leer [QUICK-START.md](QUICK-START.md)
2. Ejecutar `quick-deploy.sh`
3. Verificar con [CHECKLIST-DESPLIEGUE.md](CHECKLIST-DESPLIEGUE.md)

**¡Feliz despliegue! 🚀**
