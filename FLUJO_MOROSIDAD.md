# 📊 Flujo de Cálculo y Medición de Morosidad

## Resumen Ejecutivo

La morosidad en el sistema se calcula basándose en **boletas vencidas** (estado: `vencida`). El sistema tiene un flujo automatizado que detecta boletas vencidas, actualiza la deuda de los usuarios y notifica a los socios.

---

## 🔄 Flujo Completo de Morosidad

### 1. **Creación de Boleta** (`boletaController.ts`)

Cuando se crea una boleta nueva:

```typescript
// Archivo: server/src/controllers/boletaController.ts
const boleta = new Boleta({
  numeroBoleta,
  socioId,
  lecturaAnterior,
  lecturaActual,
  consumoM3,
  montoTotal: calculoTarifa.montoTotal,
  fechaVencimiento: new Date(fechaVencimiento),
  estado: 'pendiente',  // Estado inicial
  periodo
});
```

**Estado inicial:** `pendiente`
**Campo clave:** `fechaVencimiento` - fecha límite de pago

---

### 2. **Detección Automática de Vencimiento** (Cron Job)

#### Servicio: `OverdueBoletasService`
**Archivo:** `server/src/services/overdueBoletasService.ts`

**Frecuencia:** Cada hora (cron: `'0 * * * *'`)

**Proceso:**
```typescript
// 1. Se ejecuta cada hora
cron.schedule('0 * * * *', async () => {
  await checkAndNotifyOverdueBoletas();
});

// 2. Busca boletas pendientes vencidas
const overdueBoletas = await Boleta.find({
  estado: 'pendiente',           // Solo boletas pendientes
  fechaVencimiento: { $lt: now }, // Fecha vencimiento < fecha actual
  pagada: false                   // No han sido pagadas
});

// 3. Para cada boleta vencida:
for (const boleta of overdueBoletas) {
  // a) Cambia estado a 'vencida'
  boleta.estado = 'vencida';
  await boleta.save();  // ⚠️ Esto dispara el middleware pre-save
  
  // b) Crea notificación in-app
  await Notification.create({
    userId: user._id,
    tipo: 'boleta_vencida',
    titulo: 'Boleta vencida',
    mensaje: `Su boleta #${boleta.numeroBoleta} ha vencido...`
  });
  
  // c) Emite notificación Socket.IO en tiempo real
  io.to(`user_${user._id}`).emit('nueva-notificacion', {...});
}
```

**Inicio del servicio:**
```typescript
// Archivo: server/src/server.ts
OverdueBoletasService.start();
console.log('🔔 Overdue boletas notification service started');
```

---

### 3. **Actualización Automática de Deuda** (Middleware)

#### Middleware: `Boleta.pre('save')`
**Archivo:** `server/src/models/Boleta.ts`

Cuando una boleta cambia a estado `vencida`, el middleware actualiza automáticamente la deuda del usuario:

```typescript
BoletaSchema.pre('save', async function(next) {
  // Detecta cambio de estado
  if (this.isNew || this.isModified('estado')) {
    const wasVencida = originalEstado === 'vencida';
    const isNowVencida = this.estado === 'vencida';
    
    // IMPORTANTE: Solo suma a deuda si no fue previamente pagada
    if (this.pagada || originalPagada) {
      console.log('⚠️ Boleta ya pagada. No se suma a deuda.');
    }
    // Caso 1: Boleta se vuelve VENCIDA → AÑADIR a deuda
    else if (isNowVencida && wasNotVencida) {
      await User.findByIdAndUpdate(
        this.socioId,
        { $inc: { deudaTotal: this.montoTotal } },  // ➕ SUMA
        { new: true }
      );
    }
    // Caso 2: Boleta VENCIDA cambia a otro estado → RESTAR de deuda
    else if (wasVencida && !isNowVencida) {
      await User.findByIdAndUpdate(
        this.socioId,
        { $inc: { deudaTotal: -this.montoTotal } },  // ➖ RESTA
        { new: true }
      );
    }
  }
});
```

**Estados que afectan la deuda:**
- ✅ `pendiente → vencida` = **SUMA** a deuda
- ✅ `vencida → pagada` = **RESTA** de deuda
- ✅ `vencida → anulada` = **RESTA** de deuda
- ❌ `pendiente → pagada` = **NO afecta** deuda (nunca se volvió vencida)

---

### 4. **Cálculo de Morosidad** (Reportes)

La morosidad se calcula como un porcentaje del total de boletas:

#### Fórmula:
```
Morosidad (%) = (Boletas Vencidas / Total Boletas) × 100
```

#### Implementación en Reportes:
**Archivo:** `server/src/controllers/reportesController.ts`

```typescript
// Total de boletas en el período
const totalBoletas = await Boleta.countDocuments({
  fechaEmision: { $gte: fechaInicio, $lt: fechaFin }
});

// Boletas vencidas en el período
const boletasVencidas = await Boleta.countDocuments({
  fechaEmision: { $gte: fechaInicio, $lt: fechaFin },
  estado: 'vencida'
});

// Cálculo de morosidad
const morosidad = totalBoletas > 0 
  ? (boletasVencidas / totalBoletas) * 100 
  : 0;
```

#### Dashboard Stats:
**Archivo:** `server/src/controllers/adminController.ts`

```typescript
const [totalBoletas, boletasVencidas] = await Promise.all([
  Boleta.countDocuments(),
  Boleta.countDocuments({ estado: 'vencida' })
]);

const morosidad = totalBoletas > 0 
  ? (boletasVencidas / totalBoletas) * 100 
  : 0;
```

---

### 5. **Sincronización Manual de Deuda** (Opcional)

El sistema incluye una utilidad de sincronización para corregir inconsistencias:

**Archivo:** `server/src/utils/debtSync.ts`

```typescript
export async function syncUserDebt() {
  // 1. Recorre todos los socios
  const users = await User.find({ role: 'socio' });
  
  for (const user of users) {
    // 2. Calcula deuda real desde boletas vencidas
    const overdueBoletasAgg = await Boleta.aggregate([
      {
        $match: {
          socioId: user._id,
          estado: 'vencida'  // Solo boletas vencidas
        }
      },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: '$montoTotal' }
        }
      }
    ]);
    
    const actualDebt = overdueBoletasAgg[0]?.totalDebt || 0;
    
    // 3. Actualiza si hay diferencia
    if (user.deudaTotal !== actualDebt) {
      await User.findByIdAndUpdate(
        user._id,
        { deudaTotal: actualDebt }
      );
    }
  }
}
```

**Endpoint:** `POST /api/admin/sync-debt` (solo super_admin)

---

## 📈 Interpretación de Morosidad

### Niveles de Morosidad (Frontend)

**Archivo:** `portal-web/src/components/admin/SuperAdminDashboard.tsx`

```typescript
const getMorosidadStatus = () => {
  if (realtimeStats.morosidad < 5)  return 'Saludable';
  if (realtimeStats.morosidad < 15) return 'Moderado';
  return 'Crítico';
};
```

### Clasificación:
- 🟢 **0% - 5%**: Saludable / Bajo
- 🟡 **5% - 10%**: Moderado / Requiere atención
- 🔴 **> 10%**: Crítico / Alta morosidad

---

## 🗂️ Modelo de Datos: Boleta

**Archivo:** `server/src/models/Boleta.ts`

### Estados de una Boleta:
```typescript
estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada' | 'archivada'
```

### Campos Relevantes para Morosidad:
```typescript
{
  numeroBoleta: string;
  socioId: ObjectId;
  fechaEmision: Date;
  fechaVencimiento: Date;     // ⚠️ Fecha límite para pago
  montoTotal: number;
  estado: string;             // ⚠️ Estado actual
  pagada: boolean;            // ⚠️ Marca permanente de pago
  fechaPago?: Date;
  periodo: string;
}
```

### Reglas de Negocio:
1. ✅ Boleta `pendiente` + `fechaVencimiento < hoy` → se marca como `vencida` (cada hora)
2. ✅ Boleta `vencida` → se suma a `deudaTotal` del socio
3. ✅ Boleta `vencida → pagada` → se resta de `deudaTotal` del socio
4. ❌ Boleta `pagada` es **INMUTABLE** (no se puede cambiar estado)
5. ❌ Solo boletas con estado `vencida` cuentan para morosidad

---

## 📊 Reportes que Incluyen Morosidad

### 1. Reporte Financiero
**Endpoint:** `GET /api/reportes/financiero`

Incluye:
- Morosidad del período
- Boletas pendientes vs pagadas
- Eficiencia de cobranza

### 2. Dashboard Stats
**Endpoint:** `GET /api/admin/dashboard-stats`

Incluye:
- Morosidad global (%)
- Total socios
- Boletas pendientes/pagadas/vencidas
- Ingresos del mes

### 3. Reporte de Pagos
**Endpoint:** `GET /api/reportes/pagos`

Incluye:
- Eficiencia de cobranza
- Tiempo promedio de pago
- Boletas vencidas en el período

---

## 🔐 Protección contra Cambios Indebidos

### Middleware de Validación:
```typescript
// No permitir cambiar estado si la boleta ya fue pagada
BoletaSchema.pre('save', async function(next) {
  if (!this.isNew && this.isModified('estado') && originalPagada) {
    throw new Error(
      `No se puede cambiar el estado de la boleta ${this.numeroBoleta} ` +
      `porque ya fue pagada. Las boletas pagadas son inmutables.`
    );
  }
});
```

### Controller Validation:
```typescript
// boletaController.ts - updateBoletaStatus
if (boleta.pagada) {
  return res.status(403).json({
    success: false,
    message: 'No se puede cambiar el estado de boleta pagada.'
  });
}
```

---

## 🎯 Flujo Visual Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin crea boleta                                    │
│    - Estado: 'pendiente'                                │
│    - fechaVencimiento: DD/MM/YYYY                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Cron Job (cada hora)                                 │
│    - Compara fechaVencimiento < now                     │
│    - Boletas pendientes → 'vencida'                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Middleware pre-save (Boleta)                         │
│    - Detecta estado → 'vencida'                         │
│    - User.deudaTotal += boleta.montoTotal               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Notificación al socio                                │
│    - In-app notification (Notification model)           │
│    - Socket.IO real-time emit                           │
│    - (Opcional) SMS si está habilitado                  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Cálculo de morosidad                                 │
│    - % = (vencidas / total) × 100                       │
│    - Se muestra en dashboards y reportes                │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Socio paga boleta vencida                            │
│    - Estado: 'vencida' → 'pagada'                       │
│    - pagada: true (marca permanente)                    │
│    - User.deudaTotal -= boleta.montoTotal               │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Archivos Clave

| Archivo | Función | Responsabilidad |
|---------|---------|-----------------|
| `server/src/services/overdueBoletasService.ts` | Cron Job | Detectar boletas vencidas cada hora |
| `server/src/models/Boleta.ts` | Modelo + Middleware | Actualizar deuda automáticamente |
| `server/src/controllers/boletaController.ts` | Controlador | CRUD de boletas |
| `server/src/controllers/reportesController.ts` | Reportes | Calcular morosidad y estadísticas |
| `server/src/controllers/adminController.ts` | Dashboard | Stats generales incluyendo morosidad |
| `server/src/utils/debtSync.ts` | Sincronización | Corregir inconsistencias de deuda |
| `server/src/server.ts` | Inicialización | Arrancar servicio de cron |

---

## 🚨 Puntos Críticos

### ✅ Lo que funciona:
1. **Detección automática** cada hora de boletas vencidas
2. **Actualización automática** de deuda al cambiar estado
3. **Notificaciones en tiempo real** via Socket.IO
4. **Protección** contra modificación de boletas pagadas
5. **Sincronización manual** disponible para corregir inconsistencias
6. **Validación de archivado** - Solo boletas pagadas pueden archivarse ✨

### ⚠️ Consideraciones:
1. **Frecuencia del cron**: Cada hora (podría ser más frecuente si se requiere)
2. **Zona horaria**: El cron usa la hora del servidor
3. **Cálculo de morosidad**: Se basa en **total de boletas**, no en monto
4. **Deuda acumulada**: Solo cuenta boletas con estado `vencida`
5. **Boletas archivadas**: Solo boletas **PAGADAS** pueden archivarse (previene evasión de morosidad)
6. **Campo pagada**: Las boletas con `estado=pagada` DEBEN tener `pagada=true` para poder archivarse

### 🔒 Reglas de Archivado (NUEVO):

```typescript
// Solo boletas PAGADAS pueden archivarse
if (boleta.estado !== 'pagada') {
  return error('Solo se pueden archivar boletas pagadas');
}

// Verificación adicional del campo pagada
if (!boleta.pagada) {
  return error('Boleta no marcada como pagada');
}
```

**Beneficios:**
- ❌ Impide archivar boletas **vencidas** (evita evadir morosidad)
- ❌ Impide archivar boletas **pendientes** (deben completar su ciclo)
- ❌ Impide archivar boletas **anuladas** (innecesario)
- ✅ Solo permite archivar boletas **pagadas** (único caso válido)

---

## 📝 Ejemplo Práctico

### Escenario:
- Total boletas: 100
- Boletas pagadas: 70
- Boletas pendientes: 20
- Boletas vencidas: 10

### Cálculo:
```
Morosidad = (10 / 100) × 100 = 10%
```

### Interpretación:
🟡 **Moderado** - El 10% de las boletas están vencidas. Requiere atención.

---

## 🔍 Validación de Consistencia

Para verificar que la deuda está correctamente calculada:

```bash
# Endpoint (solo super_admin)
POST /api/admin/sync-debt

# Respuesta esperada:
{
  "success": true,
  "data": {
    "usersProcessed": 150,
    "usersWithChanges": 5,
    "totalDebtBefore": 1500000,
    "totalDebtAfter": 1480000,
    "errors": []
  }
}
```

---

## 💡 Recomendaciones

1. **Monitorear logs del cron job** cada hora para detectar boletas vencidas
2. **Ejecutar sync-debt periódicamente** (ej: 1 vez al mes) para validar consistencia
3. **Revisar dashboard de morosidad** diariamente
4. **Configurar alertas** cuando morosidad > 15%
5. **Análisis mensual** de tendencias de morosidad

---

## 📞 Contacto / Soporte

Para modificar el comportamiento del cálculo de morosidad o ajustar la frecuencia del cron job, revisar:
- `server/src/services/overdueBoletasService.ts` (frecuencia cron)
- `server/src/models/Boleta.ts` (lógica de middleware)
- `server/src/controllers/reportesController.ts` (fórmula de cálculo)
