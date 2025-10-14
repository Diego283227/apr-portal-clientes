import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Egreso } from '../models';

// Cargar variables de entorno
config();

const egresosSeed = [
  {
    monto: 45000,
    fecha: new Date('2024-12-01'),
    descripcion: 'Mantenimiento sistema de bombeo principal',
    categoria: 'mantenimiento',
    tipo: 'gasto_variable',
    proveedor: 'Servicios Técnicos SPA',
    estado: 'pagado',
    metadata: {
      numeroFactura: 'F-001234',
      metodoPago: 'transferencia',
      observaciones: 'Reparación bomba centrífuga'
    }
  },
  {
    monto: 120000,
    fecha: new Date('2024-12-02'),
    descripcion: 'Compra de cloro para tratamiento de agua',
    categoria: 'suministros',
    tipo: 'gasto_fijo',
    proveedor: 'Química del Norte Ltda.',
    estado: 'pagado',
    metadata: {
      numeroFactura: 'F-005678',
      metodoPago: 'efectivo',
      observaciones: 'Stock mensual de cloro granulado'
    }
  },
  {
    monto: 75000,
    fecha: new Date('2024-12-03'),
    descripcion: 'Cuenta de electricidad instalaciones',
    categoria: 'servicios',
    tipo: 'gasto_fijo',
    proveedor: 'Enel Distribución Chile S.A.',
    estado: 'pagado',
    metadata: {
      numeroFactura: 'E-202412001',
      metodoPago: 'transferencia',
      observaciones: 'Consumo noviembre 2024'
    }
  },
  {
    monto: 35000,
    fecha: new Date('2024-12-04'),
    descripcion: 'Materiales de fontanería y accesorios',
    categoria: 'suministros',
    tipo: 'gasto_variable',
    proveedor: 'Ferretería Los Pinos',
    estado: 'pagado',
    metadata: {
      numeroFactura: 'F-009876',
      metodoPago: 'efectivo',
      observaciones: 'Tubos PVC, codos, llaves de paso'
    }
  },
  {
    monto: 90000,
    fecha: new Date('2024-12-05'),
    descripcion: 'Honorarios contador para auditoría',
    categoria: 'administracion',
    tipo: 'gasto_fijo',
    proveedor: 'Contabilidad y Servicios SpA',
    estado: 'aprobado',
    metadata: {
      numeroFactura: 'F-112233',
      metodoPago: 'transferencia',
      observaciones: 'Auditoría financiera trimestral'
    }
  },
  {
    monto: 65000,
    fecha: new Date('2024-12-06'),
    descripcion: 'Reparación vehículo institucional',
    categoria: 'mantenimiento',
    tipo: 'gasto_variable',
    proveedor: 'Taller Mecánico Rodriguez',
    estado: 'pagado',
    metadata: {
      numeroFactura: 'F-445566',
      metodoPago: 'efectivo',
      observaciones: 'Cambio aceite y filtros'
    }
  },
  {
    monto: 150000,
    fecha: new Date('2024-12-07'),
    descripcion: 'Instalación nueva válvula de control',
    categoria: 'operacion',
    tipo: 'inversion',
    proveedor: 'Hidráulica Industrial Norte',
    estado: 'aprobado',
    metadata: {
      numeroFactura: 'F-778899',
      metodoPago: 'transferencia',
      observaciones: 'Mejora en sistema de distribución'
    }
  },
  {
    monto: 25000,
    fecha: new Date('2024-12-08'),
    descripcion: 'Combustible para generador de emergencia',
    categoria: 'operacion',
    tipo: 'gasto_fijo',
    proveedor: 'Copec',
    estado: 'pagado',
    metadata: {
      numeroFactura: 'F-334455',
      metodoPago: 'efectivo',
      observaciones: '50 litros de petróleo'
    }
  },
  {
    monto: 180000,
    fecha: new Date('2024-12-09'),
    descripcion: 'Análisis bacteriológico y químico del agua',
    categoria: 'servicios',
    tipo: 'gasto_fijo',
    proveedor: 'Laboratorio de Aguas del Norte',
    estado: 'pendiente',
    metadata: {
      numeroFactura: 'F-667788',
      metodoPago: 'transferencia',
      observaciones: 'Análisis mensual obligatorio'
    }
  },
  {
    monto: 55000,
    fecha: new Date('2024-12-10'),
    descripcion: 'Seguro anual instalaciones APR',
    categoria: 'administracion',
    tipo: 'gasto_fijo',
    proveedor: 'Seguros del Estado',
    estado: 'aprobado',
    metadata: {
      numeroFactura: 'F-990011',
      metodoPago: 'transferencia',
      observaciones: 'Póliza contra incendios y terremotos'
    }
  }
];

async function seedEgresos() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    console.log('✅ Conectado a MongoDB');

    // Limpiar egresos existentes (opcional)
    await Egreso.deleteMany({});
    console.log('🗑️ Egresos existentes eliminados');

    // Insertar nuevos egresos
    const egresosCreados = await Egreso.insertMany(egresosSeed);
    console.log(`✅ ${egresosCreados.length} egresos creados exitosamente`);

    // Mostrar resumen
    const totalMonto = egresosSeed.reduce((sum, egreso) => sum + egreso.monto, 0);
    console.log(`💰 Monto total de egresos: $${totalMonto.toLocaleString('es-CL')}`);

    // Resumen por categoría
    const porCategoria = egresosSeed.reduce((acc, egreso) => {
      acc[egreso.categoria] = (acc[egreso.categoria] || 0) + egreso.monto;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Resumen por categoría:');
    Object.entries(porCategoria).forEach(([categoria, monto]) => {
      console.log(`  ${categoria}: $${monto.toLocaleString('es-CL')}`);
    });

    // Resumen por estado
    const porEstado = egresosSeed.reduce((acc, egreso) => {
      acc[egreso.estado] = (acc[egreso.estado] || 0) + egreso.monto;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Resumen por estado:');
    Object.entries(porEstado).forEach(([estado, monto]) => {
      console.log(`  ${estado}: $${monto.toLocaleString('es-CL')}`);
    });

    console.log('\n🎉 Seed de egresos completado exitosamente');

  } catch (error) {
    console.error('❌ Error al crear egresos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  seedEgresos();
}

export default seedEgresos;