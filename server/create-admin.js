// Script para crear un usuario administrador
// Ejecutar con: node create-admin.js

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  email: { type: String, unique: true },
  password: String,
  rut: { type: String, unique: true },
  role: { type: String, enum: ['socio', 'admin', 'super_admin'] },
  telefono: String,
  direccion: String,
  activo: { type: Boolean, default: true },
  verificado: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Datos del admin
    const adminData = {
      nombre: 'Admin',
      apellido: 'Principal',
      email: 'admin@portal.com',
      password: 'Admin123!', // Cambia esta contraseña
      rut: '11111111-1',
      role: 'super_admin',
      telefono: '+56912345678',
      direccion: 'Oficina Central',
      activo: true,
      verificado: true,
    };

    // Verificar si ya existe
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️  El admin ya existe con el email:', adminData.email);
      process.exit(0);
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Crear admin
    const admin = new User(adminData);
    await admin.save();

    console.log('🎉 Admin creado exitosamente!');
    console.log('📧 Email:', 'admin@portal.com');
    console.log('🔑 Password:', 'Admin123!');
    console.log('⚠️  CAMBIA LA CONTRASEÑA después del primer login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
