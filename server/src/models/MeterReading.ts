import mongoose, { Document, Schema } from 'mongoose';

export interface IMeterReading extends Document {
  meterId: mongoose.Types.ObjectId;
  timestamp: Date;
  currentReading: number;
  flowRate?: number;
  temperature?: number;
  pressure?: number;
  batteryLevel?: number;
  signalStrength?: number;
  dataQuality: 'good' | 'fair' | 'poor' | 'invalid';
  consumptionSinceLast?: number;
  metadata?: any;
}

const MeterReadingSchema = new Schema<IMeterReading>({
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmartMeter',
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentReading: {
    type: Number,
    required: true,
    min: 0
  },
  flowRate: {
    type: Number,
    min: 0
  },
  temperature: {
    type: Number,
    min: -50,
    max: 100
  },
  pressure: {
    type: Number,
    min: 0
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  signalStrength: {
    type: Number,
    min: -150,
    max: 0
  },
  dataQuality: {
    type: String,
    enum: ['good', 'fair', 'poor', 'invalid'],
    default: 'good'
  },
  consumptionSinceLast: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  timeseries: {
    timeField: 'timestamp',
    metaField: 'meterId',
    granularity: 'minutes'
  }
});

MeterReadingSchema.index({ meterId: 1, timestamp: -1 });
MeterReadingSchema.index({ timestamp: -1 });
MeterReadingSchema.index({ dataQuality: 1, timestamp: -1 });

export default mongoose.model<IMeterReading>('MeterReading', MeterReadingSchema);