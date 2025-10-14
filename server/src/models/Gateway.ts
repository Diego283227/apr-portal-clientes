import mongoose, { Document, Schema } from 'mongoose';

export interface IGateway extends Document {
  gatewayId: string;
  name: string;
  description?: string;
  location: {
    lat: number;
    lng: number;
    description?: string;
  };
  communicationType: 'lorawan' | 'cellular' | 'ethernet' | 'wifi';
  status: 'online' | 'offline' | 'maintenance';
  maxRangeKm?: number;
  lastHeartbeat?: Date;
  firmwareVersion?: string;
  ipAddress?: string;
  connectedMeters: number;
  maxConnectedMeters?: number;
  signalQuality?: {
    rssi?: number;
    snr?: number;
    batteryLevel?: number;
  };
}

const GatewaySchema = new Schema<IGateway>({
  gatewayId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    description: {
      type: String,
      trim: true
    }
  },
  communicationType: {
    type: String,
    enum: ['lorawan', 'cellular', 'ethernet', 'wifi'],
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
    default: 'online'
  },
  maxRangeKm: {
    type: Number,
    default: 10,
    min: 0.1,
    max: 50
  },
  lastHeartbeat: {
    type: Date
  },
  firmwareVersion: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  connectedMeters: {
    type: Number,
    default: 0,
    min: 0
  },
  maxConnectedMeters: {
    type: Number,
    default: 100,
    min: 1
  },
  signalQuality: {
    rssi: {
      type: Number,
      min: -150,
      max: 0
    },
    snr: {
      type: Number,
      min: -20,
      max: 20
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

GatewaySchema.index({ gatewayId: 1 });
GatewaySchema.index({ status: 1, lastHeartbeat: -1 });
GatewaySchema.index({ communicationType: 1, status: 1 });

export default mongoose.model<IGateway>('Gateway', GatewaySchema);