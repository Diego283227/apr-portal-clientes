import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  isValid(): { valid: boolean; errors: string[] };
  // Información de la Organización APR
  organizacion: {
    nombreAPR: string;
    razonSocial?: string;
    rut?: string;
    direccion: string;
    comuna: string;
    region: string;
    telefono: string;
    email: string;
    sitioWeb?: string;
    logoUrl?: string;
  };

  // Configuración Regional
  regional: {
    timezone: string;           // "America/Santiago"
    moneda: string;            // "CLP"
    codigoMoneda: string;      // "CLP"
    formatoFecha: string;      // "DD/MM/YYYY"
    formatoHora: string;       // "HH:mm"
    idioma: string;            // "es"
  };

  // Configuración de Boletas y Facturación
  facturacion: {
    diaGeneracionBoletas: number;        // 1-28 (día del mes)
    diasVencimientoDefecto: number;      // días para pagar
    generacionAutomatica: boolean;
    numeracionConsecutiva: boolean;
    prefijoNumeroBoleta: string;         // "BOL-"
    digitosNumeroBoleta: number;         // cantidad de dígitos
    incluirIVA: boolean;
    porcentajeIVA: number;
  };

  // Configuración de Cortes y Reconexiones
  servicios: {
    diasGraciaCorte: number;            // días adicionales antes de corte
    costoReconexion: number;            // costo por reconectar
    horarioCorte: {
      inicio: string;                   // "08:00"
      fin: string;                     // "17:00"
      diasSemana: number[];             // [1,2,3,4,5] Lun-Vie
    };
    requiereAviso: boolean;             // avisar antes de corte
    diasAvisoCorte: number;             // días de anticipación
  };

  // Configuración de Medidores
  medidores: {
    lecturaManual: boolean;
    frecuenciaLectura: 'mensual' | 'bimensual' | 'trimestral';
    toleranciaConsumoAnormal: number;   // % de variación aceptable
    alertaFugaConsumo: number;          // m³ que activa alerta
    requiereFotoLectura: boolean;
    validacionCruzada: boolean;         // validar con lecturas anteriores
  };

  // Configuración de Notificaciones
  notificaciones: {
    habilitadas: boolean;
    emailHabilitado: boolean;
    smsHabilitado: boolean;
    horariosEnvio: {
      inicio: string;                   // "09:00"
      fin: string;                     // "18:00"
    };
    diasRecordatorio: number[];         // [7, 3, 1] días antes del vencimiento
    recordatorioPostVencimiento: boolean;
    frecuenciaRecordatorioVencido: number; // días
  };

  // Configuración de Seguridad
  seguridad: {
    sessionTimeout: number;             // minutos
    maxLoginAttempts: number;
    lockoutDuration: number;            // minutos
    passwordMinLength: number;
    passwordRequireSpecialChars: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireUppercase: boolean;
    tokenExpirationHours: number;
    auditLogRetentionDays: number;
  };

  // Configuración de Backups
  backups: {
    automatico: boolean;
    frecuencia: 'diario' | 'semanal' | 'mensual';
    horaEjecucion: string;             // "02:00"
    retencionDias: number;
    incluirArchivos: boolean;
    notificarResultado: boolean;
    emailNotificacion: string[];
  };

  // Configuración de la Aplicación
  aplicacion: {
    modoMantenimiento: boolean;
    mensajeMantenimiento?: string;
    versionApp: string;
    entorno: 'desarrollo' | 'testing' | 'produccion';
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    maxFileUploadSize: number;         // MB
    allowedFileTypes: string[];        // ['.pdf', '.jpg', '.png']
  };

  // Configuración de Integración
  integraciones: {
    paypal: {
      habilitado: boolean;
      sandbox: boolean;
      webhook: string;
      currency: string;
    };
    mercadoPago: {
      habilitado: boolean;
      country: string;
      currency: string;
      webhook: string;
    };
    email: {
      provider: 'smtp' | 'sendgrid' | 'ses';
      configuracion: any; // Configuración específica del proveedor
    };
    sms: {
      provider: 'twilio' | 'nexmo' | 'local';
      configuracion: any;
    };
  };

  // Metadatos de Configuración
  metadata: {
    version: string;
    creadoPor: mongoose.Types.ObjectId;
    fechaCreacion: Date;
    modificadoPor?: mongoose.Types.ObjectId;
    fechaModificacion?: Date;
    configuracionAnterior?: string; // JSON backup de config anterior
  };
}

const SystemConfigSchema = new Schema<ISystemConfig>({
  organizacion: {
    nombreAPR: { type: String, required: true, trim: true },
    razonSocial: { type: String, trim: true },
    rut: { type: String, trim: true },
    direccion: { type: String, required: true, trim: true },
    comuna: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    sitioWeb: { type: String, trim: true },
    logoUrl: { type: String, trim: true }
  },

  regional: {
    timezone: { type: String, default: 'America/Santiago' },
    moneda: { type: String, default: 'Peso Chileno' },
    codigoMoneda: { type: String, default: 'CLP' },
    formatoFecha: { type: String, default: 'DD/MM/YYYY' },
    formatoHora: { type: String, default: 'HH:mm' },
    idioma: { type: String, default: 'es' }
  },

  facturacion: {
    diaGeneracionBoletas: { type: Number, min: 1, max: 28, default: 1 },
    diasVencimientoDefecto: { type: Number, min: 1, max: 90, default: 30 },
    generacionAutomatica: { type: Boolean, default: false },
    numeracionConsecutiva: { type: Boolean, default: true },
    prefijoNumeroBoleta: { type: String, default: 'BOL-' },
    digitosNumeroBoleta: { type: Number, min: 3, max: 10, default: 6 },
    incluirIVA: { type: Boolean, default: false },
    porcentajeIVA: { type: Number, min: 0, max: 50, default: 19 }
  },

  servicios: {
    diasGraciaCorte: { type: Number, min: 0, max: 90, default: 5 },
    costoReconexion: { type: Number, min: 0, default: 0 },
    horarioCorte: {
      inicio: { type: String, default: '08:00' },
      fin: { type: String, default: '17:00' },
      diasSemana: { type: [Number], default: [1, 2, 3, 4, 5] } // Lun-Vie
    },
    requiereAviso: { type: Boolean, default: true },
    diasAvisoCorte: { type: Number, min: 0, max: 30, default: 3 }
  },

  medidores: {
    lecturaManual: { type: Boolean, default: true },
    frecuenciaLectura: {
      type: String,
      enum: ['mensual', 'bimensual', 'trimestral'],
      default: 'mensual'
    },
    toleranciaConsumoAnormal: { type: Number, min: 0, max: 100, default: 50 },
    alertaFugaConsumo: { type: Number, min: 0, default: 100 },
    requiereFotoLectura: { type: Boolean, default: false },
    validacionCruzada: { type: Boolean, default: true }
  },

  notificaciones: {
    habilitadas: { type: Boolean, default: true },
    emailHabilitado: { type: Boolean, default: true },
    smsHabilitado: { type: Boolean, default: false },
    horariosEnvio: {
      inicio: { type: String, default: '09:00' },
      fin: { type: String, default: '18:00' }
    },
    diasRecordatorio: { type: [Number], default: [7, 3, 1] },
    recordatorioPostVencimiento: { type: Boolean, default: true },
    frecuenciaRecordatorioVencido: { type: Number, min: 1, max: 30, default: 7 }
  },

  seguridad: {
    sessionTimeout: { type: Number, min: 5, max: 1440, default: 60 }, // minutos
    maxLoginAttempts: { type: Number, min: 3, max: 10, default: 5 },
    lockoutDuration: { type: Number, min: 5, max: 1440, default: 15 }, // minutos
    passwordMinLength: { type: Number, min: 6, max: 50, default: 8 },
    passwordRequireSpecialChars: { type: Boolean, default: true },
    passwordRequireNumbers: { type: Boolean, default: true },
    passwordRequireUppercase: { type: Boolean, default: true },
    tokenExpirationHours: { type: Number, min: 1, max: 168, default: 24 },
    auditLogRetentionDays: { type: Number, min: 30, max: 2555, default: 365 }
  },

  backups: {
    automatico: { type: Boolean, default: true },
    frecuencia: {
      type: String,
      enum: ['diario', 'semanal', 'mensual'],
      default: 'diario'
    },
    horaEjecucion: { type: String, default: '02:00' },
    retencionDias: { type: Number, min: 7, max: 365, default: 30 },
    incluirArchivos: { type: Boolean, default: true },
    notificarResultado: { type: Boolean, default: true },
    emailNotificacion: { type: [String], default: [] }
  },

  aplicacion: {
    modoMantenimiento: { type: Boolean, default: false },
    mensajeMantenimiento: { type: String, trim: true },
    versionApp: { type: String, default: '1.0.0' },
    entorno: {
      type: String,
      enum: ['desarrollo', 'testing', 'produccion'],
      default: 'desarrollo'
    },
    logLevel: {
      type: String,
      enum: ['error', 'warn', 'info', 'debug'],
      default: 'info'
    },
    maxFileUploadSize: { type: Number, min: 1, max: 100, default: 10 }, // MB
    allowedFileTypes: {
      type: [String],
      default: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
    }
  },

  integraciones: {
    paypal: {
      habilitado: { type: Boolean, default: false },
      sandbox: { type: Boolean, default: true },
      webhook: { type: String, trim: true },
      currency: { type: String, default: 'USD' }
    },
    mercadoPago: {
      habilitado: { type: Boolean, default: false },
      country: { type: String, default: 'CL' },
      currency: { type: String, default: 'CLP' },
      webhook: { type: String, trim: true }
    },
    email: {
      provider: {
        type: String,
        enum: ['smtp', 'sendgrid', 'ses'],
        default: 'smtp'
      },
      configuracion: { type: Schema.Types.Mixed, default: {} }
    },
    sms: {
      provider: {
        type: String,
        enum: ['twilio', 'nexmo', 'local'],
        default: 'twilio'
      },
      configuracion: { type: Schema.Types.Mixed, default: {} }
    }
  },

  metadata: {
    version: { type: String, default: '1.0' },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fechaCreacion: { type: Date, default: Date.now },
    modificadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fechaModificacion: { type: Date },
    configuracionAnterior: { type: String } // JSON backup
  }
}, {
  timestamps: true,
  collection: 'systemconfig' // Solo una configuración por sistema
});

// Solo una configuración del sistema puede existir
SystemConfigSchema.index({}, { unique: true });

// Middleware: Backup de configuración anterior antes de actualizar
SystemConfigSchema.pre('save', async function(next) {
  if (!this.isNew && this.isModified()) {
    // Guardar configuración anterior como backup
    const original = await mongoose.models.SystemConfig.findById(this._id).lean();
    if (original) {
      this.metadata.configuracionAnterior = JSON.stringify(original);
    }
    this.metadata.fechaModificacion = new Date();
  }
  next();
});

// Definir interface para métodos estáticos
interface ISystemConfigModel extends mongoose.Model<ISystemConfig> {
  getCurrentConfig(): Promise<ISystemConfig>;
}

// Método estático para obtener configuración actual
SystemConfigSchema.statics.getCurrentConfig = async function() {
  let config = await this.findOne();

  // Si no existe configuración, crear una por defecto
  if (!config) {
    // Crear configuración temporal sin validación estricta
    const defaultConfig = new this({
      organizacion: {
        nombreAPR: 'APR Sin Configurar',
        direccion: 'Sin configurar',
        comuna: 'Sin configurar',
        region: 'Sin configurar',
        telefono: 'Sin configurar',
        email: 'admin@apr.local'
      },
      metadata: {
        creadoPor: new mongoose.Types.ObjectId(), // ObjectId temporal
        version: '1.0'
      }
    });

    // Guardar sin validación estricta
    config = await defaultConfig.save({ validateBeforeSave: false });
  }

  return config;
};

// Método para validar configuración completa
SystemConfigSchema.methods.isValid = function(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar campos obligatorios
  if (!this.organizacion.nombreAPR) errors.push('Nombre del APR es obligatorio');
  if (!this.organizacion.email) errors.push('Email de contacto es obligatorio');
  if (!this.organizacion.telefono) errors.push('Teléfono es obligatorio');

  // Validar configuración de horarios
  const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!horaRegex.test(this.servicios.horarioCorte.inicio)) {
    errors.push('Formato de hora de inicio de corte inválido');
  }
  if (!horaRegex.test(this.servicios.horarioCorte.fin)) {
    errors.push('Formato de hora de fin de corte inválido');
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.organizacion.email)) {
    errors.push('Formato de email inválido');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default mongoose.model<ISystemConfig, ISystemConfigModel>('SystemConfig', SystemConfigSchema);