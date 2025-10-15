# Dockerfile para el servidor backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production && \
    npm ci --only=development

# Copiar el código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Etapa de producción
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar el código compilado desde el builder
COPY --from=builder /app/dist ./dist

# Crear directorios para uploads y backups
RUN mkdir -p /app/uploads /app/backups && \
    chown -R node:node /app/uploads /app/backups

# Cambiar a usuario no privilegiado
USER node

# Exponer el puerto
EXPOSE 5000

# Variables de entorno por defecto
ENV NODE_ENV=production

# Comando de inicio
CMD ["node", "dist/server.js"]
