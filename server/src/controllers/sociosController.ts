import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { User } from '../models';
import { smsService } from '../services/smsService';
import { createAuditLog } from './auditController';

// Get all socios with pagination and search (admin only)
export const getAllSocios = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    
    const query: any = { role: 'socio' };
    
    // Search filter
    if (search) {
      query.$or = [
        { nombres: { $regex: search, $options: 'i' } },
        { apellidos: { $regex: search, $options: 'i' } },
        { rut: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { codigoSocio: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'active') {
      query.activo = true;
    } else if (status === 'inactive') {
      query.activo = false;
    }

    const socios = await User.find(query)
      .select('nombres apellidos rut email telefono direccion codigoSocio activo saldoActual deudaTotal smsNotifications fechaIngreso profilePhoto medidor categoriaUsuario')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ fechaIngreso: -1 });

    const total = await User.countDocuments(query);

    const sociosData = socios.map(socio => ({
      id: socio._id,
      nombres: socio.nombres,
      apellidos: socio.apellidos,
      rut: socio.rut,
      email: socio.email,
      telefono: socio.telefono,
      direccion: socio.direccion,
      codigoSocio: socio.codigoSocio,
      activo: socio.activo,
      saldoActual: socio.saldoActual || 0,
      deudaTotal: socio.deudaTotal || 0,
      fechaIngreso: socio.fechaIngreso,
      smsEnabled: socio.smsNotifications?.enabled || false,
      phoneVerified: socio.smsNotifications?.phoneVerified || false,
      hasPhone: !!socio.telefono,
      profileImage: socio.profilePhoto,
      medidor: socio.medidor,
      categoriaUsuario: socio.categoriaUsuario
    }));

    res.status(200).json({
      success: true,
      data: {
        socios: sociosData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        statistics: {
          total,
          active: await User.countDocuments({ role: 'socio', activo: true }),
          inactive: await User.countDocuments({ role: 'socio', activo: false }),
          withPhone: await User.countDocuments({ role: 'socio', telefono: { $exists: true, $ne: null, $nin: [''] } }),
          smsEnabled: await User.countDocuments({ role: 'socio', 'smsNotifications.enabled': true })
        }
      }
    });

    // Log the access
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'consultar_socios',
      'gestion',
      `Consulta de socios - ${total} registros`,
      { search, status, total },
      'exitoso',
      undefined,
      req
    );
  }
);

// Get single socio details (admin only)
export const getSocioDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { socioId } = req.params;

    const socio = await User.findOne({ _id: socioId, role: 'socio' })
      .select('nombres apellidos rut email telefono direccion codigoSocio activo saldoActual deudaTotal smsNotifications fechaIngreso');

    if (!socio) {
      return next(new AppError('Socio no encontrado', 404));
    }

    const socioData = {
      id: socio._id,
      nombres: socio.nombres,
      apellidos: socio.apellidos,
      rut: socio.rut,
      email: socio.email,
      telefono: socio.telefono,
      direccion: socio.direccion,
      codigoSocio: socio.codigoSocio,
      activo: socio.activo,
      saldoActual: socio.saldoActual || 0,
      deudaTotal: socio.deudaTotal || 0,
      fechaIngreso: socio.fechaIngreso,
      smsNotifications: socio.smsNotifications
    };

    res.status(200).json({
      success: true,
      data: socioData
    });
  }
);

// Block/Unblock socio (admin only)
export const toggleSocioStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { socioId } = req.params;
    const { action } = req.body; // 'block' or 'unblock'

    if (!action || !['block', 'unblock'].includes(action)) {
      return next(new AppError('Acción inválida. Use "block" o "unblock"', 400));
    }

    const socio = await User.findOne({ _id: socioId, role: 'socio' });

    if (!socio) {
      return next(new AppError('Socio no encontrado', 404));
    }

    const newStatus = action === 'block' ? false : true;
    socio.activo = newStatus;
    await socio.save();

    // Send SMS notification if enabled
    if (socio.telefono && socio.smsNotifications?.enabled && smsService.isEnabled()) {
      const message = newStatus 
        ? `Hola ${socio.nombres}! ✅ Tu cuenta en Portal APR ha sido reactivada. Ya puedes acceder normalmente.`
        : `Hola ${socio.nombres}! ⚠️ Tu cuenta en Portal APR ha sido temporalmente suspendida. Contacta al administrador para más información.`;
      
      await smsService.sendSMS({
        to: socio.telefono,
        message
      });
    }

    // Log the action
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      action === 'block' ? 'bloquear_socio' : 'desbloquear_socio',
      'gestion',
      `${action === 'block' ? 'Bloqueo' : 'Desbloqueo'} de socio ${socio.nombres} ${socio.apellidos}`,
      {
        socioId,
        socioName: `${socio.nombres} ${socio.apellidos}`,
        socioRut: socio.rut,
        newStatus: newStatus ? 'activo' : 'bloqueado'
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: `Socio ${newStatus ? 'desbloqueado' : 'bloqueado'} exitosamente`,
      data: {
        socioId,
        activo: newStatus,
        action: action
      }
    });
  }
);

// Delete socio (admin only) - Soft delete
export const deleteSocio = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { socioId } = req.params;
    const { confirm } = req.body;

    if (!confirm || confirm !== 'DELETE') {
      return next(new AppError('Confirmación requerida. Envíe "confirm": "DELETE"', 400));
    }

    const socio = await User.findOne({ _id: socioId, role: 'socio' });

    if (!socio) {
      return next(new AppError('Socio no encontrado', 404));
    }

    // Check if socio has pending debt
    if (socio.deudaTotal && socio.deudaTotal > 0) {
      return next(new AppError('No se puede eliminar un socio con deudas pendientes', 400));
    }

    // Soft delete - mark as inactive and add deletion flag
    socio.activo = false;
    (socio as any).deleted = true;
    (socio as any).deletedAt = new Date();
    (socio as any).deletedBy = req.user!.id;
    await socio.save();

    // Send final SMS notification if enabled
    if (socio.telefono && socio.smsNotifications?.enabled && smsService.isEnabled()) {
      await smsService.sendSMS({
        to: socio.telefono,
        message: `Hola ${socio.nombres}! Tu cuenta en Portal APR ha sido eliminada. Gracias por haber sido parte de nuestra comunidad. 🚰`
      });
    }

    // Log the deletion
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'eliminar_socio',
      'gestion',
      `Eliminación de socio ${socio.nombres} ${socio.apellidos}`,
      {
        socioId,
        socioName: `${socio.nombres} ${socio.apellidos}`,
        socioRut: socio.rut,
        socioEmail: socio.email,
        reason: 'Eliminación administrativa'
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Socio eliminado exitosamente',
      data: {
        socioId,
        deletedAt: new Date()
      }
    });
  }
);

// Send SMS to specific socio (admin only)
export const sendSMSToSocio = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { socioId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return next(new AppError('Mensaje es requerido', 400));
    }

    if (message.length > 160) {
      return next(new AppError('El mensaje no puede exceder 160 caracteres', 400));
    }

    const socio = await User.findOne({ _id: socioId, role: 'socio' });

    if (!socio) {
      return next(new AppError('Socio no encontrado', 404));
    }

    if (!socio.telefono) {
      return next(new AppError('El socio no tiene teléfono registrado', 400));
    }

    if (!socio.activo) {
      return next(new AppError('No se puede enviar SMS a un socio inactivo', 400));
    }

    if (!smsService.isEnabled()) {
      return next(new AppError('Servicio SMS no está disponible', 503));
    }

    const result = await smsService.sendSMS({
      to: socio.telefono,
      message: `Portal APR - ${message}`
    });

    if (!result.success) {
      return next(new AppError(result.error || 'Error al enviar SMS', 500));
    }

    // Log the SMS
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'sms_directo_socio',
      'comunicacion',
      `SMS directo enviado a socio ${socio.nombres} ${socio.apellidos}`,
      {
        socioId,
        socioName: `${socio.nombres} ${socio.apellidos}`,
        phone: socio.telefono,
        message,
        messageId: result.messageId
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'SMS enviado exitosamente',
      data: {
        messageId: result.messageId,
        sentTo: `${socio.nombres} ${socio.apellidos}`,
        phone: socio.telefono
      }
    });
  }
);

// Update socio information (admin only)
export const updateSocio = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { socioId } = req.params;
    const {
      nombres,
      apellidos,
      email,
      telefono,
      direccion,
      categoriaUsuario,
      medidor
    } = req.body;

    const socio = await User.findOne({ _id: socioId, role: 'socio' });

    if (!socio) {
      return next(new AppError('Socio no encontrado', 404));
    }

    // Update only provided fields
    if (nombres) socio.nombres = nombres;
    if (apellidos) socio.apellidos = apellidos;
    if (email) socio.email = email;
    if (telefono !== undefined) socio.telefono = telefono;
    if (direccion !== undefined) socio.direccion = direccion;
    if (categoriaUsuario) socio.categoriaUsuario = categoriaUsuario;

    // Update medidor information
    if (medidor) {
      console.log('🔧 DEBUG: Updating medidor for socio:', socio.nombres);
      console.log('🔧 DEBUG: Medidor data received:', medidor);
      socio.medidor = {
        numero: medidor.numero || socio.medidor?.numero || '',
        ubicacion: medidor.ubicacion,
        fechaInstalacion: medidor.fechaInstalacion ? new Date(medidor.fechaInstalacion) : socio.medidor?.fechaInstalacion,
        lecturaInicial: medidor.lecturaInicial !== undefined ? medidor.lecturaInicial : socio.medidor?.lecturaInicial,
        estado: medidor.estado || socio.medidor?.estado || 'active'
      };
      console.log('🔧 DEBUG: Medidor after assignment:', socio.medidor);
    }

    await socio.save();
    console.log('🔧 DEBUG: Socio saved. Medidor in DB:', socio.medidor);

    // Log the update
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'actualizar_socio',
      'gestion',
      `Actualización de datos de socio ${socio.nombres} ${socio.apellidos}`,
      {
        socioId,
        socioName: `${socio.nombres} ${socio.apellidos}`,
        updatedFields: { nombres, apellidos, email, telefono, direccion, categoriaUsuario, medidor }
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Información del socio actualizada exitosamente',
      data: {
        id: socio._id,
        nombres: socio.nombres,
        apellidos: socio.apellidos,
        email: socio.email,
        telefono: socio.telefono,
        direccion: socio.direccion,
        categoriaUsuario: socio.categoriaUsuario,
        medidor: socio.medidor
      }
    });
  }
);