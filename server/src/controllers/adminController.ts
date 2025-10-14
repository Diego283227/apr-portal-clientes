import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { SuperAdmin, User } from '../models';
import Boleta from '../models/Boleta';
import Pago from '../models/Pago';
import { createAuditLog } from './auditController';

interface SystemConfig {
  // Información general del sistema
  organizacion: {
    nombre: string;
    rut: string;
    direccion: string;
    telefono: string;
    email: string;
    sitioWeb?: string;
    logo?: string;
  };
  
  // Configuración de pagos
  pagos: {
    habilitado: boolean;
    metodosPermitidos: string[];
    montoMinimo: number;
    comisionTarjeta: number;
    diasGraciaVencimiento: number;
  };
  
  // Configuración de notificaciones
  notificaciones: {
    emailHabilitado: boolean;
    smsHabilitado: boolean;
    recordatoriosPago: boolean;
    diasAntesVencimiento: number;
    notificacionesAdmin: boolean;
  };
  
  // Configuración del sistema
  sistema: {
    mantenimiento: boolean;
    registroSociosAbierto: boolean;
    versionApp: string;
    ultimaActualizacion: string;
    backupAutomatico: boolean;
  };
}

// Default system configuration
const DEFAULT_CONFIG: SystemConfig = {
  organizacion: {
    nombre: 'APR Agua Potable Rural',
    rut: '12.345.678-9',
    direccion: 'Calle Principal 123, Comuna, Región',
    telefono: '+56 9 1234 5678',
    email: 'contacto@apr.cl',
    sitioWeb: 'https://apr.cl',
    logo: ''
  },
  pagos: {
    habilitado: true,
    metodosPermitidos: ['tarjeta_credito', 'tarjeta_debito', 'transferencia'],
    montoMinimo: 1000,
    comisionTarjeta: 2.5,
    diasGraciaVencimiento: 10
  },
  notificaciones: {
    emailHabilitado: true,
    smsHabilitado: false,
    recordatoriosPago: true,
    diasAntesVencimiento: 7,
    notificacionesAdmin: true
  },
  sistema: {
    mantenimiento: false,
    registroSociosAbierto: true,
    versionApp: '1.0.0',
    ultimaActualizacion: new Date().toISOString(),
    backupAutomatico: true
  }
};

export const getSystemConfiguration = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // For now, return default configuration
    // In a real app, you might store this in a separate SystemConfig model
    res.status(200).json({
      success: true,
      data: DEFAULT_CONFIG,
      message: 'Configuración del sistema obtenida exitosamente'
    });
  }
);

export const updateSystemConfiguration = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const config: SystemConfig = req.body;

    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    // Validate required fields
    if (!config.organizacion?.nombre || !config.organizacion?.email) {
      return next(new AppError('Nombre de organización y email son requeridos', 400));
    }

    // Log the configuration update
    await createAuditLog(
      {
        id: req.user.id,
        tipo: 'super_admin',
        nombre: `${req.user.nombres} ${req.user.apellidos}`,
        identificador: (req.user as any).username || req.user.email
      },
      'actualizar_configuracion_sistema',
      'configuracion',
      'Actualización de configuración del sistema',
      { config },
      'exitoso',
      undefined,
      req
    );

    // Update timestamp
    config.sistema.ultimaActualizacion = new Date().toISOString();

    // In a real app, you would save this to the database
    // For now, we'll just return the updated config
    res.status(200).json({
      success: true,
      data: config,
      message: 'Configuración del sistema actualizada exitosamente'
    });
  }
);

export const getSuperAdminProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    const admin = await SuperAdmin.findById(req.user.id);
    if (!admin) {
      return next(new AppError('Administrador no encontrado', 404));
    }

    const profile = {
      id: (admin._id as any).toString(),
      username: admin.username,
      email: admin.email,
      nombres: admin.nombres,
      apellidos: admin.apellidos,
      role: admin.role,
      activo: admin.activo,
      ultimoAcceso: admin.ultimoAcceso?.toISOString(),
      fechaCreacion: admin.fechaCreacion.toISOString(),
      permisos: admin.permisos
    };

    res.status(200).json({
      success: true,
      data: profile,
      message: 'Perfil de administrador obtenido exitosamente'
    });
  }
);

export const updateSuperAdminProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    const { nombres, apellidos, email, username } = req.body;

    const admin = await SuperAdmin.findById(req.user.id);
    if (!admin) {
      return next(new AppError('Administrador no encontrado', 404));
    }

    // Check if email is already taken by another admin
    if (email && email !== admin.email) {
      const existingAdmin = await SuperAdmin.findOne({ 
        email, 
        _id: { $ne: admin._id } 
      });
      if (existingAdmin) {
        return next(new AppError('Email ya está en uso por otro administrador', 400));
      }
    }

    // Check if username is already taken by another admin
    if (username && username !== admin.username) {
      const existingAdmin = await SuperAdmin.findOne({ 
        username, 
        _id: { $ne: admin._id } 
      });
      if (existingAdmin) {
        return next(new AppError('Username ya está en uso por otro administrador', 400));
      }
    }

    // Update fields if provided
    if (nombres) admin.nombres = nombres;
    if (apellidos) admin.apellidos = apellidos;
    if (email) admin.email = email;
    if (username) admin.username = username;

    await admin.save();

    const updatedProfile = {
      id: (admin._id as any).toString(),
      username: admin.username,
      email: admin.email,
      nombres: admin.nombres,
      apellidos: admin.apellidos,
      role: admin.role,
      activo: admin.activo,
      ultimoAcceso: admin.ultimoAcceso?.toISOString(),
      fechaCreacion: admin.fechaCreacion.toISOString(),
      permisos: admin.permisos
    };

    // Log the update
    await createAuditLog(
      {
        id: updatedProfile.id,
        tipo: 'super_admin',
        nombre: `${updatedProfile.nombres} ${updatedProfile.apellidos}`,
        identificador: updatedProfile.username
      },
      'actualizar_perfil_super_admin',
      'perfil',
      'Actualización de perfil de super administrador',
      { updatedFields: { nombres, apellidos, email, username } },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Perfil de administrador actualizado exitosamente'
    });
  }
);

export const getDashboardStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log('📊 Getting dashboard stats...');

      // 1. Total de usuarios (socios) reales
      const totalSocios = await User.countDocuments({
        role: 'socio',
        activo: true
      });
      console.log('👥 Total socios:', totalSocios);

      // 2. Estadísticas de boletas
      const totalBoletas = await Boleta.countDocuments();
      const boletasPendientes = await Boleta.countDocuments({
        estado: { $in: ['pendiente', 'vencida'] }
      });
      const boletasPagadas = await Boleta.countDocuments({
        estado: 'pagada'
      });
      console.log('📄 Boletas - Total:', totalBoletas, 'Pendientes:', boletasPendientes, 'Pagadas:', boletasPagadas);

      // 3. Ingresos reales de pagos
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      // Debug: Check total pagos in system
      const totalPagos = await Pago.countDocuments();
      const pagosCompletados = await Pago.countDocuments({ estadoPago: 'completado' });
      console.log('💳 Total pagos in DB:', totalPagos, 'Completados:', pagosCompletados);

      // Ingresos del mes actual
      const ingresosMesData = await Pago.aggregate([
        {
          $match: {
            fechaPago: { $gte: firstDayOfMonth },
            estadoPago: 'completado'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$monto' }
          }
        }
      ]);
      const ingresosMes = ingresosMesData.length > 0 ? ingresosMesData[0].total : 0;

      // Ingresos totales históricos
      const ingresosTotalesData = await Pago.aggregate([
        {
          $match: {
            estadoPago: 'completado'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$monto' }
          }
        }
      ]);
      const ingresosTotales = ingresosTotalesData.length > 0 ? ingresosTotalesData[0].total : 0;
      console.log('💰 Ingresos - Mes:', ingresosMes, 'Total:', ingresosTotales);

      // 4. Calcular morosidad real
      const boletasVencidas = await Boleta.countDocuments({
        estado: 'vencida'
      });
      const morosidad = totalBoletas > 0 ? (boletasVencidas / totalBoletas) * 100 : 0;
      console.log('⚠️ Morosidad:', morosidad.toFixed(2) + '%');

      const stats = {
        totalSocios,
        boletasPendientes,
        boletasPagadas,
        ingresosMes,
        ingresosTotales,
        morosidad: parseFloat(morosidad.toFixed(2))
      };

      console.log('✅ Dashboard stats calculated:', stats);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas del dashboard obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error getting dashboard stats:', error);
      return next(new AppError('Error al obtener estadísticas del dashboard', 500));
    }
  }
);

// Get debt statistics
export const getDebtStatisticsEndpoint = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { getDebtStatistics } = await import('../utils/debtSync');
      const statistics = await getDebtStatistics();

      res.status(200).json({
        success: true,
        data: statistics,
        message: 'Estadísticas de deuda obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error getting debt statistics:', error);
      return next(new AppError('Error al obtener estadísticas de deuda', 500));
    }
  }
);

// Sync user debt manually
export const syncUserDebtManual = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log('🔄 Manual debt sync initiated by admin:', req.user?.id);

      const { syncUserDebt, validateDebtConsistency } = await import('../utils/debtSync');

      // Check current inconsistencies
      const inconsistenciesBefore = await validateDebtConsistency();

      // Run synchronization
      const syncResult = await syncUserDebt();

      // Check consistency after sync
      const inconsistenciesAfter = await validateDebtConsistency();

      // Log the action
      await createAuditLog(
        {
          id: req.user!.id,
          tipo: 'super_admin',
          nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
          identificador: (req.user as any).username || (req.user as any).rut || ''
        },
        'sincronizar_deuda',
        'sistema',
        `Sincronización manual de deuda - ${syncResult.usersWithChanges} usuarios actualizados`,
        {
          usersProcessed: syncResult.usersProcessed,
          usersWithChanges: syncResult.usersWithChanges,
          totalDebtBefore: syncResult.totalDebtBefore,
          totalDebtAfter: syncResult.totalDebtAfter,
          inconsistenciesBefore: inconsistenciesBefore.length,
          inconsistenciesAfter: inconsistenciesAfter.length
        },
        'exitoso',
        undefined,
        req
      );

      res.status(200).json({
        success: true,
        data: {
          syncResult,
          inconsistenciesBefore: inconsistenciesBefore.length,
          inconsistenciesAfter: inconsistenciesAfter.length
        },
        message: `Sincronización completada. ${syncResult.usersWithChanges} usuarios actualizados.`
      });

    } catch (error) {
      console.error('❌ Error in manual debt sync:', error);

      // Log the failed action
      try {
        await createAuditLog(
          {
            id: req.user!.id,
            tipo: 'super_admin',
            nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
            identificador: (req.user as any).username || (req.user as any).rut || ''
          },
          'sincronizar_deuda',
          'sistema',
          'Error en sincronización manual de deuda',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'error',
          undefined,
          req
        );
      } catch (auditError) {
        console.error('Failed to log audit for debt sync error:', auditError);
      }

      return next(new AppError('Error al sincronizar deuda de usuarios', 500));
    }
  }
);