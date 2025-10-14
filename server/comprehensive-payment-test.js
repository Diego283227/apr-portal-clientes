const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos TypeScript compilados si existen
let compiledModels = null;
try {
  compiledModels = require('./dist/models');
} catch (error) {
  console.log('📝 Modelos compilados no disponibles, usando esquemas JavaScript');
}

async function comprehensivePaymentTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    console.log('🔗 Conectado a MongoDB');

    console.log('\n🔍 REVISIÓN COMPLETA DEL FLUJO DE PAGOS');
    console.log('='.repeat(70));

    const testUserId = '68b8f47d1362234bec2e8991';
    const db = mongoose.connection.db;

    // ANÁLISIS 1: Estado actual del sistema
    console.log('\n📊 ANÁLISIS 1: Estado actual del sistema');
    console.log('-'.repeat(50));

    const allBoletas = await db.collection('boletas').find({
      socioId: new mongoose.Types.ObjectId(testUserId)
    }).toArray();

    const allPagos = await db.collection('pagos').find({
      socioId: new mongoose.Types.ObjectId(testUserId)
    }).toArray();

    console.log(`📄 Total boletas del usuario: ${allBoletas.length}`);
    console.log(`💰 Total pagos del usuario: ${allPagos.length}`);

    const boletasPagadas = allBoletas.filter(b => b.estado === 'pagada').length;
    const boletasPendientes = allBoletas.filter(b => b.estado === 'pendiente').length;
    const pagosCompletados = allPagos.filter(p => p.estadoPago === 'completado').length;
    const pagosPendientes = allPagos.filter(p => p.estadoPago === 'pendiente').length;

    console.log(`   ✅ Boletas pagadas: ${boletasPagadas}`);
    console.log(`   ⏳ Boletas pendientes: ${boletasPendientes}`);
    console.log(`   ✅ Pagos completados: ${pagosCompletados}`);
    console.log(`   ⏳ Pagos pendientes: ${pagosPendientes}`);

    // ANÁLISIS 2: Revisar inconsistencias existentes
    console.log('\n🔍 ANÁLISIS 2: Detectando inconsistencias');
    console.log('-'.repeat(50));

    let inconsistenciasEncontradas = 0;

    for (const boleta of allBoletas) {
      const pagosAsociados = allPagos.filter(p => p.boletaId.toString() === boleta._id.toString());
      const tienePagoCompletado = pagosAsociados.some(p => p.estadoPago === 'completado');

      if (boleta.estado === 'pagada' && !tienePagoCompletado) {
        console.log(`⚠️  INCONSISTENCIA: Boleta ${boleta.numeroBoleta} pagada sin pago completado`);
        inconsistenciasEncontradas++;
      } else if (boleta.estado === 'pendiente' && tienePagoCompletado) {
        console.log(`⚠️  INCONSISTENCIA: Boleta ${boleta.numeroBoleta} pendiente con pago completado`);
        inconsistenciasEncontradas++;
      }
    }

    if (inconsistenciasEncontradas === 0) {
      console.log(`✅ No se encontraron inconsistencias en el sistema actual`);
    } else {
      console.log(`🔴 Encontradas ${inconsistenciasEncontradas} inconsistencias`);
    }

    // PRUEBA 3: Simular flujo completo de pago nuevo
    console.log('\n🧪 PRUEBA 3: Simulando flujo completo de pago');
    console.log('-'.repeat(50));

    // Crear nueva boleta
    const testBoleta = {
      numeroBoleta: `COMPREHENSIVE_${Date.now()}`,
      socioId: new mongoose.Types.ObjectId(testUserId),
      fechaEmision: new Date(),
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      consumoM3: 40,
      montoTotal: 150000,
      estado: 'pendiente',
      detalle: {
        consumoAnterior: 600,
        consumoActual: 640,
        tarifaM3: 3000,
        cargoFijo: 30000,
        otrosCargos: 0,
        descuentos: 0
      },
      lecturaAnterior: 600,
      lecturaActual: 640,
      periodo: '2025-12',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const boletaResult = await db.collection('boletas').insertOne(testBoleta);
    console.log(`📄 Boleta de prueba creada: ${testBoleta.numeroBoleta}`);

    // Crear pago asociado
    const testPago = {
      boletaId: boletaResult.insertedId,
      socioId: new mongoose.Types.ObjectId(testUserId),
      monto: testBoleta.montoTotal,
      fechaPago: new Date(),
      metodoPago: 'paypal',
      estadoPago: 'pendiente',
      transactionId: `comprehensive-${Date.now()}`,
      metadata: {
        paypalPaymentId: `PAY-COMPREHENSIVE-${Date.now()}`,
        externalReference: `comp-ref-${Date.now()}`,
        boletaNumero: testBoleta.numeroBoleta,
        userId: testUserId,
        comprehensiveTest: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const pagoResult = await db.collection('pagos').insertOne(testPago);
    console.log(`💳 Pago de prueba creado: ${pagoResult.insertedId}`);

    // PASO A: Simular comportamiento actual del sistema (updateMany sin sync)
    console.log('\n🎯 PASO A: Simulando comportamiento actual del sistema');

    await db.collection('pagos').updateMany(
      { _id: pagoResult.insertedId },
      {
        $set: {
          estadoPago: 'completado',
          'metadata.paypalExecuteResult': { state: 'approved' },
          'metadata.paypalState': 'approved',
          fechaPago: new Date(),
          updatedAt: new Date()
        }
      }
    );

    const boletaDespuesUpdate = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
    const pagoDespuesUpdate = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });

    console.log(`   💳 Estado del pago después de updateMany: ${pagoDespuesUpdate.estadoPago}`);
    console.log(`   📄 Estado de la boleta después de updateMany: ${boletaDespuesUpdate.estado}`);

    if (pagoDespuesUpdate.estadoPago === 'completado' && boletaDespuesUpdate.estado === 'pendiente') {
      console.log(`   🔴 CONFIRMADO: El problema persiste - updateMany no sincroniza boletas`);
    } else if (pagoDespuesUpdate.estadoPago === 'completado' && boletaDespuesUpdate.estado === 'pagada') {
      console.log(`   🟢 SORPRESA: El sistema ahora sincroniza automáticamente`);
    }

    // PASO B: Probar si existe la función de sincronización compilada
    console.log('\n🔧 PASO B: Verificando función de sincronización');

    let syncFunctionWorks = false;

    try {
      if (compiledModels && compiledModels.syncBoletasWithCompletedPayments) {
        console.log(`   📦 Función compilada encontrada, probando...`);
        await compiledModels.syncBoletasWithCompletedPayments([pagoResult.insertedId]);
        syncFunctionWorks = true;
        console.log(`   ✅ Función de sincronización compilada funciona`);
      } else {
        console.log(`   📝 Función compilada no disponible, probando sincronización manual...`);
      }
    } catch (error) {
      console.log(`   ❌ Error con función compilada: ${error.message}`);
    }

    // Si la función compilada no funciona, probar sincronización manual
    if (!syncFunctionWorks) {
      console.log(`   🔧 Aplicando sincronización manual...`);

      try {
        // Obtener el pago actualizado
        const pagoParaSync = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });

        if (pagoParaSync && pagoParaSync.estadoPago === 'completado') {
          // Actualizar boleta
          await db.collection('boletas').updateOne(
            { _id: pagoParaSync.boletaId },
            { $set: { estado: 'pagada', updatedAt: new Date() } }
          );

          // Actualizar deuda del usuario
          await db.collection('users').updateOne(
            { _id: pagoParaSync.socioId },
            { $inc: { deudaTotal: -pagoParaSync.monto } }
          );

          console.log(`   ✅ Sincronización manual exitosa`);
          syncFunctionWorks = true;
        }
      } catch (manualError) {
        console.log(`   ❌ Error en sincronización manual: ${manualError.message}`);
      }
    }

    // VERIFICACIÓN FINAL
    console.log('\n🔍 VERIFICACIÓN FINAL');
    console.log('-'.repeat(50));

    const boletaFinal = await db.collection('boletas').findOne({ _id: boletaResult.insertedId });
    const pagoFinal = await db.collection('pagos').findOne({ _id: pagoResult.insertedId });

    console.log(`📊 Estado final del pago: ${pagoFinal.estadoPago}`);
    console.log(`📄 Estado final de la boleta: ${boletaFinal.estado}`);

    // DIAGNÓSTICO FINAL
    console.log('\n📋 DIAGNÓSTICO FINAL');
    console.log('='.repeat(70));

    if (pagoFinal.estadoPago === 'completado' && boletaFinal.estado === 'pagada') {
      console.log(`🟢 ESTADO: Sistema funcionando correctamente`);

      if (boletaDespuesUpdate.estado === 'pagada') {
        console.log(`   💡 CAUSA: Sistema nativo ya funciona automáticamente`);
        console.log(`   📝 NOTA: Es posible que el problema se haya resuelto por sí solo`);
      } else {
        console.log(`   💡 CAUSA: Función de sincronización manual corrigió el problema`);
        console.log(`   🔧 ACCIÓN: Implementar sincronización explícita en controladores`);
      }
    } else {
      console.log(`🔴 ESTADO: Sistema tiene problemas persistentes`);
      console.log(`   📊 Pago: ${pagoFinal.estadoPago} (esperado: completado)`);
      console.log(`   📄 Boleta: ${boletaFinal.estado} (esperado: pagada)`);
      console.log(`   🔧 ACCIÓN: Revisar y corregir lógica de sincronización`);
    }

    // RECOMENDACIONES
    console.log('\n💡 RECOMENDACIONES');
    console.log('-'.repeat(50));

    if (inconsistenciasEncontradas > 0) {
      console.log(`1. 🔧 Corregir ${inconsistenciasEncontradas} inconsistencias existentes`);
    }

    if (!syncFunctionWorks) {
      console.log(`2. 🔧 Implementar función de sincronización robusta`);
    }

    console.log(`3. 🔄 Reiniciar servidor para aplicar cambios en controladores`);
    console.log(`4. 🧪 Probar flujo completo desde frontend después del reinicio`);

    // Limpieza
    console.log('\n🧹 Limpiando datos de prueba...');
    await db.collection('boletas').deleteOne({ _id: boletaResult.insertedId });
    await db.collection('pagos').deleteOne({ _id: pagoResult.insertedId });
    console.log(`✅ Datos de prueba eliminados`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en análisis completo:', error);
    process.exit(1);
  }
}

comprehensivePaymentTest();