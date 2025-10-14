import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SmartMeter from '../models/SmartMeter';
import User from '../models/User';
import { RealisticDataService } from '../services/RealisticDataService';
import connectDB from '../config/database';

dotenv.config();

async function seedSmartMeters() {
  try {
    await connectDB();
    console.log('🔌 Conectado a MongoDB');

    // Buscar algunos usuarios existentes
    const users = await User.find({ role: 'socio' }).limit(5);

    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios. Crea algunos usuarios primero.');
      return;
    }

    console.log(`👥 Encontrados ${users.length} usuarios`);

    // Limpiar medidores existentes (opcional)
    const existingMeters = await SmartMeter.countDocuments();
    if (existingMeters > 0) {
      console.log(`🗑️ Eliminando ${existingMeters} medidores existentes...`);
      await SmartMeter.deleteMany({});
    }

    // Medidores de ejemplo
    const sampleMeters = [
      // Residencial
      {
        meterId: 'SM-001',
        socioId: users[0]._id,
        serialNumber: 'WM2024001',
        meterModel: 'AquaFlow Pro 2000',
        manufacturer: 'HydroTech Solutions',
        location: {
          lat: -33.4489,
          lng: -70.6693,
          description: 'Casa Principal - Las Condes'
        },
        status: 'active',
        communicationType: 'lorawan',
        configuration: {
          readingIntervalMinutes: 15,
          transmissionIntervalMinutes: 60,
          leakThresholdLPM: 1.5,
          highConsumptionThresholdLD: 400,
          lowBatteryThreshold: 20,
          tamperSensitivity: 'medium',
          dataRetentionDays: 365
        }
      },
      {
        meterId: 'SM-002',
        socioId: users[1] ? users[1]._id : users[0]._id,
        serialNumber: 'WM2024002',
        meterModel: 'SmartFlow Residential',
        manufacturer: 'AquaTech Chile',
        location: {
          lat: -33.4378,
          lng: -70.6504,
          description: 'Departamento - Providencia'
        },
        status: 'active',
        communicationType: 'wifi',
        configuration: {
          readingIntervalMinutes: 15,
          transmissionIntervalMinutes: 30,
          leakThresholdLPM: 1.0,
          highConsumptionThresholdLD: 250,
          lowBatteryThreshold: 25,
          tamperSensitivity: 'high',
          dataRetentionDays: 730
        }
      },
      // Comercial
      {
        meterId: 'SM-COM-001',
        socioId: users[2] ? users[2]._id : users[0]._id,
        serialNumber: 'WM2024003',
        meterModel: 'CommercialFlow 3000',
        manufacturer: 'Industrial Water Systems',
        location: {
          lat: -33.4372,
          lng: -70.6506,
          description: 'Restaurante El Buen Sabor'
        },
        status: 'active',
        communicationType: 'cellular',
        configuration: {
          readingIntervalMinutes: 10,
          transmissionIntervalMinutes: 30,
          leakThresholdLPM: 3.0,
          highConsumptionThresholdLD: 800,
          lowBatteryThreshold: 15,
          tamperSensitivity: 'high',
          dataRetentionDays: 1095
        }
      },
      // Rural
      {
        meterId: 'SM-RURAL-001',
        socioId: users[3] ? users[3]._id : users[0]._id,
        serialNumber: 'WM2024004',
        meterModel: 'RuralTech Field Monitor',
        manufacturer: 'AgriFlow Systems',
        location: {
          lat: -33.5731,
          lng: -70.6208,
          description: 'Predio Agrícola - Melipilla'
        },
        status: 'active',
        communicationType: 'lorawan',
        configuration: {
          readingIntervalMinutes: 30,
          transmissionIntervalMinutes: 120,
          leakThresholdLPM: 2.0,
          highConsumptionThresholdLD: 600,
          lowBatteryThreshold: 10,
          tamperSensitivity: 'low',
          dataRetentionDays: 730
        }
      },
      // Medidor en mantenimiento
      {
        meterId: 'SM-MAINT-001',
        socioId: users[4] ? users[4]._id : users[0]._id,
        serialNumber: 'WM2024005',
        meterModel: 'AquaFlow Pro 2000',
        manufacturer: 'HydroTech Solutions',
        location: {
          lat: -33.4691,
          lng: -70.6420,
          description: 'Casa Familiar - Ñuñoa (En Mantenimiento)'
        },
        status: 'maintenance',
        communicationType: 'wifi',
        configuration: {
          readingIntervalMinutes: 60,
          transmissionIntervalMinutes: 120,
          leakThresholdLPM: 1.2,
          highConsumptionThresholdLD: 350,
          lowBatteryThreshold: 20,
          tamperSensitivity: 'medium',
          dataRetentionDays: 365
        }
      }
    ];

    console.log('📊 Creando medidores de ejemplo...');
    const createdMeters = await SmartMeter.insertMany(sampleMeters);

    console.log(`✅ Creados ${createdMeters.length} medidores inteligentes:`);
    createdMeters.forEach(meter => {
      console.log(`  • ${meter.meterId} - ${meter.location.description} (${meter.communicationType})`);
    });

    // Generar algunos datos históricos para los medidores activos
    console.log('\n🎲 Generando datos históricos realistas...');

    const dataService = new RealisticDataService();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Última semana
    const endDate = new Date();

    const configs = [
      { profileType: 'residential', intensity: 'medium' },
      { profileType: 'residential', intensity: 'low' },
      { profileType: 'commercial', intensity: 'high' },
      { profileType: 'rural', intensity: 'medium' }
    ];

    let totalReadingsGenerated = 0;

    for (let i = 0; i < createdMeters.length - 1; i++) { // Excluir el último (mantenimiento)
      const meter = createdMeters[i];
      const config = configs[i] || configs[0];

      console.log(`  Generando datos para ${meter.meterId} (${config.profileType}/${config.intensity})...`);

      const readings = await dataService.generateRealisticReadings(
        meter.meterId,
        startDate,
        endDate,
        {
          profileType: config.profileType as any,
          intensity: config.intensity as any,
          seasonality: true,
          includeAnomalies: Math.random() < 0.3 // 30% probabilidad de anomalías
        }
      );

      await dataService.insertGeneratedReadings(readings);
      totalReadingsGenerated += readings.length;

      console.log(`    ✓ ${readings.length} lecturas generadas`);
    }

    console.log(`\n🎉 Proceso completado exitosamente!`);
    console.log(`📊 Resumen:`);
    console.log(`  • ${createdMeters.length} medidores creados`);
    console.log(`  • ${totalReadingsGenerated} lecturas históricas generadas`);
    console.log(`  • Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

    console.log(`\n💡 Próximos pasos:`);
    console.log(`  1. Inicia el servidor: npm run dev`);
    console.log(`  2. Ve a la sección "Medidores Inteligentes"`);
    console.log(`  3. Explora el Dashboard con datos reales`);
    console.log(`  4. Prueba la "Gestión de Fuentes de Datos"`);

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

// Ejecutar el script
if (require.main === module) {
  seedSmartMeters().catch(console.error);
}

export default seedSmartMeters;