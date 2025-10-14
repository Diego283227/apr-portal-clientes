import express from 'express';
import {
  createManualBackup,
  listBackups,
  downloadBackup,
  restoreFromBackup,
  deleteBackup,
  setupAutomaticBackup
} from '../controllers/backupController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Backups
 *   description: Gestión de backups del sistema
 */

// Crear backup manual
router.post('/create', authorize('admin', 'super_admin'), createManualBackup);

// Listar backups disponibles
router.get('/list', authorize('admin', 'super_admin'), listBackups);

// Descargar backup
router.get('/download/:filename', authorize('admin', 'super_admin'), downloadBackup);

// Restaurar desde backup
router.post('/restore', authorize('super_admin'), restoreFromBackup);

// Eliminar backup
router.delete('/delete/:filename', authorize('admin', 'super_admin'), deleteBackup);

// Configurar backup automático
router.post('/setup-automatic', authorize('super_admin'), setupAutomaticBackup);

export default router;