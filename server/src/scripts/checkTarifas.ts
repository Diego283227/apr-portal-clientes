import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const TarifaConfigSchema = new mongoose.Schema({
  nombre: String,
  activa: Boolean,
  estado: String,
  fechaVigencia: Date,
  fechaVencimiento: Date
});

const TarifaConfig = mongoose.model('TarifaConfig', TarifaConfigSchema);

async function checkTarifas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    const tarifas = await TarifaConfig.find({}).select('nombre activa estado fechaVigencia fechaVencimiento').lean();

    console.log('📊 Total tarifas encontradas:', tarifas.length);
    console.log('═'.repeat(80));

    tarifas.forEach((tarifa: any, index) => {
      console.log(`\n${index + 1}. ${tarifa.nombre}`);
      console.log(`   ID: ${tarifa._id}`);
      console.log(`   activa: ${tarifa.activa}`);
      console.log(`   estado: ${tarifa.estado || 'NO DEFINIDO'}`);
      console.log(`   fechaVigencia: ${tarifa.fechaVigencia}`);
      console.log(`   fechaVencimiento: ${tarifa.fechaVencimiento || 'Sin vencimiento'}`);

      // Identificar problemas
      if (tarifa.activa && tarifa.estado !== 'activa') {
        console.log(`   ⚠️  PROBLEMA: activa=true pero estado='${tarifa.estado}'`);
      }
      if (tarifa.activa === undefined) {
        console.log(`   ⚠️  PROBLEMA: campo 'activa' no existe`);
      }
      if (!tarifa.estado) {
        console.log(`   ⚠️  PROBLEMA: campo 'estado' no existe o está vacío`);
      }
    });

    console.log('\n═'.repeat(80));
    console.log('\n🔍 Buscando tarifa activa específicamente...');

    const tarifaActiva = await TarifaConfig.findOne({ activa: true });
    if (tarifaActiva) {
      console.log(`✅ Tarifa activa encontrada: ${tarifaActiva.nombre}`);
      console.log(`   activa: ${tarifaActiva.activa}`);
      console.log(`   estado: ${tarifaActiva.estado}`);
    } else {
      console.log('❌ NO se encontró ninguna tarifa con activa=true');
    }

    console.log('\n🔍 Buscando "Tarifa de Invierno" específicamente...');
    const tarifaInvierno = await TarifaConfig.findOne({ nombre: /invierno/i });
    if (tarifaInvierno) {
      console.log(`✅ Tarifa de Invierno encontrada:`);
      console.log(JSON.stringify(tarifaInvierno, null, 2));
    } else {
      console.log('❌ NO se encontró "Tarifa de Invierno"');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTarifas();
