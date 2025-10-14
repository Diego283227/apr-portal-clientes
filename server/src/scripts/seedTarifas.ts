import mongoose from 'mongoose';
import TarifaConfig from '../models/TarifaConfig';
import User from '../models/User';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web';

async function seedTarifas() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Check if admin user exists (we need it for the creadoPor field)
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ No se encontró usuario admin. Ejecute primero el seed de base de datos.');
      return;
    }

    // Check if there's already an active tarifa
    const existingActiveTarifa = await TarifaConfig.findOne({ activa: true });

    if (existingActiveTarifa) {
      console.log('✅ Ya existe una configuración de tarifa activa:', existingActiveTarifa.nombre);
      return;
    }

    // Create default tarifa configuration
    const defaultTarifa = new TarifaConfig({
      nombre: 'Tarifa Básica APR 2025',
      descripcion: 'Configuración inicial de tarifas para el sistema APR',
      activa: true,
      fechaVigencia: new Date('2025-02-01'), // Fecha futura para permitir edición
      fechaVencimiento: new Date('2025-12-31'),
      cargoFijo: {
        residencial: 12500,   // $12,500 CLP
        comercial: 25000,     // $25,000 CLP
        industrial: 50000,    // $50,000 CLP
        terceraEdad: 8000     // $8,000 CLP (descuento tercera edad)
      },
      escalones: [
        {
          desde: 0,
          hasta: 10,
          tarifaResidencial: 800,
          tarifaComercial: 1000,
          tarifaIndustrial: 1200,
          tarifaTerceraEdad: 600
        },
        {
          desde: 11,
          hasta: 20,
          tarifaResidencial: 1200,
          tarifaComercial: 1500,
          tarifaIndustrial: 1800,
          tarifaTerceraEdad: 900
        },
        {
          desde: 21,
          hasta: -1, // Ilimitado
          tarifaResidencial: 1800,
          tarifaComercial: 2200,
          tarifaIndustrial: 2500,
          tarifaTerceraEdad: 1400
        }
      ],
      temporadas: [],
      descuentos: [
        {
          tipo: 'porcentaje',
          nombre: 'Pago Anticipado',
          descripcion: 'Descuento por pago antes del vencimiento',
          valor: 5,
          condiciones: {
            pagoAnticipado: true
          },
          activo: true
        }
      ],
      recargos: {
        diasGracia: 10,
        porcentajeMora: 0.5,     // 0.5% diario
        porcentajeMaximo: 50,    // Máximo 50%
        cargoReconexion: 15000   // $15,000 CLP
      },
      configuracion: {
        redondeoDecimales: 0,
        aplicarIVA: false,
        porcentajeIVA: 19,
        subsidioEstatal: {
          activo: false,
          porcentajeDescuento: 20,
          consumoMaximo: 15
        }
      },
      creadoPor: admin._id
    });

    await defaultTarifa.save();
    console.log('✅ Configuración de tarifa por defecto creada exitosamente');
    console.log(`📋 Nombre: ${defaultTarifa.nombre}`);
    console.log(`🔄 Estado: ${defaultTarifa.activa ? 'Activa' : 'Inactiva'}`);
    console.log(`📅 Vigencia: ${defaultTarifa.fechaVigencia.toISOString().split('T')[0]}`);
    console.log(`💰 Cargo fijo residencial: $${defaultTarifa.cargoFijo.residencial.toLocaleString('es-CL')}`);
    console.log(`📊 Escalones definidos: ${defaultTarifa.escalones.length}`);

  } catch (error) {
    console.error('❌ Error creando configuración de tarifa:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedTarifas();
}

export default seedTarifas;