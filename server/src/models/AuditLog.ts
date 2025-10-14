import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  usuario: {
    id: string;
    tipo: 'socio' | 'super_admin';
    nombre: string;
    identificador: string; // RUT para socios, username para super admins
  };
  accion: string;
  modulo: string;
  descripcion: string;
  detalles?: {
    entidadTipo?: string;
    entidadId?: string;
    datosAnteriores?: any;
    datosNuevos?: any;
    ip?: string;
    userAgent?: string;
  };
  resultado: 'exitoso' | 'fallido' | 'error';
  timestamp: Date;
  metadata?: {
    duracion?: number;
    errorCode?: string;
    errorMessage?: string;
  };
}

const AuditLogSchema = new Schema<IAuditLog>({
  usuario: {
    id: {
      type: String,
      required: true,
      index: true
    },
    tipo: {
      type: String,
      required: true,
      enum: ['socio', 'super_admin'],
      index: true
    },
    nombre: {
      type: String,
      required: true
    },
    identificador: {
      type: String,
      required: true,
      index: true
    }
  },
  accion: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  modulo: {
    type: String,
    required: true,
    index: true,
    enum: [
      'autenticacion',
      'usuarios',
      'boletas',
      'pagos',
      'perfil',
      'sistema',
      'reportes',
      'configuracion',
      'gestion',
      'comunicacion',
      'notificaciones',
      'seguridad',
      'auditoria'
    ]
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  detalles: {
    entidadTipo: {
      type: String,
      trim: true
    },
    entidadId: {
      type: String,
      index: true
    },
    datosAnteriores: Schema.Types.Mixed,
    datosNuevos: Schema.Types.Mixed,
    ip: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    }
  },
  resultado: {
    type: String,
    required: true,
    enum: ['exitoso', 'fallido', 'error'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    duracion: Number,
    errorCode: String,
    errorMessage: String
  }
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'audit_logs'
});

// Indexes for better query performance
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ 'usuario.tipo': 1, timestamp: -1 });
AuditLogSchema.index({ modulo: 1, timestamp: -1 });
AuditLogSchema.index({ accion: 1, timestamp: -1 });
AuditLogSchema.index({ resultado: 1, timestamp: -1 });

// Compound indexes for common queries
AuditLogSchema.index({ 'usuario.id': 1, timestamp: -1 });
AuditLogSchema.index({ modulo: 1, accion: 1, timestamp: -1 });

// TTL index to automatically delete old logs after 2 years
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);