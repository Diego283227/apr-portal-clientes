import { Request, Response } from 'express';
import MeterAlert from '../models/MeterAlert';
import SmartMeter from '../models/SmartMeter';
import { getSocketInstance } from '../socket/socketInstance';
import { NotificationService } from '../services/NotificationService';

export class MeterAlertController {
  private notificationService = new NotificationService();

  async getAlerts(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        severity,
        alertType,
        socioId
      } = req.query;

      let query: any = {};

      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (alertType) query.alertType = alertType;

      let meters: any[] = [];
      if (socioId) {
        meters = await SmartMeter.find({ socioId }).select('_id');
        query.meterId = { $in: meters.map(m => m._id) };
      }

      const alerts = await MeterAlert
        .find(query)
        .populate({
          path: 'meterId',
          select: 'meterId serialNumber location',
          populate: {
            path: 'socioId',
            select: 'nombres apellidos codigoSocio telefono'
          }
        })
        .populate('resolvedBy', 'nombres apellidos')
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .sort({ triggeredAt: -1 });

      const total = await MeterAlert.countDocuments(query);

      res.json({
        success: true,
        data: alerts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener alertas',
        error: error.message
      });
    }
  }

  async getActiveAlerts(req: Request, res: Response) {
    try {
      const { socioId } = req.query;

      let query: any = { status: 'active' };

      if (socioId) {
        const meters = await SmartMeter.find({ socioId }).select('_id');
        query.meterId = { $in: meters.map(m => m._id) };
      }

      const alerts = await MeterAlert
        .find(query)
        .populate({
          path: 'meterId',
          select: 'meterId serialNumber location',
          populate: {
            path: 'socioId',
            select: 'nombres apellidos codigoSocio telefono'
          }
        })
        .sort({ severity: -1, triggeredAt: -1 });

      const alertsByType = await MeterAlert.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$alertType',
            count: { $sum: 1 },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          alerts,
          summary: {
            total: alerts.length,
            byType: alertsByType,
            critical: alerts.filter(a => a.severity === 'critical').length
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching active alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener alertas activas',
        error: error.message
      });
    }
  }

  async createAlert(req: Request, res: Response) {
    try {
      const alertData = req.body;

      const meter = await SmartMeter.findById(alertData.meterId)
        .populate('socioId', 'nombres apellidos telefono email');

      if (!meter) {
        return res.status(404).json({
          success: false,
          message: 'Medidor no encontrado'
        });
      }

      const alert = new MeterAlert(alertData);
      await alert.save();

      await alert.populate('meterId', 'meterId serialNumber location');

      const io = getSocketInstance();
      if (io) {
        io.emit('newAlert', {
          alert: alert.toObject(),
          socioId: meter.socioId._id
        });
      }

      await this.notificationService.sendAlertNotification(alert, meter);

      console.log(`🚨 New alert created: ${alert.alertType} for meter ${meter.meterId}`);

      res.status(201).json({
        success: true,
        message: 'Alerta creada exitosamente',
        data: alert
      });
    } catch (error: any) {
      console.error('❌ Error creating alert:', error);
      res.status(400).json({
        success: false,
        message: 'Error al crear alerta',
        error: error.message
      });
    }
  }

  async resolveAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { resolutionNotes, resolvedBy } = req.body;

      const alert = await MeterAlert.findByIdAndUpdate(
        id,
        {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes
        },
        { new: true }
      ).populate({
        path: 'meterId',
        select: 'meterId serialNumber',
        populate: {
          path: 'socioId',
          select: 'nombres apellidos codigoSocio'
        }
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alerta no encontrada'
        });
      }

      const io = getSocketInstance();
      if (io) {
        io.emit('alertResolved', {
          alertId: alert._id,
          meterId: (alert.meterId as any).meterId,
          socioId: (alert.meterId as any).socioId._id
        });
      }

      console.log(`✅ Alert resolved: ${alert._id} for meter ${(alert.meterId as any).meterId}`);

      res.json({
        success: true,
        message: 'Alerta resuelta exitosamente',
        data: alert
      });
    } catch (error: any) {
      console.error('❌ Error resolving alert:', error);
      res.status(500).json({
        success: false,
        message: 'Error al resolver alerta',
        error: error.message
      });
    }
  }

  async markAsFalsePositive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { resolutionNotes, resolvedBy } = req.body;

      const alert = await MeterAlert.findByIdAndUpdate(
        id,
        {
          status: 'false_positive',
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes
        },
        { new: true }
      );

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alerta no encontrada'
        });
      }

      console.log(`❌ Alert marked as false positive: ${alert._id}`);

      res.json({
        success: true,
        message: 'Alerta marcada como falso positivo',
        data: alert
      });
    } catch (error: any) {
      console.error('❌ Error marking alert as false positive:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar alerta como falso positivo',
        error: error.message
      });
    }
  }

  async getAlertStatistics(req: Request, res: Response) {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await MeterAlert.aggregate([
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            bySeverity: [
              {
                $match: { status: 'active' }
              },
              {
                $group: {
                  _id: '$severity',
                  count: { $sum: 1 }
                }
              }
            ],
            byType: [
              {
                $group: {
                  _id: '$alertType',
                  count: { $sum: 1 },
                  activeCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                  }
                }
              }
            ],
            recentTrends: [
              {
                $match: {
                  triggeredAt: { $gte: lastMonth }
                }
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$triggeredAt' },
                    month: { $month: '$triggeredAt' },
                    day: { $dayOfMonth: '$triggeredAt' }
                  },
                  count: { $sum: 1 },
                  criticalCount: {
                    $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
                  }
                }
              },
              {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
              }
            ]
          }
        }
      ]);

      const totalActive = await MeterAlert.countDocuments({ status: 'active' });
      const totalCritical = await MeterAlert.countDocuments({
        status: 'active',
        severity: 'critical'
      });

      res.json({
        success: true,
        data: {
          totalActive,
          totalCritical,
          breakdown: stats[0]
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching alert statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de alertas',
        error: error.message
      });
    }
  }

  async bulkResolveAlerts(req: Request, res: Response) {
    try {
      const { alertIds, resolutionNotes, resolvedBy } = req.body;

      if (!Array.isArray(alertIds) || alertIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de IDs de alertas'
        });
      }

      const result = await MeterAlert.updateMany(
        {
          _id: { $in: alertIds },
          status: 'active'
        },
        {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes
        }
      );

      const io = getSocketInstance();
      if (io) {
        io.emit('bulkAlertsResolved', {
          count: result.modifiedCount,
          resolvedBy
        });
      }

      console.log(`✅ Bulk resolved ${result.modifiedCount} alerts`);

      res.json({
        success: true,
        message: `${result.modifiedCount} alertas resueltas exitosamente`,
        data: {
          resolved: result.modifiedCount,
          total: alertIds.length
        }
      });
    } catch (error: any) {
      console.error('❌ Error bulk resolving alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al resolver alertas masivamente',
        error: error.message
      });
    }
  }
}