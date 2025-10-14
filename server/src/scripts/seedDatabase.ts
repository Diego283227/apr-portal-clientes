import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Boleta from '../models/Boleta';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Clear existing data (optional - uncomment if you want to reset)
    // await User.deleteMany({});
    // await Boleta.deleteMany({});
    // console.log('🗑️ Cleared existing data');

    // Check if admin user exists
    const existingAdmin = await User.findOne({ email: 'admin@portal.com' });
    let adminId;
    
    if (!existingAdmin) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const admin = new User({
        rut: '11.111.111-1',
        nombres: 'Admin',
        apellidos: 'Sistema',
        email: 'admin@portal.com',
        password: hashedPassword,
        role: 'admin',
        telefono: '+56912345678',
        direccion: 'Oficina Central',
        activo: true
      });
      await admin.save();
      adminId = admin._id;
      console.log('👤 Admin user created:', admin.email);
    } else {
      adminId = existingAdmin._id;
      console.log('👤 Admin user already exists:', existingAdmin.email);
    }

    // Check if socio user exists
    const existingSocio = await User.findOne({ email: 'socio@portal.com' });
    let socioId;
    
    if (!existingSocio) {
      // Create socio user
      const hashedPassword = await bcrypt.hash('socio123', 12);
      const socio = new User({
        rut: '12.345.678-9',
        nombres: 'Juan Carlos',
        apellidos: 'Pérez González',
        email: 'socio@portal.com',
        password: hashedPassword,
        role: 'socio',
        telefono: '+56987654321',
        direccion: 'Av. Principal 123',
        codigoSocio: 'SOC001',
        fechaIngreso: new Date('2023-01-15'),
        saldoActual: 0,
        deudaTotal: 74500, // Sum of all pending boletas
        activo: true
      });
      await socio.save();
      socioId = socio._id;
      console.log('👤 Socio user created:', socio.email);
    } else {
      socioId = existingSocio._id;
      console.log('👤 Socio user already exists:', existingSocio.email);
    }

    // Check if boletas exist for this socio
    const existingBoletas = await Boleta.find({ socioId });
    
    if (existingBoletas.length === 0) {
      // Create sample boletas
      const boletas = [
        {
          numeroBoleta: '202501001',
          socioId,
          fechaEmision: new Date('2025-01-01'),
          fechaVencimiento: new Date('2025-01-31'),
          lecturaAnterior: 12,
          lecturaActual: 27,
          consumoM3: 15,
          montoTotal: 35000,
          estado: 'pendiente',
          detalle: {
            consumoAnterior: 12,
            consumoActual: 27,
            tarifaM3: 1500,
            cargoFijo: 12500,
            otrosCargos: 0,
            descuentos: 0
          },
          periodo: '2025-01'
        },
        {
          numeroBoleta: '202412001',
          socioId,
          fechaEmision: new Date('2024-12-01'),
          fechaVencimiento: new Date('2024-12-31'),
          lecturaAnterior: 8,
          lecturaActual: 20,
          consumoM3: 12,
          montoTotal: 30500,
          estado: 'vencida',
          detalle: {
            consumoAnterior: 8,
            consumoActual: 20,
            tarifaM3: 1500,
            cargoFijo: 12500,
            otrosCargos: 0,
            descuentos: 0
          },
          periodo: '2024-12'
        },
        {
          numeroBoleta: '202411001',
          socioId,
          fechaEmision: new Date('2024-11-01'),
          fechaVencimiento: new Date('2024-11-30'),
          lecturaAnterior: 15,
          lecturaActual: 23,
          consumoM3: 8,
          montoTotal: 24500,
          estado: 'pagada',
          detalle: {
            consumoAnterior: 15,
            consumoActual: 23,
            tarifaM3: 1500,
            cargoFijo: 12500,
            otrosCargos: 0,
            descuentos: 0
          },
          periodo: '2024-11'
        }
      ];

      await Boleta.insertMany(boletas);
      console.log(`📄 Created ${boletas.length} sample boletas for socio`);
    } else {
      console.log(`📄 Found ${existingBoletas.length} existing boletas for socio`);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('📧 Admin credentials: admin@portal.com / admin123');
    console.log('📧 Socio credentials: socio@portal.com / socio123');
    
    // Update the socio's ObjectId to match our frontend mock data
    console.log(`🔑 Socio ObjectId: ${socioId}`);
    console.log(`🔑 Admin ObjectId: ${adminId}`);
    
    // Get the actual boleta IDs
    const boletasCreated = await Boleta.find({ socioId }).select('_id numeroBoleta');
    console.log('📄 Boleta IDs created:');
    boletasCreated.forEach(boleta => {
      console.log(`   - ${boleta.numeroBoleta}: ${boleta._id}`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;