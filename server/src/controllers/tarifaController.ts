import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import TarifaConfig from '../models/TarifaConfig';
import TarifaService from '../services/tarifaService';
import { createAuditLog } from '../utils/audit';

/**
 * @swagger
 * /api/tarifas/configuracion:
 *   get:
 *     summary: Obtener configuración de tarifa activa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 */
export const getTarifaActiva = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tarifa = await TarifaConfig.findOne({ activa: true })
      .populate('creadoPor', 'nombres apellidos')
      .populate('modificadoPor', 'nombres apellidos');

    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'No hay configuración de tarifa activa'
      });
    }

    res.json({
      success: true,
      data: tarifa,
      message: 'Configuración de tarifa obtenida exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/tarifas/configuraciones:
 *   get:
 *     summary: Obtener todas las configuraciones de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const getAllTarifas = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tarifas = await TarifaConfig.find()
      .populate('creadoPor', 'nombres apellidos')
      .populate('modificadoPor', 'nombres apellidos')
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      data: tarifas,
      message: `${tarifas.length} configuraciones encontradas`
    });
  }
);

/**
 * @swagger
 * /api/tarifas/configuracion:
 *   post:
 *     summary: Crear nueva configuración de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const crearTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      nombre,
      descripcion,
      fechaVigencia,
      fechaVencimiento,
      cargoFijo,
      escalones,
      temporadas,
      descuentos,
      recargos,
      configuracion,
      activarInmediatamente = false
    } = req.body;

    // Validaciones básicas
    if (!nombre || !fechaVigencia || !cargoFijo || !escalones || !recargos) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    // Validar escalones
    if (!Array.isArray(escalones) || escalones.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe definir al menos un escalón de tarifa'
      });
    }

    // Validar que los escalones no se solapen
    const escalonesOrdenados = escalones.sort((a, b) => a.desde - b.desde);
    for (let i = 1; i < escalonesOrdenados.length; i++) {
      const anterior = escalonesOrdenados[i - 1];
      const actual = escalonesOrdenados[i];

      if (anterior.hasta !== -1 && actual.desde <= anterior.hasta) {
        return res.status(400).json({
          success: false,
          message: `Los escalones se solapan: ${anterior.desde}-${anterior.hasta} y ${actual.desde}-${actual.hasta}`
        });
      }
    }

    try {
      const nuevaTarifa = new TarifaConfig({
        nombre,
        descripcion,
        activa: activarInmediatamente,
        fechaVigencia: new Date(fechaVigencia),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
        cargoFijo,
        escalones: escalonesOrdenados,
        temporadas: temporadas || [],
        descuentos: descuentos || [],
        recargos,
        configuracion: {
          redondeoDecimales: 0,
          aplicarIVA: false,
          ...configuracion
        },
        creadoPor: req.user!.id
      });

      await nuevaTarifa.save();

      // Crear log de auditoría
      await createAuditLog({
        action: 'CREATE',
        entity: 'TarifaConfig',
        entityId: (nuevaTarifa._id as any).toString(),
        userId: req.user!.id,
        details: {
          nombre: nuevaTarifa.nombre,
          activa: nuevaTarifa.activa,
          fechaVigencia: nuevaTarifa.fechaVigencia.toISOString()
        }
      });

      const tarifaCompleta = await TarifaConfig.findById(nuevaTarifa._id)
        .populate('creadoPor', 'nombres apellidos');

      res.status(201).json({
        success: true,
        data: tarifaCompleta,
        message: 'Configuración de tarifa creada exitosamente'
      });

    } catch (error: any) {
      console.error('Error creando tarifa:', error);
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
 * /api/tarifas/configuracion/{id}/activar:
 *   put:
 *     summary: Activar una configuración de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const activarTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const tarifa = await TarifaConfig.findById(id);
    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de tarifa no encontrada'
      });
    }

    // Verificar que no esté vencida
    if (tarifa.fechaVencimiento && new Date() > tarifa.fechaVencimiento) {
      return res.status(400).json({
        success: false,
        message: 'No se puede activar una configuración vencida'
      });
    }

    // Activar esta tarifa (el middleware se encarga de desactivar las demás)
    tarifa.activa = true;
    tarifa.modificadoPor = req.user!.id as any;
    tarifa.fechaModificacion = new Date();

    await tarifa.save();

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'TarifaConfig',
      entityId: (tarifa._id as any).toString(),
      userId: req.user!.id,
      details: {
        accion: 'Activar tarifa',
        nombre: tarifa.nombre
      }
    });

    res.json({
      success: true,
      data: tarifa,
      message: 'Configuración de tarifa activada exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/tarifas/simular:
 *   post:
 *     summary: Simular cálculo de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const simularCalculo = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { categoriaUsuario, consumoM3, pagoAnticipado = false } = req.body;

    if (!categoriaUsuario || consumoM3 === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Categoría de usuario y consumo son obligatorios'
      });
    }

    try {
      const simulacion = await TarifaService.simularCalculo(
        categoriaUsuario,
        parseFloat(consumoM3),
        pagoAnticipado
      );

      if (!simulacion) {
        return res.status(400).json({
          success: false,
          message: 'No hay configuración de tarifa activa para simular'
        });
      }

      res.json({
        success: true,
        data: simulacion,
        message: 'Simulación realizada exitosamente'
      });

    } catch (error: any) {
      console.error('Error en simulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error en la simulación',
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/tarifas/configuracion/{id}:
 *   put:
 *     summary: Actualizar configuración de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const actualizarTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const tarifa = await TarifaConfig.findById(id);
    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de tarifa no encontrada'
      });
    }

    // No permitir editar tarifa activa o finalizada
    if (tarifa.activa || tarifa.estado === 'activa') {
      return res.status(400).json({
        success: false,
        message: 'No se puede editar una configuración activa. Debe pausarla primero.'
      });
    }

    if (tarifa.estado === 'finalizada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede editar una configuración finalizada.'
      });
    }

    // Actualizar campos
    Object.assign(tarifa, updateData, {
      modificadoPor: req.user!.id as any,
      fechaModificacion: new Date()
    });

    await tarifa.save();

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'TarifaConfig',
      entityId: (tarifa._id as any).toString(),
      userId: req.user!.id,
      details: {
        nombre: tarifa.nombre,
        cambios: Object.keys(updateData)
      }
    });

    const tarifaActualizada = await TarifaConfig.findById(id)
      .populate('creadoPor', 'nombres apellidos')
      .populate('modificadoPor', 'nombres apellidos');

    res.json({
      success: true,
      data: tarifaActualizada,
      message: 'Configuración actualizada exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/tarifas/configuracion/{id}:
 *   delete:
 *     summary: Eliminar configuración de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
/**
 * @swagger
 * /api/tarifas/configuracion/{id}/pausar:
 *   put:
 *     summary: Pausar una configuración de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const pausarTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const tarifa = await TarifaConfig.findById(id);
    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de tarifa no encontrada'
      });
    }

    // Solo se puede pausar si está activa
    if (!tarifa.activa) {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede pausar una configuración activa'
      });
    }

    // Marcar como pausada (inactiva pero con estado especial)
    tarifa.activa = false;
    tarifa.estado = 'pausada';
    tarifa.fechaPausa = new Date();
    tarifa.modificadoPor = req.user!.id as any;
    tarifa.fechaModificacion = new Date();

    await tarifa.save();

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'TarifaConfig',
      entityId: (tarifa._id as any).toString(),
      userId: req.user!.id,
      details: {
        accion: 'Pausar tarifa',
        nombre: tarifa.nombre
      }
    });

    res.json({
      success: true,
      data: tarifa,
      message: 'Configuración de tarifa pausada exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/tarifas/configuracion/{id}/reanudar:
 *   put:
 *     summary: Reanudar una configuración de tarifa pausada
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const reanudarTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const tarifa = await TarifaConfig.findById(id);
    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de tarifa no encontrada'
      });
    }

    // Solo se puede reanudar si está pausada
    if (tarifa.estado !== 'pausada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede reanudar una configuración pausada'
      });
    }

    // Verificar que no haya otra tarifa activa
    const tarifaActiva = await TarifaConfig.findOne({ activa: true });
    if (tarifaActiva) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra configuración activa. Debe pausarla primero.'
      });
    }

    // Reactivar
    tarifa.activa = true;
    tarifa.estado = 'activa';
    tarifa.fechaPausa = undefined;
    tarifa.modificadoPor = req.user!.id as any;
    tarifa.fechaModificacion = new Date();

    await tarifa.save();

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'TarifaConfig',
      entityId: (tarifa._id as any).toString(),
      userId: req.user!.id,
      details: {
        accion: 'Reanudar tarifa',
        nombre: tarifa.nombre
      }
    });

    res.json({
      success: true,
      data: tarifa,
      message: 'Configuración de tarifa reanudada exitosamente'
    });
  }
);

/**
 * @swagger
 * /api/tarifas/configuracion/{id}/finalizar:
 *   put:
 *     summary: Finalizar la vigencia de una configuración de tarifa
 *     tags: [Tarifas]
 *     security:
 *       - bearerAuth: []
 */
export const finalizarVigenciaTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const tarifa = await TarifaConfig.findById(id);
    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de tarifa no encontrada'
      });
    }

    // Solo se puede finalizar si está activa o pausada
    if (tarifa.estado === 'finalizada') {
      return res.status(400).json({
        success: false,
        message: 'La configuración ya está finalizada'
      });
    }

    // Finalizar vigencia
    tarifa.activa = false;
    tarifa.estado = 'finalizada';
    tarifa.fechaVencimiento = new Date(); // Forzar vencimiento
    tarifa.modificadoPor = req.user!.id as any;
    tarifa.fechaModificacion = new Date();

    await tarifa.save();

    // Crear log de auditoría
    await createAuditLog({
      action: 'UPDATE',
      entity: 'TarifaConfig',
      entityId: (tarifa._id as any).toString(),
      userId: req.user!.id,
      details: {
        accion: 'Finalizar vigencia',
        nombre: tarifa.nombre,
        fechaFinalizacion: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      data: tarifa,
      message: 'Vigencia de tarifa finalizada exitosamente'
    });
  }
);

export const eliminarTarifa = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const tarifa = await TarifaConfig.findById(id);
    if (!tarifa) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de tarifa no encontrada'
      });
    }

    // Solo permitir eliminar tarifas pausadas o finalizadas
    if (tarifa.activa || tarifa.estado === 'activa') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una configuración activa. Debe pausarla o finalizar su vigencia primero.'
      });
    }

    await TarifaConfig.findByIdAndDelete(id);

    // Crear log de auditoría
    await createAuditLog({
      action: 'DELETE',
      entity: 'TarifaConfig',
      entityId: id,
      userId: req.user!.id,
      details: {
        nombre: tarifa.nombre,
        fechaVigencia: tarifa.fechaVigencia,
        estadoAnterior: tarifa.estado
      }
    });

    res.json({
      success: true,
      message: 'Configuración de tarifa eliminada exitosamente'
    });
  }
);