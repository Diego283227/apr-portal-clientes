import mongoose, { Document, Schema } from 'mongoose';

export interface IPago extends Document {
  boletaId: mongoose.Types.ObjectId;
  socioId: mongoose.Types.ObjectId;
  monto: number;
  fechaPago: Date;
  metodoPago: 'webpay' | 'flow' | 'mercadopago' | 'paypal' | 'transferencia' | 'efectivo';
  estadoPago: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  transactionId: string;
  detallesPago?: {
    numeroTransaccion?: string;
    codigoAutorizacion?: string;
    numeroTarjeta?: string;
    tipoTarjeta?: string;
    banco?: string;
  };
  metadata?: Record<string, any>;
}

export interface IPagoModel extends mongoose.Model<IPago> {
  updateBoletaStatus(paymentId: mongoose.Types.ObjectId): Promise<void>;
}

const PagoSchema = new Schema<IPago>({
  boletaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boleta',
    required: true
  },
  socioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  fechaPago: {
    type: Date,
    default: Date.now
  },
  metodoPago: {
    type: String,
    enum: ['webpay', 'flow', 'mercadopago', 'paypal', 'transferencia', 'efectivo'],
    required: true
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'completado', 'fallido', 'reembolsado'],
    default: 'pendiente'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  detallesPago: {
    numeroTransaccion: String,
    codigoAutorizacion: String,
    numeroTarjeta: String,
    tipoTarjeta: String,
    banco: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Update boleta status when payment is completed - works for individual saves
PagoSchema.post('save', async function(doc) {
  if (doc.estadoPago === 'completado') {
    console.log(`🔄 Payment ${doc._id} completed, updating boleta ${doc.boletaId} to 'pagada'`);

    // Check if boleta is already paid to avoid double processing
    const boleta = await mongoose.models.Boleta.findById(doc.boletaId);
    if (boleta && boleta.estado !== 'pagada') {
      await mongoose.models.Boleta.findByIdAndUpdate(doc.boletaId, {
        estado: 'pagada'
      });

      // Update user saldo - only if boleta was not already paid
      await mongoose.models.User.findByIdAndUpdate(doc.socioId, {
        $inc: { saldoActual: doc.monto, deudaTotal: -doc.monto }
      });
      console.log(`✅ Boleta ${doc.boletaId} updated to 'pagada' and user balance updated by ${doc.monto}`);
    } else if (boleta) {
      console.log(`ℹ️  Boleta ${doc.boletaId} already marked as 'pagada', skipping user balance update`);
    }
  }
});

// Static method to handle boleta status update after payment completion
PagoSchema.statics.updateBoletaStatus = async function(paymentId: mongoose.Types.ObjectId) {
  try {
    const payment = await this.findById(paymentId);
    if (!payment) {
      console.log(`❌ Payment ${paymentId} not found`);
      return;
    }

    if (payment.estadoPago === 'completado') {
      console.log(`💰 Processing completed payment ${paymentId} for boleta ${payment.boletaId}`);

      // Check if boleta exists and update its status
      const boleta = await mongoose.models.Boleta.findById(payment.boletaId);
      if (boleta && boleta.estado !== 'pagada') {
        console.log(`🔄 Updating boleta ${payment.boletaId} from '${boleta.estado}' to 'pagada'`);

        await mongoose.models.Boleta.findByIdAndUpdate(payment.boletaId, {
          estado: 'pagada'
        });

        // Update user balance - only if not already updated
        const user = await mongoose.models.User.findById(payment.socioId);
        if (user) {
          await mongoose.models.User.findByIdAndUpdate(payment.socioId, {
            $inc: { saldoActual: payment.monto, deudaTotal: -payment.monto }
          });
          console.log(`✅ Boleta ${payment.boletaId} updated to 'pagada' and user balance updated by ${payment.monto}`);
        }
      } else if (boleta) {
        console.log(`ℹ️  Boleta ${payment.boletaId} already marked as '${boleta.estado}'`);
      } else {
        console.log(`❌ Boleta ${payment.boletaId} not found`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating boleta status:', error);
  }
};

export default mongoose.model<IPago, IPagoModel>('Pago', PagoSchema);