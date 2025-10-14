import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { Boleta, Pago, User, Ingreso, Egreso } from '../models';
import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     ReporteFinanciero:
 *       type: object
 *       properties:
 *         periodo:
 *           type: string
 *           description: Período del reporte (mes, año)
 *         ingresos:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             paypal:
 *               type: number
 *             efectivo:
 *               type: number
 *             transferencia:
 *               type: number
 *         egresos:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             mantenimiento:
 *               type: number
 *             operacion:
 *               type: number
 *             administracion:
 *               type: number
 *         utilidad:
 *           type: number
 *         morosidad:
 *           type: number
 *         boletasEstadisticas:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             pagadas:
 *               type: number
 *             pendientes:
 *               type: number
 *             vencidas:
 *               type: number
 */

/**
 * @swagger
 * /api/reportes/financiero:
 *   get:
 *     summary: Obtener reporte financiero
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *           enum: [mes, año, trimestre, semestre]
 *         description: Período del reporte
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de referencia (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Reporte financiero obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReporteFinanciero'
 */
export const getReporteFinanciero = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { periodo = 'mes', fecha } = req.query;

    console.log('📊 Petición de reporte recibida:', { periodo, fecha });

    // Calcular fechas del período - usar UTC para evitar problemas de timezone
    let fechaRef: Date;
    if (fecha) {
      // Parsear fecha como YYYY-MM-DD y crear en UTC
      const [year, month, day] = (fecha as string).split('-').map(Number);
      fechaRef = new Date(Date.UTC(year, month - 1, day)); // month - 1 porque enero es 0
    } else {
      fechaRef = new Date();
    }
    console.log('📅 Fecha de referencia:', fechaRef);
    console.log('📅 Año:', fechaRef.getUTCFullYear(), 'Mes (0-11):', fechaRef.getUTCMonth(), 'Día:', fechaRef.getUTCDate());

    let fechaInicio: Date;
    let fechaFin: Date;

    // Usar getUTCFullYear y getUTCMonth para cálculos en UTC
    switch (periodo) {
      case 'año':
        fechaInicio = new Date(Date.UTC(fechaRef.getUTCFullYear(), 0, 1));
        fechaFin = new Date(Date.UTC(fechaRef.getUTCFullYear() + 1, 0, 1));
        break;
      case 'trimestre':
        const trimestre = Math.floor(fechaRef.getUTCMonth() / 3);
        fechaInicio = new Date(Date.UTC(fechaRef.getUTCFullYear(), trimestre * 3, 1));
        fechaFin = new Date(Date.UTC(fechaRef.getUTCFullYear(), (trimestre + 1) * 3, 1));
        break;
      case 'semestre':
        const semestre = Math.floor(fechaRef.getUTCMonth() / 6);
        fechaInicio = new Date(Date.UTC(fechaRef.getUTCFullYear(), semestre * 6, 1));
        fechaFin = new Date(Date.UTC(fechaRef.getUTCFullYear(), (semestre + 1) * 6, 1));
        break;
      default: // mes
        fechaInicio = new Date(Date.UTC(fechaRef.getUTCFullYear(), fechaRef.getUTCMonth(), 1));
        fechaFin = new Date(Date.UTC(fechaRef.getUTCFullYear(), fechaRef.getUTCMonth() + 1, 1));
    }

    console.log(`📊 Generando reporte financiero - Período: ${periodo}`, {
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString()
    });

    // Obtener ingresos por método de pago
    const ingresosPorMetodo = await Pago.aggregate([
      {
        $match: {
          estadoPago: 'completado',
          fechaPago: { $gte: fechaInicio, $lt: fechaFin }
        }
      },
      {
        $group: {
          _id: '$metodoPago',
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    console.log('💰 Ingresos por método encontrados:', ingresosPorMetodo);

    // También buscar TODOS los pagos para debug
    const todosPagos = await Pago.find({ estadoPago: 'completado' }).select('fechaPago monto metodoPago');
    console.log('💳 Total de pagos completados en BD:', todosPagos.length);
    console.log('💳 Fechas de pagos:', todosPagos.map(p => ({ fecha: p.fechaPago, monto: p.monto })));

    // Obtener estadísticas de boletas
    const boletasStats = await Boleta.aggregate([
      {
        $match: {
          fechaEmision: { $gte: fechaInicio, $lt: fechaFin }
        }
      },
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 },
          monto: { $sum: '$montoTotal' }
        }
      }
    ]);

    // Obtener morosidad
    const totalBoletas = await Boleta.countDocuments({
      fechaEmision: { $gte: fechaInicio, $lt: fechaFin }
    });

    const boletasVencidas = await Boleta.countDocuments({
      fechaEmision: { $gte: fechaInicio, $lt: fechaFin },
      estado: 'vencida'
    });

    // Procesar datos de ingresos
    const ingresos = {
      total: 0,
      paypal: 0,
      efectivo: 0,
      transferencia: 0,
      mercadopago: 0
    };

    ingresosPorMetodo.forEach(item => {
      ingresos.total += item.total;
      switch (item._id) {
        case 'paypal':
          ingresos.paypal = item.total;
          break;
        case 'efectivo':
          ingresos.efectivo = item.total;
          break;
        case 'transferencia':
          ingresos.transferencia = item.total;
          break;
        case 'mercadopago':
          ingresos.mercadopago = item.total;
          break;
      }
    });

    // Procesar estadísticas de boletas
    const boletasEstadisticas = {
      total: 0,
      pagadas: 0,
      pendientes: 0,
      vencidas: 0,
      montoTotal: 0,
      montoPagado: 0,
      montoPendiente: 0
    };

    boletasStats.forEach(item => {
      boletasEstadisticas.total += item.total;
      boletasEstadisticas.montoTotal += item.monto;

      switch (item._id) {
        case 'pagada':
          boletasEstadisticas.pagadas = item.total;
          boletasEstadisticas.montoPagado = item.monto;
          break;
        case 'pendiente':
          boletasEstadisticas.pendientes = item.total;
          boletasEstadisticas.montoPendiente += item.monto;
          break;
        case 'vencida':
          boletasEstadisticas.vencidas = item.total;
          boletasEstadisticas.montoPendiente += item.monto;
          break;
      }
    });

    // Calcular morosidad
    const morosidad = totalBoletas > 0 ? (boletasVencidas / totalBoletas) * 100 : 0;

    // Obtener egresos reales del sistema
    const egresosPorCategoria = await Egreso.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicio, $lt: fechaFin },
          estado: { $in: ['aprobado', 'pagado'] }
        }
      },
      {
        $group: {
          _id: '$categoria',
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      }
    ]);

    // Procesar egresos reales
    const egresos = {
      total: 0,
      mantenimiento: 0,
      operacion: 0,
      administracion: 0,
      suministros: 0,
      servicios: 0,
      otros: 0
    };

    egresosPorCategoria.forEach(item => {
      egresos.total += item.total;
      switch (item._id) {
        case 'mantenimiento':
          egresos.mantenimiento = item.total;
          break;
        case 'operacion':
          egresos.operacion = item.total;
          break;
        case 'administracion':
          egresos.administracion = item.total;
          break;
        case 'suministros':
          egresos.suministros = item.total;
          break;
        case 'servicios':
          egresos.servicios = item.total;
          break;
        case 'otros':
          egresos.otros = item.total;
          break;
      }
    });

    const utilidad = ingresos.total - egresos.total;

    const reporte = {
      periodo: {
        tipo: periodo,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        label: formatPeriodoLabel(periodo as string, fechaRef)
      },
      ingresos,
      egresos,
      utilidad,
      morosidad,
      boletasEstadisticas,
      resumen: {
        totalFacturado: boletasEstadisticas.montoTotal,
        totalCobrado: ingresos.total,
        eficienciaCobranza: boletasEstadisticas.montoTotal > 0
          ? (ingresos.total / boletasEstadisticas.montoTotal) * 100
          : 0,
        margenUtilidad: ingresos.total > 0 ? (utilidad / ingresos.total) * 100 : 0
      }
    };

    res.json({
      success: true,
      data: reporte,
      message: `Reporte financiero de ${periodo} generado exitosamente`
    });
  }
);

/**
 * @swagger
 * /api/reportes/socios:
 *   get:
 *     summary: Obtener reporte de socios
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reporte de socios obtenido exitosamente
 */
export const getReporteSocios = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('👥 Generando reporte de socios...');

    // Estadísticas generales de socios
    const totalSocios = await User.countDocuments({ role: 'socio' });

    // Socios por estado de deuda
    const sociosPorDeuda = await User.aggregate([
      { $match: { role: 'socio' } },
      {
        $group: {
          _id: {
            tieneDeuda: { $gt: ['$deudaTotal', 0] }
          },
          count: { $sum: 1 },
          deudaPromedio: { $avg: '$deudaTotal' },
          deudaTotal: { $sum: '$deudaTotal' }
        }
      }
    ]);

    // Distribución de saldos
    const distribucionSaldos = await User.aggregate([
      { $match: { role: 'socio' } },
      {
        $bucket: {
          groupBy: '$saldoActual',
          boundaries: [0, 50000, 100000, 200000, 500000, Number.MAX_VALUE],
          default: 'otros',
          output: {
            count: { $sum: 1 },
            saldoPromedio: { $avg: '$saldoActual' }
          }
        }
      }
    ]);

    // Socios más activos (por número de boletas pagadas)
    const sociosActivos = await Pago.aggregate([
      { $match: { estadoPago: 'completado' } },
      {
        $group: {
          _id: '$socioId',
          totalPagos: { $sum: 1 },
          montoTotal: { $sum: '$monto' },
          ultimoPago: { $max: '$fechaPago' }
        }
      },
      { $sort: { totalPagos: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'socio'
        }
      },
      { $unwind: '$socio' },
      {
        $project: {
          nombres: '$socio.nombres',
          apellidos: '$socio.apellidos',
          codigoSocio: '$socio.codigoSocio',
          totalPagos: 1,
          montoTotal: 1,
          ultimoPago: 1
        }
      }
    ]);

    // Análisis de crecimiento mensual
    const crecimientoMensual = await User.aggregate([
      { $match: { role: 'socio' } },
      {
        $group: {
          _id: {
            año: { $year: '$fechaIngreso' },
            mes: { $month: '$fechaIngreso' }
          },
          nuevos: { $sum: 1 }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1 } },
      { $limit: 12 } // Últimos 12 meses
    ]);

    res.json({
      success: true,
      data: {
        resumen: {
          totalSocios,
          sociosConDeuda: sociosPorDeuda.find(s => s._id.tieneDeuda)?.count || 0,
          sociosSinDeuda: sociosPorDeuda.find(s => !s._id.tieneDeuda)?.count || 0,
          deudaTotalAcumulada: sociosPorDeuda.find(s => s._id.tieneDeuda)?.deudaTotal || 0,
          deudaPromedio: sociosPorDeuda.find(s => s._id.tieneDeuda)?.deudaPromedio || 0
        },
        distribucionSaldos,
        sociosActivos,
        crecimientoMensual
      },
      message: 'Reporte de socios generado exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/reportes/pagos:
 *   get:
 *     summary: Obtener reporte de pagos
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Reporte de pagos obtenido exitosamente
 */
export const getReportePagos = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { fechaInicio, fechaFin } = req.query;

    console.log('💳 Petición de reporte de pagos recibida:', { fechaInicio, fechaFin });

    // Parsear fechas en UTC para evitar problemas de timezone
    let fechaInicioQuery: Date;
    let fechaFinQuery: Date;

    if (fechaInicio) {
      const [year, month, day] = (fechaInicio as string).split('-').map(Number);
      fechaInicioQuery = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      // Primer día del mes actual en UTC
      const now = new Date();
      fechaInicioQuery = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    }

    if (fechaFin) {
      const [year, month, day] = (fechaFin as string).split('-').map(Number);
      // Fin del día para incluir todo el día
      fechaFinQuery = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      fechaFinQuery = new Date(); // Fecha actual
    }

    console.log('💳 Generando reporte de pagos...', {
      fechaInicio: fechaInicioQuery.toISOString(),
      fechaFin: fechaFinQuery.toISOString()
    });

    // Pagos por método de pago - incluir todos los pagos registrados
    const pagosPorMetodo = await Pago.aggregate([
      {
        $match: {
          fechaPago: { $gte: fechaInicioQuery, $lte: fechaFinQuery }
        }
      },
      {
        $group: {
          _id: {
            metodoPago: '$metodoPago',
            estado: '$estadoPago'
          },
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      },
      {
        $sort: { '_id.metodoPago': 1, '_id.estado': 1 }
      }
    ]);

    // También obtener todos los pagos sin filtro de estado para debug
    const todosPagos = await Pago.aggregate([
      {
        $match: {
          fechaPago: { $gte: fechaInicioQuery, $lte: fechaFinQuery }
        }
      },
      {
        $group: {
          _id: '$metodoPago',
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' },
          completados: {
            $sum: { $cond: [{ $eq: ['$estadoPago', 'completado'] }, 1, 0] }
          },
          pendientes: {
            $sum: { $cond: [{ $eq: ['$estadoPago', 'pendiente'] }, 1, 0] }
          }
        }
      }
    ]);

    console.log('💳 Pagos encontrados por método:', todosPagos);

    // Pagos por día (últimos 30 días)
    const pagosPorDia = await Pago.aggregate([
      {
        $match: {
          fechaPago: { $gte: fechaInicioQuery, $lte: fechaFinQuery },
          estadoPago: 'completado'
        }
      },
      {
        $group: {
          _id: {
            día: { $dayOfMonth: '$fechaPago' },
            mes: { $month: '$fechaPago' },
            año: { $year: '$fechaPago' }
          },
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1, '_id.día': 1 } }
    ]);

    // Eficiencia de cobranza
    const totalBoletas = await Boleta.countDocuments({
      fechaEmision: { $gte: fechaInicioQuery, $lte: fechaFinQuery }
    });

    const boletasPagadas = await Boleta.countDocuments({
      fechaEmision: { $gte: fechaInicioQuery, $lte: fechaFinQuery },
      estado: 'pagada'
    });

    const eficienciaCobranza = totalBoletas > 0 ? (boletasPagadas / totalBoletas) * 100 : 0;

    // Tiempo promedio de pago
    const tiempoPromedioPago = await Boleta.aggregate([
      {
        $match: {
          fechaEmision: { $gte: fechaInicioQuery, $lte: fechaFinQuery },
          estado: 'pagada',
          fechaPago: { $exists: true }
        }
      },
      {
        $project: {
          diasPago: {
            $divide: [
              { $subtract: ['$fechaPago', '$fechaVencimiento'] },
              86400000 // milisegundos en un día
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          tiempoPromedio: { $avg: '$diasPago' }
        }
      }
    ]);

    // Calcular resumen solo con pagos completados
    const resumenPagosCompletados = await Pago.aggregate([
      {
        $match: {
          fechaPago: { $gte: fechaInicioQuery, $lte: fechaFinQuery },
          estadoPago: 'completado'
        }
      },
      {
        $group: {
          _id: null,
          totalPagos: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      }
    ]);

    const totalPagosCalc = todosPagos.reduce((sum, p) => sum + p.cantidad, 0);
    const montoTotalCalc = resumenPagosCompletados[0]?.montoTotal || 0;
    const pagosCompletados = resumenPagosCompletados[0]?.totalPagos || 0;

    console.log(`📊 Resumen pagos: Total=${totalPagosCalc}, MontoCompletado=${montoTotalCalc}, Completados=${pagosCompletados}`);

    res.json({
      success: true,
      data: {
        periodo: {
          fechaInicio: fechaInicioQuery.toISOString(),
          fechaFin: fechaFinQuery.toISOString()
        },
        resumen: {
          totalPagos: totalPagosCalc,
          montoTotal: montoTotalCalc,
          eficienciaCobranza,
          tiempoPromedioPago: tiempoPromedioPago[0]?.tiempoPromedio || 0,
          pagosCompletados
        },
        pagosPorMetodo,
        pagosPorDia,
        todosPagos, // Incluir datos de debug
        estadisticas: {
          totalBoletas,
          boletasPagadas,
          pendientesCobro: totalBoletas - boletasPagadas
        }
      },
      message: `Reporte de pagos generado exitosamente - ${totalPagosCalc} pagos encontrados`
    });
  }
);

/**
 * @swagger
 * /api/reportes/egresos:
 *   get:
 *     summary: Obtener reporte de egresos
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Reporte de egresos obtenido exitosamente
 */
export const getReporteEgresos = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { fechaInicio, fechaFin } = req.query;

    // Usar fechas por defecto si no se proporcionan
    const fechaInicioQuery = fechaInicio
      ? new Date(fechaInicio as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const fechaFinQuery = fechaFin
      ? new Date(fechaFin as string)
      : new Date();

    console.log('💰 Generando reporte de egresos...', {
      fechaInicio: fechaInicioQuery.toISOString(),
      fechaFin: fechaFinQuery.toISOString()
    });

    // Egresos por categoría
    const egresosPorCategoria = await Egreso.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicioQuery, $lte: fechaFinQuery }
        }
      },
      {
        $group: {
          _id: {
            categoria: '$categoria',
            estado: '$estado'
          },
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      }
    ]);

    // Egresos por tipo
    const egresosPorTipo = await Egreso.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicioQuery, $lte: fechaFinQuery },
          estado: { $in: ['aprobado', 'pagado'] }
        }
      },
      {
        $group: {
          _id: '$tipo',
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      }
    ]);

    // Evolución temporal de egresos
    const evolucionEgresos = await Egreso.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicioQuery, $lte: fechaFinQuery },
          estado: { $in: ['aprobado', 'pagado'] }
        }
      },
      {
        $group: {
          _id: {
            día: { $dayOfMonth: '$fecha' },
            mes: { $month: '$fecha' },
            año: { $year: '$fecha' }
          },
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1, '_id.día': 1 } }
    ]);

    // Resumen general
    const totalEgresos = await Egreso.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicioQuery, $lte: fechaFinQuery }
        }
      },
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$monto' }
        }
      }
    ]);

    const resumen = {
      totalEgresos: 0,
      egresosPagados: 0,
      egresosPendientes: 0,
      egresosAprobados: 0
    };

    totalEgresos.forEach(item => {
      resumen.totalEgresos += item.montoTotal;
      switch (item._id) {
        case 'pagado':
          resumen.egresosPagados = item.montoTotal;
          break;
        case 'pendiente':
          resumen.egresosPendientes = item.montoTotal;
          break;
        case 'aprobado':
          resumen.egresosAprobados = item.montoTotal;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        periodo: {
          fechaInicio: fechaInicioQuery.toISOString(),
          fechaFin: fechaFinQuery.toISOString()
        },
        resumen,
        egresosPorCategoria,
        egresosPorTipo,
        evolucionEgresos,
        estadisticas: {
          totalRegistros: totalEgresos.reduce((sum, item) => sum + item.cantidad, 0),
          montoPagado: resumen.egresosPagados,
          montoPendiente: resumen.egresosPendientes + resumen.egresosAprobados
        }
      },
      message: 'Reporte de egresos generado exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/reportes/dashboard-stats:
 *   get:
 *     summary: Obtener estadísticas para el dashboard
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del dashboard obtenidas exitosamente
 */
export const getDashboardStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('📊 Obteniendo estadísticas del dashboard...');

    const stats = await Promise.all([
      // Total socios
      User.countDocuments({ role: 'socio' }),

      // Boletas pendientes
      Boleta.countDocuments({ estado: { $in: ['pendiente', 'vencida'] } }),

      // Boletas pagadas
      Boleta.countDocuments({ estado: 'pagada' }),

      // Ingresos del mes actual
      Pago.aggregate([
        {
          $match: {
            estadoPago: 'completado',
            fechaPago: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]),

      // Ingresos totales
      Pago.aggregate([
        { $match: { estadoPago: 'completado' } },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]),

      // Morosidad
      Promise.all([
        Boleta.countDocuments(),
        Boleta.countDocuments({ estado: 'vencida' })
      ])
    ]);

    const [
      totalSocios,
      boletasPendientes,
      boletasPagadas,
      ingresosMesResult,
      ingresosTotalesResult,
      [totalBoletas, boletasVencidas]
    ] = stats;

    const ingresosMes = ingresosMesResult[0]?.total || 0;
    const ingresosTotales = ingresosTotalesResult[0]?.total || 0;
    const morosidad = totalBoletas > 0 ? (boletasVencidas / totalBoletas) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalSocios,
        boletasPendientes,
        boletasPagadas,
        ingresosMes,
        ingresosTotales,
        morosidad: Math.round(morosidad * 100) / 100
      },
      message: 'Estadísticas obtenidas exitosamente'
    });
  }
);

// Función auxiliar para formatear etiquetas de período
function formatPeriodoLabel(periodo: string, fecha: Date): string {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  switch (periodo) {
    case 'año':
      return `Año ${year}`;
    case 'trimestre':
      const trimestre = Math.floor(month / 3) + 1;
      return `Q${trimestre} ${year}`;
    case 'semestre':
      const semestre = Math.floor(month / 6) + 1;
      return `S${semestre} ${year}`;
    default: // mes
      return `${meses[month]} ${year}`;
  }
}