import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import SystemConfig from '../models/SystemConfig';
import { createAuditLog } from '../utils/audit';
import BackupService from '../services/backupService';

/**
 * @swagger
 * /api/system/config:
 *   get:
 *     summary: Obtener configuración actual del sistema
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 */
export const getSystemConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔧 Obteniendo configuración del sistema...');

    try {
      let config = await SystemConfig.findOne();

      // Si no existe configuración, crear una básica
      if (!config) {
        config = new SystemConfig({
          organizacion: {
            nombreAPR: 'APR Sin Configurar',
            direccion: 'Sin configurar',
            comuna: 'Sin configurar',
            region: 'Sin configurar',
            telefono: 'Sin configurar',
            email: 'admin@apr.local'
          },
          metadata: {
            creadoPor: req.user!.id, // Usar el usuario actual
            version: '1.0'
          }
        });

        // Guardar la configuración inicial
        await config.save();
        console.log('✅ Configuración inicial creada para el usuario:', req.user!.email);
      }

      // Verificar permisos: admin y super_admin pueden ver toda la config
      // socios solo pueden ver información básica
      let responseData;

      if (req.user?.role === 'socio') {
        // Solo información pública para socios
        responseData = {
          organizacion: {
            nombreAPR: config.organizacion.nombreAPR,
            direccion: config.organizacion.direccion,
            comuna: config.organizacion.comuna,
            region: config.organizacion.region,
            telefono: config.organizacion.telefono,
            email: config.organizacion.email,
            sitioWeb: config.organizacion.sitioWeb,
            logoUrl: config.organizacion.logoUrl
          },
          regional: config.regional,
          facturacion: {
            diasVencimientoDefecto: config.facturacion.diasVencimientoDefecto,
            incluirIVA: config.facturacion.incluirIVA,
            porcentajeIVA: config.facturacion.porcentajeIVA
          },
          servicios: {
            costoReconexion: config.servicios.costoReconexion,
            horarioCorte: config.servicios.horarioCorte
          }
        };
      } else {
        // Configuración completa para admins
        responseData = config;
      }

      res.json({
        success: true,
        data: responseData,
        message: 'Configuración del sistema obtenida exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo configuración del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/system/config:
 *   put:
 *     summary: Actualizar configuración del sistema
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 */
export const updateSystemConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔧 Actualizando configuración del sistema...');

    try {
      const updateData = req.body;

      // Obtener configuración actual
      let config = await SystemConfig.findOne();

      if (!config) {
        // Crear configuración inicial si no existe
        config = new SystemConfig({
          ...updateData,
          metadata: {
            creadoPor: req.user!.id,
            version: '1.0'
          }
        });
      } else {
        // Actualizar configuración existente
        Object.assign(config, updateData, {
          'metadata.modificadoPor': req.user!.id,
          'metadata.fechaModificacion': new Date()
        });
      }

      // Validar configuración
      const validation = (config as any).isValid();
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Configuración inválida',
          errors: validation.errors
        });
      }

      await config.save();

      // Actualizar configuración de backup automático si cambió
      try {
        const backupService = BackupService.getInstance();
        const backupConfig = {
          enabled: config.backups.automatico,
          frequency: config.backups.frecuencia === 'diario' ? 'daily' as const :
                    config.backups.frecuencia === 'semanal' ? 'weekly' as const : 'monthly' as const,
          time: config.backups.horaEjecucion,
          retentionDays: config.backups.retencionDias,
          includeFiles: config.backups.incluirArchivos,
          notifyEmails: config.backups.emailNotificacion,
          backupPath: require('path').join(process.cwd(), 'backups')
        };
        await backupService.setupAutomaticBackup(backupConfig);
        console.log('🔄 Configuración de backup automático sincronizada');
      } catch (error) {
        console.warn('⚠️ Error sincronizando configuración de backup:', error);
      }

      // Crear log de auditoría
      await createAuditLog({
        action: config.isNew ? 'CREATE' : 'UPDATE',
        entity: 'SystemConfig',
        entityId: (config._id as any).toString(),
        userId: req.user!.id,
        details: {
          accion: config.isNew ? 'Configuración inicial del sistema' : 'Actualización de configuración',
          nombreAPR: config.organizacion.nombreAPR,
          sectoresActualizados: Object.keys(updateData)
        }
      });

      console.log(`✅ Configuración del sistema ${config.isNew ? 'creada' : 'actualizada'} exitosamente`);

      res.json({
        success: true,
        data: config,
        message: `Configuración del sistema ${config.isNew ? 'creada' : 'actualizada'} exitosamente`
      });

    } catch (error: any) {
      console.error('❌ Error actualizando configuración del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/system/config/validate:
 *   post:
 *     summary: Validar configuración del sistema
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 */
export const validateSystemConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔍 Validando configuración del sistema...');

    try {
      const configData = req.body;

      // Crear instancia temporal para validación
      const tempConfig = new SystemConfig(configData);
      const validation = (tempConfig as any).isValid();

      res.json({
        success: true,
        data: validation,
        message: validation.valid ? 'Configuración válida' : 'Configuración inválida'
      });

    } catch (error: any) {
      console.error('❌ Error validando configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/system/config/reset:
 *   post:
 *     summary: Restaurar configuración por defecto
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 */
export const resetSystemConfig = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔄 Restaurando configuración del sistema a valores por defecto...');

    try {
      const { seccion } = req.body; // Opcional: restaurar solo una sección

      let config = await SystemConfig.findOne();
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'No hay configuración del sistema para restaurar'
        });
      }

      // Backup de configuración actual
      const backupConfig = JSON.stringify(config.toObject());

      if (seccion) {
        // Restaurar solo una sección específica
        const defaultConfig = new SystemConfig({
          metadata: { creadoPor: req.user!.id }
        });

        switch (seccion) {
          case 'facturacion':
            config.facturacion = defaultConfig.facturacion;
            break;
          case 'servicios':
            config.servicios = defaultConfig.servicios;
            break;
          case 'medidores':
            config.medidores = defaultConfig.medidores;
            break;
          case 'notificaciones':
            config.notificaciones = defaultConfig.notificaciones;
            break;
          case 'seguridad':
            config.seguridad = defaultConfig.seguridad;
            break;
          case 'backups':
            config.backups = defaultConfig.backups;
            break;
          case 'aplicacion':
            config.aplicacion = defaultConfig.aplicacion;
            break;
          case 'integraciones':
            config.integraciones = defaultConfig.integraciones;
            break;
          default:
            return res.status(400).json({
              success: false,
              message: 'Sección no válida'
            });
        }
      } else {
        // Restaurar toda la configuración (excepto organización)
        const defaultConfig = new SystemConfig({
          metadata: { creadoPor: req.user!.id }
        });

        // Mantener datos de organización
        const orgData = config.organizacion;

        // Restaurar todo excepto organización y metadata
        config.regional = defaultConfig.regional;
        config.facturacion = defaultConfig.facturacion;
        config.servicios = defaultConfig.servicios;
        config.medidores = defaultConfig.medidores;
        config.notificaciones = defaultConfig.notificaciones;
        config.seguridad = defaultConfig.seguridad;
        config.backups = defaultConfig.backups;
        config.aplicacion = defaultConfig.aplicacion;
        config.integraciones = defaultConfig.integraciones;

        // Restaurar datos de organización
        config.organizacion = orgData;
      }

      // Actualizar metadata
      config.metadata.modificadoPor = req.user!.id as any;
      config.metadata.fechaModificacion = new Date();
      config.metadata.configuracionAnterior = backupConfig;

      await config.save();

      // Crear log de auditoría
      await createAuditLog({
        action: 'UPDATE',
        entity: 'SystemConfig',
        entityId: (config._id as any).toString(),
        userId: req.user!.id,
        details: {
          accion: 'Restauración de configuración',
          seccion: seccion || 'completa',
          backup: 'guardado'
        }
      });

      console.log(`✅ Configuración restaurada exitosamente${seccion ? ` (sección: ${seccion})` : ''}`);

      res.json({
        success: true,
        data: config,
        message: `Configuración restaurada exitosamente${seccion ? ` (sección: ${seccion})` : ''}`
      });

    } catch (error: any) {
      console.error('❌ Error restaurando configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/system/config/backup:
 *   get:
 *     summary: Obtener backup de configuración anterior
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 */
export const getConfigBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('💾 Obteniendo backup de configuración...');

    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.metadata.configuracionAnterior) {
        return res.status(404).json({
          success: false,
          message: 'No hay backup de configuración disponible'
        });
      }

      const backup = JSON.parse(config.metadata.configuracionAnterior);

      res.json({
        success: true,
        data: backup,
        message: 'Backup de configuración obtenido exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo backup:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/system/config/restore-backup:
 *   post:
 *     summary: Restaurar configuración desde backup
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 */
export const restoreFromBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔄 Restaurando configuración desde backup...');

    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.metadata.configuracionAnterior) {
        return res.status(404).json({
          success: false,
          message: 'No hay backup de configuración disponible'
        });
      }

      const backup = JSON.parse(config.metadata.configuracionAnterior);

      // Guardar configuración actual como nuevo backup
      const currentBackup = JSON.stringify(config.toObject());

      // Restaurar desde backup (excepto metadata)
      const { metadata, ...backupData } = backup;
      Object.assign(config, backupData);

      // Actualizar metadata
      config.metadata.modificadoPor = req.user!.id as any;
      config.metadata.fechaModificacion = new Date();
      config.metadata.configuracionAnterior = currentBackup;

      await config.save();

      // Crear log de auditoría
      await createAuditLog({
        action: 'UPDATE',
        entity: 'SystemConfig',
        entityId: (config._id as any).toString(),
        userId: req.user!.id,
        details: {
          accion: 'Restauración desde backup',
          fechaBackup: metadata?.fechaModificacion || 'desconocida'
        }
      });

      console.log('✅ Configuración restaurada desde backup exitosamente');

      res.json({
        success: true,
        data: config,
        message: 'Configuración restaurada desde backup exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error restaurando desde backup:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Verificar estado del sistema
 *     tags: [System Config]
 *     responses:
 *       200:
 *         description: Estado del sistema
 */
export const getSystemHealth = asyncHandler(
  async (req: Request, res: Response) => {
    console.log('🏥 Verificando estado del sistema...');

    try {
      const config = await SystemConfig.findOne();
      const dbConnected = config ? true : false;

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        configuration: config ? 'loaded' : 'not_configured',
        environment: process.env.NODE_ENV || 'development',
        version: config?.aplicacion.versionApp || '1.0.0',
        maintenance: config?.aplicacion.modoMantenimiento || false
      };

      res.json({
        success: true,
        data: health,
        message: 'Estado del sistema obtenido exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error verificando estado del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);