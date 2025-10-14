// Script para poblar la base de datos con datos de medidores inteligentes de prueba
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Cargar variables de entorno
dotenv.config();

// Función de conexión a la base de datos
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-apr';

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Esquemas simplificados para el seeding
const userSchema = new mongoose.Schema({
  email: String,
  nombres: String,
  apellidos: String,
  role: String,
  codigoSocio: String
});

const User = mongoose.model('User', userSchema);

// Esquemas de medidores inteligentes
const smartMeterSchema = new mongoose.Schema({
  meterId: { type: String, required: true, unique: true },
  socioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serialNumber: { type: String, required: true, unique: true },
  meterModel: { type: String, required: true },
  manufacturer: { type: String, required: true },
  installationDate: { type: Date, default: Date.now },
  location: {
    lat: Number,
    lng: Number,
    description: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active'
  },
  communicationType: {
    type: String,
    enum: ['lorawan', 'nbiot', 'wifi', 'zigbee', 'cellular'],
    required: true
  },
  lastReadingDate: Date,
  calibrationFactor: { type: Number, default: 1.0 },
  firmwareVersion: String,
  configuration: {
    readingIntervalMinutes: { type: Number, default: 60 },
    transmissionIntervalMinutes: { type: Number, default: 60 },
    leakThresholdLPM: { type: Number, default: 1.0 },
    highConsumptionThresholdLD: { type: Number, default: 500 },
    lowBatteryThreshold: { type: Number, default: 20 },
    tamperSensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    dataRetentionDays: { type: Number, default: 1095 }
  }
}, { timestamps: true });

const meterReadingSchema = new mongoose.Schema({
  meterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartMeter', required: true },
  timestamp: { type: Date, required: true },
  currentReading: { type: Number, required: true },
  previousReading: { type: Number },
  consumption: { type: Number },
  flowRate: { type: Number },
  temperature: { type: Number },
  pressure: { type: Number },
  batteryLevel: { type: Number },
  signalStrength: { type: Number },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  }
}, {
  timestamps: true,
  timeseries: {
    timeField: 'timestamp',
    metaField: 'meterId',
    granularity: 'minutes'
  }
});

const dailyConsumptionSchema = new mongoose.Schema({
  meterId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartMeter', required: true },
  date: { type: Date, required: true },
  totalConsumption: { type: Number, required: true },
  averageFlowRate: { type: Number },
  peakFlowRate: { type: Number },
  minFlowRate: { type: Number },
  readingsCount: { type: Number },
  qualityScore: { type: Number },
  anomaliesDetected: [{ type: String }]
}, { timestamps: true });

// Crear modelos
const SmartMeter = mongoose.model('SmartMeter', smartMeterSchema);
const MeterReading = mongoose.model('MeterReading', meterReadingSchema);
const DailyConsumption = mongoose.model('DailyConsumption', dailyConsumptionSchema);

// Función para generar lecturas históricas realistas
const generateMeterReadings = (meterId, startDate, endDate) => {
  const readings = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let currentReading = 1500; // Lectura inicial en litros
  let currentTime = new Date(start);

  while (currentTime <= end) {
    // Simular patrones de consumo realistas
    const hour = currentTime.getHours();
    let consumptionRate = 0;

    // Patrones de consumo por hora
    if (hour >= 6 && hour <= 8) {
      consumptionRate = 15 + Math.random() * 20; // Mañana: 15-35 L/h
    } else if (hour >= 12 && hour <= 14) {
      consumptionRate = 10 + Math.random() * 15; // Almuerzo: 10-25 L/h
    } else if (hour >= 18 && hour <= 22) {
      consumptionRate = 12 + Math.random() * 18; // Noche: 12-30 L/h
    } else {
      consumptionRate = 2 + Math.random() * 8; // Resto del día: 2-10 L/h
    }

    // Añadir variación aleatoria
    consumptionRate = consumptionRate * (0.8 + Math.random() * 0.4);

    const previousReading = currentReading;
    currentReading += consumptionRate;

    readings.push({
      meterId,
      timestamp: new Date(currentTime),
      currentReading,
      previousReading,
      consumption: consumptionRate,
      flowRate: Math.max(0.1, consumptionRate + (Math.random() - 0.5) * 2),
      temperature: 15 + Math.random() * 10,
      pressure: 2.0 + Math.random() * 0.5,
      batteryLevel: Math.floor(80 + Math.random() * 20),
      signalStrength: Math.floor(75 + Math.random() * 25),
      quality: ['excellent', 'good', 'good', 'good'][Math.floor(Math.random() * 4)]
    });

    // Incrementar una hora
    currentTime.setHours(currentTime.getHours() + 1);
  }

  return readings;
};

// Función para generar consumo diario
const generateDailyConsumption = (meterId, readings) => {
  const dailyData = {};

  readings.forEach(reading => {
    const dateKey = reading.timestamp.toISOString().split('T')[0];

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        meterId,
        date: new Date(dateKey),
        totalConsumption: 0,
        flowRates: [],
        readingsCount: 0
      };
    }

    dailyData[dateKey].totalConsumption += reading.consumption;
    dailyData[dateKey].flowRates.push(reading.flowRate);
    dailyData[dateKey].readingsCount++;
  });

  return Object.values(dailyData).map(day => ({
    ...day,
    averageFlowRate: day.flowRates.reduce((a, b) => a + b, 0) / day.flowRates.length,
    peakFlowRate: Math.max(...day.flowRates),
    minFlowRate: Math.min(...day.flowRates),
    qualityScore: 85 + Math.random() * 10,
    anomaliesDetected: []
  }));
};

// Función principal de seeding
const seedSmartMeters = async () => {
  try {
    console.log('🌱 Starting smart meter seeding...');

    // Limpiar colecciones existentes
    await SmartMeter.deleteMany({});
    await MeterReading.deleteMany({});
    await DailyConsumption.deleteMany({});
    console.log('🧹 Cleared existing smart meter data');

    // Obtener algunos usuarios existentes para asignar medidores
    const users = await User.find({ role: 'socio' }).limit(10);

    if (users.length === 0) {
      console.error('❌ No users found. Please seed users first.');
      return;
    }

    console.log(`👥 Found ${users.length} users for meter assignment`);

    // Crear medidores inteligentes de ejemplo
    const sampleMeters = [];

    users.forEach((user, index) => {
      sampleMeters.push({
        meterId: `SM-${String(index + 1).padStart(4, '0')}`,
        socioId: user._id,
        serialNumber: `SN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        meterModel: ['AquaSmart Pro', 'FlowMaster 3000', 'HydroSense Elite'][index % 3],
        manufacturer: ['AquaTech', 'FlowCorp', 'HydroInnovations'][index % 3],
        installationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        location: {
          lat: -36.8 + Math.random() * 0.1,
          lng: -73.0 + Math.random() * 0.1,
          description: `Medidor principal - ${user.nombres} ${user.apellidos}`
        },
        status: 'active',
        communicationType: ['lorawan', 'nbiot', 'wifi'][index % 3],
        lastReadingDate: new Date(),
        calibrationFactor: 0.95 + Math.random() * 0.1,
        firmwareVersion: `v2.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}`,
        configuration: {
          readingIntervalMinutes: 15,
          transmissionIntervalMinutes: 60,
          leakThresholdLPM: 1.0 + Math.random() * 0.5,
          highConsumptionThresholdLD: 400 + Math.random() * 200,
          lowBatteryThreshold: 15 + Math.random() * 10,
          tamperSensitivity: ['low', 'medium', 'high'][index % 3],
          dataRetentionDays: 1095
        }
      });
    });

    // Insertar medidores
    const createdMeters = await SmartMeter.insertMany(sampleMeters);
    console.log(`📊 Created ${createdMeters.length} smart meters`);

    // Generar lecturas históricas (último mes)
    console.log('📈 Generating historical readings...');

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const meter of createdMeters) {
      console.log(`  📊 Generating readings for meter ${meter.meterId}...`);

      // Generar lecturas
      const readings = generateMeterReadings(meter._id, oneMonthAgo, now);
      await MeterReading.insertMany(readings);

      // Generar consumo diario
      const dailyConsumption = generateDailyConsumption(meter._id, readings);
      await DailyConsumption.insertMany(dailyConsumption);

      console.log(`    ✅ Created ${readings.length} readings and ${dailyConsumption.length} daily consumption records`);
    }

    console.log('🎉 Smart meter seeding completed successfully!');

    // Mostrar estadísticas
    const totalMeters = await SmartMeter.countDocuments();
    const totalReadings = await MeterReading.countDocuments();
    const totalDailyRecords = await DailyConsumption.countDocuments();

    console.log('\n📈 Seeding Summary:');
    console.log(`  • Smart Meters: ${totalMeters}`);
    console.log(`  • Meter Readings: ${totalReadings}`);
    console.log(`  • Daily Consumption Records: ${totalDailyRecords}`);

    // Mostrar algunos datos de ejemplo
    console.log('\n🔍 Sample Data:');
    const sampleMeter = await SmartMeter.findOne().populate('socioId', 'nombres apellidos');
    const recentReading = await MeterReading.findOne({ meterId: sampleMeter._id }).sort({ timestamp: -1 });

    console.log(`  • Sample Meter: ${sampleMeter.meterId} (${sampleMeter.socioId.nombres} ${sampleMeter.socioId.apellidos})`);
    console.log(`  • Latest Reading: ${recentReading.currentReading}L at ${recentReading.timestamp}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
};

// Ejecutar el seeding
const runSeeding = async () => {
  await connectDB();
  await seedSmartMeters();
  await mongoose.connection.close();
  console.log('👋 Database connection closed');
  process.exit(0);
};

runSeeding().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});