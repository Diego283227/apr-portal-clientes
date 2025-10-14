const mongoose = require('mongoose');
require('dotenv').config();

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    // Crear nuevo usuario de prueba
    const testUser = {
      nombres: 'Juan',
      apellidos: 'Pérez',
      email: 'juan.perez@test.cl',
      password: '$2b$10$K8yJ9/9yKOEEZgW8uQGWKOFLPqgL4zF7QvVlHKFGHLJWPj8/7fPm2', // password123
      rut: '18.555.333-2',
      telefono: '+56987654321',
      direccion: 'Calle Test 456',
      role: 'socio',
      codigoSocio: 'SOC00006',
      fechaIngreso: new Date(),
      isActive: true,
      saldoActual: 0,
      deudaTotal: 150000, // Tiene deuda
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(testUser);
    console.log('✅ Test user created successfully');
    console.log('User ID:', result.insertedId);
    console.log('Email: juan.perez@test.cl');
    console.log('Password: password123');

    // Crear boletas para este usuario
    const boletas = [
      {
        numeroBoleta: '202509005',
        socioId: result.insertedId,
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
        socioId: result.insertedId,
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

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();