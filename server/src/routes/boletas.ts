import express, { Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { AuthenticatedRequest } from '../types';
import { Boleta, User } from '../models';
import {
  createBoleta,
  getBoletas,
  updateBoletaStatus,
  deleteBoleta,
  getBoletaById,
  resendBoletaNotifications,
  getBoletaStats,
  archiveBoleta,
  getArchivedBoletas
} from '../controllers/boletaController';

const router = express.Router();


// Get all boletas for authenticated user (socio gets their own, admin gets all)
router.get('/', authenticate, authorize('socio', 'super_admin'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { estado } = req.query;
    
    let query: any = {};
    
    // If user is socio, only show their boletas
    if (req.user?.role === 'socio') {
      query.socioId = req.user.id;
    }
    // If user is super_admin, show all boletas (no filter)
    
    if (estado && typeof estado === 'string') {
      query.estado = estado;
    }

    const boletas = await Boleta.find(query)
      .populate('socioId', 'nombres apellidos rut email codigoSocio direccion telefono fechaIngreso saldoActual deudaTotal')
      .sort({ fechaEmision: -1 });

    // Transform data for consistent response format
    const transformedBoletas = boletas.map(boleta => {
      const socio = boleta.socioId as any; // Cast to any to access populated fields

      // Handle cases where socioId might not be populated (deleted user)
      if (!socio) {
        return {
          id: (boleta._id as any).toString(),
          numeroBoleta: boleta.numeroBoleta,
          socioId: null,
          socio: null,
          periodo: boleta.periodo,
          fechaEmision: boleta.fechaEmision,
          fechaVencimiento: boleta.fechaVencimiento,
          consumoM3: boleta.consumoM3,
          montoTotal: boleta.montoTotal,
          estado: boleta.estado,
          lecturaAnterior: boleta.lecturaAnterior,
          lecturaActual: boleta.lecturaActual
        };
      }

      return {
        id: (boleta._id as any).toString(),
        numeroBoleta: boleta.numeroBoleta,
        socioId: (socio._id as any).toString(),
        socio: {
          id: (socio._id as any).toString(),
          nombres: socio.nombres,
          apellidos: socio.apellidos,
          rut: socio.rut,
          email: socio.email,
          role: 'socio',
          codigoSocio: socio.codigoSocio,
          direccion: socio.direccion,
          telefono: socio.telefono,
          fechaIngreso: socio.fechaIngreso?.toISOString().split('T')[0],
          saldoActual: socio.saldoActual || 0,
          deudaTotal: socio.deudaTotal || 0
        },
        fechaEmision: boleta.fechaEmision.toISOString().split('T')[0],
        fechaVencimiento: boleta.fechaVencimiento.toISOString().split('T')[0],
        consumoM3: boleta.consumoM3,
        montoTotal: boleta.montoTotal,
        estado: boleta.estado,
        detalle: boleta.detalle,
        lecturaAnterior: boleta.lecturaAnterior,
        lecturaActual: boleta.lecturaActual,
        periodo: boleta.periodo
      };
    });

    console.log(`💧 User ${req.user?.email} (${req.user?.role}) retrieved ${transformedBoletas.length} boletas`);

    res.json({
      success: true,
      data: transformedBoletas,
      message: boletas.length === 0 ? 'No tienes boletas registradas' : 'Boletas obtenidas exitosamente',
    });
  }
));

// Get specific boleta
router.get('/:id', authenticate, authorize('socio', 'super_admin'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    let query: any = { _id: id };
    
    // If user is socio, only allow access to their own boletas
    if (req.user?.role === 'socio') {
      query.socioId = req.user.id;
    }
    // If user is super_admin, allow access to any boleta
    
    const boleta = await Boleta.findOne(query)
      .populate('socioId', 'nombres apellidos rut email codigoSocio direccion telefono fechaIngreso saldoActual deudaTotal');
    
    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada',
      });
    }

    // Transform data for consistent response format
    const socio = boleta.socioId as any; // Cast to any to access populated fields
    const transformedBoleta = {
      id: (boleta._id as any).toString(),
      numeroBoleta: boleta.numeroBoleta,
      socioId: (socio._id as any).toString(),
      socio: {
        id: (socio._id as any).toString(),
        nombres: socio.nombres,
        apellidos: socio.apellidos,
        rut: socio.rut,
        email: socio.email,
        role: 'socio',
        codigoSocio: socio.codigoSocio,
        direccion: socio.direccion,
        telefono: socio.telefono,
        fechaIngreso: socio.fechaIngreso?.toISOString().split('T')[0],
        saldoActual: socio.saldoActual || 0,
        deudaTotal: socio.deudaTotal || 0
      },
      fechaEmision: boleta.fechaEmision.toISOString().split('T')[0],
      fechaVencimiento: boleta.fechaVencimiento.toISOString().split('T')[0],
      consumoM3: boleta.consumoM3,
      montoTotal: boleta.montoTotal,
      estado: boleta.estado,
      detalle: boleta.detalle,
      lecturaAnterior: boleta.lecturaAnterior,
      lecturaActual: boleta.lecturaActual,
      periodo: boleta.periodo
    };

    res.json({
      success: true,
      data: transformedBoleta,
      message: 'Boleta obtenida exitosamente',
    });
  }
));

// Validation schemas
const createBoletaValidation = [
  body('socioId')
    .isMongoId()
    .withMessage('ID de socio inválido'),

  body('lecturaAnterior')
    .isFloat({ min: 0 })
    .withMessage('Lectura anterior debe ser un número positivo'),

  body('lecturaActual')
    .isFloat({ min: 0 })
    .withMessage('Lectura actual debe ser un número positivo'),

  body('periodo')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Período es requerido'),

  body('fechaVencimiento')
    .isISO8601()
    .withMessage('Fecha de vencimiento debe ser una fecha válida'),

  body('sendNotifications')
    .optional()
    .isBoolean()
    .withMessage('sendNotifications debe ser un booleano')
];

const updateStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID de boleta inválido'),

  body('estado')
    .isIn(['pendiente', 'pagada', 'vencida', 'anulada'])
    .withMessage('Estado inválido')
];

const updateMultipleStatusValidation = [
  body('boletaIds')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un ID de boleta'),

  body('boletaIds.*')
    .isMongoId()
    .withMessage('ID de boleta inválido'),

  body('status')
    .isIn(['pendiente', 'pagada', 'vencida', 'anulada'])
    .withMessage('Estado inválido')
];

const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido')
];

// Admin routes - Enhanced boleta management

// GET /api/boletas/admin/stats - Get boleta statistics
router.get('/admin/stats', authenticate, authorize('admin', 'super_admin'), getBoletaStats);

// GET /api/boletas/admin/archived - Get archived boletas
router.get('/admin/archived', authenticate, authorize('admin', 'super_admin'), getArchivedBoletas);

// PUT /api/boletas/admin/:id/archive - Archive boleta (dar de baja)
router.put('/admin/:id/archive', authenticate, authorize('admin', 'super_admin'), mongoIdValidation, validate, archiveBoleta);

// GET /api/boletas/admin/all - Get all boletas with enhanced filters
router.get('/admin/all', authenticate, authorize('admin', 'super_admin'), getBoletas);

// POST /api/boletas/admin/create - Create new boleta with notifications
router.post(
  '/admin/create',
  authenticate,
  authorize('admin', 'super_admin'),
  createBoletaValidation,
  validate,
  createBoleta
);

// POST /api/boletas - Create new boleta (alternative route for frontend)
router.post(
  '/',
  authenticate,
  authorize('super_admin'),
  createBoletaValidation,
  validate,
  createBoleta
);

// GET /api/boletas/all - Get all boletas for admin
router.get('/all', authenticate, authorize('super_admin'), getBoletas);

// DELETE /api/boletas/paid - Remove multiple boletas after payment
router.delete(
  '/paid',
  authenticate,
  authorize('socio', 'admin', 'super_admin'),
  [
    body('boletaIds')
      .isArray({ min: 1 })
      .withMessage('Se requiere al menos un ID de boleta'),
    body('boletaIds.*')
      .isMongoId()
      .withMessage('ID de boleta inválido'),
    body('paymentMethod')
      .optional()
      .isString()
      .withMessage('Método de pago debe ser string'),
    body('paymentId')
      .optional()
      .isString()
      .withMessage('ID de pago debe ser string')
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { boletaIds, paymentMethod, paymentId } = req.body;

    console.log(`🗑️ Removing paid boletas: ${boletaIds} (Payment: ${paymentMethod}/${paymentId})`);

    // Build query - socios can only delete their own boletas
    let query: any = { _id: { $in: boletaIds } };
    if (req.user?.role === 'socio') {
      query.socioId = req.user.id;
    }

    // Get boletas before deletion for logging
    const boletasToDelete = await Boleta.find(query);
    const totalAmount = boletasToDelete.reduce((sum, boleta) => sum + boleta.montoTotal, 0);

    const result = await Boleta.deleteMany(query);

    console.log(`✅ Removed ${result.deletedCount} paid boletas (Total: $${totalAmount})`);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron boletas para eliminar'
      });
    }

    // Log the payment for audit purposes
    console.log(`💰 Payment processed: ${paymentMethod} - ${paymentId} - $${totalAmount}`);

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount,
        boletaIds,
        totalAmount,
        paymentMethod,
        paymentId
      },
      message: `Se eliminaron ${result.deletedCount} boletas pagadas. Total: $${totalAmount}`
    });
  })
);

// DELETE /api/boletas/:id - Delete boleta (alternative route)
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin'),
  mongoIdValidation,
  validate,
  deleteBoleta
);

// PATCH /api/boletas/status - Update multiple boletas status
router.patch(
  '/status',
  authenticate,
  authorize('socio', 'admin', 'super_admin'),
  updateMultipleStatusValidation,
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { boletaIds, status } = req.body;

    console.log(`📝 Updating boletas status: ${boletaIds} to ${status}`);

    // Build query - socios can only update their own boletas
    let query: any = { _id: { $in: boletaIds } };
    if (req.user?.role === 'socio') {
      query.socioId = req.user.id;
    }

    const result = await Boleta.updateMany(query, {
      estado: status,
      ...(status === 'pagada' && { fechaPago: new Date() })
    });

    console.log(`✅ Updated ${result.modifiedCount} boletas to ${status}`);

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron boletas para actualizar'
      });
    }

    res.json({
      success: true,
      data: {
        updated: result.modifiedCount,
        boletaIds,
        status
      },
      message: `Se actualizaron ${result.modifiedCount} boletas a ${status}`
    });
  })
);

// PUT /api/boletas/admin/:id/status - Update boleta status
router.put(
  '/admin/:id/status',
  authenticate,
  authorize('admin', 'super_admin'),
  updateStatusValidation,
  validate,
  updateBoletaStatus
);

// POST /api/boletas/admin/:id/resend-notifications - Resend notifications
router.post(
  '/admin/:id/resend-notifications',
  authenticate,
  authorize('admin', 'super_admin'),
  mongoIdValidation,
  validate,
  resendBoletaNotifications
);

// DELETE /api/boletas/admin/:id - Delete boleta (super_admin only)
router.delete(
  '/admin/:id',
  authenticate,
  authorize('super_admin'),
  mongoIdValidation,
  validate,
  deleteBoleta
);

// GET /api/boletas/admin/:id - Get specific boleta (admin)
router.get(
  '/admin/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  mongoIdValidation,
  validate,
  getBoletaById
);

export default router;