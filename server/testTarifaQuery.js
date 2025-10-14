const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apr')
  .then(async () => {
    console.log('✅ Conectado a MongoDB\n');

    const TarifaConfig = mongoose.model('TarifaConfig', new mongoose.Schema({}, { strict: false }));

    const ahora = new Date();
    console.log('📅 Fecha actual:', ahora);

    // Consulta ANTERIOR (la que estaba fallando)
    console.log('\n🔍 Probando consulta ANTERIOR (sin null check):');
    const tarifaAnterior = await TarifaConfig.findOne({
      activa: true,
      fechaVigencia: { $lte: ahora },
      $or: [
        { fechaVencimiento: { $exists: false } },
        { fechaVencimiento: { $gte: ahora } }
      ]
    });
    console.log('Resultado:', tarifaAnterior ? `✅ ${tarifaAnterior.nombre}` : '❌ No encontrada');

    // Consulta NUEVA (con null check)
    console.log('\n🔍 Probando consulta NUEVA (con null check):');
    const tarifaNueva = await TarifaConfig.findOne({
      activa: true,
      fechaVigencia: { $lte: ahora },
      $or: [
        { fechaVencimiento: { $exists: false } },
        { fechaVencimiento: null },
        { fechaVencimiento: { $gte: ahora } }
      ]
    });
    console.log('Resultado:', tarifaNueva ? `✅ ${tarifaNueva.nombre}` : '❌ No encontrada');

    if (tarifaNueva) {
      console.log('\n📋 Detalles de la tarifa encontrada:');
      console.log('   - Nombre:', tarifaNueva.nombre);
      console.log('   - Activa:', tarifaNueva.activa);
      console.log('   - Fecha vigencia:', tarifaNueva.fechaVigencia);
      console.log('   - Fecha vencimiento:', tarifaNueva.fechaVencimiento);
      console.log('   - Escalones:', tarifaNueva.escalones.length);
      console.log('   - Cargo fijo residencial: $' + tarifaNueva.cargoFijo.residencial);
    }

    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
