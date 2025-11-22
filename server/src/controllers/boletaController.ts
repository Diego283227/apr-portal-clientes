import { Request, Response } from 'express';
import Boleta, { IBoleta } from '../models/Boleta';
import User from '../models/User';
import { smsService } from '../services/smsService';
// WhatsApp service removed
import { createAuditLog } from '../utils/audit';
import Notification from '../models/Notification';
import TarifaService from '../services/tarifaService';
import mongoose from 'mongoose';

// Create new boleta and send notifications
export const createBoleta = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user.userId;
    const {
      socioId,
      lecturaAnterior,
      lecturaActual,
      periodo,
      fechaVencimiento,
      sendNotifications = true
    } = req.body;

    // Validate required fields
    if (!socioId || lecturaAnterior === undefined || lecturaActual === undefined ||
        !periodo || !fechaVencimiento) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser completados'
      });
    }

    // Validate readings
    if (lecturaActual < lecturaAnterior) {
      return res.status(400).json({
        success: false,
        message: 'La lectura actual no puede ser menor que la lectura anterior'
      });
    }

    // Verify socio exists
    const socio = await User.findById(socioId);
    if (!socio) {
      return res.status(404).json({
        success: false,
        message: 'Socio no encontrado'
      });
    }

    if (socio.role !== 'socio') {
      return res.status(400).json({
        success: false,
        message: 'El usuario debe tener rol de socio'
      });
    }

    // Check for duplicate period
    const existingBoleta = await Boleta.findOne({
      socioId: socioId,
      periodo: periodo
    });

    if (existingBoleta) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una boleta para el socio ${socio.nombres} ${socio.apellidos} en el período ${periodo}`
      });
    }

    // Generate numero boleta manually if needed
    const generateBoletaNumber = async () => {
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const count = await Boleta.countDocuments({
        fechaEmision: {
          $gte: new Date(year, new Date().getMonth(), 1),
          $lt: new Date(year, new Date().getMonth() + 1, 1)
        }
      });
      return `${year}${month}${(count + 1).toString().padStart(3, '0')}`;
    };

    const numeroBoleta = await generateBoletaNumber();

    // Calculate consumo
    const consumoM3 = lecturaActual - lecturaAnterior;

    // Use TarifaService to calculate all costs based on active tariff configuration
    let calculoTarifa;
    try {
      calculoTarifa = await TarifaService.calcularTarifa(
        socio,
        consumoM3,
        new Date(periodo + '-01'), // Convert YYYY-MM to Date
        0, // No late payment days for new boletas
        false // Not anticipated payment
      );
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: `Error en el cálculo de tarifas: ${error.message}`,
        error: 'No hay configuración de tarifa activa. Configure las tarifas desde el panel de administración.'
      });
    }

    console.log(`📊 Boleta calculations using active tariff:
      - Consumo: ${consumoM3} m³
      - Cargo fijo: $${calculoTarifa.cargoFijo}
      - Costo consumo: $${calculoTarifa.costoConsumo}
      - Descuentos: $${calculoTarifa.descuentos}
      - Recargos: $${calculoTarifa.recargos}
      - Monto total: $${calculoTarifa.montoTotal}`);

    // Create boleta
    const boleta = new Boleta({
      numeroBoleta,
      socioId,
      lecturaAnterior,
      lecturaActual,
      consumoM3,
      montoTotal: calculoTarifa.montoTotal,
      fechaVencimiento: new Date(fechaVencimiento),
      detalle: {
        consumoAnterior: lecturaAnterior,
        consumoActual: lecturaActual,
        tarifaCalculada: calculoTarifa,
        cargoFijo: calculoTarifa.cargoFijo,
        costoConsumo: calculoTarifa.costoConsumo,
        descuentos: calculoTarifa.descuentos,
        recargos: calculoTarifa.recargos,
        detalleCalculo: calculoTarifa.detalleCalculo
      },
      periodo
    });

    await boleta.save();

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entity: 'Boleta',
      entityId: (boleta._id as any).toString(),
      userId: adminUserId,
      details: {
        numeroBoleta: boleta.numeroBoleta,
        socio: `${socio.nombres} ${socio.apellidos}`,
        periodo: periodo,
        consumoM3: boleta.consumoM3,
        montoTotal: boleta.montoTotal
      }
    });

    // ALWAYS create in-app notification for socio (regardless of SMS/WhatsApp settings)
    try {
      const notificationData = {
        userId: (socio._id as any).toString(),
        tipo: 'boleta' as const,
        titulo: 'Nueva boleta generada',
        mensaje: `Se ha generado la boleta #${boleta.numeroBoleta} por $${boleta.montoTotal.toLocaleString('es-CL')} correspondiente al período ${periodo}. Vence el ${new Date(fechaVencimiento).toLocaleDateString('es-CL')}.`,
        referencia: {
          tipo: 'boleta' as const,
          id: (boleta._id as any).toString()
        },
        metadatos: {
          numeroBoleta: boleta.numeroBoleta,
          montoTotal: boleta.montoTotal,
          periodo: periodo,
          fechaVencimiento: fechaVencimiento,
          consumoM3: boleta.consumoM3
        }
      };

      const notification = new Notification(notificationData);
      await notification.save();

      // Send real-time notification via Socket.IO
      if (global.socketManager) {
        global.socketManager.sendNotificationToUser((socio._id as any).toString(), {
          id: (notification._id as any).toString(),
          tipo: notification.tipo,
          titulo: notification.titulo,
          mensaje: notification.mensaje,
          leida: notification.leida,
          fechaCreacion: notification.fechaCreacion,
          referencia: notification.referencia,
          metadatos: notification.metadatos
        });
      }

      console.log(`🔔 In-app notification created for user ${socio.nombres} ${socio.apellidos} - Boleta ${boleta.numeroBoleta}`);
      console.log(`📱 Socio will see notification in bell icon immediately via Socket.IO`);
    } catch (notificationError) {
      console.error('Error creating in-app notification:', notificationError);
      // Don't fail the boleta creation if notification fails
    }

    // Send SMS notifications if enabled
    if (sendNotifications) {
      await sendBoletaNotifications(boleta, socio);
    }

    // Populate socio data for response
    const boletaWithSocio = await Boleta.findById(boleta._id)
      .populate('socioId', 'nombres apellidos rut email telefono')
      .exec();

    res.status(201).json({
      success: true,
      message: 'Boleta creada exitosamente',
      data: {
        boleta: boletaWithSocio,
        notificationsSent: sendNotifications
      }
    });

  } catch (error: any) {
    console.error('Error creating boleta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear boleta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send notifications for boleta
const sendBoletaNotifications = async (boleta: IBoleta, socio: any) => {
  try {
    console.log(`📢 Starting notification process for socio: ${socio.nombres} ${socio.apellidos}`);
    console.log(`📞 Socio phone: ${socio.telefono || 'NO PHONE'}`);
    console.log(`📧 SMS settings:`, socio.smsNotifications);

    const notificationPromises: Promise<any>[] = [];
    let smsAttempted = false;

    // Format boleta details
    const boletaDetails = {
      numeroBoleta: boleta.numeroBoleta,
      periodo: boleta.periodo,
      consumoM3: boleta.consumoM3,
      montoTotal: boleta.montoTotal,
      fechaVencimiento: boleta.fechaVencimiento.toLocaleDateString('es-CL'),
      socio: `${socio.nombres} ${socio.apellidos}`
    };

    // Send SMS notification (more lenient conditions)
    if (socio.telefono) {
      const shouldSendSMS = socio.smsNotifications?.enabled && socio.smsNotifications?.nuevaBoleta;
      
      if (shouldSendSMS) {
        console.log('✅ Sending SMS notification...');
        smsAttempted = true;
        
        const smsMessage = `🧾 APR AGUA - Nueva Boleta
        
Estimado(a) ${socio.nombres},

Se ha generado su boleta de agua:
• Número: ${boleta.numeroBoleta}
• Período: ${boleta.periodo}
• Consumo: ${boleta.consumoM3} m³
• Monto: $${boleta.montoTotal.toLocaleString('es-CL')}
• Vence: ${boletaDetails.fechaVencimiento}

Puede pagar en línea en: ${process.env.FRONTEND_URL || 'portal-apr.com'}

Gracias por su puntualidad!`;
        
        notificationPromises.push(
          smsService.sendSMS({
            to: socio.telefono,
            message: smsMessage
          }).then(result => {
            console.log('📱 SMS result:', result);
            return { type: 'SMS', success: result.success, result };
          }).catch(error => {
            console.error('❌ SMS error:', error);
            return { type: 'SMS', success: false, error: error.message };
          })
        );
      } else {
        console.log('⚠️ SMS not sent - notifications disabled or nuevaBoleta disabled');
      }
    } else {
      console.log('❌ SMS not sent - no phone number');
    }

    // WhatsApp functionality removed

    // Execute all notifications
    if (notificationPromises.length > 0) {
      console.log(`🚀 Executing ${notificationPromises.length} notification(s)...`);
      const results = await Promise.allSettled(notificationPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const notificationResult = result.value;
          console.log(`✅ Notification ${index + 1} (${notificationResult.type}): ${notificationResult.success ? 'SUCCESS' : 'FAILED'}`);
        } else {
          console.log(`❌ Notification ${index + 1}: REJECTED -`, result.reason);
        }
      });
    } else {
      console.log('⚠️ No notifications sent - no valid conditions met');
    }

    console.log(`📊 Notification summary:
      - SMS attempted: ${smsAttempted}
      - Total promises: ${notificationPromises.length}`);

  } catch (error) {
    console.error('💥 Error sending boleta notifications:', error);
    // Don't throw error, just log it
  }
};

// Get all boletas with filters and pagination
export const getBoletas = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      estado,
      socioId,
      periodo,
      fechaDesde,
      fechaHasta,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = {};

    // IMPORTANTE: Excluir boletas archivadas de la vista principal
    if (estado && estado !== 'all') {
      filter.estado = estado;
    } else {
      // Si no se especifica estado, mostrar todas MENOS las archivadas
      filter.estado = { $ne: 'archivada' };
    }

    if (socioId) {
      filter.socioId = socioId;
    }

    if (periodo) {
      filter.periodo = { $regex: periodo, $options: 'i' };
    }

    if (fechaDesde || fechaHasta) {
      filter.fechaEmision = {};
      if (fechaDesde) filter.fechaEmision.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filter.fechaEmision.$lte = new Date(fechaHasta as string);
    }

    // Search in socio data if search term provided
    let searchFilter = {};
    if (search) {
      const searchUsers = await User.find({
        $or: [
          { nombres: { $regex: search, $options: 'i' } },
          { apellidos: { $regex: search, $options: 'i' } },
          { rut: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ],
        role: 'socio'
      }).select('_id');

      const userIds = searchUsers.map(user => user._id);
      
      searchFilter = {
        $or: [
          { numeroBoleta: { $regex: search, $options: 'i' } },
          { socioId: { $in: userIds } }
        ]
      };
    }

    const finalFilter = search ? { $and: [filter, searchFilter] } : filter;

    // Get total count
    const total = await Boleta.countDocuments(finalFilter);

    // Get boletas
    const boletas = await Boleta.find(finalFilter)
      .populate('socioId', 'nombres apellidos rut email telefono activo')
      .sort({ fechaEmision: -1 })
      .skip(skip)
      .limit(limitNum)
      .exec();

    res.json({
      success: true,
      data: {
        boletas,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting boletas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener boletas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update boleta status
export const updateBoletaStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const adminUserId = (req as any).user.userId;

    if (!['pendiente', 'pagada', 'vencida', 'anulada'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido'
      });
    }

    const boleta = await Boleta.findById(id).populate('socioId', 'nombres apellidos');
    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada'
      });
    }

    // CRITICAL: Prevent changing estado if boleta was already paid
    if ((boleta as any).pagada) {
      return res.status(403).json({
        success: false,
        message: `No se puede cambiar el estado de la boleta ${boleta.numeroBoleta} porque ya fue pagada. Las boletas pagadas son inmutables.`
      });
    }

    const estadoAnterior = boleta.estado;
    boleta.estado = estado;
    await boleta.save();

    // Create audit log
    const socioInfo = boleta.socioId
      ? `${(boleta.socioId as any).nombres || 'N/A'} ${(boleta.socioId as any).apellidos || ''}`
      : 'Socio no disponible';

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Boleta',
      entityId: (boleta._id as any).toString(),
      userId: adminUserId,
      details: {
        numeroBoleta: boleta.numeroBoleta,
        estadoAnterior,
        estadoNuevo: estado,
        socio: socioInfo
      }
    });

    res.json({
      success: true,
      message: 'Estado de boleta actualizado correctamente',
      data: { boleta }
    });

  } catch (error: any) {
    console.error('Error updating boleta status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar boleta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete boleta
export const deleteBoleta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user.userId;

    const boleta = await Boleta.findById(id).populate('socioId', 'nombres apellidos');
    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada'
      });
    }

    // Only allow deletion of boletas that were never paid
    if (boleta.estado === 'pagada' || (boleta as any).pagada) {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar una boleta que fue pagada. Las boletas pagadas son inmutables.'
      });
    }

    await Boleta.findByIdAndDelete(id);

    // Create audit log
    await createAuditLog({
      action: 'DELETE',
      entity: 'Boleta',
      entityId: (boleta._id as any).toString(),
      userId: adminUserId,
      details: {
        numeroBoleta: boleta.numeroBoleta,
        estado: boleta.estado,
        socio: `${(boleta.socioId as any).nombres} ${(boleta.socioId as any).apellidos}`,
        montoTotal: boleta.montoTotal
      }
    });

    res.json({
      success: true,
      message: 'Boleta eliminada correctamente'
    });

  } catch (error: any) {
    console.error('Error deleting boleta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar boleta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get boleta by ID
export const getBoletaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boleta inválido'
      });
    }

    const boleta = await Boleta.findById(id)
      .populate('socioId', 'nombres apellidos rut email telefono activo')
      .exec();

    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada'
      });
    }

    res.json({
      success: true,
      data: { boleta }
    });

  } catch (error: any) {
    console.error('Error getting boleta by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener boleta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend notifications for a boleta
export const resendBoletaNotifications = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user.userId;

    const boleta = await Boleta.findById(id).populate('socioId');
    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada'
      });
    }

    const socio = boleta.socioId as any;
    
    // Send notifications
    await sendBoletaNotifications(boleta, socio);

    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entity: 'Boleta',
      entityId: (boleta._id as any).toString(),
      userId: adminUserId,
      details: {
        action: 'resend_notifications',
        numeroBoleta: boleta.numeroBoleta,
        socio: `${socio.nombres} ${socio.apellidos}`
      }
    });

    res.json({
      success: true,
      message: 'Notificaciones enviadas correctamente'
    });

  } catch (error: any) {
    console.error('Error resending boleta notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Archive boleta (dar de baja)
export const archiveBoleta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user.userId;

    const boleta = await Boleta.findById(id).populate('socioId', 'nombres apellidos email rut');

    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada'
      });
    }

    // CRÍTICO: Solo permitir archivar boletas PAGADAS
    // Esto previene que boletas vencidas se archiven sin pasar por el flujo de morosidad
    if (boleta.estado !== 'pagada') {
      return res.status(400).json({
        success: false,
        message: `No se puede archivar esta boleta. Solo se pueden archivar boletas pagadas. Estado actual: ${boleta.estado}`
      });
    }

    // Verificación adicional: confirmar que la boleta fue efectivamente pagada
    if (!boleta.pagada) {
      return res.status(400).json({
        success: false,
        message: 'No se puede archivar una boleta que no ha sido marcada como pagada.'
      });
    }

    const estadoAnterior = boleta.estado;
    boleta.estado = 'archivada';
    await boleta.save();

    // Create audit log
    await createAuditLog({
      action: 'ARCHIVE',
      entity: 'Boleta',
      entityId: (boleta._id as any).toString(),
      userId: adminUserId,
      details: {
        numeroBoleta: boleta.numeroBoleta,
        socio: (boleta.socioId as any).nombres + ' ' + (boleta.socioId as any).apellidos,
        periodo: boleta.periodo,
        montoTotal: boleta.montoTotal,
        estadoAnterior: estadoAnterior
      }
    });

    res.json({
      success: true,
      message: 'Boleta archivada exitosamente',
      data: boleta
    });

  } catch (error: any) {
    console.error('Error archiving boleta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al archivar boleta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get archived boletas
export const getArchivedBoletas = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      periodo
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    const query: any = { estado: 'archivada' };

    if (periodo) {
      query.periodo = periodo;
    }

    // Search in socio data
    let socioIds: any[] = [];
    if (search && search !== '') {
      const searchRegex = new RegExp(search as string, 'i');
      const socios = await User.find({
        $or: [
          { nombres: searchRegex },
          { apellidos: searchRegex },
          { rut: searchRegex },
          { email: searchRegex },
          { codigoSocio: searchRegex }
        ]
      }).select('_id');
      socioIds = socios.map(s => s._id);

      if (socioIds.length > 0) {
        query.socioId = { $in: socioIds };
      } else {
        // Also search in boleta number
        query.$or = [
          { numeroBoleta: searchRegex }
        ];
      }
    }

    const [boletas, total] = await Promise.all([
      Boleta.find(query)
        .populate('socioId', 'nombres apellidos email rut codigoSocio')
        .sort({ fechaEmision: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Boleta.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: boletas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('Error getting archived boletas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener boletas archivadas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get boleta statistics
export const getBoletaStats = async (req: Request, res: Response) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Get stats
    const [
      totalBoletas,
      boletasPendientes,
      boletasPagadas,
      boletasVencidas,
      boletasAnuladas,
      boletasThisMonth,
      totalPendingAmount,
      totalPaidAmount
    ] = await Promise.all([
      Boleta.countDocuments(),
      Boleta.countDocuments({ estado: 'pendiente' }),
      Boleta.countDocuments({ estado: 'pagada' }),
      Boleta.countDocuments({ estado: 'vencida' }),
      Boleta.countDocuments({ estado: 'anulada' }),
      Boleta.countDocuments({
        fechaEmision: { $gte: currentMonth, $lt: nextMonth }
      }),
      Boleta.aggregate([
        { $match: { estado: { $in: ['pendiente', 'vencida'] } } },
        { $group: { _id: null, total: { $sum: '$montoTotal' } } }
      ]),
      Boleta.aggregate([
        { $match: { estado: 'pagada' } },
        { $group: { _id: null, total: { $sum: '$montoTotal' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total: totalBoletas,
        pendientes: boletasPendientes,
        pagadas: boletasPagadas,
        vencidas: boletasVencidas,
        anuladas: boletasAnuladas,
        thisMonth: boletasThisMonth,
        amounts: {
          pending: totalPendingAmount[0]?.total || 0,
          paid: totalPaidAmount[0]?.total || 0
        }
      }
    });

  } catch (error: any) {
    console.error('Error getting boleta stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate PDF for boleta
export const generarBoletaPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boleta inválido'
      });
    }

    // Buscar boleta con datos del socio
    const boleta = await Boleta.findById(id)
      .populate('socioId', 'nombres apellidos rut email telefono direccion')
      .exec();

    if (!boleta) {
      return res.status(404).json({
        success: false,
        message: 'Boleta no encontrada'
      });
    }

    const socio = boleta.socioId as any;

    if (!socio) {
      return res.status(404).json({
        success: false,
        message: 'Datos del socio no encontrados'
      });
    }

    // Obtener historial de consumo de los últimos 6 meses
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

    // Importar servicio dinámicamente
    const { BoletaPDFService } = await import('../services/boletaPdfService');

    // Generar PDF
    const pdfBuffer = await BoletaPDFService.generarBoletaPDF({
      boleta: boleta as any,
      socio: socio,
      historialConsumo
    });

    // Configurar headers para descarga
    const filename = BoletaPDFService.generarNombreArchivo(boleta as any, socio);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Error generando PDF de boleta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};