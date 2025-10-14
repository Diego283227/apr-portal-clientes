import mongoose, { Document, Schema } from 'mongoose';

export interface ISmartMeter extends Document {
  meterId: string;
  socioId: mongoose.Types.ObjectId;
  serialNumber: string;
  meterModel: string;
  manufacturer: string;
  installationDate: Date;
  location: {
    lat?: number;
    lng?: number;
    description?: string;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  communicationType: 'lorawan' | 'nbiot' | 'wifi' | 'zigbee' | 'cellular';
  gatewayId?: mongoose.Types.ObjectId;
  lastReadingDate?: Date;
  calibrationFactor: number;
  firmwareVersion?: string;
  configuration: {
    readingIntervalMinutes: number;
    transmissionIntervalMinutes: number;
    leakThresholdLPM: number;
    highConsumptionThresholdLD: number;
    lowBatteryThreshold: number;
    tamperSensitivity: 'low' | 'medium' | 'high';
    dataRetentionDays: number;
  };
}

const SmartMeterSchema = new Schema<ISmartMeter>({
  meterId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  socioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  meterModel: {
    type: String,
    required: true,
    trim: true
  },
  manufacturer: {
    type: String,
    required: true,
    trim: true
  },
  installationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  location: {
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    },
    description: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active'
  },
  communicationType: {
    type: String,
    enum: ['lorawan', 'nbiot', 'wifi', 'zigbee', 'cellular'],
    required: true
  },
  gatewayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gateway'
  },
  lastReadingDate: {
    type: Date
  },
  calibrationFactor: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 10.0
  },
  firmwareVersion: {
    type: String,
    trim: true
  },
  configuration: {
    readingIntervalMinutes: {
      type: Number,
      default: 60,
      min: 1,
      max: 1440
    },
    transmissionIntervalMinutes: {
      type: Number,
      default: 60,
      min: 1,
      max: 1440
    },
    leakThresholdLPM: {
      type: Number,
      default: 1.0,
      min: 0.1
    },
    highConsumptionThresholdLD: {
      type: Number,
      default: 500,
      min: 1
    },
    lowBatteryThreshold: {
      type: Number,
      default: 20,
      min: 5,
      max: 50
    },
    tamperSensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    dataRetentionDays: {
      type: Number,
      default: 1095,
      min: 30
    }
  }
}, {
  timestamps: true
});

SmartMeterSchema.index({ socioId: 1, status: 1 });
SmartMeterSchema.index({ meterId: 1 });
SmartMeterSchema.index({ serialNumber: 1 });
SmartMeterSchema.index({ status: 1, lastReadingDate: -1 });

export default mongoose.model<ISmartMeter>('SmartMeter', SmartMeterSchema);