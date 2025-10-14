import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ISuperAdmin extends Document {
  username: string;
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  direccion?: string;
  role: 'super_admin';
  activo: boolean;
  profilePhoto?: string;
  ultimoAcceso?: Date;
  fechaCreacion: Date;
  permisos: {
    gestionUsuarios: boolean;
    gestionBoletas: boolean;
    gestionPagos: boolean;
    reportes: boolean;
    configuracion: boolean;
    auditoria: boolean;
  };
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const SuperAdminSchema = new Schema<ISuperAdmin>({
  username: {
    type: String,
    required: [true, 'Username es requerido'],
    unique: true,
    trim: true,
    minlength: [3, 'Username debe tener al menos 3 caracteres'],
    maxlength: [30, 'Username no puede exceder 30 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Password es requerido'],
    minlength: [8, 'Password debe tener al menos 8 caracteres'],
    select: false
  },
  nombres: {
    type: String,
    required: [true, 'Nombres son requeridos'],
    trim: true,
    maxlength: [100, 'Nombres no pueden exceder 100 caracteres']
  },
  apellidos: {
    type: String,
    required: [true, 'Apellidos son requeridos'],
    trim: true,
    maxlength: [100, 'Apellidos no pueden exceder 100 caracteres']
  },
  telefono: {
    type: String,
    trim: true,
    maxlength: [20, 'Teléfono no puede exceder 20 caracteres']
  },
  direccion: {
    type: String,
    trim: true,
    maxlength: [200, 'Dirección no puede exceder 200 caracteres']
  },
  role: {
    type: String,
    default: 'super_admin',
    enum: ['super_admin']
  },
  activo: {
    type: Boolean,
    default: true
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  ultimoAcceso: {
    type: Date
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  permisos: {
    gestionUsuarios: {
      type: Boolean,
      default: true
    },
    gestionBoletas: {
      type: Boolean,
      default: true
    },
    gestionPagos: {
      type: Boolean,
      default: true
    },
    reportes: {
      type: Boolean,
      default: true
    },
    configuracion: {
      type: Boolean,
      default: true
    },
    auditoria: {
      type: Boolean,
      default: true
    }
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  collection: 'superadmins'
});

// Index for better performance
SuperAdminSchema.index({ username: 1 });
SuperAdminSchema.index({ email: 1 });
SuperAdminSchema.index({ activo: 1 });

// Hash password before saving
SuperAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
SuperAdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Update last access on login
SuperAdminSchema.methods.updateLastAccess = function() {
  this.ultimoAcceso = new Date();
  return this.save();
};

export const SuperAdmin = mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);