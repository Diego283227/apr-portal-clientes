# 🚀 Guía de Pruebas PayPal - Portal APR

## 📋 Archivos de Prueba Creados

- `test-paypal.json` - JSONs completos para todas las pruebas
- `test-paypal-curl.sh` - Comandos curl listos para usar
- `swagger-paypal-examples.json` - Ejemplos específicos para Swagger UI

## 🔧 Configuración Inicial

### 1. Iniciar el Servidor
```bash
cd server
npm run dev
```
Servidor disponible en: `http://localhost:7779`

### 2. Acceder a Swagger UI
Abrir en navegador: `http://localhost:7779/api-docs`

### 3. Verificar Configuración PayPal
El servidor debe mostrar: `🟦 PayPal initialized in sandbox mode`

## 🔐 Autenticación

### Paso 1: Login
**Endpoint:** `POST /api/auth/login`

**Body:**
```json
{
  "rut": "12345678-9",
  "password": "tu_password",
  "tipoUsuario": "socio"
}
```

### Paso 2: Autorizar en Swagger
1. Copiar el `token` del response
2. Hacer clic en **Authorize** en Swagger UI
3. Escribir: `Bearer TU_TOKEN_AQUI`

## 💳 Endpoints de PayPal

### 1. Crear Pago PayPal
**Endpoint:** `POST /api/paypal/create-payment`

**Request Body:**
```json
{
  "boletaIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ]
}
```

**Response Esperado:**
```json
{
  "success": true,
  "data": {
    "paymentId": "PAY-1B56960729604235TKQQIYVY",
    "approvalUrl": "https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=EC-xxx",
    "totalAmount": 25000,
    "externalReference": "user_id-uuid-timestamp",
    "pagos": [...],
    "boletas": [...]
  },
  "message": "Pago de PayPal creado exitosamente"
}
```

### 2. Ejecutar Pago PayPal
**Endpoint:** `POST /api/paypal/execute-payment`

**Request Body:**
```json
{
  "paymentId": "PAY-1B56960729604235TKQQIYVY",
  "PayerID": "TESTBUYERID"
}
```

### 3. Consultar Estado del Pago
**Endpoint:** `GET /api/paypal/order-status/{orderId}`

**Path Parameter:** Usar el `paymentId` obtenido en el paso 1

## 🧪 Casos de Prueba

### ✅ Casos Exitosos

#### Pago de Una Boleta
```json
{
  "boletaIds": ["507f1f77bcf86cd799439011"]
}
```

#### Pago de Múltiples Boletas
```json
{
  "boletaIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

### ❌ Casos de Error

#### ID de Boleta Inválido
```json
{
  "boletaIds": ["invalid_id"]
}
```
**Error Esperado:** `ID de boleta inválido: invalid_id`

#### Array Vacío
```json
{
  "boletaIds": []
}
```
**Error Esperado:** `Debe seleccionar al menos una boleta para pagar`

#### Sin PaymentID
```json
{
  "PayerID": "TESTBUYERID"
}
```
**Error Esperado:** `Payment ID y Payer ID son requeridos`

## 🗄️ Obtener IDs Reales de MongoDB

### MongoDB Compass
```javascript
// Obtener boletas pendientes
db.boletas.find(
  {estado: {$in: ["pendiente", "vencida"]}},
  {_id: 1, numeroBoleta: 1, montoTotal: 1}
).limit(5)

// Obtener boletas de un usuario específico
db.boletas.find(
  {
    socioId: ObjectId("USER_ID_HERE"),
    estado: "pendiente"
  },
  {_id: 1}
)
```

### MongoDB Shell
```bash
mongo portal-web
db.boletas.find({estado: "pendiente"}, {_id: 1}).limit(3)
```

## 🔄 Flujo Completo de Prueba

1. **Login** → Obtener JWT token
2. **Autorizar** en Swagger UI
3. **Crear Pago** → Obtener `paymentId` y `approvalUrl`
4. **Simular Aprobación** (en ambiente real: usuario va a `approvalUrl`)
5. **Ejecutar Pago** → Usar `paymentId` + `PayerID`
6. **Verificar Estado** → Confirmar estado final

## 🛠️ Comandos Curl Rápidos

### Login
```bash
curl -X POST http://localhost:7779/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"rut": "12345678-9", "password": "password", "tipoUsuario": "socio"}'
```

### Crear Pago
```bash
curl -X POST http://localhost:7779/api/paypal/create-payment \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"boletaIds": ["507f1f77bcf86cd799439011"]}'
```

### Ejecutar Pago
```bash
curl -X POST http://localhost:7779/api/paypal/execute-payment \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"paymentId": "PAY-XXX", "PayerID": "TESTBUYERID"}'
```

## 🚨 Troubleshooting

### Error: "PayPal credentials are required"
- Verificar que `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` estén en `.env`
- Para pruebas, usar credenciales de PayPal Sandbox

### Error: "Usuario no encontrado"
- Verificar que el usuario existe en la base de datos
- Verificar que el RUT y password son correctos

### Error: "Boleta no encontrada"
- Verificar que los IDs de boletas son ObjectIds válidos de 24 caracteres
- Verificar que las boletas pertenecen al usuario logueado
- Verificar que las boletas están en estado `pendiente` o `vencida`

### Error: 401 Unauthorized
- Verificar que el token JWT es válido
- Verificar que se está usando el formato: `Bearer TOKEN`
- El token podría haber expirado, hacer login nuevamente

## 📊 Estados de Pago

| Estado PayPal | Estado Interno | Descripción |
|---------------|----------------|-------------|
| `created` | `pendiente` | Pago creado, esperando aprobación |
| `approved` | `completado` | Pago aprobado y procesado |
| `failed` | `fallido` | Pago falló |
| `cancelled` | `fallido` | Pago cancelado por usuario |

## 🔗 Enlaces Útiles

- **Swagger UI:** http://localhost:7779/api-docs
- **Health Check:** http://localhost:7779/health
- **Swagger JSON:** http://localhost:7779/api-docs.json
- **PayPal Sandbox:** https://developer.paypal.com/