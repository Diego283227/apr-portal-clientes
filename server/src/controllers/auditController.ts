import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuditLog, SuperAdmin } from '../models';

export const createAuditLog = async (
  usuario: {
    id: string;
    tipo: 'socio' | 'super_admin';
    nombre: string;
    identificador: string;
  },
  accion: string,
  modulo: string,
  descripcion: string,
  detalles?: any,
  resultado: 'exitoso' | 'fallido' | 'error' = 'exitoso',
  metadata?: any,
  req?: Request
) => {
  try {
    const auditData: any = {
      usuario,
      accion,
      modulo,
      descripcion,
      resultado,
      timestamp: new Date()
    };

    if (detalles) {
      auditData.detalles = {
        ...detalles,
        ip: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      };
    }

    if (metadata) {
      auditData.metadata = metadata;
    }

    const auditLog = new AuditLog(auditData);
    await auditLog.save();

    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

export const getAuditLogs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Only super admins can access audit logs
    if (!req.user || req.user.role !== 'super_admin') {
      return next(new AppError('No tienes permisos para acceder a los logs de auditoría', 403));
    }

    const {
      page = 1,
      limit = 50,
      modulo,
      resultado,
      usuarioTipo,
      usuarioId,
      accion,
      fechaDesde,
      fechaHasta,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = {};

    if (modulo && modulo !== 'todos') {
      filter.modulo = modulo;
    }

    if (resultado && resultado !== 'todos') {
      filter.resultado = resultado;
    }

    if (usuarioTipo && usuarioTipo !== 'todos') {
      filter['usuario.tipo'] = usuarioTipo;
    }

    if (usuarioId) {
      filter['usuario.id'] = usuarioId;
    }

    if (accion) {
      filter.accion = { $regex: accion, $options: 'i' };
    }

    // Date range filter
    if (fechaDesde || fechaHasta) {
      filter.timestamp = {};
      if (fechaDesde) {
        filter.timestamp.$gte = new Date(fechaDesde as string);
      }
      if (fechaHasta) {
        filter.timestamp.$lte = new Date(fechaHasta as string);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { descripcion: { $regex: search, $options: 'i' } },
        { 'usuario.nombre': { $regex: search, $options: 'i' } },
        { 'usuario.identificador': { $regex: search, $options: 'i' } },
        { accion: { $regex: search, $options: 'i' } }
      ];
    }

    try {
      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limitNum),
        AuditLog.countDocuments(filter)
      ]);

      // Log this audit access
      await createAuditLog(
        {
          id: req.user.id,
          tipo: 'super_admin',
          nombre: `${req.user.nombres} ${req.user.apellidos}`,
          identificador: (req.user as any).username || (req.user as any).rut
        },
        'consultar_logs',
        'auditoria',
        `Consulta de logs de auditoría - ${logs.length} registros`,
        {
          filtros: {
            modulo,
            resultado,
            usuarioTipo,
            usuarioId,
            accion,
            fechaDesde,
            fechaHasta,
            search
          },
          resultados: logs.length
        },
        'exitoso',
        undefined,
        req
      );

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum
          }
        },
        message: 'Logs de auditoría obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return next(new AppError('Error al obtener los logs de auditoría', 500));
    }
  }
);

export const getAuditStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Only super admins can access audit stats
    if (!req.user || req.user.role !== 'super_admin') {
      return next(new AppError('No tienes permisos para acceder a las estadísticas de auditoría', 403));
    }

    const { period = '7d' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    try {
      const [
        totalLogs,
        successfulLogs,
        failedLogs,
        errorLogs,
        moduleStats,
        userTypeStats,
        recentActivity
      ] = await Promise.all([
        // Total logs in period
        AuditLog.countDocuments({
          timestamp: { $gte: startDate }
        }),
        
        // Successful operations
        AuditLog.countDocuments({
          timestamp: { $gte: startDate },
          resultado: 'exitoso'
        }),
        
        // Failed operations
        AuditLog.countDocuments({
          timestamp: { $gte: startDate },
          resultado: 'fallido'
        }),
        
        // Error operations
        AuditLog.countDocuments({
          timestamp: { $gte: startDate },
          resultado: 'error'
        }),
        
        // Stats by module
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: '$modulo', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        
        // Stats by user type
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: '$usuario.tipo', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        
        // Recent activity (last 24 hours)
        AuditLog.find({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
          .sort({ timestamp: -1 })
          .limit(10)
          .select('usuario.nombre usuario.tipo accion modulo descripcion resultado timestamp')
      ]);

      const stats = {
        period,
        dateRange: {
          from: startDate.toISOString(),
          to: now.toISOString()
        },
        totals: {
          total: totalLogs,
          exitoso: successfulLogs,
          fallido: failedLogs,
          error: errorLogs,
          successRate: totalLogs > 0 ? Math.round((successfulLogs / totalLogs) * 100) : 0
        },
        moduleStats: moduleStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        userTypeStats: userTypeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {} as Record<string, number>),
        recentActivity
      };

      // Log this stats access
      await createAuditLog(
        {
          id: req.user.id,
          tipo: 'super_admin',
          nombre: `${req.user.nombres} ${req.user.apellidos}`,
          identificador: (req.user as any).username || (req.user as any).rut
        },
        'consultar_estadisticas',
        'auditoria',
        `Consulta de estadísticas de auditoría - período: ${period}`,
        { period, totalLogs },
        'exitoso',
        undefined,
        req
      );

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas de auditoría obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return next(new AppError('Error al obtener las estadísticas de auditoría', 500));
    }
  }
);

export const exportAuditLogs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Only super admins can export audit logs
    if (!req.user || req.user.role !== 'super_admin') {
      return next(new AppError('No tienes permisos para exportar los logs de auditoría', 403));
    }

    const {
      modulo,
      resultado,
      usuarioTipo,
      usuarioId,
      accion,
      fechaDesde,
      fechaHasta,
      format = 'csv'
    } = req.query;

    // Build filter query (same as getAuditLogs)
    const filter: any = {};
    
    if (modulo && modulo !== 'todos') filter.modulo = modulo;
    if (resultado && resultado !== 'todos') filter.resultado = resultado;
    if (usuarioTipo && usuarioTipo !== 'todos') filter['usuario.tipo'] = usuarioTipo;
    if (usuarioId) filter['usuario.id'] = usuarioId;
    if (accion) filter.accion = { $regex: accion, $options: 'i' };
    
    if (fechaDesde || fechaHasta) {
      filter.timestamp = {};
      if (fechaDesde) filter.timestamp.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filter.timestamp.$lte = new Date(fechaHasta as string);
    }

    try {
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(10000); // Limit to prevent memory issues

      if (format === 'csv') {
        const csvHeaders = [
          'Timestamp',
          'Usuario',
          'Tipo Usuario',
          'Identificador',
          'Módulo',
          'Acción',
          'Descripción',
          'Resultado',
          'IP',
          'User Agent'
        ];

        const csvRows = logs.map(log => [
          log.timestamp.toISOString(),
          log.usuario.nombre,
          log.usuario.tipo,
          log.usuario.identificador,
          log.modulo,
          log.accion,
          log.descripcion,
          log.resultado,
          log.detalles?.ip || '',
          log.detalles?.userAgent || ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        // Log the export action
        await createAuditLog(
          {
            id: req.user.id,
            tipo: 'super_admin',
            nombre: `${req.user.nombres} ${req.user.apellidos}`,
            identificador: (req.user as any).username || (req.user as any).rut
          },
          'exportar_logs',
          'auditoria',
          `Exportación de logs de auditoría - ${logs.length} registros`,
          {
            filtros: filter,
            formato: format,
            totalRegistros: logs.length
          },
          'exitoso',
          undefined,
          req
        );

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
          exportDate: new Date().toISOString(),
          totalRecords: logs.length,
          filters: filter,
          logs
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      return next(new AppError('Error al exportar los logs de auditoría', 500));
    }
  }
);