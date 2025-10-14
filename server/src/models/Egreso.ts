import mongoose, { Document, Schema } from 'mongoose';

export interface IEgreso extends Document {
  monto: number;
  fecha: Date;
  descripcion: string;
  categoria: 'mantenimiento' | 'operacion' | 'administracion' | 'suministros' | 'servicios' | 'otros';
  tipo: 'gasto_fijo' | 'gasto_variable' | 'inversion' | 'emergencia';
  responsable?: string; // ID del administrador que registró el gasto
  comprobante?: string; // URL o referencia del comprobante
  proveedor?: string;
  estado: 'pendiente' | 'aprobado' | 'pagado' | 'anulado';
  fechaCreacion: Date;
  fechaActualizacion: Date;
  metadata?: {
    numeroFactura?: string;
    metodoPago?: string;
    observaciones?: string;
    [key: string]: any;
  };
}

const EgresoSchema = new Schema<IEgreso>({
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
    trim: true,
    maxlength: 500
  },
  categoria: {
    type: String,
    enum: ['mantenimiento', 'operacion', 'administracion', 'suministros', 'servicios', 'otros'],
    required: true,
    default: 'otros'
  },
  tipo: {
    type: String,
    enum: ['gasto_fijo', 'gasto_variable', 'inversion', 'emergencia'],
    required: true,
    default: 'gasto_variable'
  },
  responsable: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  comprobante: {
    type: String,
    trim: true
  },
  proveedor: {
    type: String,
    trim: true,
    maxlength: 200
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aprobado', 'pagado', 'anulado'],
    required: true,
    default: 'pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Índices para optimizar consultas
EgresoSchema.index({ fecha: 1 });
EgresoSchema.index({ categoria: 1 });
EgresoSchema.index({ estado: 1 });
EgresoSchema.index({ responsable: 1 });
EgresoSchema.index({ fechaCreacion: -1 });

// Middleware para actualizar fechaActualizacion
EgresoSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Métodos de instancia
EgresoSchema.methods.aprobar = function() {
  this.estado = 'aprobado';
  return this.save();
};

EgresoSchema.methods.marcarComoPagado = function() {
  this.estado = 'pagado';
  return this.save();
};

EgresoSchema.methods.anular = function() {
  this.estado = 'anulado';
  return this.save();
};

// Métodos estáticos
EgresoSchema.statics.obtenerEgresosPorPeriodo = function(fechaInicio: Date, fechaFin: Date) {
  return this.aggregate([
    {
      $match: {
        fecha: { $gte: fechaInicio, $lte: fechaFin },
        estado: { $in: ['aprobado', 'pagado'] }
      }
    },
    {
      $group: {
        _id: '$categoria',
        totalMonto: { $sum: '$monto' },
        cantidad: { $sum: 1 }
      }
    }
  ]);
};

EgresoSchema.statics.obtenerTotalEgresos = function(fechaInicio: Date, fechaFin: Date) {
  return this.aggregate([
    {
      $match: {
        fecha: { $gte: fechaInicio, $lte: fechaFin },
        estado: { $in: ['aprobado', 'pagado'] }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$monto' },
        cantidad: { $sum: 1 }
      }
    }
  ]);
};

export default mongoose.model<IEgreso>('Egreso', EgresoSchema);