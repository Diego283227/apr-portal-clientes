# Dockerfile para el frontend React
FROM node:20 AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias y binarios nativos necesarios
RUN npm install && \
    npm install --save-optional @rollup/rollup-linux-x64-gnu && \
    npm install --save-optional @swc/core-linux-x64-gnu && \
    npm install --save-optional lightningcss-linux-x64-gnu

# Copiar el código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Copiar los archivos construidos
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
