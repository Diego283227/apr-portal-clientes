import mongoose, { Document, Schema } from 'mongoose';

export interface IIngreso extends Document {
  monto: number;
  fecha: Date;
  descripcion: string;
  tipo: 'pago_boleta' | 'otro';
  pagoId?: mongoose.Types.ObjectId;
  socioId: mongoose.Types.ObjectId;
  metodoPago: 'paypal' | 'webpay' | 'flow' | 'mercadopago' | 'transferencia' | 'efectivo';
  boletaIds: mongoose.Types.ObjectId[];
  transactionId?: string;
  metadata?: {
    paypalPaymentId?: string;
    webpayTransactionId?: string;
    flowCommerceOrder?: string;
    mercadopagoPaymentId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const IngresoSchema: Schema = new Schema({
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['pago_boleta', 'otro'],
    required: true,
    default: 'pago_boleta'
  },
  pagoId: {
    type: Schema.Types.ObjectId,
    ref: 'Pago',
    index: true
  },
  socioId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  metodoPago: {
    type: String,
    enum: ['paypal', 'webpay', 'flow', 'mercadopago', 'transferencia', 'efectivo'],
    required: true,
    index: true
  },
  boletaIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Boleta'
  }],
  transactionId: {
    type: String,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'ingresos'
});

// Índices para mejorar performance
IngresoSchema.index({ fecha: -1 });
IngresoSchema.index({ tipo: 1, fecha: -1 });
IngresoSchema.index({ metodoPago: 1, fecha: -1 });
IngresoSchema.index({ socioId: 1, fecha: -1 });
IngresoSchema.index({ pagoId: 1 }, { unique: true, sparse: true });

// Middleware para formatear datos antes de guardar
IngresoSchema.pre('save', function(next) {
  if (this.isNew) {
    this.fecha = this.fecha || new Date();
  }
  next();
});

export default mongoose.model<IIngreso>('Ingreso', IngresoSchema);