const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apr')
  .then(async () => {
    console.log('✅ Conectado a MongoDB');

    const TarifaConfig = mongoose.model('TarifaConfig', new mongoose.Schema({}, { strict: false }));
    const tarifa = await TarifaConfig.findOne({ activa: true });

    if (!tarifa) {
      console.log('❌ No hay tarifa activa');
    } else {
      console.log('\n✅ Tarifa activa encontrada:', tarifa.nombre);
      console.log('\n📋 Cargo Fijo:');
      console.log('   Residencial: $' + tarifa.cargoFijo.residencial);
      console.log('   Comercial: $' + tarifa.cargoFijo.comercial);
      console.log('   Industrial: $' + tarifa.cargoFijo.industrial);
      console.log('   Tercera Edad: $' + tarifa.cargoFijo.terceraEdad);

      console.log('\n📐 Escalones configurados:', tarifa.escalones?.length || 0);

      if (tarifa.escalones && tarifa.escalones.length > 0) {
        console.log('\n🔢 Detalle de escalones:');
        tarifa.escalones.forEach((e, i) => {
          const hasta = e.hasta === -1 ? '∞' : e.hasta;
          console.log(`\n  Escalón ${i+1}: ${e.desde}-${hasta} m³`);
          console.log(`     - Residencial: $${e.tarifaResidencial}/m³`);
          console.log(`     - Comercial: $${e.tarifaComercial}/m³`);
          console.log(`     - Industrial: $${e.tarifaIndustrial}/m³`);
          console.log(`     - Tercera Edad: $${e.tarifaTerceraEdad}/m³`);
        });
      } else {
        console.log('\n⚠️  ¡NO HAY ESCALONES CONFIGURADOS!');
        console.log('⚠️  Por eso las boletas solo muestran el cargo fijo ($88)');
        console.log('\n💡 Solución: Debes configurar los escalones de consumo en la tarifa activa');
      }
    }

    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
