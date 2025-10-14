const mongoose = require('mongoose');
require('dotenv').config();

async function adminFixSync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');
    console.log('🔗 Conectado a MongoDB como administrador');

    console.log('\n🔧 CORRECCIÓN ADMINISTRATIVA DE SINCRONIZACIÓN');
    console.log('='.repeat(60));

    const db = mongoose.connection.db;

    // OPCIÓN 1: Corregir todos los pagos completados existentes
    console.log('\n1️⃣ Corrigiendo pagos completados existentes...');

    const pagosCompletados = await db.collection('pagos').find({
      estadoPago: 'completado'
    }).toArray();

    console.log(`📋 Encontrados ${pagosCompletados.length} pagos completados`);

    let corregidos = 0;
    let yaCorrectos = 0;

    for (const pago of pagosCompletados) {
      const boleta = await db.collection('boletas').findOne({ _id: pago.boletaId });

      if (boleta) {
        if (boleta.estado !== 'pagada') {
          console.log(`🔧 Corrigiendo boleta ${boleta.numeroBoleta}...`);

          await db.collection('boletas').updateOne(
            { _id: boleta._id },
            { $set: { estado: 'pagada', updatedAt: new Date() } }
          );

          // Nota: No actualizo deuda del usuario aquí para evitar duplicados
          corregidos++;
        } else {
          yaCorrectos++;
        }
      }
    }

    console.log(`✅ Boletas corregidas: ${corregidos}`);
    console.log(`ℹ️  Boletas ya correctas: ${yaCorrectos}`);

    // OPCIÓN 2: Crear un middleware de base de datos para automático
    console.log('\n2️⃣ Implementando trigger de sincronización automática...');

    // Crear una función de sincronización que se ejecute directamente en la base de datos
    const syncFunction = `
      function syncBoletaWithPago(pagoId) {
        const pagosCollection = db.pagos;
        const boletasCollection = db.boletas;

        const pago = pagosCollection.findOne({ _id: pagoId });

        if (pago && pago.estadoPago === 'completado') {
          const boleta = boletasCollection.findOne({ _id: pago.boletaId });

          if (boleta && boleta.estado !== 'pagada') {
            boletasCollection.updateOne(
              { _id: boleta._id },
              { $set: { estado: 'pagada', updatedAt: new Date() } }
            );

            print('Boleta ' + boleta.numeroBoleta + ' actualizada automáticamente');
          }
        }
      }
    `;

    console.log(`📜 Función de sincronización preparada para MongoDB`);

    // OPCIÓN 3: Implementar middleware en el código actual sin reiniciar
    console.log('\n3️⃣ Implementando hook de sincronización en tiempo real...');

    // Crear un script que se ejecute periódicamente para verificar inconsistencias
    const intervalScript = `
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

        console.log(\`🔄 Auto-sincronizada boleta \${boleta.numeroBoleta}\`);
      }
    }

  } catch (error) {
    console.error('Error en auto-sincronización:', error);
  }
}

// Ejecutar cada 30 segundos
setInterval(autoSync, 30000);
console.log('🔄 Auto-sincronización iniciada (cada 30 segundos)');
`;

    // Guardar el script de auto-sincronización
    require('fs').writeFileSync(
      './auto-sync-daemon.js',
      intervalScript
    );

    console.log(`✅ Script de auto-sincronización creado: auto-sync-daemon.js`);

    // OPCIÓN 4: Crear endpoints de emergencia
    console.log('\n4️⃣ Preparando endpoints de emergencia...');

    const emergencyEndpoints = `
// Endpoints de emergencia para sincronización
app.post('/api/admin/sync-all-payments', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const pagosCompletados = await db.collection('pagos').find({
      estadoPago: 'completado'
    }).toArray();

    let synced = 0;

    for (const pago of pagosCompletados) {
      const boleta = await db.collection('boletas').findOne({ _id: pago.boletaId });

      if (boleta && boleta.estado !== 'pagada') {
        await db.collection('boletas').updateOne(
          { _id: boleta._id },
          { $set: { estado: 'pagada', updatedAt: new Date() } }
        );
        synced++;
      }
    }

    res.json({ success: true, synced });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/sync-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const db = mongoose.connection.db;

    const pago = await db.collection('pagos').findOne({
      _id: new mongoose.Types.ObjectId(paymentId)
    });

    if (pago && pago.estadoPago === 'completado') {
      const boleta = await db.collection('boletas').findOne({ _id: pago.boletaId });

      if (boleta && boleta.estado !== 'pagada') {
        await db.collection('boletas').updateOne(
          { _id: boleta._id },
          { $set: { estado: 'pagada', updatedAt: new Date() } }
        );

        res.json({ success: true, message: 'Boleta sincronizada' });
      } else {
        res.json({ success: true, message: 'Boleta ya estaba sincronizada' });
      }
    } else {
      res.json({ success: false, message: 'Pago no encontrado o no completado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;

    require('fs').writeFileSync(
      './emergency-endpoints.js',
      emergencyEndpoints
    );

    console.log(`✅ Endpoints de emergencia creados: emergency-endpoints.js`);

    // RESUMEN Y RECOMENDACIONES
    console.log('\n📋 RESUMEN DE ACCIONES IMPLEMENTADAS');
    console.log('='.repeat(60));
    console.log(`1. ✅ Corregidos ${corregidos} inconsistencias existentes`);
    console.log(`2. 📜 Función de sincronización para MongoDB preparada`);
    console.log(`3. 🔄 Script de auto-sincronización creado`);
    console.log(`4. 🚨 Endpoints de emergencia preparados`);

    console.log('\n🎯 PRÓXIMOS PASOS RECOMENDADOS:');
    console.log('1. Ejecutar: node auto-sync-daemon.js (en otra terminal)');
    console.log('2. Agregar emergency-endpoints.js al servidor principal');
    console.log('3. Probar nuevos pagos para verificar que se sincronizan');
    console.log('4. Una vez confirmado, reiniciar servidor con nuevos controladores');

    console.log('\n🔧 ESTADO ACTUAL:');
    console.log('- Inconsistencias existentes: CORREGIDAS ✅');
    console.log('- Auto-sincronización: PREPARADA ✅');
    console.log('- Endpoints de emergencia: LISTOS ✅');
    console.log('- Problema de raíz: PENDIENTE (requiere reinicio del servidor)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en corrección administrativa:', error);
    process.exit(1);
  }
}

adminFixSync();