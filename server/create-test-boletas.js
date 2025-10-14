const mongoose = require('mongoose');
require('dotenv').config();

async function createTestBoletas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    // Buscar el usuario de prueba
    const testUser = await db.collection('users').findOne({ email: 'juan.perez@test.cl' });
    if (!testUser) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    console.log('✅ Found test user:', testUser._id);

    // Crear boletas para este usuario
    const boletas = [
      {
        numeroBoleta: '202509005',
        socioId: testUser._id,
        fechaEmision: new Date('2025-09-13'),
        fechaVencimiento: new Date('2025-10-13'),
        consumoM3: 25,
        montoTotal: 75000,
        estado: 'pendiente',
        detalle: {
          consumoAnterior: 10,
          consumoActual: 35,
          tarifaM3: 2500,
          cargoFijo: 5000,
          otrosCargos: 0,
          descuentos: 0
        },
        lecturaAnterior: 10,
        lecturaActual: 35,
        periodo: '2025-09',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        numeroBoleta: '202509006',
        socioId: testUser._id,
        fechaEmision: new Date('2025-09-13'),
        fechaVencimiento: new Date('2025-10-13'),
        consumoM3: 30,
        montoTotal: 75000,
        estado: 'pendiente',
        detalle: {
          consumoAnterior: 35,
          consumoActual: 65,
          tarifaM3: 2200,
          cargoFijo: 5000,
          otrosCargos: 0,
          descuentos: 0
        },
        lecturaAnterior: 35,
        lecturaActual: 65,
        periodo: '2025-10',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('boletas').insertMany(boletas);
    console.log('✅ Test boletas created successfully');
    console.log('Boletas:', boletas.map(b => ({ numero: b.numeroBoleta, monto: b.montoTotal })));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestBoletas();