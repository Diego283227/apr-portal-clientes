import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  tipo: 'boleta' | 'mensaje' | 'sms' | 'sistema';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: Date;
  referencia?: {
    tipo: 'boleta' | 'mensaje' | 'sms';
    id: mongoose.Types.ObjectId;
  };
  metadatos?: {
    [key: string]: any;
  };
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['boleta', 'mensaje', 'sms', 'sistema'],
    required: true
  },
  titulo: {
    type: String,
    required: true,
    maxlength: 200
  },
  mensaje: {
    type: String,
    required: true,
    maxlength: 500
  },
  leida: {
    type: Boolean,
    default: false
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  referencia: {
    tipo: {
      type: String,
      enum: ['boleta', 'mensaje', 'sms']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  metadatos: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ userId: 1, leida: 1, fechaCreacion: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);