const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apr')
  .then(async () => {
    console.log('✅ Conectado a MongoDB\n');

    // Cargar modelos
    const TarifaConfig = mongoose.model('TarifaConfig', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Buscar tarifa activa
    const tarifa = await TarifaConfig.findOne({ activa: true });
    if (!tarifa) {
      console.log('❌ No hay tarifa activa');
      process.exit(1);
    }

    console.log('📋 Tarifa activa:', tarifa.nombre);
    console.log('💰 Cargo fijo residencial:', tarifa.cargoFijo.residencial);
    console.log('📐 Escalones:', tarifa.escalones.length);

    // Datos de prueba
    const lecturaAnterior = 100;
    const lecturaActual = 125;
    const consumoM3 = lecturaActual - lecturaAnterior;

    console.log('\n🔢 === SIMULACIÓN DE CÁLCULO ===');
    console.log(`📊 Lectura anterior: ${lecturaAnterior} m³`);
    console.log(`📊 Lectura actual: ${lecturaActual} m³`);
    console.log(`📊 Consumo: ${consumoM3} m³`);
    console.log(`👤 Categoría: residencial`);

    // Simular cálculo manual
    const cargoFijo = tarifa.cargoFijo.residencial;
    console.log(`\n💵 Cargo fijo: $${cargoFijo}`);

    let costoConsumo = 0;
    let consumoRestante = consumoM3;

    console.log('\n📐 Calculando por escalones:');

    if (!tarifa.escalones || tarifa.escalones.length === 0) {
      console.log('❌ ERROR: No hay escalones configurados');
    } else {
      const escalonesOrdenados = tarifa.escalones.sort((a, b) => a.desde - b.desde);

      for (const escalon of escalonesOrdenados) {
        if (consumoRestante <= 0) break;

        const limiteSuperior = escalon.hasta === -1 ? Infinity : escalon.hasta;
        const consumoEnEsteEscalon = Math.min(
          consumoRestante,
          limiteSuperior - escalon.desde + 1
        );

        if (consumoEnEsteEscalon > 0) {
          const tarifaUnitaria = escalon.tarifaResidencial;
          const costoEscalon = consumoEnEsteEscalon * tarifaUnitaria;

          console.log(`\n  Escalón ${escalon.desde}-${escalon.hasta === -1 ? '∞' : escalon.hasta} m³:`);
          console.log(`    - Consumo en este escalón: ${consumoEnEsteEscalon} m³`);
          console.log(`    - Tarifa: $${tarifaUnitaria}/m³`);
          console.log(`    - Costo: ${consumoEnEsteEscalon} × $${tarifaUnitaria} = $${costoEscalon}`);

          costoConsumo += costoEscalon;
          consumoRestante -= consumoEnEsteEscalon;
        }
      }
    }

    const montoTotal = cargoFijo + costoConsumo;

    console.log(`\n📊 === RESUMEN ===`);
    console.log(`💵 Cargo fijo: $${cargoFijo}`);
    console.log(`💧 Costo consumo: $${costoConsumo}`);
    console.log(`💰 MONTO TOTAL: $${montoTotal}`);

    if (costoConsumo === 0) {
      console.log('\n⚠️  PROBLEMA DETECTADO:');
      console.log('⚠️  El costo del consumo es $0');
      console.log('⚠️  Esto explica por qué las boletas solo muestran el cargo fijo');
      console.log('\n🔍 Posibles causas:');
      console.log('   1. Los escalones tienen tarifas en $0');
      console.log('   2. El rango de los escalones no cubre el consumo');
      console.log('   3. Hay un error en la lógica del cálculo');
    }

    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
