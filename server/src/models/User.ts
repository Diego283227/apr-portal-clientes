import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
  role: 'socio' | 'admin' | 'super_admin';
  fechaIngreso: Date;
  activo: boolean;
  profilePhoto?: string;
  // Campos específicos para socios
  codigoSocio?: string;
  saldoActual?: number;
  deudaTotal?: number;
  categoriaUsuario?: 'residencial' | 'comercial' | 'industrial' | 'tercera_edad';
  medidor?: {
    numero: string;
    ubicacion?: string;
    fechaInstalacion?: Date;
    lecturaInicial?: number;
    estado?: 'active' | 'inactive' | 'maintenance' | 'error';
  };
  // Campos específicos para admins
  permisos?: string[];
  // Configuración de notificaciones SMS
  smsNotifications?: {
    enabled: boolean;
    nuevaBoleta: boolean;
    recordatorioPago: boolean;
    confirmacionPago: boolean;
    phoneVerified: boolean;
  };
  // WhatsApp notifications removed
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  rut: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombres: {
    type: String,
    required: true,
    trim: true
  },
  apellidos: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  telefono: {
    type: String,
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['socio', 'admin', 'super_admin'],
    default: 'socio'
  },
  fechaIngreso: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  // Campos específicos para socios
  codigoSocio: {
    type: String,
    unique: true,
    sparse: true
  },
  saldoActual: {
    type: Number,
    default: 0
  },
  deudaTotal: {
    type: Number,
    default: 0
  },
  categoriaUsuario: {
    type: String,
    enum: ['residencial', 'comercial', 'industrial', 'tercera_edad'],
    default: 'residencial'
  },
  medidor: {
    numero: { type: String, trim: true },
    ubicacion: { type: String, trim: true },
    fechaInstalacion: { type: Date },
    lecturaInicial: { type: Number, min: 0 },
    estado: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'error'],
      default: 'active'
    }
  },
  // Campos específicos para admins
  permisos: [{
    type: String
  }],
  // Configuración de notificaciones SMS
  smsNotifications: {
    enabled: {
      type: Boolean,
      default: false
    },
    nuevaBoleta: {
      type: Boolean,
      default: true
    },
    recordatorioPago: {
      type: Boolean,
      default: true
    },
    confirmacionPago: {
      type: Boolean,
      default: true
    },
    phoneVerified: {
      type: Boolean,
      default: false
    }
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  // WhatsApp notifications schema removed
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Generate codigo socio for socios
UserSchema.pre('save', async function(next) {
  if (this.role === 'socio' && !this.codigoSocio) {
    let codigoSocio: string;
    let exists = true;

    // Keep generating until we find a unique code
    while (exists) {
      const randomNum = Math.floor(Math.random() * 100000);
      codigoSocio = `SOC${randomNum.toString().padStart(5, '0')}`;

      // Check if this code already exists
      const existingUser = await mongoose.models.User.findOne({ codigoSocio });
      exists = !!existingUser;
    }

    this.codigoSocio = codigoSocio!;
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
UserSchema.virtual('nombre').get(function() {
  return `${this.nombres} ${this.apellidos}`;
});

export default mongoose.model<IUser>('User', UserSchema);