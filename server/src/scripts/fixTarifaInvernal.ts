import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TarifaConfigSchema = new mongoose.Schema({
  nombre: String,
  activa: Boolean,
  estado: String,
  escalones: [{
    desde: Number,
    hasta: Number,
    tarifaResidencial: Number,
    tarifaComercial: Number,
    tarifaIndustrial: Number,
    tarifaTerceraEdad: Number
  }]
}, { strict: false });

const TarifaConfig = mongoose.model('TarifaConfig', TarifaConfigSchema);

async function fixTarifaInvernal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find "Tarifa invernal 2026" or similar
    const tarifaInvernal = await TarifaConfig.findOne({
      nombre: /invernal.*2026/i
    });

    if (!tarifaInvernal) {
      console.log('❌ No se encontró la tarifa invernal 2026');
      await mongoose.disconnect();
      return;
    }

    console.log('📊 Tarifa encontrada:', tarifaInvernal.nombre);
    console.log('📊 Escalones antes:');
    tarifaInvernal.escalones.forEach((esc: any, i: number) => {
      console.log(`   Escalón ${i + 1}: desde=${esc.desde}, hasta=${esc.hasta}`);
      if (esc.hasta !== -1 && esc.desde > esc.hasta) {
        console.log(`   ⚠️  PROBLEMA: desde (${esc.desde}) > hasta (${esc.hasta})`);
      }
    });

    // Fix any escalones where desde > hasta
    let fixed = false;
    tarifaInvernal.escalones.forEach((esc: any) => {
      if (esc.hasta !== -1 && esc.desde > esc.hasta) {
        console.log(`\n🔧 Corrigiendo escalón: desde=${esc.desde}, hasta=${esc.hasta}`);
        // Swap values
        const temp = esc.desde;
        esc.desde = esc.hasta;
        esc.hasta = temp;
        console.log(`   ✅ Nuevo: desde=${esc.desde}, hasta=${esc.hasta}`);
        fixed = true;
      }
    });

    if (fixed) {
      await tarifaInvernal.save();
      console.log('\n✅ Tarifa corregida y guardada exitosamente');
    } else {
      console.log('\nℹ️  No se encontraron escalones con problemas');
    }

    console.log('\n📊 Escalones después:');
    tarifaInvernal.escalones.forEach((esc: any, i: number) => {
      console.log(`   Escalón ${i + 1}: desde=${esc.desde}, hasta=${esc.hasta}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTarifaInvernal();
