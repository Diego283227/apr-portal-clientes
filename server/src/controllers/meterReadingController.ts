import { Request, Response } from 'express';
import MeterReading from '../models/MeterReading';
import SmartMeter from '../models/SmartMeter';
import MeterAlert from '../models/MeterAlert';
import { getSocketInstance } from '../socket/socketInstance';
import { LeakDetectionService } from '../services/LeakDetectionService';

export class MeterReadingController {
  private leakDetectionService = new LeakDetectionService();

  async addReading(req: Request, res: Response) {
    try {
      const readingData = req.body;

      const meter = await SmartMeter.findOne({ meterId: readingData.meterId });
      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      const reading = new MeterReading({
        ...readingData,
        meterId: meter._id
      });

      await reading.save();

      await SmartMeter.findByIdAndUpdate(meter._id, {
        lastReadingDate: reading.timestamp
      });

      await this.leakDetectionService.checkForLeaks(reading, meter);

      const io = getSocketInstance();
      if (io) {
        io.emit('newReading', {
          meterId: meter.meterId,
          socioId: meter.socioId,
          reading: reading.toObject()
        });
      }

      console.log(`📊 New reading for meter ${meter.meterId}: ${reading.currentReading}L`);

      res.status(201).json({
        success: true,
        message: 'Lectura registrada exitosamente',
        data: reading
      });
    } catch (error: any) {
      console.error('❌ Error adding meter reading:', error);
      res.status(400).json({
        success: false,
        message: 'Error al registrar lectura',
        error: error.message
      });
    }
  }

  async getReadings(req: Request, res: Response) {
    try {
      const {
        meterId,
        startDate,
        endDate,
        page = 1,
        limit = 100,
        dataQuality
      } = req.query;

      let query: any = {};

      if (meterId) {
        const meter = await SmartMeter.findOne({ meterId });
        if (meter) {
          query.meterId = meter._id;
        }
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      if (dataQuality) {
        query.dataQuality = dataQuality;
      }

      const readings = await MeterReading
        .find(query)
        .populate('meterId', 'meterId serialNumber')
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .sort({ timestamp: -1 });

      const total = await MeterReading.countDocuments(query);

      res.json({
        success: true,
        data: readings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching meter readings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener lecturas',
        error: error.message
      });
    }
  }

  async getRecentReadings(req: Request, res: Response) {
    try {
      const { meterId } = req.params;
      const { hours = 24 } = req.query;

      const meter = await SmartMeter.findOne({ meterId });
      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      const hoursAgo = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

      const readings = await MeterReading
        .find({
          meterId: meter._id,
          timestamp: { $gte: hoursAgo }
        })
        .sort({ timestamp: -1 })
        .limit(1000);

      const stats = await MeterReading.aggregate([
        {
          $match: {
            meterId: meter._id,
            timestamp: { $gte: hoursAgo }
          }
        },
        {
          $group: {
            _id: null,
            avgFlowRate: { $avg: '$flowRate' },
            maxFlowRate: { $max: '$flowRate' },
            minReading: { $min: '$currentReading' },
            maxReading: { $max: '$currentReading' },
            totalReadings: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          readings,
          statistics: stats[0] || null,
          totalConsumption: stats[0] ? (stats[0].maxReading - stats[0].minReading) : 0
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching recent readings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener lecturas recientes',
        error: error.message
      });
    }
  }

  async getConsumptionChart(req: Request, res: Response) {
    try {
      const { meterId } = req.params;
      const { period = 'day' } = req.query;

      const meter = await SmartMeter.findOne({ meterId });
      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      let groupBy: any;
      let dateRange: Date;
      let dateFormat: string;

      switch (period) {
        case 'hour':
          dateRange = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
          dateFormat = '%Y-%m-%d %H:00:00';
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          };
          break;
        case 'day':
          dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
          dateFormat = '%Y-%m-%d';
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
          break;
        case 'week':
          dateRange = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000); // Last 12 weeks
          dateFormat = '%Y-%U';
          groupBy = {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          };
          break;
        default:
          dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          dateFormat = '%Y-%m-%d';
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
      }

      const chartData = await MeterReading.aggregate([
        {
          $match: {
            meterId: meter._id,
            timestamp: { $gte: dateRange }
          }
        },
        {
          $group: {
            _id: groupBy,
            minReading: { $min: '$currentReading' },
            maxReading: { $max: '$currentReading' },
            avgFlowRate: { $avg: '$flowRate' },
            readingsCount: { $sum: 1 }
          }
        },
        {
          $addFields: {
            consumption: { $subtract: ['$maxReading', '$minReading'] },
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
                hour: '$_id.hour'
              }
            }
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      res.json({
        success: true,
        data: chartData
      });
    } catch (error: any) {
      console.error('❌ Error fetching consumption chart:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener gráfico de consumo',
        error: error.message
      });
    }
  }

  async bulkAddReadings(req: Request, res: Response) {
    try {
      const { readings } = req.body;

      if (!Array.isArray(readings) || readings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de lecturas'
        });
      }

      const processedReadings = await Promise.all(
        readings.map(async (reading) => {
          const meter = await SmartMeter.findOne({ meterId: reading.meterId });
          if (meter) {
            return {
              ...reading,
              meterId: meter._id
            };
          }
          return null;
        })
      );

      const validReadings = processedReadings.filter(reading => reading !== null);

      if (validReadings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron medidores válidos'
        });
      }

      const insertedReadings = await MeterReading.insertMany(validReadings);

      for (const reading of insertedReadings) {
        await SmartMeter.findByIdAndUpdate(reading.meterId, {
          lastReadingDate: reading.timestamp
        });
      }

      const io = getSocketInstance();
      if (io) {
        io.emit('bulkReadingsAdded', {
          count: insertedReadings.length,
          timestamp: new Date()
        });
      }

      console.log(`📊 Bulk readings added: ${insertedReadings.length} readings`);

      res.status(201).json({
        success: true,
        message: `${insertedReadings.length} lecturas registradas exitosamente`,
        data: {
          inserted: insertedReadings.length,
          total: readings.length
        }
      });
    } catch (error: any) {
      console.error('❌ Error adding bulk readings:', error);
      res.status(400).json({
        success: false,
        message: 'Error al registrar lecturas masivas',
        error: error.message
      });
    }
  }
}