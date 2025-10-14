const mongoose = require('mongoose');
require('dotenv').config();

async function finalComprehensiveTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    console.log('🏁 PRUEBA FINAL COMPLETA DEL SISTEMA DE PAGOS');
    console.log('='.repeat(60));

    const testUserId = '68b8f47d1362234bec2e8991';

    // PASO 1: Crear boleta completamente nueva
    console.log('\n📄 PASO 1: Creando nueva boleta pendiente...');

    const nuevaBoleta = {
      numeroBoleta: `FINAL_TEST_${Date.now()}`,
      socioId: new mongoose.Types.ObjectId(testUserId),
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      consumoM3: 30,
      montoTotal: 100000,
      estado: 'pendiente',
      detalle: {
        consumoAnterior: 400,
        consumoActual: 430,
        tarifaM3: 2500,
        cargoFijo: 25000,
        otrosCargos: 0,
        descuentos: 0
      },
      lecturaAnterior: 400,
      lecturaActual: 430,
      periodo: '2025-11',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const boletaResult = await db.collection('boletas').insertOne(nuevaBoleta);
    console.log(`✅ Boleta creada: ${nuevaBoleta.numeroBoleta} (ID: ${boletaResult.insertedId})`);
    console.log(`   Estado inicial: ${nuevaBoleta.estado}`);
    console.log(`   Monto: $${nuevaBoleta.montoTotal}`);

    // PASO 2: Crear pago asociado (simulando creación por PayPal/MercadoPago)
    console.log('\n💳 PASO 2: Creando pago asociado...');

    const nuevoPago = {
      boletaId: boletaResult.insertedId,
      socioId: new mongoose.Types.ObjectId(testUserId),
      monto: nuevaBoleta.montoTotal,
      fechaPago: new Date(),
      metodoPago: 'paypal',
      estadoPago: 'pendiente',
      transactionId: `final-test-${Date.now()}`,
      metadata: {
        paypalPaymentId: `PAY-FINAL-TEST-${Date.now()}`,
        externalReference: `final-ref-${Date.now()}`,
        boletaNumero: nuevaBoleta.numeroBoleta,
        userId: testUserId,
        finalTest: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const pagoResult = await db.collection('pagos').insertOne(nuevoPago);
    console.log(`✅ Pago creado: ${pagoResult.insertedId}`);
    console.log(`   Estado inicial: ${nuevoPago.estadoPago}`);
    console.log(`   TransactionId: ${nuevoPago.transactionId}`);

    // PASO 3: Simular webhook de PayPal que marca el pago como completado
    console.log('\n🎯 PASO 3: Simulando webhook de PayPal (updateMany)...');

    const updateResult = await db.collection('pagos').updateMany(
      { _id: pagoResult.insertedId },
      {
        $set: {
          estadoPago: 'completado',
          'metadata.paypalExecuteResult': { state: 'approved' },
          'metadata.paypalState': 'approved',
          'metadata.webhookReceived': new Date(),
          fechaPago: new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ UpdateMany ejecutado: ${updateResult.modifiedCount} pago(s) actualizado(s)`);

    // PASO 4: Verificar si el sistema automáticamente actualizó la boleta
    console.log('\n🔍 PASO 4: Verificando actualización automática de boleta...');

    const boletaVerificacion = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
    const pagoVerificacion = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });

    console.log(`📊 Estado del pago: ${pagoVerificacion.estadoPago}`);
    console.log(`📄 Estado de la boleta: ${boletaVerificacion.estado}`);

    let sistemaFunciona = false;

    if (pagoVerificacion.estadoPago === 'completado' && boletaVerificacion.estado === 'pagada') {
      console.log(`🟢 ¡PERFECTO! El sistema funciona automáticamente`);
      console.log(`   - Pago completado ✅`);
      console.log(`   - Boleta automáticamente actualizada a pagada ✅`);
      sistemaFunciona = true;
    } else if (pagoVerificacion.estadoPago === 'completado' && boletaVerificacion.estado === 'pendiente') {
      console.log(`🔴 PROBLEMA CONFIRMADO: Pago completado pero boleta no actualizada`);
      console.log(`   - Pago: completado ✅`);
      console.log(`   - Boleta: pendiente ❌`);
      console.log(`   - Esto confirma que updateMany() no activa el middleware`);
      sistemaFunciona = false;
    } else {
      console.log(`⚠️  Estado inesperado:`);
      console.log(`   - Pago: ${pagoVerificacion.estadoPago}`);
      console.log(`   - Boleta: ${boletaVerificacion.estado}`);
    }

    // PASO 5: Si no funciona automáticamente, probar corrección manual
    if (!sistemaFunciona) {
      console.log('\n🔧 PASO 5: Aplicando corrección manual...');

      // Simular lo que debería hacer updateBoletaStatus()
      await db.collection('boletas').updateOne(
        { _id: boletaResult.insertedId },
        { $set: { estado: 'pagada', updatedAt: new Date() } }
      );

      await db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(testUserId) },
        { $inc: { deudaTotal: -nuevoPago.monto } }
      );

      console.log(`✅ Corrección manual aplicada`);

      // Verificar resultado de la corrección
      const boletaCorregida = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
      console.log(`📄 Estado de boleta después de corrección: ${boletaCorregida.estado}`);

      if (boletaCorregida.estado === 'pagada') {
        console.log(`🟢 CORRECCIÓN EXITOSA: El método manual funciona`);
      } else {
        console.log(`🔴 ERROR: Incluso la corrección manual falló`);
      }
    }

    // PASO 6: Verificar estado del usuario
    console.log('\n👤 PASO 6: Verificando impacto en deuda del usuario...');
    const usuarioFinal = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    console.log(`💰 Deuda total del usuario: $${usuarioFinal?.deudaTotal || 0}`);

    // PASO 7: Resumen y diagnóstico final
    console.log('\n📋 DIAGNÓSTICO FINAL:');

    if (sistemaFunciona) {
      console.log(`🟢 ESTADO: Sistema funcionando correctamente`);
      console.log(`   ✅ Los pagos se sincronizan automáticamente con las boletas`);
      console.log(`   ✅ No se requiere acción adicional`);
      console.log(`   💡 Si reportas problemas, pueden ser casos específicos o timing`);
    } else {
      console.log(`🔴 ESTADO: Sistema requiere corrección`);
      console.log(`   ❌ updateMany() no activa la actualización automática de boletas`);
      console.log(`   ✅ La corrección manual funciona`);
      console.log(`   🔧 RECOMENDACIÓN: Implementar llamadas explícitas a updateBoletaStatus()`);
      console.log(`   🔧 O modificar los controladores para usar save() en lugar de updateMany()`);
    }

    // PASO 8: Limpieza
    console.log('\n🧹 PASO 8: Limpiando datos de prueba...');
    await db.collection('boletas').deleteOne({ _id: boletaResult.insertedId });
    await db.collection('pagos').deleteOne({ _id: pagoResult.insertedId });
    console.log(`✅ Datos de prueba eliminados`);

    console.log('\n🏁 PRUEBA FINAL COMPLETADA');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en prueba final:', error);
    process.exit(1);
  }
}

finalComprehensiveTest();