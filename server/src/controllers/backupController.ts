import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import BackupService from '../services/backupService';
import SystemConfig from '../models/SystemConfig';
import { createAuditLog } from '../utils/audit';
import path from 'path';
import fs from 'fs';

/**
 * @swagger
 * /api/backups/create:
 *   post:
 *     summary: Crear backup manual del sistema
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 */
export const createManualBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { includeFiles = true } = req.body;

    console.log('💾 Iniciando backup manual solicitado por:', req.user!.email);

    try {
      const backupService = BackupService.getInstance();
      const result = await backupService.createFullBackup(includeFiles);

      // Crear log de auditoría
      await createAuditLog({
        action: 'CREATE',
        entity: 'Backup',
        entityId: result.filename,
        userId: req.user!.id,
        details: {
          tipo: 'manual',
          tamaño: result.size,
          exitoso: result.success,
          incluirArchivos: includeFiles,
          duracion: result.duration
        }
      });

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: 'Backup creado exitosamente'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error al crear backup',
          error: result.error
        });
      }

    } catch (error: any) {
      console.error('❌ Error en backup manual:', error);
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
 * /api/backups/list:
 *   get:
 *     summary: Listar backups disponibles
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 */
export const listBackups = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const backupService = BackupService.getInstance();
      const backups = await backupService.listBackups();
      const stats = await backupService.getBackupStats();

      res.json({
        success: true,
        data: {
          backups,
          stats
        },
        message: `${backups.length} backup(s) encontrados`
      });

    } catch (error: any) {
      console.error('❌ Error listando backups:', error);
      res.status(500).json({
        success: false,
        message: 'Error al listar backups',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/backups/download/{filename}:
 *   get:
 *     summary: Descargar archivo de backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 */
export const downloadBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;

    try {
      // Validar nombre del archivo
      if (!filename || !filename.startsWith('backup_') || !filename.endsWith('.zip')) {
        return res.status(400).json({
          success: false,
          message: 'Nombre de archivo inválido'
        });
      }

      const backupPath = path.join(process.cwd(), 'backups', filename);

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({
          success: false,
          message: 'Archivo de backup no encontrado'
        });
      }

      // Crear log de auditoría
      await createAuditLog({
        action: 'DOWNLOAD',
        entity: 'Backup',
        entityId: filename,
        userId: req.user!.id,
        details: {
          accion: 'descarga_backup',
          archivo: filename
        }
      });

      console.log(`📥 Descarga de backup iniciada: ${filename} por ${req.user!.email}`);

      // Enviar archivo
      res.download(backupPath, filename, (err) => {
        if (err) {
          console.error('❌ Error en descarga:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error al descargar archivo'
            });
          }
        } else {
          console.log(`✅ Descarga completada: ${filename}`);
        }
      });

    } catch (error: any) {
      console.error('❌ Error en descarga de backup:', error);
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
 * /api/backups/restore:
 *   post:
 *     summary: Restaurar sistema desde backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 */
export const restoreFromBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.body;

    console.log('🔄 Solicitud de restauración desde:', filename, 'por:', req.user!.email);

    try {
      const backupService = BackupService.getInstance();
      const result = await backupService.restoreFromBackup(filename);

      // Crear log de auditoría
      await createAuditLog({
        action: 'RESTORE',
        entity: 'Backup',
        entityId: filename,
        userId: req.user!.id,
        details: {
          accion: 'restauracion_sistema',
          archivo: filename,
          exitoso: result.success,
          mensaje: result.message
        }
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error: any) {
      console.error('❌ Error en restauración:', error);
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
 * /api/backups/delete/{filename}:
 *   delete:
 *     summary: Eliminar archivo de backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 */
export const deleteBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;

    try {
      // Validar nombre del archivo
      if (!filename || !filename.startsWith('backup_') || !filename.endsWith('.zip')) {
        return res.status(400).json({
          success: false,
          message: 'Nombre de archivo inválido'
        });
      }

      const backupPath = path.join(process.cwd(), 'backups', filename);

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({
          success: false,
          message: 'Archivo de backup no encontrado'
        });
      }

      // Eliminar archivo
      fs.unlinkSync(backupPath);

      // Crear log de auditoría
      await createAuditLog({
        action: 'DELETE',
        entity: 'Backup',
        entityId: filename,
        userId: req.user!.id,
        details: {
          accion: 'eliminacion_backup',
          archivo: filename
        }
      });

      console.log(`🗑️ Backup eliminado: ${filename} por ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Backup eliminado exitosamente'
      });

    } catch (error: any) {
      console.error('❌ Error eliminando backup:', error);
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
 * /api/backups/setup-automatic:
 *   post:
 *     summary: Configurar backup automático
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 */
export const setupAutomaticBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Obtener configuración actual del sistema
      const systemConfig = await SystemConfig.findOne();
      if (!systemConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuración del sistema no encontrada'
        });
      }

      const backupConfig = {
        enabled: systemConfig.backups.automatico,
        frequency: systemConfig.backups.frecuencia as 'daily' | 'weekly' | 'monthly',
        time: systemConfig.backups.horaEjecucion,
        retentionDays: systemConfig.backups.retencionDias,
        includeFiles: systemConfig.backups.incluirArchivos,
        notifyEmails: systemConfig.backups.emailNotificacion,
        backupPath: path.join(process.cwd(), 'backups')
      };

      const backupService = BackupService.getInstance();
      await backupService.setupAutomaticBackup(backupConfig);

      // Crear log de auditoría
      await createAuditLog({
        action: 'UPDATE',
        entity: 'BackupConfiguration',
        entityId: 'automatic',
        userId: req.user!.id,
        details: {
          habilitado: backupConfig.enabled,
          frecuencia: backupConfig.frequency,
          hora: backupConfig.time,
          retencion: backupConfig.retentionDays
        }
      });

      console.log(`⚙️ Configuración de backup automático actualizada por: ${req.user!.email}`);

      res.json({
        success: true,
        data: backupConfig,
        message: backupConfig.enabled
          ? 'Backup automático configurado exitosamente'
          : 'Backup automático deshabilitado'
      });

    } catch (error: any) {
      console.error('❌ Error configurando backup automático:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
);