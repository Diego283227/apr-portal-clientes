import { Request, Response } from 'express';
import SmartMeter from '../models/SmartMeter';
import MeterReading from '../models/MeterReading';
import DailyConsumption from '../models/DailyConsumption';
import MeterAlert from '../models/MeterAlert';
import { getSocketInstance } from '../socket/socketInstance';

export class SmartMeterController {
  async createMeter(req: Request, res: Response) {
    try {
      const meterData = req.body;
      const newMeter = new SmartMeter(meterData);
      await newMeter.save();

      console.log(`📡 New smart meter created: ${newMeter.meterId}`);

      res.status(201).json({
        success: true,
        message: 'Medidor inteligente creado exitosamente',
        data: newMeter
      });
    } catch (error: any) {
      console.error('❌ Error creating smart meter:', error);
      res.status(400).json({
        success: false,
        message: 'Error al crear medidor inteligente',
        error: error.message
      });
    }
  }

  async getMeters(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, status, socioId } = req.query;

      const query: any = {};
      if (status) query.status = status;
      if (socioId) query.socioId = socioId;

      const meters = await SmartMeter
        .find(query)
        .populate('socioId', 'nombres apellidos codigoSocio')
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .sort({ createdAt: -1 });

      const total = await SmartMeter.countDocuments(query);

      res.json({
        success: true,
        data: meters,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching smart meters:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener medidores',
        error: error.message
      });
    }
  }

  async getMeterById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const meter = await SmartMeter
        .findById(id)
        .populate('socioId', 'nombres apellidos codigoSocio telefono email');

      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      const lastReading = await MeterReading
        .findOne({ meterId: meter._id })
        .sort({ timestamp: -1 });

      const todayConsumption = await DailyConsumption
        .findOne({
          meterId: meter._id,
          consumptionDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        });

      res.json({
        success: true,
        data: {
          meter,
          lastReading,
          todayConsumption
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching meter:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener medidor',
        error: error.message
      });
    }
  }

  async updateMeter(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const meter = await SmartMeter.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      console.log(`📡 Smart meter updated: ${meter.meterId}`);

      res.json({
        success: true,
        message: 'Medidor actualizado exitosamente',
        data: meter
      });
    } catch (error: any) {
      console.error('❌ Error updating smart meter:', error);
      res.status(400).json({
        success: false,
        message: 'Error al actualizar medidor',
        error: error.message
      });
    }
  }

  async deleteMeter(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const meter = await SmartMeter.findByIdAndDelete(id);

      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      console.log(`🗑️ Smart meter deleted: ${meter.meterId}`);

      res.json({
        success: true,
        message: 'Medidor eliminado exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error deleting smart meter:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar medidor',
        error: error.message
      });
    }
  }

  async getMetersByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const meters = await SmartMeter
        .find({ socioId: userId, status: { $ne: 'inactive' } })
        .select('meterId serialNumber model status lastReadingDate location')
        .sort({ createdAt: -1 });

      const metersWithData = await Promise.all(
        meters.map(async (meter) => {
          const lastReading = await MeterReading
            .findOne({ meterId: meter._id })
            .sort({ timestamp: -1 })
            .select('currentReading flowRate batteryLevel timestamp');

          const todayConsumption = await DailyConsumption
            .findOne({
              meterId: meter._id,
              consumptionDate: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            })
            .select('totalConsumption dataQuality');

          const activeAlerts = await MeterAlert.countDocuments({
            meterId: meter._id,
            status: 'active'
          });

          return {
            ...meter.toObject(),
            lastReading,
            todayConsumption,
            activeAlerts
          };
        })
      );

      res.json({
        success: true,
        data: metersWithData
      });
    } catch (error: any) {
      console.error('❌ Error fetching user meters:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener medidores del usuario',
        error: error.message
      });
    }
  }

  async getMeterStatistics(req: Request, res: Response) {
    try {
      const stats = await SmartMeter.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalMeters = await SmartMeter.countDocuments();
      const activeMeters = await SmartMeter.countDocuments({ status: 'active' });
      const onlineMeters = await SmartMeter.countDocuments({
        status: 'active',
        lastReadingDate: {
          $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        }
      });

      const activeAlerts = await MeterAlert.countDocuments({ status: 'active' });
      const criticalAlerts = await MeterAlert.countDocuments({
        status: 'active',
        severity: 'critical'
      });

      res.json({
        success: true,
        data: {
          totalMeters,
          activeMeters,
          onlineMeters,
          activeAlerts,
          criticalAlerts,
          statusBreakdown: stats,
          onlinePercentage: totalMeters > 0 ? ((onlineMeters / totalMeters) * 100).toFixed(1) : 0
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching meter statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}