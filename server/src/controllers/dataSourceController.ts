import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { RealisticDataService } from '../services/RealisticDataService';
import MeterReading from '../models/MeterReading';
import SmartMeter from '../models/SmartMeter';
import { parse } from 'csv-parse/sync';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface CSVRecord {
  meterId?: string;
  currentReading?: string;
  timestamp?: string;
  flowRate?: string;
  temperature?: string;
  pressure?: string;
  batteryLevel?: string;
  signalStrength?: string;
  dataQuality?: string;
  [key: string]: string | undefined;
}

interface ProcessedReading {
  meterId: import('mongoose').Types.ObjectId;
  timestamp: Date;
  currentReading: number;
  flowRate?: number;
  temperature?: number;
  pressure?: number;
  batteryLevel?: number;
  signalStrength?: number;
  dataQuality: string;
  metadata: any;
}

export class DataSourceController {
  private dataService = new RealisticDataService();

  /**
   * Genera datos simulados realistas
   */
  async generateSimulatedData(req: Request, res: Response) {
    try {
      const {
        meterId,
        startDate,
        endDate,
        profileType = 'residential',
        intensity = 'medium',
        seasonality = true,
        includeAnomalies = false,
        replaceExisting = false
      } = req.body;

      // Validar fechas
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de fin'
        });
      }

      // Si se especifica meterId, generar solo para ese medidor
      if (meterId) {
        // Verificar si ya existen datos para este período
        if (!replaceExisting) {
          const existingData = await MeterReading.countDocuments({
            timestamp: { $gte: start, $lte: end }
          });

          if (existingData > 0) {
            return res.status(400).json({
              success: false,
              message: `Ya existen ${existingData} lecturas para este período. Use replaceExisting=true para sobrescribir.`
            });
          }
        } else {
          // Eliminar datos existentes
          const meter = await SmartMeter.findOne({ meterId });
          if (meter) {
            await MeterReading.deleteMany({
              meterId: meter._id,
              timestamp: { $gte: start, $lte: end }
            });
          }
        }

        const readings = await this.dataService.generateRealisticReadings(
          meterId,
          start,
          end,
          { profileType, intensity, seasonality, includeAnomalies }
        );

        await this.dataService.insertGeneratedReadings(readings);

        return res.json({
          success: true,
          message: `Generadas ${readings.length} lecturas simuladas para el medidor ${meterId}`,
          data: {
            meterId,
            readingsGenerated: readings.length,
            period: { start, end },
            config: { profileType, intensity, seasonality, includeAnomalies }
          }
        });
      } else {
        // Generar para todos los medidores activos
        await this.dataService.generateForAllMeters(
          start,
          end,
          { profileType, intensity, seasonality, includeAnomalies }
        );

        const totalReadings = await MeterReading.countDocuments({
          timestamp: { $gte: start, $lte: end }
        });

        return res.json({
          success: true,
          message: `Datos simulados generados para todos los medidores activos`,
          data: {
            totalReadings,
            period: { start, end },
            config: { profileType, intensity, seasonality, includeAnomalies }
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Error generating simulated data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar datos simulados',
        error: error.message
      });
    }
  }

  /**
   * Entrada manual de lectura
   */
  async addManualReading(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        meterId,
        currentReading,
        timestamp,
        notes,
        photo
      } = req.body;

      const meter = await SmartMeter.findOne({ meterId });
      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      // Validar que la lectura sea mayor que la anterior
      const lastReading = await MeterReading
        .findOne({ meterId: meter._id })
        .sort({ timestamp: -1 });

      if (lastReading && currentReading < lastReading.currentReading) {
        return res.status(400).json({
          success: false,
          message: `La lectura actual (${currentReading}L) debe ser mayor que la última lectura (${lastReading.currentReading}L)`
        });
      }

      // Calcular consumo desde última lectura
      const consumptionSinceLast = lastReading
        ? currentReading - lastReading.currentReading
        : 0;

      const reading = new MeterReading({
        meterId: meter._id,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        currentReading,
        consumptionSinceLast,
        dataQuality: 'good',
        metadata: {
          source: 'manual',
          enteredBy: req.user?.id,
          notes,
          photo,
          entryTime: new Date()
        }
      });

      await reading.save();

      // Actualizar última fecha de lectura
      await SmartMeter.findByIdAndUpdate(meter._id, {
        lastReadingDate: reading.timestamp
      });

      console.log(`📝 Manual reading added for meter ${meterId}: ${currentReading}L`);

      res.json({
        success: true,
        message: 'Lectura manual registrada exitosamente',
        data: {
          reading: reading.toObject(),
          consumptionSinceLast,
          previousReading: lastReading?.currentReading || null
        }
      });
    } catch (error: any) {
      console.error('❌ Error adding manual reading:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar lectura manual',
        error: error.message
      });
    }
  }

  /**
   * Subida masiva de datos via CSV - TEMPORALMENTE DESHABILITADO
   */
  /*
  async uploadCSVData(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo CSV'
        });
      }

      const csvContent = req.file.buffer.toString('utf-8');

      // Parsear CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        cast: true
      }) as CSVRecord[];

      const processedReadings: any[] = [];
      const errors: any[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        try {
          // Validar formato del registro
          if (!record.meterId || !record.currentReading || !record.timestamp) {
            errors.push({
              row: i + 1,
              error: 'Faltan campos requeridos: meterId, currentReading, timestamp'
            });
            continue;
          }

          // Buscar medidor
          const meter = await SmartMeter.findOne({ meterId: record.meterId });
          if (!meter) {
            errors.push({
              row: i + 1,
              error: `Medidor ${record.meterId} no encontrado`
            });
            continue;
          }

          // Crear lectura
          const reading: any = {
            meterId: meter._id,
            timestamp: new Date(record.timestamp),
            currentReading: parseFloat(record.currentReading),
            flowRate: record.flowRate ? parseFloat(record.flowRate) : undefined,
            temperature: record.temperature ? parseFloat(record.temperature) : undefined,
            pressure: record.pressure ? parseFloat(record.pressure) : undefined,
            batteryLevel: record.batteryLevel ? parseInt(record.batteryLevel) : undefined,
            signalStrength: record.signalStrength ? parseInt(record.signalStrength) : undefined,
            dataQuality: record.dataQuality || 'good',
            metadata: {
              source: 'csv_upload',
              uploadedBy: req.user?.id,
              uploadTime: new Date(),
              originalRow: i + 1
            }
          };

          processedReadings.push(reading);
        } catch (error: any) {
          errors.push({
            row: i + 1,
            error: error.message
          });
        }
      }

      // Insertar lecturas válidas
      if (processedReadings.length > 0) {
        await MeterReading.insertMany(processedReadings);

        // Actualizar fechas de última lectura
        const meterUpdates = new Map<string, Date>();
        processedReadings.forEach((reading: any) => {
          const current = meterUpdates.get(reading.meterId.toString());
          if (!current || reading.timestamp > current) {
            meterUpdates.set(reading.meterId.toString(), reading.timestamp);
          }
        });

        for (const [meterId, lastDate] of meterUpdates) {
          await SmartMeter.findByIdAndUpdate(meterId, {
            lastReadingDate: lastDate
          });
        }
      }

      console.log(`📄 CSV upload completed: ${processedReadings.length} readings processed, ${errors.length} errors`);

      res.json({
        success: true,
        message: `Procesamiento de CSV completado`,
        data: {
          totalRows: records.length,
          successfulReadings: processedReadings.length,
          errors: errors.length,
          errorDetails: errors
        }
      });
    } catch (error: any) {
      console.error('❌ Error processing CSV upload:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar archivo CSV',
        error: error.message
      });
    }
  }
  */

  /**
   * Obtener estadísticas de fuentes de datos
   */
  async getDataSourceStats(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;
      const since = subDays(new Date(), Number(days));

      const stats = await MeterReading.aggregate([
        {
          $match: {
            timestamp: { $gte: since }
          }
        },
        {
          $group: {
            _id: '$metadata.source',
            count: { $sum: 1 },
            avgQuality: {
              $avg: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$dataQuality', 'good'] }, then: 4 },
                    { case: { $eq: ['$dataQuality', 'fair'] }, then: 3 },
                    { case: { $eq: ['$dataQuality', 'poor'] }, then: 2 },
                    { case: { $eq: ['$dataQuality', 'invalid'] }, then: 1 }
                  ],
                  default: 4
                }
              }
            },
            lastReading: { $max: '$timestamp' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const totalReadings = await MeterReading.countDocuments({
        timestamp: { $gte: since }
      });

      const qualityDistribution = await MeterReading.aggregate([
        {
          $match: {
            timestamp: { $gte: since }
          }
        },
        {
          $group: {
            _id: '$dataQuality',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          period: { since, days: Number(days) },
          totalReadings,
          sourceBreakdown: stats,
          qualityDistribution,
          summary: {
            sources: stats.length,
            avgQualityScore: stats.reduce((sum, s) => sum + s.avgQuality, 0) / stats.length || 0
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Error getting data source stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de fuentes de datos',
        error: error.message
      });
    }
  }

  /**
   * Limpiar datos de un período específico
   */
  async cleanDataPeriod(req: Request, res: Response) {
    try {
      const { startDate, endDate, meterId, source } = req.body;

      const query: any = {};

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      if (meterId) {
        const meter = await SmartMeter.findOne({ meterId });
        if (meter) {
          query.meterId = meter._id;
        }
      }

      if (source) {
        query['metadata.source'] = source;
      }

      const deletedCount = await MeterReading.deleteMany(query);

      console.log(`🗑️ Cleaned ${deletedCount.deletedCount} readings`);

      res.json({
        success: true,
        message: `Eliminadas ${deletedCount.deletedCount} lecturas`,
        data: {
          deletedCount: deletedCount.deletedCount,
          query
        }
      });
    } catch (error: any) {
      console.error('❌ Error cleaning data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar datos',
        error: error.message
      });
    }
  }
}