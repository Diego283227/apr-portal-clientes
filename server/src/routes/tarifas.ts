import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body, param } from 'express-validator';
import {
  getTarifaActiva,
  getAllTarifas,
  crearTarifa,
  activarTarifa,
  simularCalculo,
  actualizarTarifa,
  eliminarTarifa,
  pausarTarifa,
  reanudarTarifa,
  finalizarVigenciaTarifa
} from '../controllers/tarifaController';

const router = express.Router();

// Validaciones
const validarCrearTarifa = [
  body('nombre')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),

  body('fechaVigencia')
    .isISO8601()
    .withMessage('Fecha de vigencia debe ser válida'),

  body('cargoFijo.residencial')
    .isFloat({ min: 0 })
    .withMessage('Cargo fijo residencial debe ser mayor o igual a 0'),

  body('cargoFijo.comercial')
    .isFloat({ min: 0 })
    .withMessage('Cargo fijo comercial debe ser mayor o igual a 0'),

  body('cargoFijo.industrial')
    .isFloat({ min: 0 })
    .withMessage('Cargo fijo industrial debe ser mayor o igual a 0'),

  body('cargoFijo.terceraEdad')
    .isFloat({ min: 0 })
    .withMessage('Cargo fijo tercera edad debe ser mayor o igual a 0'),

  body('escalones')
    .isArray({ min: 1 })
    .withMessage('Debe definir al menos un escalón'),

  body('escalones.*.desde')
    .isFloat({ min: 0 })
    .withMessage('El valor "desde" debe ser mayor o igual a 0'),

  body('escalones.*.hasta')
    .isFloat({ min: -1 })
    .withMessage('El valor "hasta" debe ser mayor o igual a -1'),

  body('escalones.*.tarifaResidencial')
    .isFloat({ min: 0 })
    .withMessage('Tarifa residencial debe ser mayor o igual a 0'),

  body('recargos.diasGracia')
    .isInt({ min: 0, max: 90 })
    .withMessage('Días de gracia debe estar entre 0 y 90'),

  body('recargos.porcentajeMora')
    .isFloat({ min: 0, max: 10 })
    .withMessage('Porcentaje de mora debe estar entre 0 y 10'),

  validate
];

const validarSimulacion = [
  body('categoriaUsuario')
    .isIn(['residencial', 'comercial', 'industrial', 'tercera_edad'])
    .withMessage('Categoría de usuario no válida'),

  body('consumoM3')
    .isFloat({ min: 0 })
    .withMessage('El consumo debe ser mayor o igual a 0'),

  body('pagoAnticipado')
    .optional()
    .isBoolean()
    .withMessage('Pago anticipado debe ser boolean'),

  validate
];

const validarIdParam = [
  param('id')
    .isMongoId()
    .withMessage('ID no válido'),
  validate
];

// ====================
// RUTAS PÚBLICAS (ADMIN/SUPER_ADMIN)
// ====================

// Obtener tarifa activa
router.get('/configuracion',
  authenticate,
  authorize('admin', 'super_admin'),
  getTarifaActiva
);

// Obtener todas las configuraciones
router.get('/configuraciones',
  authenticate,
  authorize('admin', 'super_admin'),
  getAllTarifas
);

// Simular cálculo de tarifa
router.post('/simular',
  authenticate,
  authorize('admin', 'super_admin'),
  validarSimulacion,
  simularCalculo
);

// ====================
// RUTAS DE GESTIÓN (SOLO SUPER_ADMIN)
// ====================

// Crear nueva configuración
router.post('/configuracion',
  authenticate,
  authorize('super_admin'),
  validarCrearTarifa,
  crearTarifa
);

// Activar configuración
router.put('/configuracion/:id/activar',
  authenticate,
  authorize('super_admin'),
  validarIdParam,
  activarTarifa
);

// Pausar configuración
router.put('/configuracion/:id/pausar',
  authenticate,
  authorize('super_admin'),
  validarIdParam,
  pausarTarifa
);

// Reanudar configuración pausada
router.put('/configuracion/:id/reanudar',
  authenticate,
  authorize('super_admin'),
  validarIdParam,
  reanudarTarifa
);

// Finalizar vigencia de configuración
router.put('/configuracion/:id/finalizar',
  authenticate,
  authorize('super_admin'),
  validarIdParam,
  finalizarVigenciaTarifa
);

// Actualizar configuración
router.put('/configuracion/:id',
  authenticate,
  authorize('super_admin'),
  validarIdParam,
  actualizarTarifa
);

// Eliminar configuración
router.delete('/configuracion/:id',
  authenticate,
  authorize('super_admin'),
  validarIdParam,
  eliminarTarifa
);

export default router;