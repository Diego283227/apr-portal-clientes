# Integración de Flow como Método de Pago

## 📋 Resumen

Se ha integrado **Flow** como método de pago adicional en el Portal APR, junto con PayPal y MercadoPago.

## 🔑 Credenciales Configuradas

### Flow Producción (ACTIVO)

- **API Key:** `cdf395dc8fd468fe62be2eb0e597a26ce8e43da1`
- **Secret Key:** `1F780270-6615-40CA-B28F-3C0L70B562DC`
- **Ambiente:** `production` ✅
- **API URL:** `https://www.flow.cl/api`

> ⚠️ **Importante:** Flow está configurado en modo producción. Los pagos son reales.

## 🏗️ Arquitectura

### Backend

1. **Config:** `server/src/config/flow.ts`

   - Cliente Flow con generación de firma HMAC SHA-256
   - Métodos: `createPayment()`, `getPaymentStatus()`, `verifySignature()`

2. **Controller:** `server/src/controllers/flowController.ts`

   - `createFlowPayment` - Crea el pago en Flow
   - `handleFlowWebhook` - Procesa confirmaciones de pago
   - `getFlowPaymentStatus` - Consulta estado del pago

3. **Routes:** `server/src/routes/flow.ts`
   - `POST /api/flow/create-payment` (autenticado)
   - `POST /api/flow/webhook` (público)
   - `GET /api/flow/payment-status/:token` (autenticado)

### Frontend

1. **UI:** Botón "Flow" agregado en `PaymentInterface.tsx`

   - Recomendado como método principal
   - Icono de tarjeta de crédito
   - Features: Tarjetas, transferencia, rápido y seguro

2. **Service:** `portal-web/src/services/paymentService.ts`

   - Método `createFlowPayment()` agregado

3. **App:** `portal-web/src/App.tsx`
   - Handler para redirigir a Flow al seleccionar el método

## 🔄 Flujo de Pago

### 1. Usuario selecciona boletas y método "Flow"

```typescript
// Frontend solicita crear pago
POST / api / flow / create - payment;
Body: {
  boletaIds: ["id1", "id2"];
}
```

### 2. Backend crea pago en Flow

```typescript
// Se genera:
- commerceOrder: APR-{timestamp}-{uuid}
- signature (HMAC SHA-256)
- Se guarda Pago con estado "pendiente"

// Flow responde:
{ url: "https://...", token: "xxx" }
```

### 3. Usuario redirigido a Flow

```javascript
window.location.href = data.paymentUrl;
```

### 4. Usuario paga en Flow

- Ingresa tarjeta o selecciona banco
- Flow procesa el pago

### 5. Flow confirma vía webhook

```typescript
POST /api/flow/webhook
Body: { token: "xxx" }

// Backend:
- Consulta estado en Flow API
- Si status === 2 (confirmado):
  - Actualiza Pago a "completado"
  - Marca Boletas como "pagada"
  - Crea registro de Ingreso
  - Envía email con comprobantes PDF
```

### 6. Usuario redirigido a success

```
https://facilapr.cl/#/payment-success
```

## 📊 Estados de Flow

| Código | Estado    | Acción Backend     |
| ------ | --------- | ------------------ |
| 1      | Pendiente | Mantener pendiente |
| 2      | Pagado    | Marcar completado  |
| 3      | Rechazado | Marcar rechazado   |
| 4      | Anulado   | Marcar cancelado   |

## 🔐 Seguridad

### Firma HMAC

Todas las requests a Flow incluyen firma:

```typescript
// Ordenar parámetros alfabéticamente
const paramsString = Object.keys(params)
  .sort()
  .map((key) => `${key}${params[key]}`)
  .join("");

// Generar HMAC SHA-256
const signature = crypto
  .createHmac("sha256", SECRET_KEY)
  .update(paramsString)
  .digest("hex");
```

### Validación de Webhook

El webhook verifica:

1. Token válido
2. Pago existe en BD
3. Estado Flow es válido
4. Solo actualiza si estado cambió

## 🧪 Modo de Operación

### ✅ Producción (ACTIVO)

Flow está configurado en modo **producción**. Los pagos procesados son **reales** y se cobran a los usuarios.

- Usa tarjetas reales
- Transferencias bancarias reales
- Comisiones de Flow aplican
- Pagos se acreditan en cuenta real

> ⚠️ **Atención:** Verificar cada transacción antes de confirmar pagos.

## 📝 Logs

Los logs incluyen:

```
✅ Flow client initialized in production mode
✅ Flow payment created: { paymentId, token, amount, boletas }
🔔 Flow webhook received: { token }
📊 Flow payment status: { status, flowOrder, ... }
✅ Payment completed - N boletas updated
✅ Payment confirmation email sent to: user@example.com
```

## 🚀 Despliegue

### Variables de Entorno

Asegúrate de tener en `.env`:

```env
FLOW_API_KEY=cdf395dc8fd468fe62be2eb0e597a26ce8e43da1
FLOW_SECRET_KEY=1F780270-6615-40CA-B28F-3C0L70B562DC
FLOW_ENVIRONMENT=production
FLOW_API_URL=https://www.flow.cl/api
```

### Webhook URL

Configurar en Flow Dashboard (Producción):

- **URL:** `https://facilapr.cl/api/flow/webhook`

### URLs de Retorno

- **Success:** `https://facilapr.cl/#/payment-success`
- **Return:** `https://facilapr.cl/#/payment-success`

## 🐛 Troubleshooting

### Error: "Flow API error: 401"

- Verificar API Key y Secret Key
- Verificar firma HMAC

### Error: "Payment not found"

- El token no coincide con ningún pago en BD
- Verificar que el webhook recibió el token correcto

### Pago no se marca como completado

- Revisar logs del webhook
- Verificar que Flow status === 2
- Verificar que boletaIds existen en metadata

## 📚 Documentación Flow

- API Docs: https://www.flow.cl/docs/api.html
- Dashboard Producción: https://www.flow.cl/
- Soporte: soporte@flow.cl

## ✅ Checklist de Implementación

- [x] Configurar credenciales en `.env`
- [x] Crear cliente Flow con firma HMAC
- [x] Implementar controlador con create/webhook/status
- [x] Registrar rutas en servidor
- [x] Agregar Flow a UI de métodos de pago
- [x] Implementar handler en frontend
- [x] Agregar servicio de Flow
- [x] Documentar integración
- [x] Configurar en modo producción
- [ ] Configurar webhook URL en Flow Dashboard producción
- [ ] Probar pago real completo
- [ ] Verificar emails de confirmación
- [ ] Monitorear transacciones en dashboard

## 🎯 Configuración Final Requerida

1. **Acceder a Flow Dashboard producción:** https://www.flow.cl/
2. **Configurar webhook URL:** `https://facilapr.cl/api/flow/webhook`
3. **Configurar URL de retorno:** `https://facilapr.cl/#/payment-success`
4. **Probar pago real** con tarjeta personal (monto mínimo)
5. **Verificar** que el webhook se ejecute correctamente
6. **Validar** que se envíen emails de confirmación
7. **Monitorear** pagos en Flow Dashboard
