import mongoose, { Schema, Document } from 'mongoose';

export interface ILectura extends Document {
  socioId: mongoose.Types.ObjectId;
  numeroMedidor: string;
  codigoCliente?: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoM3: number;
  periodo: Date;
  fechaLectura: Date;
  horaLectura?: string;
  nombreLector?: string;
  observaciones?: string;
  incidencias?: string;
  lecturaEsCero?: boolean;
  registradoPor: mongoose.Types.ObjectId;
  fotoMedidor?: string;
  boletaGenerada?: mongoose.Types.ObjectId;
  estado: 'pendiente' | 'procesada' | 'cancelada';
  fechaCreacion: Date;
}

const LecturaSchema: Schema = new Schema({
  socioId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  numeroMedidor: {
    type: String,
    required: true
  },
  codigoCliente: {
    type: String
  },
  lecturaAnterior: {
    type: Number,
    required: true,
    min: 0
  },
  lecturaActual: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(this: ILectura, value: number) {
        return value >= this.lecturaAnterior;
      },
      message: 'La lectura actual debe ser mayor o igual a la lectura anterior'
    }
  },
  consumoM3: {
    type: Number,
    required: true,
    min: 0
  },
  periodo: {
    type: Date,
    required: true,
    index: true
  },
  fechaLectura: {
    type: Date,
    required: true,
    default: Date.now
  },
  horaLectura: {
    type: String
  },
  nombreLector: {
    type: String,
    maxlength: 200
  },
  observaciones: {
    type: String,
    maxlength: 500
  },
  incidencias: {
    type: String,
    maxlength: 1000
  },
  lecturaEsCero: {
    type: Boolean,
    default: false
  },
  registradoPor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fotoMedidor: {
    type: String
  },
  boletaGenerada: {
    type: Schema.Types.ObjectId,
    ref: 'Boleta'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'procesada', 'cancelada'],
    default: 'pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index compuesto para evitar duplicados
LecturaSchema.index({ socioId: 1, periodo: 1 }, { unique: true });

// Pre-save hook para calcular consumo
LecturaSchema.pre<ILectura>('save', function(next) {
  if (this.isModified('lecturaActual') || this.isModified('lecturaAnterior')) {
    this.consumoM3 = this.lecturaActual - this.lecturaAnterior;
  }
  next();
});

export default mongoose.model<ILectura>('Lectura', LecturaSchema);
