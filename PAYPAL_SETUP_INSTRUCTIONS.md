# Instrucciones para Configurar PayPal en Producción

⚠️ **IMPORTANTE**: Estas son credenciales de PRODUCCIÓN - procesarán pagos REALES

## Paso 1: Actualizar variables de entorno en el servidor

Conéctate al servidor y actualiza el archivo `.env`:

```bash
ssh root@159.223.152.210

cd /opt/portal-online

# Editar el archivo .env del backend
nano server/.env
```

Agrega estas líneas al archivo (si no existen):

```env
# PayPal Backend (LIVE/Production)
PAYPAL_CLIENT_ID=AUcINwUAJt2ck2OcZjrBxg3qKR4sDfyABZ7yWrjbDUAm-UCmbwvmepPE82DyNhlF2Gc4QjZEy9djA0e0
PAYPAL_CLIENT_SECRET=EGEQn1QYinzXiqFJ3u9C4JeqeKAHYFZnU2OkqXjuJ-sa9ZaIhdC0syFRKrQuEWxEA6cHp6ptyJkXIWAt
PAYPAL_MODE=live
```

Guardar y salir (Ctrl+O, Enter, Ctrl+X)

## Paso 2: Actualizar variables de entorno del frontend

Editar el archivo .env del frontend:

```bash
nano portal-web/.env
```

Actualiza las líneas de PayPal:

```env
# PayPal Frontend (LIVE/Production)
VITE_PAYPAL_CLIENT_ID=AUcINwUAJt2ck2OcZjrBxg3qKR4sDfyABZ7yWrjbDUAm-UCmbwvmepPE82DyNhlF2Gc4QjZEy9djA0e0
VITE_PAYPAL_CLIENT_SECRET=EGEQn1QYinzXiqFJ3u9C4JeqeKAHYFZnU2OkqXjuJ-sa9ZaIhdC0syFRKrQuEWxEA6cHp6ptyJkXIWAt
VITE_PAYPAL_ENVIRONMENT=live
```

Guardar y salir (Ctrl+O, Enter, Ctrl+X)

## Paso 3: Actualizar las variables en .env principal (raíz del proyecto)

```bash
cd /opt/portal-online
nano .env
```

Agrega/actualiza estas líneas:

```env
# PayPal Configuration (LIVE/Production)
PAYPAL_CLIENT_ID=AUcINwUAJt2ck2OcZjrBxg3qKR4sDfyABZ7yWrjbDUAm-UCmbwvmepPE82DyNhlF2Gc4QjZEy9djA0e0
PAYPAL_CLIENT_SECRET=EGEQn1QYinzXiqFJ3u9C4JeqeKAHYFZnU2OkqXjuJ-sa9ZaIhdC0syFRKrQuEWxEA6cHp6ptyJkXIWAt
PAYPAL_MODE=live

# Frontend PayPal
VITE_PAYPAL_CLIENT_ID=AUcINwUAJt2ck2OcZjrBxg3qKR4sDfyABZ7yWrjbDUAm-UCmbwvmepPE82DyNhlF2Gc4QjZEy9djA0e0
VITE_PAYPAL_CLIENT_SECRET=EGEQn1QYinzXiqFJ3u9C4JeqeKAHYFZnU2OkqXjuJ-sa9ZaIhdC0syFRKrQuEWxEA6cHp6ptyJkXIWAt
VITE_PAYPAL_ENVIRONMENT=live
```

## Paso 4: Reconstruir los containers

⚠️ **CRÍTICO**: Las variables `VITE_*` se compilan en tiempo de build, necesitas reconstruir el frontend

```bash
cd /opt/portal-online

# Detener todos los containers
docker-compose down

# Reconstruir ambos servicios (backend y frontend) con las nuevas variables
docker-compose build --no-cache

# Iniciar los servicios
docker-compose up -d

# Verificar que estén corriendo
docker-compose ps
docker-compose logs frontend | grep -i paypal
docker-compose logs backend | grep -i paypal
```

## Paso 5: Verificar la configuración

1. Abre la aplicación en el navegador
2. Ve a "Pagar Boleta"
3. Selecciona PayPal como método de pago
4. La URL debe ser `www.paypal.com` (NO `sandbox.paypal.com`)

## Verificar Client ID en uso

Para verificar qué Client ID está usando el frontend:

```bash
# Ver las variables compiladas en el frontend
docker-compose exec frontend sh -c "cat /usr/share/nginx/html/assets/index*.js | grep -o 'VITE_PAYPAL[^\"]*' | head -5"
```

## Notas Importantes

- ✅ Las credenciales están configuradas para **PRODUCCIÓN (LIVE)**
- ⚠️ Todos los pagos serán **REALES** y cobrarán dinero real
- 🔒 Nunca commitear archivos `.env` al repositorio Git
- 📝 Mantén un backup seguro de estas credenciales
- 🔄 Si cambias las credenciales, debes reconstruir el frontend

## Troubleshooting

Si sigue usando sandbox:
1. Verifica que las variables estén en el archivo `.env` correcto
2. Asegúrate de hacer `docker-compose down` antes de rebuildar
3. Usa `docker-compose build --no-cache` para forzar rebuild completo
4. Limpia la caché del navegador (Ctrl+Shift+Del)
5. Verifica con DevTools > Network que el Client ID sea el correcto
