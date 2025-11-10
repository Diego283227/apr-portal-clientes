# Dockerfile para el frontend React
FROM node:20 AS builder

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Borrar cualquier lock file y node_modules que venga del host
RUN rm -rf package-lock.json node_modules

# Instalar dependencias FRESCAS en el contenedor (esto instalará todos los binarios nativos correctos)
RUN npm install --force

# Copiar el código fuente
COPY . .

# Limpiar caché de Vite antes de construir
RUN rm -rf node_modules/.vite .vite dist

# Argumentos de build para variables de entorno
ARG VITE_API_BASE_URL
ARG VITE_PAYPAL_CLIENT_ID
ARG VITE_PAYPAL_CLIENT_SECRET
ARG VITE_PAYPAL_ENVIRONMENT
ARG VITE_MERCADOPAGO_PUBLIC_KEY

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PAYPAL_CLIENT_ID=$VITE_PAYPAL_CLIENT_ID
ENV VITE_PAYPAL_CLIENT_SECRET=$VITE_PAYPAL_CLIENT_SECRET
ENV VITE_PAYPAL_ENVIRONMENT=$VITE_PAYPAL_ENVIRONMENT
ENV VITE_MERCADOPAGO_PUBLIC_KEY=$VITE_MERCADOPAGO_PUBLIC_KEY

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
