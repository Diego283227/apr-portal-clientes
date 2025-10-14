const mongoose = require('mongoose');
require('dotenv').config();

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    // Verificar si ya existe un admin
    const existingAdmin = await db.collection('users').findOne({ email: 'admin@apr.cl' });

    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Updating user role to admin...');

      await db.collection('users').updateOne(
        { email: 'admin@apr.cl' },
        { $set: { role: 'admin' } }
      );

      console.log('✅ Admin role updated successfully');
    } else {
      // Crear nuevo usuario admin
      const adminUser = {
        nombres: 'Administrador',
        apellidos: 'Sistema',
        email: 'admin@apr.cl',
        password: '$2b$10$K8yJ9/9yKOEEZgW8uQGWKOFLPqgL4zF7QvVlHKFGHLJWPj8/7fPm2', // password123
        rut: '99.999.999-9',
        telefono: '+56912345678',
        direccion: 'Admin Office',
        role: 'admin',
        codigoSocio: 'ADMIN001',
        fechaIngreso: new Date(),
        isActive: true,
        saldoActual: 0,
        deudaTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('users').insertOne(adminUser);
      console.log('✅ Admin user created successfully');
      console.log('Email: admin@apr.cl');
      console.log('Password: password123');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUser();