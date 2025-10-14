
const mongoose = require('mongoose');

async function autoSync() {
  try {
    const db = mongoose.connection.db;

    // Buscar pagos completados con boletas pendientes
    const pagosProblematicos = await db.collection('pagos').aggregate([
      {
        $match: { estadoPago: 'completado' }
      },
      {
        $lookup: {
          from: 'boletas',
          localField: 'boletaId',
          foreignField: '_id',
          as: 'boleta'
        }
      },
      {
        $match: {
          'boleta.estado': 'pendiente'
        }
      }
    ]).toArray();

    for (const pago of pagosProblematicos) {
      const boleta = pago.boleta[0];
      if (boleta) {
        await db.collection('boletas').updateOne(
          { _id: boleta._id },
          { $set: { estado: 'pagada', updatedAt: new Date() } }
        );

        console.log(`🔄 Auto-sincronizada boleta ${boleta.numeroBoleta}`);
      }
    }

  } catch (error) {
    console.error('Error en auto-sincronización:', error);
  }
}

// Ejecutar cada 30 segundos
setInterval(autoSync, 30000);
console.log('🔄 Auto-sincronización iniciada (cada 30 segundos)');
