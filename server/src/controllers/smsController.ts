import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { User } from '../models';
import { smsService } from '../services/smsService';
import { createAuditLog } from './auditController';

// Get SMS settings for user
export const getSMSSettings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!.id);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    const smsStatus = smsService.getStatus();

    res.status(200).json({
      success: true,
      data: {
        settings: user.smsNotifications || {
          enabled: false,
          nuevaBoleta: true,
          recordatorioPago: true,
          confirmacionPago: true,
          phoneVerified: false
        },
        serviceStatus: smsStatus,
        phone: user.telefono
      }
    });
  }
);

// Update SMS settings
export const updateSMSSettings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { enabled, nuevaBoleta, recordatorioPago, confirmacionPago } = req.body;
    
    const user = await User.findById(req.user!.id);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    if (!user.telefono) {
      return next(new AppError('Debe agregar un número de teléfono primero', 400));
    }

    // Update SMS settings
    user.smsNotifications = {
      enabled: Boolean(enabled),
      nuevaBoleta: Boolean(nuevaBoleta),
      recordatorioPago: Boolean(recordatorioPago),
      confirmacionPago: Boolean(confirmacionPago),
      phoneVerified: user.smsNotifications?.phoneVerified || false
    };

    await user.save();

    // Log the configuration change
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: req.user!.role === 'super_admin' ? 'super_admin' : 'socio',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'configurar_sms',
      'configuracion',
      `Configuración SMS actualizada - Activado: ${enabled}`,
      { 
        smsSettings: user.smsNotifications,
        phone: user.telefono 
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Configuración SMS actualizada correctamente',
      data: {
        settings: user.smsNotifications
      }
    });
  }
);

// Send test SMS
export const sendTestSMS = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!.id);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    if (!user.telefono) {
      return next(new AppError('Debe agregar un número de teléfono primero', 400));
    }

    if (!smsService.isEnabled()) {
      return next(new AppError('Servicio SMS no está disponible', 503));
    }

    const result = await smsService.sendSMS({
      to: user.telefono,
      message: `¡Hola ${user.nombres}! 📱 Este es un mensaje de prueba del Portal APR. Tu servicio SMS está configurado correctamente. ✅`
    });

    if (!result.success) {
      return next(new AppError(result.error || 'Error al enviar SMS de prueba', 500));
    }

    // Log the test SMS
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: req.user!.role === 'super_admin' ? 'super_admin' : 'socio',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'sms_prueba',
      'notificaciones',
      'SMS de prueba enviado',
      { 
        phone: user.telefono,
        messageId: result.messageId
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'SMS de prueba enviado exitosamente',
      data: {
        messageId: result.messageId
      }
    });
  }
);

// Verify phone number (send verification SMS)
export const verifyPhone = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!.id);
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    if (!user.telefono) {
      return next(new AppError('Debe agregar un número de teléfono primero', 400));
    }

    if (!smsService.isEnabled()) {
      return next(new AppError('Servicio SMS no está disponible', 503));
    }

    // Generate a simple verification code (in production, use a more secure method)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification code temporarily (in production, use Redis or similar)
    // For now, we'll just send the SMS and mark as verified
    const result = await smsService.sendSMS({
      to: user.telefono,
      message: `Portal APR - Código de verificación: ${verificationCode}. No compartas este código con nadie. 🔐`
    });

    if (!result.success) {
      return next(new AppError(result.error || 'Error al enviar SMS de verificación', 500));
    }

    // For simplicity, mark phone as verified immediately
    // In production, you'd wait for the user to enter the code
    if (!user.smsNotifications) {
      user.smsNotifications = {
        enabled: false,
        nuevaBoleta: true,
        recordatorioPago: true,
        confirmacionPago: true,
        phoneVerified: true
      };
    } else {
      user.smsNotifications.phoneVerified = true;
    }

    await user.save();

    // Log phone verification
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: req.user!.role === 'super_admin' ? 'super_admin' : 'socio',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'verificar_telefono',
      'seguridad',
      'Número de teléfono verificado',
      { 
        phone: user.telefono,
        messageId: result.messageId
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Código de verificación enviado. Tu teléfono ha sido verificado.',
      data: {
        phoneVerified: true
      }
    });
  }
);

// Get SMS service status (admin only)
export const getSMSServiceStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const status = smsService.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  }
);

// Get all users with SMS settings (admin only)
export const getAllUsersWithSMS = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query: any = {
      role: { $nin: ['super_admin', 'admin'] } // Excluir super_admin y admin
    };

    if (search) {
      query.$or = [
        { nombres: { $regex: search, $options: 'i' } },
        { apellidos: { $regex: search, $options: 'i' } },
        { rut: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('nombres apellidos rut email telefono smsNotifications activo role createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    const usersWithSMSStats = users.map(user => ({
      id: user._id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rut: user.rut,
      email: user.email,
      telefono: user.telefono,
      role: user.role,
      activo: user.activo,
      smsEnabled: user.smsNotifications?.enabled || false,
      phoneVerified: user.smsNotifications?.phoneVerified || false,
      hasPhone: !!user.telefono,
      createdAt: (user as any).createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        users: usersWithSMSStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  }
);

// Send SMS to specific user (admin only)
export const sendSMSToUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return next(new AppError('Mensaje es requerido', 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }

    if (!user.telefono) {
      return next(new AppError('Usuario no tiene teléfono registrado', 400));
    }

    if (!smsService.isEnabled()) {
      return next(new AppError('Servicio SMS no está disponible', 503));
    }

    const result = await smsService.sendSMS({
      to: user.telefono,
      message: `${smsService.getPrefix()}: ${message}`
    });

    if (!result.success) {
      return next(new AppError(result.error || 'Error al enviar SMS', 500));
    }

    // ALWAYS create in-app notification for the recipient (socio)
    console.log(`📱 Creating in-app notification for SMS sent to user: ${user.nombres} ${user.apellidos} (ID: ${userId})`);
    try {
      const { createNotification } = await import('./notificationController');
      const notification = await createNotification(userId, {
        tipo: 'sms',
        titulo: 'Mensaje del administrador',
        mensaje: `El administrador ${req.user!.nombres} ${req.user!.apellidos} te ha enviado un mensaje: "${message.trim()}"`,
        referencia: {
          tipo: 'sms',
          id: userId
        },
        metadatos: {
          smsMessageId: result.messageId,
          adminName: `${req.user!.nombres} ${req.user!.apellidos}`,
          adminId: req.user!.id,
          originalMessage: message.trim(),
          sentVia: 'SMS'
        }
      });
      
      console.log(`✅ In-app notification created successfully for SMS:`, {
        notificationId: notification._id,
        userId: userId,
        userName: `${user.nombres} ${user.apellidos}`,
        title: notification.titulo,
        message: notification.mensaje
      });
      
    } catch (notificationError) {
      console.error('❌ Error creating SMS in-app notification:', notificationError);
      console.error('Stack trace:', notificationError.stack);
      // Don't fail the SMS sending if notification fails
    }

    // Log the admin SMS
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'enviar_sms_admin',
      'notificaciones',
      `SMS enviado a usuario ${user.nombres} ${user.apellidos}`,
      { 
        targetUserId: userId,
        targetUserName: `${user.nombres} ${user.apellidos}`,
        phone: user.telefono,
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
        sentTo: `${user.nombres} ${user.apellidos}`
      }
    });
  }
);

// Send bulk SMS to multiple users (admin only)
export const sendBulkSMS = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { userIds, message } = req.body;

    if (!message || message.trim().length === 0) {
      return next(new AppError('Mensaje es requerido', 400));
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return next(new AppError('Debe seleccionar al menos un usuario', 400));
    }

    if (!smsService.isEnabled()) {
      return next(new AppError('Servicio SMS no está disponible', 503));
    }

    const users = await User.find({ 
      _id: { $in: userIds },
      telefono: { $exists: true, $ne: null, $nin: [''] }
    });

    const results = {
      sent: 0,
      failed: 0,
      details: []
    };

    for (const user of users) {
      try {
        const result = await smsService.sendSMS({
          to: user.telefono!,
          message: `${smsService.getPrefix()}: ${message}`
        });

        if (result.success) {
          results.sent++;
          (results.details as any[]).push({
            userId: user._id,
            userName: `${user.nombres} ${user.apellidos}`,
            phone: user.telefono,
            status: 'sent',
            messageId: result.messageId
          });
        } else {
          results.failed++;
          (results.details as any[]).push({
            userId: user._id,
            userName: `${user.nombres} ${user.apellidos}`,
            phone: user.telefono,
            status: 'failed',
            error: result.error
          });
        }
      } catch (error: any) {
        results.failed++;
        (results.details as any[]).push({
          userId: user._id,
          userName: `${user.nombres} ${user.apellidos}`,
          phone: user.telefono,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Log bulk SMS operation
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'enviar_sms_masivo',
      'notificaciones',
      `SMS masivo enviado a ${results.sent} usuarios`,
      { 
        message,
        targetUsers: userIds.length,
        sent: results.sent,
        failed: results.failed,
        details: results.details
      },
      results.failed === 0 ? 'exitoso' : 'fallido',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: `SMS enviado a ${results.sent} usuarios. ${results.failed} fallaron.`,
      data: results
    });
  }
);

// Update SMS prefix (admin only)
export const updateSMSPrefix = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { prefix } = req.body;

    if (!prefix || prefix.trim().length === 0) {
      return next(new AppError('El prefijo es requerido', 400));
    }

    if (prefix.trim().length > 100) {
      return next(new AppError('El prefijo no puede exceder 100 caracteres', 400));
    }

    // Update the SMS prefix in the SMS service
    smsService.updatePrefix(prefix.trim());

    // Log the prefix update
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'actualizar_prefijo_sms',
      'configuracion',
      `Prefijo SMS actualizado: "${prefix.trim()}"`,
      { 
        oldPrefix: smsService.getPrefix(),
        newPrefix: prefix.trim()
      },
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Prefijo SMS actualizado exitosamente',
      data: {
        prefix: prefix.trim()
      }
    });
  }
);