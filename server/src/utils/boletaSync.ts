import mongoose from 'mongoose';
import { Boleta, User } from '../models';

/**
 * Sincroniza el estado de las boletas con los pagos completados
 * Esta función debe llamarse después de cualquier updateMany() en pagos
 */
export async function syncBoletasWithCompletedPayments(paymentIds: mongoose.Types.ObjectId[]): Promise<void> {
  try {
    console.log(`🔄 Sincronizando ${paymentIds.length} pagos con sus boletas...`);

    // Obtener pagos completados
    const Pago = mongoose.model('Pago');
    const completedPayments = await Pago.find({
      _id: { $in: paymentIds },
      estadoPago: 'completado'
    });

    console.log(`💰 Encontrados ${completedPayments.length} pagos completados para sincronizar`);

    for (const payment of completedPayments) {
      console.log(`🔄 Procesando pago ${payment._id} para boleta ${payment.boletaId}`);

      // Verificar si la boleta existe y no está ya pagada
      const boleta = await Boleta.findById(payment.boletaId);

      if (boleta && boleta.estado !== 'pagada') {
        console.log(`📄 Actualizando boleta ${payment.boletaId} de '${boleta.estado}' a 'pagada'`);

        // Actualizar boleta a pagada
        await Boleta.findByIdAndUpdate(payment.boletaId, {
          estado: 'pagada'
        });

        // Actualizar deuda del usuario
        await User.findByIdAndUpdate(payment.socioId, {
          $inc: { deudaTotal: -payment.monto }
        });

        console.log(`✅ Boleta ${payment.boletaId} sincronizada - Deuda reducida en $${payment.monto}`);
      } else if (boleta) {
        console.log(`ℹ️  Boleta ${payment.boletaId} ya está marcada como '${boleta.estado}'`);
      } else {
        console.log(`❌ Boleta ${payment.boletaId} no encontrada`);
      }
    }

    console.log(`✅ Sincronización completada para ${paymentIds.length} pagos`);
  } catch (error) {
    console.error('❌ Error en sincronización de boletas:', error);
    throw error;
  }
}

/**
 * Sincroniza una boleta específica con su pago completado
 */
export async function syncSingleBoleta(paymentId: mongoose.Types.ObjectId): Promise<void> {
  return syncBoletasWithCompletedPayments([paymentId]);
}

/**
 * Sincroniza todas las boletas basándose en una referencia externa (para webhooks)
 */
export async function syncBoletasByExternalReference(externalReference: string): Promise<void> {
  try {
    console.log(`🔍 Buscando pagos con referencia externa: ${externalReference}`);

    const Pago = mongoose.model('Pago');
    const payments = await Pago.find({
      'metadata.externalReference': externalReference,
      estadoPago: 'completado'
    });

    if (payments.length > 0) {
      const paymentIds = payments.map(p => p._id);
      await syncBoletasWithCompletedPayments(paymentIds);
    } else {
      console.log(`⚠️  No se encontraron pagos completados con referencia: ${externalReference}`);
    }
  } catch (error) {
    console.error('❌ Error sincronizando por referencia externa:', error);
    throw error;
  }
}

/**
 * Sincroniza todas las boletas basándose en un PaymentId de PayPal
 */
export async function syncBoletasByPayPalPaymentId(paypalPaymentId: string): Promise<void> {
  try {
    console.log(`🔍 Buscando pagos de PayPal: ${paypalPaymentId}`);

    const Pago = mongoose.model('Pago');
    const payments = await Pago.find({
      'metadata.paypalPaymentId': paypalPaymentId,
      estadoPago: 'completado'
    });

    if (payments.length > 0) {
      const paymentIds = payments.map(p => p._id);
      await syncBoletasWithCompletedPayments(paymentIds);
    } else {
      console.log(`⚠️  No se encontraron pagos completados de PayPal: ${paypalPaymentId}`);
    }
  } catch (error) {
    console.error('❌ Error sincronizando pagos de PayPal:', error);
    throw error;
  }
}