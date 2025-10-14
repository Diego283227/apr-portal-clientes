const mongoose = require('mongoose');
require('dotenv').config();

async function verifyCurrentState() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    const db = mongoose.connection.db;

    const testUserId = '68b8f47d1362234bec2e8991';
    console.log('🔍 VERIFICACIÓN DE ESTADO ACTUAL');
    console.log('='.repeat(50));

    // Get boletas and their associated payments
    const boletas = await db.collection('boletas').find({
      socioId: new mongoose.Types.ObjectId(testUserId)
    }).toArray();

    console.log('\n📋 ESTADO ACTUAL BOLETA POR BOLETA:');

    for (const boleta of boletas) {
      console.log(`\n📄 Boleta ${boleta.numeroBoleta} (${boleta._id}):`);
      console.log(`   Estado: ${boleta.estado}`);
      console.log(`   Monto: $${boleta.montoTotal}`);

      // Find ALL payments for this boleta
      const pagosAsociados = await db.collection('pagos').find({
        boletaId: boleta._id
      }).toArray();

      console.log(`   Pagos asociados: ${pagosAsociados.length}`);

      pagosAsociados.forEach((pago, index) => {
        console.log(`     ${index + 1}. Pago ${pago._id}:`);
        console.log(`        - Estado: ${pago.estadoPago}`);
        console.log(`        - Método: ${pago.metodoPago}`);
        console.log(`        - Monto: $${pago.monto}`);
        console.log(`        - TransactionId: ${pago.transactionId}`);
        console.log(`        - Fecha: ${pago.fechaPago}`);
      });

      // Determine if there's a mismatch
      const hasCompletedPayment = pagosAsociados.some(p => p.estadoPago === 'completado');
      const isBoletaPaid = boleta.estado === 'pagada';

      if (hasCompletedPayment && isBoletaPaid) {
        console.log(`   ✅ Estado CORRECTO: Pago completado ↔ Boleta pagada`);
      } else if (hasCompletedPayment && !isBoletaPaid) {
        console.log(`   ❌ PROBLEMA: Pago completado pero boleta NO pagada`);
      } else if (!hasCompletedPayment && isBoletaPaid) {
        console.log(`   ⚠️  PROBLEMA: Boleta pagada pero NO hay pago completado`);
      } else {
        console.log(`   ⏳ Estado PENDIENTE: Sin pagos completados, boleta pendiente`);
      }
    }

    // Show summary
    console.log('\n📊 RESUMEN:');
    const totalBoletas = boletas.length;
    const boletasPagadas = boletas.filter(b => b.estado === 'pagada').length;
    const boletasPendientes = boletas.filter(b => b.estado === 'pendiente').length;

    const allPayments = await db.collection('pagos').find({
      socioId: new mongoose.Types.ObjectId(testUserId)
    }).toArray();

    const pagosCompletados = allPayments.filter(p => p.estadoPago === 'completado').length;
    const pagosPendientes = allPayments.filter(p => p.estadoPago === 'pendiente').length;

    console.log(`   📄 Total boletas: ${totalBoletas}`);
    console.log(`   ✅ Boletas pagadas: ${boletasPagadas}`);
    console.log(`   ⏳ Boletas pendientes: ${boletasPendientes}`);
    console.log(`   💰 Pagos completados: ${pagosCompletados}`);
    console.log(`   ⏳ Pagos pendientes: ${pagosPendientes}`);

    // Test a real payment simulation
    console.log('\n🧪 SIMULANDO NUEVO PAGO...');

    // Find a pending boleta
    const pendingBoleta = boletas.find(b => b.estado === 'pendiente');
    if (pendingBoleta) {
      console.log(`📄 Usando boleta pendiente: ${pendingBoleta.numeroBoleta}`);

      // Create a test payment
      const testPago = await db.collection('pagos').insertOne({
        boletaId: pendingBoleta._id,
        socioId: new mongoose.Types.ObjectId(testUserId),
        monto: pendingBoleta.montoTotal,
        fechaPago: new Date(),
        metodoPago: 'test',
        estadoPago: 'pendiente',
        transactionId: `simulation-${Date.now()}`,
        metadata: { simulation: true },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`💳 Pago de prueba creado: ${testPago.insertedId}`);

      // Update to completed
      await db.collection('pagos').updateOne(
        { _id: testPago.insertedId },
        {
          $set: {
            estadoPago: 'completado',
            updatedAt: new Date()
          }
        }
      );

      console.log(`🔄 Pago actualizado a completado`);

      // Check if boleta was updated (it shouldn't be with the old system)
      const updatedBoleta = await db.collection('boletas').findOne({ _id: pendingBoleta._id });
      console.log(`📄 Estado de boleta después de updateOne: ${updatedBoleta.estado}`);

      if (updatedBoleta.estado === 'pagada') {
        console.log(`✅ ¡La boleta se actualizó automáticamente!`);
      } else {
        console.log(`❌ La boleta NO se actualizó automáticamente (problema confirmado)`);
      }

      // Clean up
      await db.collection('pagos').deleteOne({ _id: testPago.insertedId });
      console.log(`🧹 Pago de prueba eliminado`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCurrentState();