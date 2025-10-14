import express from 'express';
import { Request, Response } from 'express';
import { AIConversation, AIMessage, AIUsageLimit, ExcludedTerm } from '../models';
import AIAssistantService from '../services/aiAssistantService';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    nombres: string;
    email: string;
  };
}

// Rutas para usuarios (socios)
router.use(authenticate);

// Obtener conversaciones del usuario
router.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const { limit = '20', offset = '0' } = req.query;
    const conversations = await AIAssistantService.getUserConversations(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    // Para cada conversación, obtener el último mensaje
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await AIMessage.findOne({
          conversationId: (conv.id as string)
        }).sort({ createdAt: -1 });

        return {
          id: (conv.id as string),
          title: conv.title,
          lastMessageAt: conv.lastMessageAt,
          messageCount: conv.messageCount,
          lastMessage: lastMessage?.content?.substring(0, 100) || null,
          isHighlighted: conv.isHighlighted || false
        };
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithLastMessage
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener mensajes de una conversación con paginación
router.get('/conversations/:conversationId/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    // Verificar que la conversación pertenece al usuario
    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId 
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversación no encontrada' });
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Obtener mensajes con paginación - los más recientes primero, luego aplicar offset
    const totalMessages = await AIMessage.countDocuments({ conversationId });
    
    const messages = await AIMessage.find({ conversationId })
      .sort({ createdAt: -1 }) // Orden descendente para obtener los más recientes
      .skip(offsetNum)
      .limit(limitNum);

    // Revertir el orden para mostrar cronológicamente
    const reversedMessages = messages.reverse();

    res.json({
      success: true,
      conversation: {
        id: (conversation._id as any).toString(),
        title: conversation.title,
        createdAt: (conversation as any).createdAt
      },
      messages: reversedMessages.map(msg => ({
        id: (msg._id as any).toString(),
        role: msg.role,
        content: msg.content,
        createdAt: (msg as any).createdAt,
        tokens: msg.tokens,
        processingTime: msg.processingTime
      })),
      pagination: {
        total: totalMessages,
        limit: limitNum,
        offset: offsetNum,
        hasMore: (offsetNum + limitNum) < totalMessages
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Eliminar conversación del usuario
router.delete('/conversations/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const result = await AIAssistantService.deleteUserConversation(userId, conversationId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    if (error instanceof Error && error.message.includes('sin acceso')) {
      res.status(403).json({ success: false, error: 'Sin acceso a esta conversación' });
    } else {
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
});

// Actualizar título de conversación (PUT)
router.put('/conversations/:conversationId/title', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Título requerido' });
    }

    const result = await AIAssistantService.updateConversationTitle(userId, conversationId, title);
    res.json({ success: true, conversation: result });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    if (error instanceof Error && error.message.includes('sin acceso')) {
      res.status(403).json({ success: false, error: 'Sin acceso a esta conversación' });
    } else {
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
});

// Actualizar título de conversación (PATCH) - Para compatibilidad con frontend
router.patch('/conversations/:conversationId/title', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Título requerido' });
    }

    // Verificar que la conversación pertenece al usuario
    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversación no encontrada' });
    }

    conversation.title = title.trim();
    await conversation.save();

    res.json({
      success: true,
      conversation: {
        id: (conversation._id as any).toString(),
        title: conversation.title
      }
    });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Destacar/quitar destaque de conversación (PATCH)
router.patch('/conversations/:conversationId/highlight', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { isHighlighted } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    if (typeof isHighlighted !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isHighlighted debe ser un valor booleano' });
    }

    // Verificar que la conversación pertenece al usuario
    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversación no encontrada' });
    }

    conversation.isHighlighted = isHighlighted;
    await conversation.save();

    res.json({
      success: true,
      conversation: {
        id: (conversation._id as any).toString(),
        title: conversation.title,
        isHighlighted: conversation.isHighlighted
      }
    });
  } catch (error) {
    console.error('Error updating conversation highlight:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Enviar mensaje al asistente
router.post('/send-message', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId, message, conversationTitle } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mensaje requerido' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Mensaje demasiado largo (máximo 1000 caracteres)' });
    }

    const response = await AIAssistantService.sendMessage({
      conversationId,
      message: message.trim(),
      userId,
      conversationTitle
    });

    if (!response.success) {
      return res.status(400).json(response);
    }

    res.json(response);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Crear nueva conversación
router.post('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const conversation = await AIConversation.create({
      userId,
      title: title || 'Nueva conversación',
      isActive: true,
      lastMessageAt: new Date(),
      messageCount: 0
    });

    res.json({
      success: true,
      conversation: {
        id: (conversation._id as any).toString(),
        title: conversation.title,
        createdAt: (conversation as any).createdAt
      }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Actualizar título de conversación
router.put('/conversations/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId 
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversación no encontrada' });
    }

    conversation.title = title;
    await conversation.save();

    res.json({
      success: true,
      conversation: {
        id: (conversation._id as any).toString(),
        title: conversation.title
      }
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Eliminar conversación
router.delete('/conversations/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const conversation = await AIConversation.findOne({
      _id: conversationId,
      userId 
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversación no encontrada' });
    }

    // Marcar como inactiva en lugar de eliminar
    conversation.isActive = false;
    await conversation.save();

    res.json({ success: true, message: 'Conversación eliminada' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener límites de uso del usuario
router.get('/usage-limits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const limits = await AIAssistantService.checkUsageLimits(userId);
    
    res.json({
      success: true,
      limits: {
        canSend: limits.canSend,
        daily: {
          used: limits.dailyUsed,
          limit: limits.dailyLimit,
          remaining: limits.dailyLimit - limits.dailyUsed
        },
        monthly: {
          used: limits.monthlyUsed,
          limit: limits.monthlyLimit,
          remaining: limits.monthlyLimit - limits.monthlyUsed
        }
      }
    });
  } catch (error) {
    console.error('Error fetching usage limits:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener términos excluidos (para todos los usuarios autenticados)
router.get('/excluded-terms', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const terms = await ExcludedTerm.find({ isActive: true }).select('term reason isActive createdAt');

  res.json({
    success: true,
    terms: terms.map(term => ({
      id: term._id,
      term: term.term,
      reason: term.reason,
      isActive: term.isActive,
      createdAt: term.createdAt
    }))
  });
}));

// Rutas para administradores
router.use(authorize('admin', 'super_admin'));

// Obtener configuración del asistente
router.get('/admin/config', async (req: Request, res: Response) => {
  try {
    const config = await AIAssistantService.getConfig();
    
    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    }

    // No enviar la API key en la respuesta
    const configObj = config.toObject();
    const { apiKey, ...configWithoutApiKey } = configObj;
    
    res.json({
      success: true,
      config: {
        ...configWithoutApiKey,
        hasApiKey: !!apiKey
      }
    });
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Actualizar configuración del asistente
router.put('/admin/config', async (req: Request, res: Response) => {
  try {
    const {
      systemPrompt,
      isActive,
      dailyLimit,
      monthlyLimit,
      maxTokensPerMessage,
      temperature,
      aiProvider,
      apiKey,
      model
    } = req.body;

    const updateData: any = {};

    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit;
    if (monthlyLimit !== undefined) updateData.monthlyLimit = monthlyLimit;
    if (maxTokensPerMessage !== undefined) updateData.maxTokensPerMessage = maxTokensPerMessage;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (aiProvider !== undefined) updateData.aiProvider = aiProvider;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (model !== undefined) updateData.aiModel = model;

    await AIAssistantService.updateConfig(updateData);

    // Reinicializar el servicio para aplicar cambios
    await AIAssistantService.reinitialize();

    res.json({ success: true, message: 'Configuración actualizada y servicio reinicializado exitosamente' });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de uso
router.get('/admin/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await AIAssistantService.getUsageStats(
      startDate as string, 
      endDate as string
    );

    // Estadísticas adicionales
    const totalConversations = await AIConversation.countDocuments({
      isActive: true
    });

    const totalMessages = await AIMessage.countDocuments();

    const activeUsersToday = await AIUsageLimit.countDocuments({
      date: new Date().toISOString().split('T')[0],
      dailyMessages: { $gt: 0 }
    });

    res.json({
      success: true,
      stats: {
        daily: stats,
        summary: {
          totalConversations,
          totalMessages,
          activeUsersToday
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AI stats:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Endpoint para reinicializar el servicio (fuerza recarga del prompt)
router.post('/admin/reinitialize', async (req: Request, res: Response) => {
  try {
    await AIAssistantService.reinitialize();
    res.json({ 
      success: true, 
      message: 'Servicio de asistente virtual reinicializado correctamente' 
    });
  } catch (error) {
    console.error('Error reinitializing AI service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al reinicializar el servicio' 
    });
  }
});

// ===============================
// RUTAS PARA TÉRMINOS EXCLUIDOS
// ===============================


// Validar un mensaje contra términos excluidos
router.post('/validate-message', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Mensaje requerido'
    });
  }

  const validation = await (ExcludedTerm as any).validateMessage(message);

  res.json({
    success: true,
    validation: {
      isValid: validation.isValid,
      error: validation.error,
      foundTerm: validation.foundTerm ? {
        id: validation.foundTerm._id,
        term: validation.foundTerm.term,
        reason: validation.foundTerm.reason
      } : undefined
    }
  });
}));

// ==============================
// RUTAS DE ADMINISTRACIÓN
// ==============================

// Obtener todos los términos excluidos (admin)
router.get('/admin/excluded-terms', authorize('super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const terms = await ExcludedTerm.find({}).sort({ createdAt: -1 });

  res.json({
    success: true,
    terms: terms.map(term => ({
      id: term._id,
      term: term.term,
      reason: term.reason,
      isActive: term.isActive,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt
    }))
  });
}));

// Crear nuevo término excluido (admin)
router.post('/admin/excluded-terms', authorize('super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { term, reason } = req.body;

  if (!term || typeof term !== 'string' || term.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Término es requerido'
    });
  }

  if (term.trim().length > 200) {
    return res.status(400).json({
      success: false,
      message: 'El término no puede exceder 200 caracteres'
    });
  }

  if (reason && reason.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'La razón no puede exceder 500 caracteres'
    });
  }

  try {
    const newTerm = new ExcludedTerm({
      term: term.trim(),
      reason: reason?.trim() || undefined,
      isActive: true
    });

    await newTerm.save();

    const termData = {
      id: newTerm._id,
      term: newTerm.term,
      reason: newTerm.reason,
      isActive: newTerm.isActive,
      createdAt: newTerm.createdAt,
      updatedAt: newTerm.updatedAt
    };

    // Broadcast en tiempo real a todos los usuarios
    if (global.socketManager) {
      global.socketManager.broadcastExcludedTermAdded(termData);
    }

    res.status(201).json({
      success: true,
      message: 'Término excluido creado exitosamente',
      term: termData
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Este término ya existe'
      });
    }
    throw error;
  }
}));

// Actualizar término excluido (admin)
router.put('/admin/excluded-terms/:id', authorize('super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { term, reason } = req.body;

  if (!term || typeof term !== 'string' || term.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Término es requerido'
    });
  }

  if (term.trim().length > 200) {
    return res.status(400).json({
      success: false,
      message: 'El término no puede exceder 200 caracteres'
    });
  }

  if (reason && reason.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'La razón no puede exceder 500 caracteres'
    });
  }

  try {
    const updatedTerm = await ExcludedTerm.findByIdAndUpdate(
      id,
      {
        term: term.trim(),
        reason: reason?.trim() || undefined
      },
      { new: true, runValidators: true }
    );

    if (!updatedTerm) {
      return res.status(404).json({
        success: false,
        message: 'Término no encontrado'
      });
    }

    const termData = {
      id: updatedTerm._id,
      term: updatedTerm.term,
      reason: updatedTerm.reason,
      isActive: updatedTerm.isActive,
      createdAt: updatedTerm.createdAt,
      updatedAt: updatedTerm.updatedAt
    };

    // Broadcast en tiempo real a todos los usuarios
    if (global.socketManager) {
      global.socketManager.broadcastExcludedTermUpdate(termData);
    }

    res.json({
      success: true,
      message: 'Término actualizado exitosamente',
      term: termData
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Este término ya existe'
      });
    }
    throw error;
  }
}));

// Activar/Desactivar término excluido (admin)
router.patch('/admin/excluded-terms/:id/toggle', authorize('super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isActive debe ser un valor booleano'
    });
  }

  const updatedTerm = await ExcludedTerm.findByIdAndUpdate(
    id,
    { isActive },
    { new: true }
  );

  if (!updatedTerm) {
    return res.status(404).json({
      success: false,
      message: 'Término no encontrado'
    });
  }

  const termData = {
    id: updatedTerm._id,
    term: updatedTerm.term,
    reason: updatedTerm.reason,
    isActive: updatedTerm.isActive,
    createdAt: updatedTerm.createdAt,
    updatedAt: updatedTerm.updatedAt
  };

  // Broadcast en tiempo real a todos los usuarios
  if (global.socketManager) {
    global.socketManager.broadcastExcludedTermToggled(termData);
  }

  res.json({
    success: true,
    message: `Término ${isActive ? 'activado' : 'desactivado'} exitosamente`,
    term: termData
  });
}));

// Eliminar término excluido (admin)
router.delete('/admin/excluded-terms/:id', authorize('super_admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const deletedTerm = await ExcludedTerm.findByIdAndDelete(id);

  if (!deletedTerm) {
    return res.status(404).json({
      success: false,
      message: 'Término no encontrado'
    });
  }

  // Broadcast en tiempo real a todos los usuarios
  if (global.socketManager) {
    global.socketManager.broadcastExcludedTermRemoved(id);
  }

  res.json({
    success: true,
    message: 'Término eliminado exitosamente'
  });
}));

export default router;