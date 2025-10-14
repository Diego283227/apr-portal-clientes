const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apr')
  .then(async () => {
    console.log('✅ Conectado a MongoDB');

    const TarifaConfig = mongoose.model('TarifaConfig', new mongoose.Schema({}, { strict: false }));
    const tarifa = await TarifaConfig.findOne({ activa: true });

    if (!tarifa) {
      console.log('❌ No hay tarifa activa');
      process.exit(1);
    }

    console.log(`\n📝 Actualizando tarifa: ${tarifa.nombre}`);

    // Configurar escalones correctos
    tarifa.escalones = [
      {
        desde: 0,
        hasta: 10,
        tarifaResidencial: 500,
        tarifaComercial: 700,
        tarifaIndustrial: 900,
        tarifaTerceraEdad: 400
      },
      {
        desde: 11,
        hasta: 20,
        tarifaResidencial: 800,
        tarifaComercial: 1000,
        tarifaIndustrial: 1200,
        tarifaTerceraEdad: 700
      },
      {
        desde: 21,
        hasta: 30,
        tarifaResidencial: 1200,
        tarifaComercial: 1400,
        tarifaIndustrial: 1600,
        tarifaTerceraEdad: 1000
      },
      {
        desde: 31,
        hasta: -1, // -1 significa infinito (31 en adelante)
        tarifaResidencial: 1500,
        tarifaComercial: 1800,
        tarifaIndustrial: 2000,
        tarifaTerceraEdad: 1300
      }
    ];

    await tarifa.save();

    console.log('\n✅ Tarifa actualizada exitosamente!');
    console.log('\n📐 Escalones configurados:');

    tarifa.escalones.forEach((e, i) => {
      const hasta = e.hasta === -1 ? '∞' : e.hasta;
      console.log(`\n  Escalón ${i+1}: ${e.desde}-${hasta} m³`);
      console.log(`     - Residencial: $${e.tarifaResidencial}/m³`);
      console.log(`     - Comercial: $${e.tarifaComercial}/m³`);
      console.log(`     - Industrial: $${e.tarifaIndustrial}/m³`);
      console.log(`     - Tercera Edad: $${e.tarifaTerceraEdad}/m³`);
    });

    console.log('\n💡 Ejemplo de cálculo para 25 m³ (Residencial):');
    console.log('   - Cargo fijo: $' + tarifa.cargoFijo.residencial);
    console.log('   - Primeros 10 m³ × $500 = $5,000');
    console.log('   - Siguientes 10 m³ (11-20) × $800 = $8,000');
    console.log('   - Últimos 5 m³ (21-25) × $1,200 = $6,000');
    console.log('   - Total consumo: $19,000');
    console.log('   - TOTAL BOLETA: $' + (tarifa.cargoFijo.residencial + 19000));

    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
