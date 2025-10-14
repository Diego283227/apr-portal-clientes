import mongoose from 'mongoose';
import Pago from '../models/Pago';
import Boleta from '../models/Boleta';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function seedPagos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Buscar todas las boletas
    const boletas = await Boleta.find();
    console.log(`📄 Found ${boletas.length} boletas`);

    if (boletas.length === 0) {
      console.log('⚠️ No boletas found. Run seedDatabase.ts first.');
      process.exit(1);
    }

    // Buscar el socio
    const socio = await User.findOne({ email: 'socio@portal.com' });
    if (!socio) {
      console.log('⚠️ Socio not found. Run seedDatabase.ts first.');
      process.exit(1);
    }

    // Limpiar pagos existentes (opcional)
    await Pago.deleteMany({});
    console.log('🗑️ Cleared existing pagos');

    // Crear pagos para cada boleta
    const pagos = [];
    for (const boleta of boletas) {
      const pago = new Pago({
        socioId: socio._id,
        boletaId: boleta._id,
        monto: boleta.montoTotal,
        metodoPago: 'paypal',
        estadoPago: 'completado',
        fechaPago: boleta.fechaEmision, // Usar la fecha de emisión de la boleta
        transactionId: `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paypalOrderId: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        detalles: {
          paypalPayerId: `PAYER_${Math.random().toString(36).substr(2, 9)}`,
          paypalEmail: socio.email
        }
      });

      await pago.save();
      pagos.push(pago);

      // Actualizar la boleta como pagada
      boleta.estado = 'pagada';
      await boleta.save();

      console.log(`✅ Created pago for boleta ${boleta.numeroBoleta} - $${boleta.montoTotal}`);
    }

    console.log(`\n✅ Successfully created ${pagos.length} pagos!`);
    console.log(`💰 Total amount: $${pagos.reduce((sum, p) => sum + p.monto, 0)}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding pagos:', error);
    process.exit(1);
  }
}

seedPagos();
