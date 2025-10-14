import express, { Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { Boleta, Pago, User } from '../models';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create payment
router.post('/', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { boletaIds, metodoPago } = req.body;
    
    if (!boletaIds || !Array.isArray(boletaIds) || boletaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos una boleta para pagar'
      });
    }

    // Validate payment method
    if (!['webpay', 'flow', 'mercadopago'].includes(metodoPago)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago no válido'
      });
    }

    // If MercadoPago is selected, redirect to use the specialized MercadoPago endpoint
    if (metodoPago === 'mercadopago') {
      return res.status(400).json({
        success: false,
        message: 'Para pagos con MercadoPago, use el endpoint /api/mercadopago/create-preference',
        redirectTo: '/api/mercadopago/create-preference'
      });
    }

    // Validate boletas exist and belong to the user
    const boletas = await Boleta.find({
      _id: { $in: boletaIds },
      socioId: req.user?.id,
      estado: { $in: ['pendiente', 'vencida'] }
    });

    if (boletas.length !== boletaIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunas boletas no existen o ya han sido pagadas'
      });
    }

    const totalAmount = boletas.reduce((sum, boleta) => sum + boleta.montoTotal, 0);
    const transactionId = uuidv4();

    let detallesPago = {};
    let estadoPago = 'pendiente';

    try {
      // Create payment records for each boleta
      const pagos = await Promise.all(
        boletas.map(async (boleta) => {
          const pago = new Pago({
            boletaId: boleta._id,
            socioId: req.user?.id,
            monto: boleta.montoTotal,
            metodoPago,
            estadoPago,
            transactionId: `${transactionId}-${boleta._id}`,
            detallesPago
          });

          return await pago.save();
        })
      );

      res.json({
        success: true,
        data: {
          pagos,
          totalAmount,
          estadoPago,
          transactionId
        },
        message: 'Pago iniciado correctamente'
      });

    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el pago'
      });
    }
  }
));

// Get payment history for authenticated socio
router.get('/history', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10, status = 'completado' } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query - by default only show completed payments
    const query: any = {
      socioId: req.user?.id,
      estadoPago: status
    };

    const [pagos, total] = await Promise.all([
      Pago.find(query)
        .populate('boletaId', 'numeroBoleta periodo montoTotal')
        .sort({ fechaPago: -1 })
        .skip(skip)
        .limit(limitNum),
      Pago.countDocuments(query)
    ]);

    console.log(`📊 Payment history: ${pagos.length} payments with status "${status}" for user ${req.user?.email}`);

    // Debug: Check for null boletaId references
    const pagosSinBoleta = pagos.filter(pago => !pago.boletaId);
    if (pagosSinBoleta.length > 0) {
      console.log(`⚠️ Found ${pagosSinBoleta.length} payments without boleta reference:`);
      pagosSinBoleta.forEach(pago => {
        console.log(`   - Payment ${pago._id}: transactionId=${pago.transactionId}, boletaId=${pago.boletaId}`);
      });
    }

    res.json({
      success: true,
      data: pagos,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      message: 'Historial de pagos obtenido exitosamente'
    });
  }
));

// Get specific payment details
router.get('/:id', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const pago = await Pago.findOne({
      _id: id,
      socioId: req.user?.id
    })
    .populate('boletaId', 'numeroBoleta periodo montoTotal')
    .populate('socioId', 'nombres apellidos rut codigoSocio');

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      data: pago,
      message: 'Detalles del pago obtenidos exitosamente'
    });
  }
));

// Register PayPal payment
router.post('/paypal/register', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { boletaIds, paypalOrderId, amount, currency = 'USD' } = req.body;

    if (!boletaIds || !Array.isArray(boletaIds) || boletaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos una boleta para registrar el pago'
      });
    }

    if (!paypalOrderId) {
      return res.status(400).json({
        success: false,
        message: 'ID de orden de PayPal es requerido'
      });
    }

    try {
      // Validate boletas exist and belong to the user
      const boletas = await Boleta.find({
        _id: { $in: boletaIds },
        socioId: req.user?.id
      });

      if (boletas.length !== boletaIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Algunas boletas no existen o no pertenecen al usuario'
        });
      }

      // Create payment records for each boleta
      const pagos = await Promise.all(
        boletas.map(async (boleta) => {
          const pago = new Pago({
            boletaId: boleta._id,
            socioId: req.user?.id,
            monto: boleta.montoTotal,
            metodoPago: 'paypal',
            estadoPago: 'completado',
            transactionId: `paypal-${paypalOrderId}-${boleta._id}`,
            detallesPago: {
              numeroTransaccion: paypalOrderId,
              codigoAutorizacion: paypalOrderId,
              tipoTarjeta: 'PayPal'
            },
            metadata: {
              paypalOrderId,
              currency,
              amount: boleta.montoTotal
            }
          });

          return await pago.save();
        })
      );

      const totalAmount = boletas.reduce((sum, boleta) => sum + boleta.montoTotal, 0);

      console.log(`💰 PayPal payment registered: ${pagos.length} payments for $${totalAmount}`);

      res.json({
        success: true,
        data: {
          pagos,
          totalAmount,
          paypalOrderId,
          registeredPayments: pagos.length
        },
        message: `Se registraron ${pagos.length} pagos de PayPal exitosamente`
      });

    } catch (error) {
      console.error('Error registering PayPal payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el pago de PayPal'
      });
    }
  }
));


// Admin routes - Get all payments
router.get('/admin/all', authenticate, authorize('super_admin'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, status, method, search, dateFrom, dateTo } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

    if (status && status !== 'all') {
      query.estadoPago = status;
    }

    if (method && method !== 'all') {
      query.metodoPago = method;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.fechaPago = {};
      if (dateFrom) {
        query.fechaPago.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        query.fechaPago.$lte = endDate;
      }
    }

    const [pagos, total] = await Promise.all([
      Pago.find(query)
        .populate({
          path: 'boletaId',
          select: 'numeroBoleta periodo montoTotal'
        })
        .populate({
          path: 'socioId',
          select: 'nombres apellidos rut codigoSocio email'
        })
        .sort({ fechaPago: -1 })
        .skip(skip)
        .limit(limitNum),
      Pago.countDocuments(query)
    ]);

    // Apply search filter if provided (after population)
    let filteredPagos = pagos;
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredPagos = pagos.filter(pago => {
        const socio = pago.socioId as any;
        const boleta = pago.boletaId as any;

        return (
          boleta?.numeroBoleta?.toLowerCase().includes(searchTerm) ||
          socio?.nombres?.toLowerCase().includes(searchTerm) ||
          socio?.apellidos?.toLowerCase().includes(searchTerm) ||
          socio?.rut?.includes(searchTerm) ||
          pago.transactionId?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Calculate stats
    const stats = {
      total: filteredPagos.length,
      completados: filteredPagos.filter(p => p.estadoPago === 'completado').length,
      pendientes: filteredPagos.filter(p => p.estadoPago === 'pendiente').length,
      fallidos: filteredPagos.filter(p => p.estadoPago === 'fallido').length,
      montoTotal: filteredPagos
        .filter(p => p.estadoPago === 'completado')
        .reduce((sum, p) => sum + p.monto, 0)
    };

    console.log(`📊 Admin payment history: ${filteredPagos.length} payments`);

    res.json({
      success: true,
      data: {
        pagos: filteredPagos,
        stats
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      message: 'Historial de pagos obtenido exitosamente'
    });
  }
));

// Admin route - Get payment stats
router.get('/admin/stats', authenticate, authorize('super_admin'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { period = 'month' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        dateFilter = {
          fechaPago: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        };
        break;
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = {
          fechaPago: {
            $gte: startOfWeek
          }
        };
        break;
      case 'month':
      default:
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = {
          fechaPago: {
            $gte: startOfMonth
          }
        };
        break;
    }

    const [
      totalPagos,
      pagosCompletados,
      pagosPendientes,
      pagosFallidos,
      montoTotal,
      metodosStats
    ] = await Promise.all([
      Pago.countDocuments(dateFilter),
      Pago.countDocuments({ ...dateFilter, estadoPago: 'completado' }),
      Pago.countDocuments({ ...dateFilter, estadoPago: 'pendiente' }),
      Pago.countDocuments({ ...dateFilter, estadoPago: 'fallido' }),
      Pago.aggregate([
        { $match: { ...dateFilter, estadoPago: 'completado' } },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]),
      Pago.aggregate([
        { $match: { ...dateFilter, estadoPago: 'completado' } },
        {
          $group: {
            _id: '$metodoPago',
            total: { $sum: '$monto' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalAmount = montoTotal[0]?.total || 0;

    const methodsDistribution = metodosStats.reduce((acc, item) => {
      acc[item._id] = {
        total: item.total,
        count: item.count
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        period,
        totalPagos,
        pagosCompletados,
        pagosPendientes,
        pagosFallidos,
        montoTotal: totalAmount,
        metodosDistribucion: methodsDistribution,
        tasaExito: totalPagos > 0 ? ((pagosCompletados / totalPagos) * 100).toFixed(2) : 0
      },
      message: 'Estadísticas de pagos obtenidas exitosamente'
    });
  }
));

export default router;