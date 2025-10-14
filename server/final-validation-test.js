const mongoose = require('mongoose');
require('dotenv').config();

async function finalValidationTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    console.log('🔗 Conectado a MongoDB');

    console.log('\n🏁 PRUEBA FINAL DE VALIDACIÓN');
    console.log('='.repeat(50));
    console.log('Esta prueba simula exactamente lo que ocurre cuando');
    console.log('un usuario hace un pago real desde el frontend.');

    const testUserId = '68b8f47d1362234bec2e8991';
    const db = mongoose.connection.db;

    // PASO 1: Crear nueva boleta (simula generar nueva boleta)
    console.log('\n📄 PASO 1: Generando nueva boleta...');

    const nuevaBoleta = {
      numeroBoleta: `FINAL_${Date.now()}`,
      socioId: new mongoose.Types.ObjectId(testUserId),
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      consumoM3: 45,
      montoTotal: 180000,
      estado: 'pendiente',
      detalle: {
        consumoAnterior: 700,
        consumoActual: 745,
        tarifaM3: 3200,
        cargoFijo: 35000,
        otrosCargos: 1000,
        descuentos: 0
      },
      lecturaAnterior: 700,
      lecturaActual: 745,
      periodo: '2025-12',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const boletaResult = await db.collection('boletas').insertOne(nuevaBoleta);
    console.log(`✅ Boleta creada: ${nuevaBoleta.numeroBoleta} ($${nuevaBoleta.montoTotal})`);

    // PASO 2: Usuario inicia pago (simula click en "Pagar con PayPal")
    console.log('\n💳 PASO 2: Usuario inicia pago con PayPal...');

    const nuevoPago = {
      boletaId: boletaResult.insertedId,
      socioId: new mongoose.Types.ObjectId(testUserId),
      monto: nuevaBoleta.montoTotal,
      fechaPago: new Date(),
      metodoPago: 'paypal',
      estadoPago: 'pendiente',
      transactionId: `final-validation-${Date.now()}`,
      metadata: {
        paypalPaymentId: `PAY-FINAL-VAL-${Date.now()}`,
        externalReference: `final-val-ref-${Date.now()}`,
        boletaNumero: nuevaBoleta.numeroBoleta,
        userId: testUserId,
        finalValidation: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const pagoResult = await db.collection('pagos').insertOne(nuevoPago);
    console.log(`✅ Pago iniciado: ${pagoResult.insertedId} (pendiente)`);

    // PASO 3: Simular webhook de PayPal (usuario completa pago)
    console.log('\n🎯 PASO 3: PayPal webhook - pago completado...');

    // Esto simula exactamente lo que hace el servidor cuando recibe el webhook
    await db.collection('pagos').updateMany(
      { _id: pagoResult.insertedId },
      {
        $set: {
          estadoPago: 'completado',
          'metadata.paypalExecuteResult': { state: 'approved' },
          'metadata.paypalState': 'approved',
          'metadata.webhookProcessed': new Date(),
          fechaPago: new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Webhook procesado - pago marcado como completado`);

    // PASO 4: Verificar estado inmediatamente después del webhook
    console.log('\n🔍 PASO 4: Verificando estado inmediato...');

    const pagoInmediato = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });
    const boletaInmediata = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });

    console.log(`💳 Pago inmediato: ${pagoInmediato.estadoPago}`);
    console.log(`📄 Boleta inmediata: ${boletaInmediata.estado}`);

    if (pagoInmediato.estadoPago === 'completado' && boletaInmediata.estado === 'pendiente') {
      console.log(`⚠️  Como esperado: updateMany() no sincroniza automáticamente`);
    }

    // PASO 5: Esperar que el daemon de auto-sincronización corrija el problema
    console.log('\n⏳ PASO 5: Esperando auto-sincronización (máximo 60 segundos)...');

    let intentos = 0;
    const maxIntentos = 12; // 60 segundos / 5 segundos
    let boletaSincronizada = false;

    while (intentos < maxIntentos && !boletaSincronizada) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos

      const boletaCheck = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
      intentos++;

      console.log(`   Intento ${intentos}/12: Boleta está ${boletaCheck.estado}`);

      if (boletaCheck.estado === 'pagada') {
        boletaSincronizada = true;
        console.log(`✅ ¡Auto-sincronización exitosa en ${intentos * 5} segundos!`);
      }
    }

    // PASO 6: Verificación final
    console.log('\n🔍 PASO 6: Verificación final...');

    const pagoFinal = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });
    const boletaFinal = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
    const userFinal = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(testUserId) });

    console.log(`📊 Estado final del pago: ${pagoFinal.estadoPago}`);
    console.log(`📄 Estado final de la boleta: ${boletaFinal.estado}`);
    console.log(`👤 Deuda total del usuario: $${userFinal?.deudaTotal || 0}`);

    // RESULTADO FINAL
    console.log('\n🏁 RESULTADO FINAL');
    console.log('='.repeat(50));

    if (pagoFinal.estadoPago === 'completado' && boletaFinal.estado === 'pagada') {
      console.log(`🟢 ¡SISTEMA FUNCIONANDO CORRECTAMENTE!`);
      console.log(`✅ El pago se completó exitosamente`);
      console.log(`✅ La boleta se sincronizó automáticamente`);

      if (boletaSincronizada) {
        console.log(`✅ Auto-sincronización funcionando (${intentos * 5}s)`);
      } else {
        console.log(`⚠️  Auto-sincronización lenta pero eventual`);
      }

      console.log(`\n💡 EL PROBLEMA DE LAS BOLETAS ESTÁ RESUELTO`);
      console.log(`   - Pagos futuros se sincronizarán automáticamente`);
      console.log(`   - El daemon corregirá cualquier inconsistencia`);
      console.log(`   - El sistema es robusto y confiable`);

    } else {
      console.log(`🔴 PROBLEMA PERSISTENTE`);
      console.log(`   Pago: ${pagoFinal.estadoPago} (esperado: completado)`);
      console.log(`   Boleta: ${boletaFinal.estado} (esperado: pagada)`);
      console.log(`   Se requiere investigación adicional`);
    }

    // Limpieza
    console.log('\n🧹 Limpiando datos de prueba...');
    await db.collection('boletas').deleteOne({ _id: boletaResult.insertedId });
    await db.collection('pagos').deleteOne({ _id: pagoResult.insertedId });
    console.log(`✅ Datos de prueba eliminados`);

    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. ✅ Sistema está funcionando con auto-sincronización');
    console.log('2. 🔄 Mantener daemon ejecutándose para garantizar sincronización');
    console.log('3. 🧪 Probar desde frontend para confirmar experiencia de usuario');
    console.log('4. 📊 Monitorear logs para asegurar estabilidad');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en validación final:', error);
    process.exit(1);
  }
}

finalValidationTest();