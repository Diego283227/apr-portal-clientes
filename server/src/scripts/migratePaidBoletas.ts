import mongoose from 'mongoose';
import Boleta from '../models/Boleta';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migratePaidBoletas() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-apr';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all boletas with estado 'pagada' but pagada field is not true
    const boletasPagadas = await Boleta.find({
      estado: 'pagada',
      $or: [
        { pagada: { $exists: false } },
        { pagada: false }
      ]
    });

    console.log(`\n📊 Found ${boletasPagadas.length} paid boletas that need migration\n`);

    if (boletasPagadas.length === 0) {
      console.log('✅ No boletas need migration. All paid boletas are already marked correctly.');
      await mongoose.disconnect();
      return;
    }

    // Update each boleta
    let updated = 0;
    for (const boleta of boletasPagadas) {
      console.log(`Processing boleta ${boleta.numeroBoleta}...`);

      // Mark as permanently paid
      boleta.pagada = true;
      boleta.fechaPago = boleta.fechaPago || boleta.updatedAt || new Date();

      await boleta.save();
      updated++;

      console.log(`✅ Boleta ${boleta.numeroBoleta} marked as permanently paid`);
    }

    console.log(`\n✅ Migration completed! Updated ${updated} boletas`);

    // Now recalculate debt for all users
    console.log('\n📊 Recalculating debt for all users...\n');

    const users = await User.find({ role: 'socio' });

    for (const user of users) {
      // Find all unpaid boletas for this user (vencida or pendiente, but NOT paid)
      const unpaidBoletas = await Boleta.find({
        socioId: user._id,
        estado: { $in: ['vencida', 'pendiente'] },
        $or: [
          { pagada: { $exists: false } },
          { pagada: false }
        ]
      });

      const totalDebt = unpaidBoletas.reduce((sum, b) => sum + b.montoTotal, 0);

      console.log(`User ${user.nombres} ${user.apellidos}:`);
      console.log(`  - Unpaid boletas: ${unpaidBoletas.length}`);
      console.log(`  - Old debt: $${user.deudaTotal || 0}`);
      console.log(`  - New debt: $${totalDebt}`);

      user.deudaTotal = totalDebt;
      await user.save();

      console.log(`  ✅ Debt updated\n`);
    }

    console.log('✅ All user debts recalculated!');

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migratePaidBoletas();
