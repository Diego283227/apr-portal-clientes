import mongoose from 'mongoose';
import User from '../models/User';
import Boleta from '../models/Boleta';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function checkUserBoletas() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'calfuan@gmail.com' });
    
    if (!user) {
      console.log('❌ User calfuan@gmail.com not found');
      return;
    }

    console.log('👤 User found:', {
      id: user._id,
      email: user.email,
      rut: user.rut,
      nombres: user.nombres,
      apellidos: user.apellidos,
      role: user.role,
      activo: user.activo,
      codigoSocio: user.codigoSocio
    });

    // Find boletas for this user
    const boletas = await Boleta.find({ socioId: user._id });
    console.log(`📄 Found ${boletas.length} boletas for this user:`);
    
    boletas.forEach(boleta => {
      console.log(`   - ID: ${boleta._id}`);
      console.log(`     Número: ${boleta.numeroBoleta}`);
      console.log(`     Período: ${boleta.periodo}`);
      console.log(`     Estado: ${boleta.estado}`);
      console.log(`     Monto: $${boleta.montoTotal}`);
      console.log(`     Vencimiento: ${boleta.fechaVencimiento}`);
      console.log('');
    });

    // Count by status
    const pendientes = boletas.filter(b => b.estado === 'pendiente').length;
    const vencidas = boletas.filter(b => b.estado === 'vencida').length;
    const pagadas = boletas.filter(b => b.estado === 'pagada').length;
    
    console.log(`📊 Resumen:`);
    console.log(`   - Pendientes: ${pendientes}`);
    console.log(`   - Vencidas: ${vencidas}`);
    console.log(`   - Pagadas: ${pagadas}`);

  } catch (error) {
    console.error('❌ Error checking user boletas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check function
if (require.main === module) {
  checkUserBoletas();
}

export default checkUserBoletas;