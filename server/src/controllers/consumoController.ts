import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import Lectura from '../models/Lectura';
import { User, Boleta } from '../models';
import TarifaService from '../services/tarifaService';
import { createAuditLog } from './auditController';

/**
 * Registrar lectura de medidor y generar boleta automáticamente
 */
export const registrarLectura = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      socioId,
      numeroMedidor,
      lecturaAnterior,
      lecturaActual,
      periodo,
      observaciones,
      fotoMedidor
    } = req.body;

    // Validaciones
    if (!socioId || !numeroMedidor || lecturaAnterior === undefined || lecturaActual === undefined || !periodo) {
      throw new AppError('Todos los campos requeridos deben ser proporcionados', 400);
    }

    if (lecturaActual < lecturaAnterior) {
      throw new AppError('La lectura actual no puede ser menor que la lectura anterior', 400);
    }

    // Verificar que el socio existe
    const socio = await User.findById(socioId);
    if (!socio) {
      throw new AppError('Socio no encontrado', 404);
    }

    // Verificar si ya existe una lectura para este socio en este periodo
    const lecturaExistente = await Lectura.findOne({
      socioId,
      periodo: new Date(periodo)
    });

    if (lecturaExistente) {
      throw new AppError('Ya existe una lectura registrada para este socio en este período', 400);
    }

    // Calcular consumo
    const consumoM3 = lecturaActual - lecturaAnterior;

    // Crear la lectura
    const lectura = await Lectura.create({
      socioId,
      numeroMedidor,
      lecturaAnterior,
      lecturaActual,
      consumoM3,
      periodo: new Date(periodo),
      fechaLectura: new Date(),
      observaciones,
      fotoMedidor,
      registradoPor: req.user!.id,
      estado: 'pendiente'
    });

    // Calcular la tarifa usando el servicio
    let calculoTarifa;
    try {
      calculoTarifa = await TarifaService.calcularTarifa(
        socio,
        consumoM3,
        new Date(periodo),
        0, // No hay días vencidos para nueva boleta
        false // No es pago anticipado
      );
    } catch (error: any) {
      // Si falla el cálculo, eliminar la lectura creada
      await Lectura.findByIdAndDelete(lectura._id);
      throw new AppError(
        `Error en el cálculo de tarifas: ${error.message}`,
        500
      );
    }

    // Generar número de boleta único
    const currentYear = new Date().getFullYear();
    const lastBoleta = await Boleta.findOne({
      numeroBoleta: new RegExp(`^BOL-${currentYear}-`)
    }).sort({ numeroBoleta: -1 });

    let numeroBoleta: string;
    if (lastBoleta && lastBoleta.numeroBoleta) {
      const lastNumber = parseInt(lastBoleta.numeroBoleta.split('-')[2]);
      numeroBoleta = `BOL-${currentYear}-${String(lastNumber + 1).padStart(6, '0')}`;
    } else {
      numeroBoleta = `BOL-${currentYear}-000001`;
    }

    // Calcular fecha de vencimiento (30 días desde emisión)
    const fechaEmision = new Date();
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // Crear la boleta automáticamente
    const boleta = await Boleta.create({
      numeroBoleta,
      socioId,
      periodo: new Date(periodo),
      fechaEmision,
      fechaVencimiento,
      consumoM3,
      cargoFijo: calculoTarifa.cargoFijo,
      costoConsumo: calculoTarifa.costoConsumo,
      descuentos: calculoTarifa.descuentos,
      recargos: 0, // Nueva boleta no tiene recargos
      montoTotal: calculoTarifa.montoTotal,
      estado: 'pendiente',
      pagada: false,
      detalleCalculo: calculoTarifa.detalleCalculo,
      lecturaAnterior,
      lecturaActual
    });

    // Actualizar la lectura con el ID de la boleta generada
    lectura.boletaGenerada = boleta._id as any;
    lectura.estado = 'procesada';
    await lectura.save();

    // Actualizar deuda del socio
    socio.deudaTotal = (socio.deudaTotal || 0) + calculoTarifa.montoTotal;
    await socio.save();

    // Crear log de auditoría
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: req.user!.username || req.user!.email
      },
      'registrar_consumo',
      'consumo',
      `Lectura registrada para ${socio.nombres} ${socio.apellidos} - Consumo: ${consumoM3}m³`,
      {
        socioId,
        lecturaId: lectura._id,
        boletaId: boleta._id,
        consumoM3,
        montoTotal: calculoTarifa.montoTotal
      },
      'exitoso',
      undefined,
      req
    );

    // Populate para la respuesta
    await lectura.populate('socioId', 'nombres apellidos rut codigoSocio');
    await lectura.populate('boletaGenerada');

    res.status(201).json({
      success: true,
      data: {
        lectura,
        boleta,
        calculoTarifa
      },
      message: 'Lectura registrada y boleta generada exitosamente'
    });
  }
);

/**
 * Obtener todas las lecturas con filtros
 */
export const getLecturas = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { socioId, periodo, estado, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (socioId) query.socioId = socioId;
    if (periodo) {
      const periodoDate = new Date(periodo as string);
      query.periodo = periodoDate;
    }
    if (estado) query.estado = estado;

    const skip = (Number(page) - 1) * Number(limit);

    const lecturas = await Lectura.find(query)
      .populate('socioId', 'nombres apellidos rut codigoSocio')
      .populate('registradoPor', 'nombres apellidos')
      .populate('boletaGenerada', 'numeroBoleta montoTotal estado')
      .sort({ fechaCreacion: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await Lectura.countDocuments(query);

    res.json({
      success: true,
      data: {
        lecturas,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      },
      message: `${lecturas.length} lecturas encontradas`
    });
  }
);

/**
 * Obtener lectura por ID
 */
export const getLecturaById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const lectura = await Lectura.findById(id)
      .populate('socioId', 'nombres apellidos rut codigoSocio email telefono')
      .populate('registradoPor', 'nombres apellidos')
      .populate('boletaGenerada');

    if (!lectura) {
      throw new AppError('Lectura no encontrada', 404);
    }

    res.json({
      success: true,
      data: lectura,
      message: 'Lectura obtenida exitosamente'
    });
  }
);

/**
 * Obtener última lectura de un socio
 */
export const getUltimaLectura = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { socioId } = req.params;

    const ultimaLectura = await Lectura.findOne({ socioId })
      .sort({ fechaLectura: -1 })
      .populate('socioId', 'nombres apellidos rut codigoSocio');

    if (!ultimaLectura) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay lecturas previas para este socio'
      });
    }

    res.json({
      success: true,
      data: ultimaLectura,
      message: 'Última lectura obtenida exitosamente'
    });
  }
);

/**
 * Cancelar una lectura (solo si no se ha generado boleta aún)
 */
export const cancelarLectura = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const lectura = await Lectura.findById(id);

    if (!lectura) {
      throw new AppError('Lectura no encontrada', 404);
    }

    if (lectura.estado === 'procesada' && lectura.boletaGenerada) {
      throw new AppError('No se puede cancelar una lectura con boleta generada', 400);
    }

    lectura.estado = 'cancelada';
    await lectura.save();

    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: req.user!.username || req.user!.email
      },
      'cancelar_lectura',
      'consumo',
      `Lectura cancelada - ID: ${lectura._id}`,
      { lecturaId: lectura._id },
      'exitoso',
      undefined,
      req
    );

    res.json({
      success: true,
      data: lectura,
      message: 'Lectura cancelada exitosamente'
    });
  }
);
