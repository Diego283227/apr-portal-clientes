import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import Notification from '../models/Notification';
import mongoose from 'mongoose';

const router = Router();

// Protect all routes - require authentication
router.use(authenticate);

// Simple counts endpoint that queries the database
router.get('/counts', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Count total notifications
    const total = await Notification.countDocuments({ userId });
    
    // Count unread notifications
    const unread = await Notification.countDocuments({ 
      userId, 
      leida: false 
    });
    
    // Count by type
    const boletas = await Notification.countDocuments({ 
      userId, 
      tipo: 'boleta' 
    });
    
    const mensajes = await Notification.countDocuments({ 
      userId, 
      tipo: 'mensaje' 
    });
    
    const sms = await Notification.countDocuments({ 
      userId, 
      tipo: 'sms' 
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        unread,
        boletas,
        mensajes,
        sms
      }
    });
  } catch (error) {
    console.error('Error in notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Simple notifications list endpoint
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get notifications
    const notifications = await Notification.find({ userId })
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Notification.countDocuments({ userId });
    const pages = Math.ceil(total / limit);

    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      leida: false 
    });

    // Format notifications
    const formattedNotifications = notifications.map(notification => ({
      id: (notification._id as any).toString(),
      tipo: notification.tipo,
      titulo: notification.titulo,
      mensaje: notification.mensaje,
      leida: notification.leida,
      fechaCreacion: notification.fechaCreacion,
      referencia: notification.referencia,
      metadatos: notification.metadatos
    }));

    res.status(200).json({
      success: true,
      data: {
        notifications: formattedNotifications,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error in notifications list:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { leida: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: (notification._id as any).toString(),
        leida: notification.leida
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, leida: false },
      { leida: true }
    );

    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Create test notification (temporary endpoint for testing)
router.post('/test', async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Create a test notification
    const notification = new Notification({
      userId: userId,
      tipo: 'mensaje',
      titulo: 'Nuevo mensaje de chat de prueba',
      mensaje: `Admin te ha enviado un mensaje: "Esta es una notificación de prueba para el chat - ${new Date().toLocaleString()}"`,
      leida: false,
      referencia: {
        tipo: 'mensaje',
        id: '507f1f77bcf86cd799439011' // dummy ObjectId
      },
      metadatos: {
        conversationId: 'test-conversation',
        senderName: 'Admin Prueba',
        senderRole: 'admin'
      }
    });

    await notification.save();

    // Send real-time notification via Socket.IO
    if (global.socketManager) {
      global.socketManager.sendNotificationToUser(userId, {
        id: (notification._id as any).toString(),
        tipo: notification.tipo,
        titulo: notification.titulo,
        mensaje: notification.mensaje,
        leida: notification.leida,
        fechaCreacion: notification.fechaCreacion
      });
    }

    console.log(`🔔 Test notification created for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Notificación de prueba creada exitosamente',
      data: {
        id: (notification._id as any).toString(),
        tipo: notification.tipo,
        titulo: notification.titulo,
        mensaje: notification.mensaje,
        leida: notification.leida,
        fechaCreacion: notification.fechaCreacion
      }
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Create chat notification endpoint (for internal use by chat controller)
router.post('/chat-message', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { recipientId, senderName, messageContent, conversationId, messageId } = req.body;

    if (!recipientId || !senderName || !messageContent) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    // Create notification for chat message
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(recipientId),
      tipo: 'mensaje',
      titulo: 'Nuevo mensaje de chat',
      mensaje: `${senderName} te ha enviado un mensaje: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`,
      leida: false,
      referencia: {
        tipo: 'mensaje',
        id: messageId ? new mongoose.Types.ObjectId(messageId) : new mongoose.Types.ObjectId()
      },
      metadatos: {
        conversationId: conversationId,
        messageId: messageId,
        senderName: senderName,
        senderRole: req.user.role
      }
    });

    await notification.save();

    // Send real-time notification via Socket.IO
    if (global.socketManager) {
      global.socketManager.sendNotificationToUser(recipientId, {
        id: (notification._id as any).toString(),
        tipo: notification.tipo,
        titulo: notification.titulo,
        mensaje: notification.mensaje,
        leida: notification.leida,
        fechaCreacion: notification.fechaCreacion
      });
    }

    console.log(`🔔 Chat notification created for user ${recipientId} from ${senderName}`);

    res.status(201).json({
      success: true,
      message: 'Notificación de chat creada exitosamente',
      data: {
        id: (notification._id as any).toString(),
        tipo: notification.tipo,
        titulo: notification.titulo,
        mensaje: notification.mensaje,
        leida: notification.leida,
        fechaCreacion: notification.fechaCreacion
      }
    });
  } catch (error) {
    console.error('Error creating chat notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;