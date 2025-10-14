import mongoose, { Document, Schema } from 'mongoose';

export interface IMeterAlert extends Document {
  meterId: mongoose.Types.ObjectId;
  alertType: 'leak' | 'tamper' | 'low_battery' | 'communication_loss' | 'high_consumption' | 'sensor_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
  status: 'active' | 'resolved' | 'false_positive';
  metadata?: any;
  notificationsSent: {
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  };
}

const MeterAlertSchema = new Schema<IMeterAlert>({
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmartMeter',
    required: true
  },
  alertType: {
    type: String,
    enum: ['leak', 'tamper', 'low_battery', 'communication_loss', 'high_consumption', 'sensor_error'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  triggeredAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'false_positive'],
    default: 'active'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  notificationsSent: {
    sms: {
      type: Boolean,
      default: false
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

MeterAlertSchema.index({ meterId: 1, status: 1 });
MeterAlertSchema.index({ severity: 1, status: 1, triggeredAt: -1 });
MeterAlertSchema.index({ alertType: 1, status: 1 });
MeterAlertSchema.index({ triggeredAt: -1 });

export default mongoose.model<IMeterAlert>('MeterAlert', MeterAlertSchema);