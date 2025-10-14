# Portal Online

Sistema web completo con gestión de usuarios, pagos, notificaciones y más.

## 🏗️ Arquitectura

- **Backend**: Node.js + TypeScript + Express + MongoDB
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Base de Datos**: MongoDB
- **WebSockets**: Socket.IO (notificaciones en tiempo real)

## 🚀 Despliegue

Para desplegar esta aplicación en un VPS Ubuntu, consulta la **[Guía de Despliegue](DEPLOYMENT.md)**.

## 📦 Estructura del Proyecto

```
portal-online/
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/        # Configuraciones
│   │   ├── controllers/   # Controladores
│   │   ├── middleware/    # Middlewares
│   │   ├── models/        # Modelos de MongoDB
│   │   ├── routes/        # Rutas de API
│   │   ├── services/      # Servicios
│   │   ├── socket/        # WebSocket handlers
│   │   └── server.ts      # Punto de entrada
│   ├── Dockerfile
│   └── package.json
│
├── portal-web/            # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilidades
│   │   └── App.tsx        # App principal
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml     # Orquestación de servicios
├── nginx-proxy.conf       # Configuración Nginx para VPS
├── deploy.sh              # Script de despliegue
├── .env.example           # Ejemplo de variables de entorno
└── DEPLOYMENT.md          # Guía de despliegue

```

## 🛠️ Desarrollo Local

### Requisitos
- Node.js 20+
- MongoDB (local o remoto)
- npm o pnpm

### Configuración

1. Clonar el repositorio:
```bash
git clone <tu-repositorio>
cd portal-online
```

2. Configurar variables de entorno:
```bash
# Backend
cd server
cp .env.example .env
# Editar .env con tus configuraciones

# Frontend
cd ../portal-web
cp .env.example .env
# Editar .env con tus configuraciones
```

3. Instalar dependencias:
```bash
# Backend
cd server
npm install

# Frontend
cd ../portal-web
npm install
```

4. Iniciar servicios:
```bash
# Backend (en una terminal)
cd server
npm run dev

# Frontend (en otra terminal)
cd portal-web
npm run dev
```

## 📝 Variables de Entorno

### Backend (.env)
- `MONGODB_URI`: URI de conexión a MongoDB
- `JWT_SECRET`: Secret para JWT
- `JWT_REFRESH_SECRET`: Secret para refresh tokens
- `PORT`: Puerto del servidor (default: 5000)
- `FRONTEND_URL`: URL del frontend
- Servicios externos: Cloudinary, MercadoPago, PayPal, Twilio, etc.

### Frontend (.env)
- `VITE_API_BASE_URL`: URL del backend API
- `VITE_PAYPAL_CLIENT_ID`: Client ID de PayPal

## 🐳 Docker

Para ejecutar con Docker Compose:

```bash
# Crear archivo .env en la raíz
cp .env.example .env

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

## 📚 Características

- ✅ Autenticación y autorización con JWT
- ✅ Gestión de usuarios y roles
- ✅ Sistema de pagos (MercadoPago y PayPal)
- ✅ Notificaciones en tiempo real (Socket.IO)
- ✅ Carga de archivos (Cloudinary)
- ✅ Envío de emails y SMS
- ✅ Dashboard administrativo
- ✅ Documentación API (Swagger)
- ✅ Rate limiting y seguridad

## 🔒 Seguridad

- Helmet.js para headers de seguridad
- CORS configurado
- Rate limiting
- Validación de inputs
- Encriptación de contraseñas (bcrypt)
- JWT con refresh tokens

## 📄 Licencia

[Tu licencia aquí]

## 👥 Contribuir

[Instrucciones para contribuir]

## 📞 Contacto

[Tu información de contacto]
