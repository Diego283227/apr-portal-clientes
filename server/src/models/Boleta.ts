import mongoose, { Document, Schema } from 'mongoose';

export interface IBoleta extends Document {
  numeroBoleta: string;
  socioId: mongoose.Types.ObjectId;
  fechaEmision: Date;
  fechaVencimiento: Date;
  consumoM3: number;
  montoTotal: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada' | 'archivada';
  pagada: boolean; // Marca permanente de si la boleta fue pagada alguna vez
  fechaPago?: Date; // Fecha en que se marcó como pagada
  detalle: {
    consumoAnterior: number;
    consumoActual: number;
    tarifaM3?: number; // Opcional para compatibilidad con sistema anterior
    cargoFijo: number;
    costoConsumo?: number; // Nuevo campo para sistema de tarifas
    otrosCargos?: number;
    descuentos: number;
    recargos?: number; // Nuevo campo para recargos por mora
    detalleCalculo?: any; // Detalle completo del cálculo de TarifaService
    tarifaCalculada?: any; // Cálculo completo del TarifaService
  };
  lecturaAnterior: number;
  lecturaActual: number;
  periodo: string;
}

const BoletaSchema = new Schema<IBoleta>({
  numeroBoleta: {
    type: String,
    required: true,
    unique: true
  },
  socioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaEmision: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaVencimiento: {
    type: Date,
    required: true
  },
  consumoM3: {
    type: Number,
    required: true,
    min: 0
  },
  montoTotal: {
    type: Number,
    required: true,
    min: 0
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagada', 'vencida', 'anulada', 'archivada'],
    default: 'pendiente'
  },
  pagada: {
    type: Boolean,
    default: false
  },
  fechaPago: {
    type: Date,
    required: false
  },
  detalle: {
    consumoAnterior: {
      type: Number,
      required: true,
      min: 0
    },
    consumoActual: {
      type: Number,
      required: true,
      min: 0
    },
    tarifaM3: {
      type: Number,
      required: false, // Opcional para compatibilidad
      min: 0
    },
    cargoFijo: {
      type: Number,
      required: true,
      min: 0
    },
    costoConsumo: {
      type: Number,
      required: false,
      min: 0
    },
    otrosCargos: {
      type: Number,
      default: 0,
      min: 0
    },
    descuentos: {
      type: Number,
      default: 0,
      min: 0
    },
    recargos: {
      type: Number,
      default: 0,
      min: 0
    },
    detalleCalculo: {
      type: mongoose.Schema.Types.Mixed, // Permite cualquier estructura
      required: false
    },
    tarifaCalculada: {
      type: mongoose.Schema.Types.Mixed, // Permite cualquier estructura
      required: false
    }
  },
  lecturaAnterior: {
    type: Number,
    required: true,
    min: 0
  },
  lecturaActual: {
    type: Number,
    required: true,
    min: 0
  },
  periodo: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Pre-validate middleware: Calculate all fields before validation
BoletaSchema.pre('validate', async function(next) {
  try {
    // 1. Auto-generate numero boleta
    if (!this.numeroBoleta) {
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const count = await mongoose.models.Boleta.countDocuments({
        fechaEmision: {
          $gte: new Date(year, new Date().getMonth(), 1),
          $lt: new Date(year, new Date().getMonth() + 1, 1)
        }
      });
      this.numeroBoleta = `${year}${month}${(count + 1).toString().padStart(3, '0')}`;
      console.log(`🔢 Generated boleta number: ${this.numeroBoleta}`);
    }

    // 2. Calculate consumo
    if (this.lecturaActual !== undefined && this.lecturaAnterior !== undefined) {
      this.consumoM3 = this.lecturaActual - this.lecturaAnterior;
      this.detalle.consumoAnterior = this.lecturaAnterior;
      this.detalle.consumoActual = this.lecturaActual;
      console.log(`💧 Calculated consumo: ${this.consumoM3} m³`);
    }

    // 3. Calculate total amount (solo para el sistema anterior con tarifaM3)
    if (this.consumoM3 !== undefined && this.detalle.tarifaM3 !== undefined) {
      const consumoCost = this.consumoM3 * this.detalle.tarifaM3;
      const otrosCargos = this.detalle.otrosCargos || 0;
      const descuentos = this.detalle.descuentos || 0;
      this.montoTotal = this.detalle.cargoFijo + consumoCost + otrosCargos - descuentos;
      console.log(`💰 Calculated total amount: $${this.montoTotal}`);
    }
    // Note: Para el nuevo sistema con TarifaService, montoTotal ya viene calculado

    // 4. Update estado based on fecha vencimiento
    if (this.estado === 'pendiente' && new Date() > this.fechaVencimiento) {
      this.estado = 'vencida';
    }

  } catch (error) {
    console.error('Error in pre-validate middleware:', error);
    return next(error);
  }

  next();
});

// Pre-save middleware: Update user debt when boleta status changes
BoletaSchema.pre('save', async function(next) {
  try {
    const User = mongoose.model('User');

    // Get original boleta data if not new
    let originalEstado: string | undefined;
    let originalPagada: boolean = false;

    if (!this.isNew) {
      const original = await mongoose.models.Boleta.findById(this._id).lean() as any;
      originalEstado = original?.estado;
      originalPagada = original?.pagada || false;
    }

    // CRITICAL: Prevent changing estado if boleta was already paid
    if (!this.isNew && this.isModified('estado') && originalPagada) {
      const error = new Error(
        `No se puede cambiar el estado de la boleta ${this.numeroBoleta} porque ya fue pagada. ` +
        `Las boletas pagadas son inmutables.`
      );
      console.error(`🚫 ${error.message}`);
      return next(error);
    }

    // Mark boleta as permanently paid when estado changes to 'pagada'
    if (this.isModified('estado') && this.estado === 'pagada' && !this.pagada) {
      this.pagada = true;
      this.fechaPago = new Date();
      console.log(`✅ Boleta ${this.numeroBoleta} marked as permanently paid`);
    }

    // Check if this is a new boleta or if estado changed
    if (this.isNew || this.isModified('estado')) {

      const wasVencida = this.isNew ? false : originalEstado === 'vencida';
      const isNowVencida = this.estado === 'vencida';
      const wasNotVencida = this.isNew ? true : originalEstado !== 'vencida';

      console.log(`💰 Boleta ${this.numeroBoleta} - Estado change:`, {
        isNew: this.isNew,
        from: originalEstado || 'new',
        to: this.estado,
        amount: this.montoTotal,
        socioId: this.socioId,
        pagada: this.pagada,
        originalPagada: originalPagada
      });

      // IMPORTANT: Never add to debt if boleta was already paid (check both current and original)
      if (this.pagada || originalPagada) {
        console.log(`⚠️ Boleta ${this.numeroBoleta} was already paid. Not adding to debt.`);
      }
      // Case 1: Boleta becomes 'vencida' - ADD to debt (only if not paid)
      else if (isNowVencida && wasNotVencida) {
        console.log(`📈 Adding ${this.montoTotal} to debt for user ${this.socioId}`);
        await User.findByIdAndUpdate(
          this.socioId,
          { $inc: { deudaTotal: this.montoTotal } },
          { new: true }
        );
      }
      // Case 2: Boleta was 'vencida' but now is NOT 'vencida' (paid/cancelled) - REMOVE from debt
      else if (wasVencida && !isNowVencida) {
        console.log(`📉 Removing ${this.montoTotal} from debt for user ${this.socioId}`);
        await User.findByIdAndUpdate(
          this.socioId,
          { $inc: { deudaTotal: -this.montoTotal } },
          { new: true }
        );
      }
    }
  } catch (error) {
    console.error('❌ Error updating user debt in Boleta pre-save:', error);
    return next(error);
  }

  next();
});

export default mongoose.model<IBoleta>('Boleta', BoletaSchema);