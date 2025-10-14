import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import Notification from '../models/Notification';
import { createAuditLog } from './auditController';

// Create a new notification (utility function)
export const createNotification = async (userId: string, data: {
  tipo: 'boleta' | 'mensaje' | 'sms' | 'whatsapp' | 'sistema';
  titulo: string;
  mensaje: string;
  referencia?: {
    tipo: 'boleta' | 'mensaje' | 'sms';
    id: string;
  };
  metadatos?: any;
}) => {

    const notification = new Notification({
      userId,
      ...data
    });

    await notification.save();

    // Emit real-time notification via Socket.IO
    if (global.socketManager) {
      global.socketManager.sendNotificationToUser(userId, {
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

    return notification;
};

// Get user notifications with pagination
export const getUserNotifications = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { page = 1, limit = 20, onlyUnread = false } = req.query;
    const userId = req.user!.id;

    const query: any = { userId };
    if (onlyUnread === 'true') {
      query.leida = false;
    }

    const notifications = await Notification.find(query)
      .sort({ fechaCreacion: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('tipo titulo mensaje leida fechaCreacion referencia metadatos');

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, leida: false });

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map(notif => ({
          id: notif._id,
          tipo: notif.tipo,
          titulo: notif.titulo,
          mensaje: notif.mensaje,
          leida: notif.leida,
          fechaCreacion: notif.fechaCreacion,
          referencia: notif.referencia,
          metadatos: notif.metadatos
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        unreadCount
      }
    });
  }
);

// Mark notification as read
export const markNotificationAsRead = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findOne({ 
      _id: notificationId, 
      userId 
    });

    if (!notification) {
      return next(new AppError('Notificación no encontrada', 404));
    }

    notification.leida = true;
    await notification.save();

    // Emit updated unread count
    if (global.socketManager) {
      const unreadCount = await Notification.countDocuments({ userId, leida: false });
      global.socketManager.sendUnreadCountUpdate(userId, unreadCount);
    }

    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  }
);

// Mark all notifications as read
export const markAllNotificationsAsRead = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    await Notification.updateMany(
      { userId, leida: false },
      { leida: true }
    );

    // Emit updated unread count
    if (global.socketManager) {
      global.socketManager.sendUnreadCountUpdate(userId, 0);
    }

    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  }
);

// Get notification counts
export const getNotificationCounts = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const counts = await Notification.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$leida', false] }, 1, 0] } },
          boletas: { $sum: { $cond: [{ $eq: ['$tipo', 'boleta'] }, 1, 0] } },
          mensajes: { $sum: { $cond: [{ $eq: ['$tipo', 'mensaje'] }, 1, 0] } },
          sms: { $sum: { $cond: [{ $eq: ['$tipo', 'sms'] }, 1, 0] } }
        }
      }
    ]);

    const result = counts[0] || {
      total: 0,
      unread: 0,
      boletas: 0,
      mensajes: 0,
      sms: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  }
);

// Delete notification
export const deleteNotification = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findOneAndDelete({ 
      _id: notificationId, 
      userId 
    });

    if (!notification) {
      return next(new AppError('Notificación no encontrada', 404));
    }

    // Emit updated unread count
    if (global.socketManager) {
      const unreadCount = await Notification.countDocuments({ userId, leida: false });
      global.socketManager.sendUnreadCountUpdate(userId, unreadCount);
    }

    res.status(200).json({
      success: true,
      message: 'Notificación eliminada'
    });
  }
);

// Admin: Send notification to specific user
export const sendNotificationToUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { userId, tipo, titulo, mensaje, metadatos } = req.body;

    if (!userId || !tipo || !titulo || !mensaje) {
      return next(new AppError('userId, tipo, titulo y mensaje son requeridos', 400));
    }

    const notification = await createNotification(userId, {
      tipo,
      titulo,
      mensaje,
      metadatos
    });

    // Log the action
    await createAuditLog(
      {
        id: req.user!.id,
        tipo: 'super_admin',
        nombre: `${req.user!.nombres} ${req.user!.apellidos}`,
        identificador: (req.user as any).username || (req.user as any).rut || ''
      },
      'enviar_notificacion',
      'comunicacion',
      `Notificación enviada: ${titulo}`,
      {
        targetUserId: userId,
        tipo,
        titulo,
        mensaje
      },
      'exitoso',
      undefined,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Notificación enviada exitosamente',
      data: {
        id: notification._id,
        titulo: notification.titulo
      }
    });
  }
);