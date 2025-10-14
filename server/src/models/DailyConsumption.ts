import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyConsumption extends Document {
  meterId: mongoose.Types.ObjectId;
  consumptionDate: Date;
  startReading: number;
  endReading: number;
  totalConsumption: number;
  averageFlowRate?: number;
  peakFlowRate?: number;
  readingsCount: number;
  dataQuality: 'complete' | 'partial' | 'estimated' | 'incomplete';
  estimatedConsumption?: number;
  hourlyBreakdown?: Array<{
    hour: number;
    consumption: number;
    avgFlowRate?: number;
  }>;
}

const DailyConsumptionSchema = new Schema<IDailyConsumption>({
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmartMeter',
    required: true
  },
  consumptionDate: {
    type: Date,
    required: true
  },
  startReading: {
    type: Number,
    required: true,
    min: 0
  },
  endReading: {
    type: Number,
    required: true,
    min: 0
  },
  totalConsumption: {
    type: Number,
    required: true,
    min: 0
  },
  averageFlowRate: {
    type: Number,
    min: 0
  },
  peakFlowRate: {
    type: Number,
    min: 0
  },
  readingsCount: {
    type: Number,
    required: true,
    min: 0
  },
  dataQuality: {
    type: String,
    enum: ['complete', 'partial', 'estimated', 'incomplete'],
    default: 'complete'
  },
  estimatedConsumption: {
    type: Number,
    min: 0
  },
  hourlyBreakdown: [{
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23
    },
    consumption: {
      type: Number,
      required: true,
      min: 0
    },
    avgFlowRate: {
      type: Number,
      min: 0
    }
  }]
}, {
  timestamps: true
});

DailyConsumptionSchema.index({ meterId: 1, consumptionDate: -1 }, { unique: true });
DailyConsumptionSchema.index({ consumptionDate: -1 });
DailyConsumptionSchema.index({ meterId: 1, dataQuality: 1 });

export default mongoose.model<IDailyConsumption>('DailyConsumption', DailyConsumptionSchema);