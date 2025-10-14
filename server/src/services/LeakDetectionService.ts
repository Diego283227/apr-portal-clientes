import MeterReading from '../models/MeterReading';
import MeterAlert from '../models/MeterAlert';
import SmartMeter from '../models/SmartMeter';
import { IMeterReading } from '../models/MeterReading';
import { ISmartMeter } from '../models/SmartMeter';

export class LeakDetectionService {

  async checkForLeaks(reading: IMeterReading, meter: ISmartMeter): Promise<void> {
    try {
      await Promise.all([
        this.checkContinuousFlow(reading, meter),
        this.checkAbnormalConsumption(reading, meter),
        this.checkFlowPatternAnomaly(reading, meter),
        this.checkNightTimeFlow(reading, meter)
      ]);
    } catch (error) {
      console.error('❌ Error in leak detection:', error);
    }
  }

  private async checkContinuousFlow(reading: IMeterReading, meter: ISmartMeter): Promise<void> {
    const threshold = meter.configuration.leakThresholdLPM;

    if (!reading.flowRate || reading.flowRate <= threshold) {
      return;
    }

    const recentReadings = await MeterReading
      .find({
        meterId: meter._id,
        timestamp: {
          $gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
          $lte: reading.timestamp
        },
        flowRate: { $gt: threshold }
      })
      .sort({ timestamp: -1 })
      .limit(10);

    if (recentReadings.length >= 8) {
      const avgFlow = recentReadings.reduce((sum, r) => sum + (r.flowRate || 0), 0) / recentReadings.length;

      if (avgFlow > threshold) {
        await this.createLeakAlert(
          meter,
          'leak',
          'high',
          'Posible fuga detectada',
          `Flujo continuo detectado: ${avgFlow.toFixed(2)} L/min durante ${recentReadings.length * 15} minutos`,
          {
            avgFlowRate: avgFlow,
            duration: recentReadings.length * 15,
            threshold,
            readings: recentReadings.length
          }
        );
      }
    }
  }

  private async checkAbnormalConsumption(reading: IMeterReading, meter: ISmartMeter): Promise<void> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayReadings = await MeterReading
      .find({
        meterId: meter._id,
        timestamp: { $gte: startOfDay }
      })
      .sort({ timestamp: 1 });

    if (todayReadings.length < 2) return;

    const firstReading = todayReadings[0];
    const lastReading = todayReadings[todayReadings.length - 1];
    const dailyConsumption = lastReading.currentReading - firstReading.currentReading;

    if (dailyConsumption > meter.configuration.highConsumptionThresholdLD) {
      const lastWeekAvg = await this.getAverageWeeklyConsumption(meter);

      if (lastWeekAvg && dailyConsumption > (lastWeekAvg * 2)) {
        await this.createLeakAlert(
          meter,
          'high_consumption',
          'medium',
          'Consumo anómalo detectado',
          `Consumo diario ${dailyConsumption.toFixed(0)}L excede significativamente el promedio semanal de ${lastWeekAvg.toFixed(0)}L`,
          {
            dailyConsumption,
            weeklyAverage: lastWeekAvg,
            threshold: meter.configuration.highConsumptionThresholdLD
          }
        );
      }
    }
  }

  private async checkFlowPatternAnomaly(reading: IMeterReading, meter: ISmartMeter): Promise<void> {
    if (!reading.flowRate) return;

    const last24Hours = await MeterReading
      .find({
        meterId: meter._id,
        timestamp: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          $lte: reading.timestamp
        }
      })
      .sort({ timestamp: -1 })
      .limit(96);

    if (last24Hours.length < 48) return;

    const flowRates = last24Hours.map(r => r.flowRate || 0);
    const avgFlow = flowRates.reduce((a, b) => a + b, 0) / flowRates.length;
    const variance = flowRates.reduce((sum, flow) => sum + Math.pow(flow - avgFlow, 2), 0) / flowRates.length;
    const stdDev = Math.sqrt(variance);

    if (reading.flowRate > (avgFlow + 3 * stdDev) && reading.flowRate > meter.configuration.leakThresholdLPM) {
      await this.createLeakAlert(
        meter,
        'leak',
        'medium',
        'Anomalía en patrón de flujo',
        `Flujo anómalo detectado: ${reading.flowRate.toFixed(2)} L/min (promedio: ${avgFlow.toFixed(2)} ± ${stdDev.toFixed(2)})`,
        {
          currentFlow: reading.flowRate,
          averageFlow: avgFlow,
          standardDeviation: stdDev,
          threshold: avgFlow + 3 * stdDev
        }
      );
    }
  }

  private async checkNightTimeFlow(reading: IMeterReading, meter: ISmartMeter): Promise<void> {
    const hour = reading.timestamp.getHours();

    if (hour < 23 && hour > 6) return;

    if (reading.flowRate && reading.flowRate > (meter.configuration.leakThresholdLPM * 0.5)) {
      const nightReadings = await MeterReading
        .find({
          meterId: meter._id,
          timestamp: {
            $gte: new Date(Date.now() - 4 * 60 * 60 * 1000)
          },
          $expr: {
            $or: [
              { $gte: [{ $hour: '$timestamp' }, 23] },
              { $lte: [{ $hour: '$timestamp' }, 6] }
            ]
          }
        });

      const consistentFlow = nightReadings.filter(r =>
        r.flowRate && r.flowRate > (meter.configuration.leakThresholdLPM * 0.5)
      );

      if (consistentFlow.length >= 6) {
        const avgNightFlow = consistentFlow.reduce((sum, r) => sum + (r.flowRate || 0), 0) / consistentFlow.length;

        await this.createLeakAlert(
          meter,
          'leak',
          'high',
          'Flujo nocturno detectado',
          `Flujo continuo durante horario nocturno: ${avgNightFlow.toFixed(2)} L/min`,
          {
            avgNightFlow,
            nightReadingsCount: consistentFlow.length,
            timeRange: '23:00-06:00'
          }
        );
      }
    }
  }

  private async createLeakAlert(
    meter: ISmartMeter,
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    metadata: any
  ): Promise<void> {

    const existingAlert = await MeterAlert.findOne({
      meterId: meter._id,
      alertType,
      status: 'active',
      triggeredAt: {
        $gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    });

    if (existingAlert) {
      console.log(`⚠️ Similar alert already exists for meter ${meter.meterId}`);
      return;
    }

    const alert = new MeterAlert({
      meterId: meter._id,
      alertType,
      severity,
      title,
      description,
      metadata,
      triggeredAt: new Date()
    });

    await alert.save();
    console.log(`🚨 Leak alert created: ${alertType} for meter ${meter.meterId}`);
  }

  private async getAverageWeeklyConsumption(meter: ISmartMeter): Promise<number | null> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    try {
      const weeklyConsumption = await MeterReading.aggregate([
        {
          $match: {
            meterId: meter._id,
            timestamp: {
              $gte: twoWeeksAgo,
              $lt: oneWeekAgo
            }
          }
        },
        {
          $group: {
            _id: null,
            minReading: { $min: '$currentReading' },
            maxReading: { $max: '$currentReading' }
          }
        }
      ]);

      if (weeklyConsumption.length > 0) {
        return weeklyConsumption[0].maxReading - weeklyConsumption[0].minReading;
      }

      return null;
    } catch (error) {
      console.error('❌ Error calculating weekly average:', error);
      return null;
    }
  }

  async checkBatteryLevel(reading: IMeterReading, meter: ISmartMeter): Promise<void> {
    if (!reading.batteryLevel) return;

    if (reading.batteryLevel <= meter.configuration.lowBatteryThreshold) {
      const existingAlert = await MeterAlert.findOne({
        meterId: meter._id,
        alertType: 'low_battery',
        status: 'active'
      });

      if (!existingAlert) {
        const severity = reading.batteryLevel <= 10 ? 'critical' :
                        reading.batteryLevel <= 15 ? 'high' : 'medium';

        await this.createLeakAlert(
          meter,
          'low_battery',
          severity,
          'Batería baja detectada',
          `Nivel de batería: ${reading.batteryLevel}%`,
          {
            batteryLevel: reading.batteryLevel,
            threshold: meter.configuration.lowBatteryThreshold
          }
        );
      }
    }
  }

  async checkCommunicationLoss(meter: ISmartMeter): Promise<void> {
    const lastReading = await MeterReading
      .findOne({ meterId: meter._id })
      .sort({ timestamp: -1 });

    if (!lastReading) return;

    const timeSinceLastReading = Date.now() - lastReading.timestamp.getTime();
    const maxInterval = meter.configuration.transmissionIntervalMinutes * 60 * 1000 * 3; // 3x interval

    if (timeSinceLastReading > maxInterval) {
      const existingAlert = await MeterAlert.findOne({
        meterId: meter._id,
        alertType: 'communication_loss',
        status: 'active'
      });

      if (!existingAlert) {
        const hoursOffline = Math.floor(timeSinceLastReading / (60 * 60 * 1000));

        await this.createLeakAlert(
          meter,
          'communication_loss',
          hoursOffline > 12 ? 'high' : 'medium',
          'Pérdida de comunicación',
          `Sin comunicación por ${hoursOffline} horas`,
          {
            lastReadingTime: lastReading.timestamp,
            hoursOffline,
            expectedInterval: meter.configuration.transmissionIntervalMinutes
          }
        );
      }
    }
  }
}