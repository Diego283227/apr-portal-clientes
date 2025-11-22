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
      codigoCliente,
      lecturaAnterior,
      lecturaActual,
      fechaLectura,
      horaLectura,
      nombreLector,
      periodo,
      observaciones,
      incidencias,
      lecturaEsCero,
      fotoMedidor
    } = req.body;

    // Validaciones detalladas
    const camposFaltantes = [];
    if (!socioId) camposFaltantes.push('socioId');
    if (!numeroMedidor) camposFaltantes.push('numeroMedidor');
    if (lecturaAnterior === undefined || lecturaAnterior === null) camposFaltantes.push('lecturaAnterior');
    if (lecturaActual === undefined || lecturaActual === null) camposFaltantes.push('lecturaActual');
    if (!periodo) camposFaltantes.push('periodo');

    if (camposFaltantes.length > 0) {
      console.error('Validation failed - missing fields:', camposFaltantes);
      console.error('Received data:', { socioId, numeroMedidor, lecturaAnterior, lecturaActual, periodo });
      throw new AppError(`Campos requeridos faltantes: ${camposFaltantes.join(', ')}`, 400);
    }

    if (lecturaActual < lecturaAnterior) {
      throw new AppError('La lectura actual no puede ser menor que la lectura anterior', 400);
    }

    // Verificar que el socio existe
    const socio = await User.findById(socioId);
    if (!socio) {
      throw new AppError('Socio no encontrado', 404);
    }

    // Verificar si ya existe una lectura para este socio en este periodo (mismo mes/año)
    const periodDate = new Date(periodo);
    const startOfMonth = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const endOfMonth = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0, 23, 59, 59);

    const lecturaExistente = await Lectura.findOne({
      socioId,
      periodo: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
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
      codigoCliente,
      lecturaAnterior,
      lecturaActual,
      consumoM3,
      periodo: new Date(periodo),
      fechaLectura: fechaLectura ? new Date(fechaLectura) : new Date(),
      horaLectura,
      nombreLector,
      observaciones,
      incidencias,
      lecturaEsCero,
      fotoMedidor,
      registradoPor: req.user!.id,
      estado: 'pendiente'
    });

    // TODO: Calcular la tarifa usando el servicio (deshabilitado temporalmente)
    // Por ahora usar valores por defecto
    const calculoTarifa = {
      cargoFijo: 0,
      costoConsumo: consumoM3 * 1000, // Tarifa base temporal: $1000 por m³
      descuentos: 0,
      montoTotal: consumoM3 * 1000,
      detalleCalculo: {
        consumoM3,
        tarifaBase: 1000,
        mensaje: 'Cálculo temporal - Tarifas pendientes de configurar'
      }
    };

    // NOTA: Descomentar cuando las tarifas estén configuradas
    // try {
    //   calculoTarifa = await TarifaService.calcularTarifa(
    //     socio,
    //     consumoM3,
    //     new Date(periodo),
    //     0,
    //     false
    //   );
    // } catch (error: any) {
    //   await Lectura.findByIdAndDelete(lectura._id);
    //   throw new AppError(`Error en el cálculo de tarifas: ${error.message}`, 500);
    // }

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
      montoTotal: calculoTarifa.montoTotal,
      estado: 'pendiente',
      pagada: false,
      detalle: {
        consumoAnterior: lecturaAnterior,
        consumoActual: lecturaActual,
        cargoFijo: calculoTarifa.cargoFijo,
        costoConsumo: calculoTarifa.costoConsumo,
        descuentos: calculoTarifa.descuentos,
        recargos: 0, // Nueva boleta no tiene recargos
        detalleCalculo: calculoTarifa.detalleCalculo
      },
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

    // Generar PDF de la boleta y enviar por email
    try {
      // Importar servicios
      const { BoletaPDFService } = await import('../services/boletaPdfService');
      const { emailService } = await import('../services/emailService');

      // Obtener historial de consumo para el gráfico
      const historialBoletas = await Boleta.find({
        socioId: socio._id,
        fechaEmision: {
          $lte: boleta.fechaEmision
        }
      })
        .sort({ fechaEmision: -1 })
        .limit(6)
        .select('periodo consumoM3');

      const historialConsumo = historialBoletas.reverse().map(b => ({
        periodo: b.periodo,
        consumo: b.consumoM3
      }));

      // Generar PDF
      const pdfBuffer = await BoletaPDFService.generarBoletaPDF({
        boleta: boleta as any,
        socio: socio as any,
        historialConsumo
      });

      const filename = BoletaPDFService.generarNombreArchivo(boleta as any, socio as any);

      // Enviar email con PDF adjunto
      if (socio.email) {
        await emailService.sendBoletaEmail(
          socio.email,
          {
            nombreSocio: `${socio.nombres} ${socio.apellidos}`,
            numeroBoleta: boleta.numeroBoleta,
            periodo: new Date(boleta.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
            consumo: consumoM3,
            montoTotal: calculoTarifa.montoTotal,
            fechaVencimiento: boleta.fechaVencimiento.toLocaleDateString('es-CL')
          },
          pdfBuffer,
          filename
        );
        console.log(`📧 Email con PDF enviado a ${socio.email}`);
      }
    } catch (pdfError: any) {
      // No fallar toda la operación si el PDF falla, solo registrar el error
      console.error('⚠️ Error generando/enviando PDF:', pdfError.message);
      // La boleta ya fue creada exitosamente, continuamos
    }

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

/**
 * Obtener lecturas del socio logueado
 */
export const getMisLecturas = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const socioId = req.user!.id;

    const lecturas = await Lectura.find({ socioId })
      .sort({ periodo: -1, fechaCreacion: -1 })
      .lean();

    res.json({
      success: true,
      data: lecturas
    });
  }
);

/**
 * Obtener información del medidor asignado al socio logueado
 */
export const getMiMedidor = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const socioId = req.user!.id;

    const socio = await User.findById(socioId)
      .select('medidor codigoSocio')
      .lean();

    if (!socio) {
      throw new AppError('Socio no encontrado', 404);
    }

    // Primero intentar buscar en SmartMeter (medidores inteligentes)
    const SmartMeter = (await import('../models/SmartMeter')).default;
    const smartMeter = await SmartMeter.findOne({ socioId }).lean();

    if (smartMeter) {
      return res.json({
        success: true,
        data: {
          numero: smartMeter.serialNumber || smartMeter.meterId,
          codigoSocio: socio.codigoSocio,
          fechaInstalacion: smartMeter.installationDate,
          ubicacion: smartMeter.location?.description,
          estado: smartMeter.status,
          tipo: 'smart_meter',
          modelo: smartMeter.meterModel,
          fabricante: smartMeter.manufacturer
        }
      });
    }

    // Si no hay SmartMeter, buscar en el campo anidado del usuario
    if (!socio.medidor || !socio.medidor.numero) {
      return res.status(404).json({
        success: false,
        message: 'No tienes un medidor asignado'
      });
    }

    res.json({
      success: true,
      data: {
        numero: socio.medidor.numero,
        codigoSocio: socio.codigoSocio,
        fechaInstalacion: socio.medidor.fechaInstalacion,
        ubicacion: socio.medidor.ubicacion,
        estado: socio.medidor.estado || 'active',
        tipo: 'medidor_tradicional'
      }
    });
  }
);
