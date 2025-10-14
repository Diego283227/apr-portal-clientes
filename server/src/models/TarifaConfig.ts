import mongoose, { Document, Schema } from 'mongoose';

export interface ITarifaConfig extends Document {
  nombre: string;
  descripcion?: string;
  activa: boolean;
  estado?: 'activa' | 'pausada' | 'finalizada' | 'borrador';
  fechaVigencia: Date;
  fechaVencimiento?: Date;
  fechaPausa?: Date;

  // Configuración de cargo fijo
  cargoFijo: {
    residencial: number;
    comercial: number;
    industrial: number;
    terceraEdad: number;
  };

  // Tarifas escalonadas por consumo
  escalones: Array<{
    desde: number;      // m³ desde
    hasta: number;      // m³ hasta (-1 para infinito)
    tarifaResidencial: number;
    tarifaComercial: number;
    tarifaIndustrial: number;
    tarifaTerceraEdad: number;
  }>;

  // Configuraciones estacionales
  temporadas?: Array<{
    nombre: string;     // "Verano", "Invierno"
    mesInicio: number;  // 1-12
    mesFin: number;     // 1-12
    factorMultiplicador: number; // 1.0 = normal, 1.2 = +20%
  }>;

  // Descuentos automáticos
  descuentos: Array<{
    tipo: 'porcentaje' | 'monto_fijo' | 'consumo_minimo';
    nombre: string;
    descripcion: string;
    valor: number;
    condiciones: {
      consumoMinimo?: number;
      consumoMaximo?: number;
      categoriaUsuario?: string[];
      mesesConsecutivos?: number;
      pagoAnticipado?: boolean;
    };
    activo: boolean;
  }>;

  // Recargos por mora
  recargos: {
    diasGracia: number;
    porcentajeMora: number;  // % diario
    porcentajeMaximo: number; // % máximo acumulable
    cargoReconexion: number;
  };

  // Configuración adicional
  configuracion: {
    redondeoDecimales: number;
    aplicarIVA: boolean;
    porcentajeIVA?: number;
    subsidioEstatal?: {
      activo: boolean;
      porcentajeDescuento: number;
      consumoMaximo: number;
    };
  };

  // Auditoría
  creadoPor: mongoose.Types.ObjectId;
  fechaCreacion: Date;
  modificadoPor?: mongoose.Types.ObjectId;
  fechaModificacion?: Date;
}

const TarifaConfigSchema = new Schema<ITarifaConfig>({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  activa: {
    type: Boolean,
    default: false
  },
  estado: {
    type: String,
    enum: ['activa', 'pausada', 'finalizada', 'borrador'],
    default: 'borrador'
  },
  fechaVigencia: {
    type: Date,
    required: true
  },
  fechaVencimiento: {
    type: Date
  },
  fechaPausa: {
    type: Date
  },
  cargoFijo: {
    residencial: { type: Number, required: true, min: 0 },
    comercial: { type: Number, required: true, min: 0 },
    industrial: { type: Number, required: true, min: 0 },
    terceraEdad: { type: Number, required: true, min: 0 }
  },
  escalones: [{
    desde: { type: Number, required: true, min: 0 },
    hasta: { type: Number, required: true, min: -1 }, // -1 = infinito
    tarifaResidencial: { type: Number, required: true, min: 0 },
    tarifaComercial: { type: Number, required: true, min: 0 },
    tarifaIndustrial: { type: Number, required: true, min: 0 },
    tarifaTerceraEdad: { type: Number, required: true, min: 0 }
  }],
  temporadas: [{
    nombre: { type: String, required: true },
    mesInicio: { type: Number, required: true, min: 1, max: 12 },
    mesFin: { type: Number, required: true, min: 1, max: 12 },
    factorMultiplicador: { type: Number, required: true, min: 0.5, max: 3.0 }
  }],
  descuentos: [{
    tipo: {
      type: String,
      enum: ['porcentaje', 'monto_fijo', 'consumo_minimo'],
      required: true
    },
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    valor: { type: Number, required: true, min: 0 },
    condiciones: {
      consumoMinimo: { type: Number, min: 0 },
      consumoMaximo: { type: Number, min: 0 },
      categoriaUsuario: [{ type: String }],
      mesesConsecutivos: { type: Number, min: 1 },
      pagoAnticipado: { type: Boolean }
    },
    activo: { type: Boolean, default: true }
  }],
  recargos: {
    diasGracia: { type: Number, required: true, min: 0, max: 90 },
    porcentajeMora: { type: Number, required: true, min: 0, max: 10 },
    porcentajeMaximo: { type: Number, required: true, min: 0, max: 100 },
    cargoReconexion: { type: Number, required: true, min: 0 }
  },
  configuracion: {
    redondeoDecimales: { type: Number, default: 0, min: 0, max: 2 },
    aplicarIVA: { type: Boolean, default: false },
    porcentajeIVA: { type: Number, min: 0, max: 50 },
    subsidioEstatal: {
      activo: { type: Boolean, default: false },
      porcentajeDescuento: { type: Number, min: 0, max: 100 },
      consumoMaximo: { type: Number, min: 0 }
    }
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  modificadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaModificacion: {
    type: Date
  }
}, {
  timestamps: true
});

// Índices para performance
TarifaConfigSchema.index({ activa: 1, fechaVigencia: 1 });
TarifaConfigSchema.index({ fechaVigencia: 1, fechaVencimiento: 1 });

// Middleware: Solo una tarifa activa a la vez
TarifaConfigSchema.pre('save', async function(next) {
  if (this.activa && (this.isNew || this.isModified('activa'))) {
    // Desactivar otras tarifas activas
    await mongoose.models.TarifaConfig.updateMany(
      { _id: { $ne: this._id }, activa: true },
      { $set: { activa: false, estado: 'pausada' } }
    );
    console.log('✅ Desactivadas otras configuraciones de tarifa');
  }

  // Sincronizar estado con campo activa
  if (this.isNew || this.isModified('activa')) {
    if (this.activa) {
      this.estado = 'activa';
    } else if (!this.estado || this.estado === 'activa') {
      this.estado = 'borrador';
    }
  }

  next();
});

export default mongoose.model<ITarifaConfig>('TarifaConfig', TarifaConfigSchema);