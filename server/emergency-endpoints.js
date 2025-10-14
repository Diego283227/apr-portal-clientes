
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
