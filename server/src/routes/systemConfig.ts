import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body } from 'express-validator';
import {
  getSystemConfig,
  updateSystemConfig,
  validateSystemConfig,
  resetSystemConfig,
  getConfigBackup,
  restoreFromBackup,
  getSystemHealth
} from '../controllers/systemConfigController';

const router = express.Router();

// Validaciones para actualización de configuración
const validateConfigUpdate = [
  body('organizacion.nombreAPR')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre del APR debe tener entre 3 y 100 caracteres'),

  body('organizacion.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido'),

  body('organizacion.telefono')
    .optional()
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('El teléfono debe tener entre 8 y 20 caracteres'),

  body('facturacion.diaGeneracionBoletas')
    .optional()
    .isInt({ min: 1, max: 28 })
    .withMessage('El día de generación debe estar entre 1 y 28'),

  body('facturacion.diasVencimientoDefecto')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Los días de vencimiento deben estar entre 1 y 90'),

  body('servicios.diasGraciaCorte')
    .optional()
    .isInt({ min: 0, max: 90 })
    .withMessage('Los días de gracia deben estar entre 0 y 90'),

  body('servicios.costoReconexion')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo de reconexión debe ser mayor o igual a 0'),

  body('seguridad.sessionTimeout')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('El timeout de sesión debe estar entre 5 y 1440 minutos'),

  body('seguridad.maxLoginAttempts')
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage('Los intentos máximos de login deben estar entre 3 y 10'),

  body('seguridad.passwordMinLength')
    .optional()
    .isInt({ min: 6, max: 50 })
    .withMessage('La longitud mínima de contraseña debe estar entre 6 y 50'),

  validate
];

const validateResetConfig = [
  body('seccion')
    .optional()
    .isIn(['facturacion', 'servicios', 'medidores', 'notificaciones', 'seguridad', 'backups', 'aplicacion', 'integraciones'])
    .withMessage('Sección no válida'),

  validate
];

// ====================
// RUTAS PÚBLICAS
// ====================

// Estado del sistema (sin autenticación)
router.get('/health', getSystemHealth);

// ====================
// RUTAS AUTENTICADAS
// ====================

// Obtener configuración (todos los roles pueden ver según permisos)
router.get('/config',
  authenticate,
  getSystemConfig
);

// ====================
// RUTAS DE ADMINISTRACIÓN (ADMIN/SUPER_ADMIN)
// ====================

// Validar configuración
router.post('/config/validate',
  authenticate,
  authorize('admin', 'super_admin'),
  validateSystemConfig
);

// Obtener backup de configuración
router.get('/config/backup',
  authenticate,
  authorize('admin', 'super_admin'),
  getConfigBackup
);

// ====================
// RUTAS DE GESTIÓN (SOLO SUPER_ADMIN)
// ====================

// Actualizar configuración
router.put('/config',
  authenticate,
  authorize('super_admin'),
  validateConfigUpdate,
  updateSystemConfig
);

// Restaurar configuración por defecto
router.post('/config/reset',
  authenticate,
  authorize('super_admin'),
  validateResetConfig,
  resetSystemConfig
);

// Restaurar desde backup
router.post('/config/restore-backup',
  authenticate,
  authorize('super_admin'),
  restoreFromBackup
);

export default router;