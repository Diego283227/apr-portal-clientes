import mongoose, { Schema, Document } from 'mongoose';

export interface IContacto extends Document {
  nombre: string;
  email: string;
  telefono?: string;
  mensaje: string;
  estado: 'nuevo' | 'leido' | 'respondido' | 'archivado';
  notas?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

const contactoSchema = new Schema<IContacto>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    telefono: {
      type: String,
      trim: true,
    },
    mensaje: {
      type: String,
      required: [true, 'El mensaje es requerido'],
      trim: true,
    },
    estado: {
      type: String,
      enum: ['nuevo', 'leido', 'respondido', 'archivado'],
      default: 'nuevo',
    },
    notas: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: 'creadoEn',
      updatedAt: 'actualizadoEn',
    },
  }
);

// Índices para búsqueda eficiente
contactoSchema.index({ email: 1 });
contactoSchema.index({ estado: 1 });
contactoSchema.index({ creadoEn: -1 });

const Contacto = mongoose.model<IContacto>('Contacto', contactoSchema);

export default Contacto;
