const mongoose = require('mongoose');
require('dotenv').config();

async function createTestScenario() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    const testUserId = '68b8f47d1362234bec2e8991';
    console.log('🧪 CREANDO ESCENARIO DE PRUEBA PARA NUEVOS PAGOS');
    console.log('='.repeat(60));

    // 1. Crear una nueva boleta pendiente para probar
    const newBoleta = {
      numeroBoleta: `TEST${Date.now()}`,
      socioId: new mongoose.Types.ObjectId(testUserId),
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      consumoM3: 20,
      montoTotal: 50000,
      estado: 'pendiente',
      detalle: {
        consumoAnterior: 200,
        consumoActual: 220,
        tarifaM3: 1500,
        cargoFijo: 20000,
        otrosCargos: 0,
        descuentos: 0
      },
      lecturaAnterior: 200,
      lecturaActual: 220,
      periodo: '2025-10',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const boletaResult = await db.collection('boletas').insertOne(newBoleta);
    console.log(`📄 Nueva boleta creada: ${newBoleta.numeroBoleta} (ID: ${boletaResult.insertedId})`);
    console.log(`💰 Monto: $${newBoleta.montoTotal}`);
    console.log(`📊 Estado: ${newBoleta.estado}`);

    // 2. Simular el flujo completo de pago como lo haría el controlador real
    console.log('\n🔄 SIMULANDO FLUJO COMPLETO DE PAGO (como MercadoPago o PayPal)...');

    // Crear pago inicial (pendiente)
    const newPago = {
      boletaId: boletaResult.insertedId,
      socioId: new mongoose.Types.ObjectId(testUserId),
      monto: newBoleta.montoTotal,
      fechaPago: new Date(),
      metodoPago: 'test',
      estadoPago: 'pendiente',
      transactionId: `test-flow-${Date.now()}`,
      metadata: {
        externalReference: `test-ref-${Date.now()}`,
        boletaNumero: newBoleta.numeroBoleta,
        userId: testUserId,
        simulationTest: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const pagoResult = await db.collection('pagos').insertOne(newPago);
    console.log(`💳 Pago inicial creado: ${pagoResult.insertedId}`);
    console.log(`📊 Estado inicial: ${newPago.estadoPago}`);

    // 3. Simular webhook/callback que actualiza el pago (usando updateMany como en el código real)
    console.log('\n🎯 Simulando webhook que actualiza pago con updateMany()...');

    const updateResult = await db.collection('pagos').updateMany(
      { _id: pagoResult.insertedId },
      {
        $set: {
          estadoPago: 'completado',
          fechaPago: new Date(),
          'metadata.webhookProcessed': true,
          updatedAt: new Date()
        }
      }
    );

    console.log(`📊 Pagos actualizados por updateMany: ${updateResult.modifiedCount}`);

    // 4. Verificar si la boleta se actualizó automáticamente (debería fallar con el sistema actual)
    const boletaAfterUpdate = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
    console.log(`📄 Estado de boleta después de updateMany: ${boletaAfterUpdate.estado}`);

    if (boletaAfterUpdate.estado === 'pagada') {
      console.log(`✅ ¡ÉXITO! La boleta se actualizó automáticamente`);
    } else {
      console.log(`❌ PROBLEMA CONFIRMADO: updateMany() no activó la actualización de boleta`);

      // 5. Probar el nuevo método updateBoletaStatus manualmente
      console.log('\n🔧 Probando método updateBoletaStatus() manualmente...');

      // Simulate calling the updateBoletaStatus method
      const completedPago = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });

      if (completedPago && completedPago.estadoPago === 'completado') {
        console.log(`💰 Encontrado pago completado: ${completedPago._id}`);

        // Manually update boleta (simulating what updateBoletaStatus should do)
        await db.collection('boletas').updateOne(
          { _id: completedPago.boletaId },
          { $set: { estado: 'pagada', updatedAt: new Date() } }
        );

        // Update user debt
        await db.collection('users').updateOne(
          { _id: completedPago.socioId },
          { $inc: { deudaTotal: -completedPago.monto } }
        );

        console.log(`✅ Boleta actualizada manualmente a 'pagada'`);
        console.log(`💰 Deuda de usuario reducida en $${completedPago.monto}`);

        // Verify final state
        const finalBoleta = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
        console.log(`📄 Estado final de boleta: ${finalBoleta.estado}`);
      }
    }

    // 6. Verificar estado de usuario
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    console.log(`👤 Deuda total del usuario: $${user?.deudaTotal || 0}`);

    console.log('\n📋 CONCLUSIONES:');
    console.log('1. Si la boleta NO se actualizó automáticamente con updateMany(), entonces el problema está confirmado');
    console.log('2. Si la actualización manual funcionó, entonces el método updateBoletaStatus() debería resolver el problema');
    console.log('3. El problema ocurre porque updateMany() no activa middlewares de Mongoose');

    // 7. Cleanup
    console.log('\n🧹 Limpiando datos de prueba...');
    await db.collection('boletas').deleteOne({ _id: boletaResult.insertedId });
    await db.collection('pagos').deleteOne({ _id: pagoResult.insertedId });
    console.log('✅ Datos de prueba eliminados');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestScenario();