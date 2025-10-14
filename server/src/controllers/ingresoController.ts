import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { Ingreso } from '../models';
import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Ingreso:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         monto:
 *           type: number
 *         fecha:
 *           type: string
 *           format: date-time
 *         descripcion:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [pago_boleta, otro]
 *         metodoPago:
 *           type: string
 *           enum: [paypal, webpay, flow, mercadopago, transferencia, efectivo]
 *         socio:
 *           type: object
 *           properties:
 *             nombres:
 *               type: string
 *             apellidos:
 *               type: string
 *             rut:
 *               type: string
 *         boletaIds:
 *           type: array
 *           items:
 *             type: string
 *         transactionId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/admin/ingresos:
 *   get:
 *     summary: Obtener ingresos del admin
 *     tags: [Admin - Ingresos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Elementos por página
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *       - in: query
 *         name: metodoPago
 *         schema:
 *           type: string
 *           enum: [paypal, webpay, flow, mercadopago, transferencia, efectivo]
 *         description: Filtrar por método de pago
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [pago_boleta, otro]
 *         description: Filtrar por tipo de ingreso
 *     responses:
 *       200:
 *         description: Lista de ingresos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     ingresos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Ingreso'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         totalItems:
 *                           type: number
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *                     resumen:
 *                       type: object
 *                       properties:
 *                         totalIngresos:
 *                           type: number
 *                         totalPorMetodo:
 *                           type: object
 *                         ingresosPorMes:
 *                           type: array
 *                 message:
 *                   type: string
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos de administrador
 *       500:
 *         description: Error interno del servidor
 */
export const getIngresos = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Verificar que el usuario es admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver los ingresos'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters: any = {};

    // Filtro por fechas
    if (req.query.fechaInicio || req.query.fechaFin) {
      filters.fecha = {};
      if (req.query.fechaInicio) {
        filters.fecha.$gte = new Date(req.query.fechaInicio as string);
      }
      if (req.query.fechaFin) {
        const fechaFin = new Date(req.query.fechaFin as string);
        fechaFin.setHours(23, 59, 59, 999); // Incluir todo el día
        filters.fecha.$lte = fechaFin;
      }
    }

    // Filtro por método de pago
    if (req.query.metodoPago) {
      filters.metodoPago = req.query.metodoPago;
    }

    // Filtro por tipo
    if (req.query.tipo) {
      filters.tipo = req.query.tipo;
    }

    try {
      // Obtener ingresos con paginación
      const [ingresos, totalItems] = await Promise.all([
        Ingreso.find(filters)
          .populate('socioId', 'nombres apellidos rut email codigoSocio')
          .populate('boletaIds', 'numeroBoleta periodo montoTotal')
          .sort({ fecha: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Ingreso.countDocuments(filters)
      ]);

      // Calcular información de paginación
      const totalPages = Math.ceil(totalItems / limit);
      const pagination = {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

      // Calcular resumen
      const [resumenTotal, resumenPorMetodo, ingresosPorMes] = await Promise.all([
        // Total de ingresos
        Ingreso.aggregate([
          { $match: filters },
          { $group: { _id: null, total: { $sum: '$monto' } } }
        ]),

        // Total por método de pago
        Ingreso.aggregate([
          { $match: filters },
          {
            $group: {
              _id: '$metodoPago',
              total: { $sum: '$monto' },
              cantidad: { $sum: 1 }
            }
          }
        ]),

        // Ingresos por mes (últimos 12 meses)
        Ingreso.aggregate([
          {
            $match: {
              ...filters,
              fecha: {
                $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
              }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$fecha' },
                month: { $month: '$fecha' }
              },
              total: { $sum: '$monto' },
              cantidad: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
      ]);

      const resumen = {
        totalIngresos: resumenTotal[0]?.total || 0,
        totalPorMetodo: resumenPorMetodo.reduce((acc, item) => {
          acc[item._id] = {
            total: item.total,
            cantidad: item.cantidad
          };
          return acc;
        }, {} as Record<string, { total: number; cantidad: number }>),
        ingresosPorMes: ingresosPorMes.map(item => ({
          periodo: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          total: item.total,
          cantidad: item.cantidad
        }))
      };

      res.json({
        success: true,
        data: {
          ingresos: ingresos.map(ingreso => ({
            id: ingreso._id,
            monto: ingreso.monto,
            fecha: ingreso.fecha,
            descripcion: ingreso.descripcion,
            tipo: ingreso.tipo,
            metodoPago: ingreso.metodoPago,
            socio: ingreso.socioId,
            boletaIds: ingreso.boletaIds,
            transactionId: ingreso.transactionId,
            createdAt: ingreso.createdAt
          })),
          pagination,
          resumen
        },
        message: 'Ingresos obtenidos exitosamente'
      });

    } catch (error: any) {
      console.error('Error obteniendo ingresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los ingresos'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/ingresos/resumen:
 *   get:
 *     summary: Obtener resumen de ingresos
 *     tags: [Admin - Ingresos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de ingresos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalHoy:
 *                       type: number
 *                     totalSemana:
 *                       type: number
 *                     totalMes:
 *                       type: number
 *                     totalAnio:
 *                       type: number
 *                     totalGeneral:
 *                       type: number
 *                 message:
 *                   type: string
 */
export const getResumenIngresos = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Verificar que el usuario es admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver el resumen de ingresos'
      });
    }

    try {
      const now = new Date();
      const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const inicioAnio = new Date(now.getFullYear(), 0, 1);

      const [totalHoy, totalSemana, totalMes, totalAnio, totalGeneral] = await Promise.all([
        // Total hoy
        Ingreso.aggregate([
          { $match: { fecha: { $gte: hoy } } },
          { $group: { _id: null, total: { $sum: '$monto' } } }
        ]),

        // Total esta semana
        Ingreso.aggregate([
          { $match: { fecha: { $gte: inicioSemana } } },
          { $group: { _id: null, total: { $sum: '$monto' } } }
        ]),

        // Total este mes
        Ingreso.aggregate([
          { $match: { fecha: { $gte: inicioMes } } },
          { $group: { _id: null, total: { $sum: '$monto' } } }
        ]),

        // Total este año
        Ingreso.aggregate([
          { $match: { fecha: { $gte: inicioAnio } } },
          { $group: { _id: null, total: { $sum: '$monto' } } }
        ]),

        // Total general
        Ingreso.aggregate([
          { $group: { _id: null, total: { $sum: '$monto' } } }
        ])
      ]);

      res.json({
        success: true,
        data: {
          totalHoy: totalHoy[0]?.total || 0,
          totalSemana: totalSemana[0]?.total || 0,
          totalMes: totalMes[0]?.total || 0,
          totalAnio: totalAnio[0]?.total || 0,
          totalGeneral: totalGeneral[0]?.total || 0
        },
        message: 'Resumen de ingresos obtenido exitosamente'
      });

    } catch (error: any) {
      console.error('Error obteniendo resumen de ingresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el resumen de ingresos'
      });
    }
  }
);