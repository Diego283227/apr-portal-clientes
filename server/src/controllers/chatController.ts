import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { Message, Conversation, IMessage, IConversation } from "../models/Chat";
import { User } from "../models";
import { createAuditLog } from "./auditController";

// Get all conversations (Admin only)
export const getAllConversations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("getAllConversations called");
    console.log("User from request:", req.user);
    const { page = 1, limit = 10, status = "all", search = "" } = req.query;

    const query: any = {};
    if (status !== "all") {
      query.status = status;
    }

    // Search filter by socio name
    if (search) {
      query.socioName = { $regex: search, $options: "i" };
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageTime: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Conversation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  }
);

// Get or create conversation for socio
export const getOrCreateConversation = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("getOrCreateConversation called");
    const user = req.user!;
    console.log("User from request:", user);

    let conversation = await Conversation.findOne({ socioId: user.id });

    // If conversation exists but is closed, reopen it
    if (conversation && conversation.status === "closed") {
      console.log("🔄 Reopening closed conversation for socio:", user.id);

      // Reopen the conversation
      conversation.status = "active";
      conversation.adminId = undefined;
      conversation.adminName = undefined;
      conversation.unreadCount = { socio: 0, admin: 0 };
      await conversation.save();

      // Create reopened message
      const reopenedMessage = new Message({
        conversationId: (conversation._id as any).toString(),
        senderId: "system",
        senderType: "super_admin",
        senderName: "Sistema",
        content:
          "🔄 Conversación reiniciada. Un administrador te atenderá pronto.",
        messageType: "system",
        read: false,
      });
      await reopenedMessage.save();

      // Update conversation with new message
      conversation.lastMessage = reopenedMessage.content;
      conversation.lastMessageTime = reopenedMessage.timestamp;
      await conversation.save();

      // Create audit log for reopening
      await createAuditLog(
        {
          id: user.id,
          tipo: "socio",
          nombre: `${user.nombres} ${user.apellidos}`,
          identificador: (user as any).rut,
        },
        "reiniciar_chat",
        "comunicacion",
        "Conversación de chat reiniciada",
        { conversationId: (conversation._id as any).toString() },
        "exitoso",
        undefined,
        req
      );

      // Emit conversation update via Socket.IO
      if (global.socketManager) {
        global.socketManager.emitConversationUpdate(
          (conversation._id as any).toString(),
          conversation
        );
      }
    }

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        socioId: user.id,
        socioName: `${user.nombres} ${user.apellidos}`,
        status: "active",
        unreadCount: { socio: 0, admin: 0 },
      });
      await conversation.save();

      // Create welcome message
      const welcomeMessage = new Message({
        conversationId: (conversation._id as any).toString(),
        senderId: "system",
        senderType: "super_admin",
        senderName: "Sistema",
        content:
          "¡Bienvenido al chat de soporte! Un administrador te atenderá pronto.",
        messageType: "system",
        read: false,
      });
      await welcomeMessage.save();

      // Update conversation
      conversation.lastMessage = welcomeMessage.content;
      conversation.lastMessageTime = welcomeMessage.timestamp;
      await conversation.save();

      await createAuditLog(
        {
          id: user.id,
          tipo: "socio",
          nombre: `${user.nombres} ${user.apellidos}`,
          identificador: (user as any).rut,
        },
        "iniciar_chat",
        "comunicacion",
        "Nueva conversación de chat iniciada",
        { conversationId: (conversation._id as any).toString() },
        "exitoso",
        undefined,
        req
      );
    }

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  }
);

// Get conversation details
export const getConversation = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { conversationId } = req.params;
    const user = req.user!;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError("Conversación no encontrada", 404));
    }

    // Check permissions
    const isAdmin = user.role === "super_admin";
    const isSocioOwner =
      user.role === "socio" && conversation.socioId === user.id;

    if (!isAdmin && !isSocioOwner) {
      return next(new AppError("No tienes acceso a esta conversación", 403));
    }

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  }
);

// Get messages for conversation
export const getMessages = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const user = req.user!;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError("Conversación no encontrada", 404));
    }

    // Check permissions
    const isAdmin = user.role === "super_admin";
    const isSocioOwner =
      user.role === "socio" && conversation.socioId === user.id;

    if (!isAdmin && !isSocioOwner) {
      return next(new AppError("No tienes acceso a esta conversación", 403));
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Message.countDocuments({ conversationId });

    // Mark messages as read for the requesting user
    const userType = user.role === "super_admin" ? "admin" : "socio";

    // Update unread count
    if (userType === "admin") {
      await Conversation.findByIdAndUpdate(conversationId, {
        "unreadCount.admin": 0,
      });
    } else {
      await Conversation.findByIdAndUpdate(conversationId, {
        "unreadCount.socio": 0,
      });
    }

    // Mark unread messages as read
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: user.id },
        read: false,
      },
      { read: true }
    );

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  }
);

// Send message
export const sendMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { conversationId } = req.params;
    const { content, replyTo, forwarded, originalSender } = req.body;
    const user = req.user!;

    if (!content || content.trim().length === 0) {
      return next(new AppError("El mensaje no puede estar vacío", 400));
    }

    if (content.length > 1000) {
      return next(
        new AppError(
          "El mensaje es demasiado largo (máximo 1000 caracteres)",
          400
        )
      );
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError("Conversación no encontrada", 404));
    }

    // Check permissions
    const isAdmin = user.role === "super_admin";
    const isSocioOwner =
      user.role === "socio" && conversation.socioId === user.id;

    if (!isAdmin && !isSocioOwner) {
      return next(new AppError("No tienes acceso a esta conversación", 403));
    }

    // Create message
    const messageData: any = {
      conversationId,
      senderId: user.id,
      senderType: user.role === "super_admin" ? "super_admin" : "socio",
      senderName: `${user.nombres} ${user.apellidos}`,
      content: content.trim(),
      read: false,
    };

    // Add replyTo data if provided
    if (replyTo) {
      messageData.replyTo = {
        messageId: replyTo.messageId,
        content: replyTo.content,
        senderName: replyTo.senderName,
        senderType: replyTo.senderType,
      };
      console.log("📤 Message includes replyTo:", messageData.replyTo);
    }

    // Add forwarded data if provided
    if (forwarded) {
      messageData.forwarded = true;
      if (originalSender) {
        messageData.originalSender = originalSender;
      }
      console.log("📤 Message is forwarded from:", originalSender);
    }

    const message = new Message(messageData);

    await message.save();

    // Emit real-time message via Socket.IO
    console.log("📤 Attempting to emit message via Socket.IO");
    console.log("📤 Global socketManager available:", !!global.socketManager);
    if (global.socketManager) {
      const messageToEmit = {
        ...message.toObject(),
        _id: (message._id as any).toString(),
      };
      console.log("📤 Emitting message:", messageToEmit);
      global.socketManager.emitNewMessage(conversationId, messageToEmit);
      console.log("📤 Message emission completed");
    } else {
      console.log("❌ No global socketManager available for message emission");
    }

    // Update conversation
    const updateData: any = {
      lastMessage: content.trim().substring(0, 200),
      lastMessageTime: message.timestamp,
      status: "active",
    };

    // Update unread count for the other party
    if (user.role === "super_admin") {
      updateData["$inc"] = { "unreadCount.socio": 1 };
      updateData.adminId = user.id;
      updateData.adminName = `${user.nombres} ${user.apellidos}`;
    } else {
      updateData["$inc"] = { "unreadCount.admin": 1 };
    }

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      updateData,
      { new: true }
    );

    // Emit conversation update via Socket.IO
    if (global.socketManager) {
      global.socketManager.emitConversationUpdate(
        conversationId,
        updatedConversation
      );
    }

    // ALWAYS create in-app notification for the recipient
    try {
      const senderName = `${user.nombres} ${user.apellidos}`;

      if (user.role === "super_admin") {
        // Admin sending to socio - create notification for socio
        const recipientId = conversation.socioId;
        console.log(`🔔 Admin sending message to socio ${recipientId}`);

        // Create in-app notification for socio
        const { createNotification } = await import("./notificationController");
        await createNotification(recipientId, {
          tipo: "mensaje",
          titulo: "Nuevo mensaje de administrador",
          mensaje: `${senderName} te ha enviado un mensaje: "${content
            .trim()
            .substring(0, 100)}${content.trim().length > 100 ? "..." : ""}"`,
          referencia: {
            tipo: "mensaje",
            id: (message._id as any).toString(),
          },
          metadatos: {
            conversationId: conversationId,
            messageId: (message._id as any).toString(),
            senderName: senderName,
            senderRole: user.role,
            senderId: user.id,
          },
        });

        console.log(`📧 Notification created for socio: ${recipientId}`);
      } else {
        // Socio sending to admin - create notifications for all admins
        console.log(`🔔 Socio sending message from: ${senderName}`);

        // Find all super_admin users to notify (both in User and SuperAdmin tables)
        const userAdmins = await User.find({
          role: "super_admin",
          activo: true,
        }).select("_id nombres apellidos");
        const superAdmins = await import("../models").then((models) =>
          models.SuperAdmin.find({ activo: true }).select(
            "_id nombres apellidos"
          )
        );

        const allAdmins = [...userAdmins, ...superAdmins];
        console.log(
          `🔍 Found ${userAdmins.length} user admins and ${superAdmins.length} super admins`
        );

        for (const admin of allAdmins) {
          const { createNotification } = await import(
            "./notificationController"
          );
          await createNotification((admin._id as any).toString(), {
            tipo: "mensaje",
            titulo: "Nuevo mensaje de socio",
            mensaje: `${senderName} te ha enviado un mensaje: "${content
              .trim()
              .substring(0, 100)}${content.trim().length > 100 ? "..." : ""}"`,
            referencia: {
              tipo: "mensaje",
              id: (message._id as any).toString(),
            },
            metadatos: {
              conversationId: conversationId,
              messageId: (message._id as any).toString(),
              senderName: senderName,
              senderRole: user.role,
              senderId: user.id,
              socioId: user.id,
            },
          });

          console.log(
            `📧 Notification created for admin: ${admin.nombres} ${admin.apellidos} (ID: ${admin._id})`
          );
        }

        console.log(
          `📧 Notifications created for ${allAdmins.length} total admins`
        );
      }
    } catch (notificationError) {
      console.error("Error creating chat notification:", notificationError);
      // Don't fail the message sending if notification fails
    }

    // Create audit log
    await createAuditLog(
      {
        id: user.id,
        tipo: user.role === "super_admin" ? "super_admin" : "socio",
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: (user as any).username || (user as any).rut || "",
      },
      "enviar_mensaje",
      "comunicacion",
      `Mensaje enviado en chat`,
      {
        conversationId,
        messageLength: content.trim().length,
        recipientType: user.role === "super_admin" ? "socio" : "admin",
      },
      "exitoso",
      undefined,
      req
    );

    res.status(201).json({
      success: true,
      message: "Mensaje enviado correctamente",
      data: { message },
    });
  }
);

// Close conversation (Admin only)
export const closeConversation = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { conversationId } = req.params;
    const user = req.user!;

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        status: "closed",
        adminId: user.id,
        adminName: `${user.nombres} ${user.apellidos}`,
      },
      { new: true }
    );

    if (!conversation) {
      return next(new AppError("Conversación no encontrada", 404));
    }

    // Add system message about closing
    const systemMessage = new Message({
      conversationId,
      senderId: user.id,
      senderType: "super_admin",
      senderName: "Sistema",
      content: `Conversación cerrada por ${user.nombres} ${user.apellidos}`,
      messageType: "system",
      read: false,
    });

    await systemMessage.save();

    // Emit conversation closed via Socket.IO
    if (global.socketManager) {
      global.socketManager.emitConversationClosed(conversationId, conversation);
    }

    await createAuditLog(
      {
        id: user.id,
        tipo: "super_admin",
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: (user as any).username || "",
      },
      "cerrar_chat",
      "comunicacion",
      `Conversación cerrada`,
      { conversationId, socioName: conversation.socioName },
      "exitoso",
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: "Conversación cerrada correctamente",
      data: { conversation },
    });
  }
);

// Get chat statistics (Admin only)
export const getChatStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const totalConversations = await Conversation.countDocuments();
    const activeConversations = await Conversation.countDocuments({
      status: "active",
    });
    const closedConversations = await Conversation.countDocuments({
      status: "closed",
    });

    const totalMessages = await Message.countDocuments();
    const unreadMessages = await Conversation.aggregate([
      { $group: { _id: null, total: { $sum: "$unreadCount.admin" } } },
    ]);

    const recentConversations = await Conversation.find({ status: "active" })
      .sort({ lastMessageTime: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalConversations,
        activeConversations,
        closedConversations,
        totalMessages,
        unreadMessages: unreadMessages[0]?.total || 0,
        recentConversations,
      },
    });
  }
);

// Edit message
export const editMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const user = req.user!;

    if (!content || content.trim().length === 0) {
      return next(new AppError("El mensaje no puede estar vacío", 400));
    }

    if (content.length > 1000) {
      return next(
        new AppError(
          "El mensaje es demasiado largo (máximo 1000 caracteres)",
          400
        )
      );
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return next(new AppError("Mensaje no encontrado", 404));
    }

    // Check permissions
    const isAdmin = user.role === "super_admin";
    const isOwner = message.senderId === user.id;

    if (!isOwner && !isAdmin) {
      return next(
        new AppError("No tienes permisos para editar este mensaje", 403)
      );
    }

    // Don't allow editing system messages
    if (message.messageType === "system") {
      return next(
        new AppError("No se pueden editar mensajes del sistema", 400)
      );
    }

    // Update message
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    // Create audit log
    await createAuditLog(
      {
        id: user.id,
        tipo: user.role === "super_admin" ? "super_admin" : "socio",
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: (user as any).username || (user as any).rut || "",
      },
      "editar_mensaje",
      "comunicacion",
      `Mensaje editado en chat`,
      {
        messageId,
        originalContent: message.content,
        newContent: content.trim(),
      },
      "exitoso",
      undefined,
      req
    );

    console.log(`💬 Message edited by ${user.role} (${user.id}): ${messageId}`);

    res.status(200).json({
      success: true,
      message: "Mensaje editado correctamente",
      data: { message },
    });
  }
);

// Delete message
export const deleteMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { messageId } = req.params;
    const user = req.user!;

    const message = await Message.findById(messageId);
    if (!message) {
      return next(new AppError("Mensaje no encontrado", 404));
    }

    // Check permissions
    const isAdmin = user.role === "super_admin";
    const isOwner = message.senderId === user.id;

    if (!isOwner && !isAdmin) {
      return next(
        new AppError("No tienes permisos para eliminar este mensaje", 403)
      );
    }

    // Don't allow deleting system messages
    if (message.messageType === "system") {
      return next(
        new AppError("No se pueden eliminar mensajes del sistema", 400)
      );
    }

    // Get conversation to update last message if needed
    const conversation = await Conversation.findById(message.conversationId);

    // Create audit log before deletion
    await createAuditLog(
      {
        id: user.id,
        tipo: user.role === "super_admin" ? "super_admin" : "socio",
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: (user as any).username || (user as any).rut || "",
      },
      "eliminar_mensaje",
      "comunicacion",
      `Mensaje eliminado en chat`,
      {
        messageId,
        deletedContent: message.content,
        messageType: message.messageType,
      },
      "exitoso",
      undefined,
      req
    );

    // Delete message
    await Message.findByIdAndDelete(messageId);

    // Update conversation's last message if the deleted message was the last one
    if (conversation) {
      const lastMessage = await Message.findOne({
        conversationId: conversation._id,
      }).sort({ timestamp: -1 });

      if (lastMessage) {
        conversation.lastMessage = lastMessage.content;
        conversation.lastMessageTime = lastMessage.timestamp;
      } else {
        // If no messages left, clear last message
        conversation.lastMessage = undefined;
        conversation.lastMessageTime = undefined;
      }

      await conversation.save();
    }

    console.log(
      `🗑️ Message deleted by ${user.role} (${user.id}): ${messageId}`
    );

    res.status(200).json({
      success: true,
      message: "Mensaje eliminado correctamente",
    });
  }
);

// Clear all messages from a conversation (Admin only)
export const clearConversationMessages = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { conversationId } = req.params;
    const user = req.user!;

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError("Conversación no encontrada", 404));
    }

    // Create audit log before deletion
    await createAuditLog(
      {
        id: user.id,
        tipo: "super_admin",
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: (user as any).username || "",
      },
      "vaciar_chat",
      "comunicacion",
      `Todos los mensajes eliminados de la conversación con ${conversation.socioName}`,
      {
        conversationId,
        socioId: conversation.socioId,
        socioName: conversation.socioName,
      },
      "exitoso",
      undefined,
      req
    );

    // Delete all messages from this conversation
    const deleteResult = await Message.deleteMany({ conversationId });
    console.log(
      `🗑️ Cleared ${deleteResult.deletedCount} messages from conversation ${conversationId} by admin (${user.id})`
    );

    // Clear conversation's last message info
    conversation.lastMessage = undefined;
    conversation.lastMessageTime = undefined;
    conversation.unreadCount = { socio: 0, admin: 0 };
    await conversation.save();

    // Emit update via Socket.IO if available
    if (global.socketManager) {
      global.socketManager.emitConversationUpdate(conversationId, conversation);
    }

    res.status(200).json({
      success: true,
      message: "Chat vaciado correctamente",
      data: {
        deletedCount: deleteResult.deletedCount,
      },
    });
  }
);

// Send broadcast message to all socios (Admin only)
export const sendBroadcastMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { content } = req.body;
    const user = req.user!;

    if (!content || !content.trim()) {
      return next(new AppError("El mensaje no puede estar vacío", 400));
    }

    // Get all active socio users
    const socios = await User.find({ tipo: "socio", estado: "activo" });

    if (socios.length === 0) {
      return next(new AppError("No hay socios activos en el sistema", 404));
    }

    let sentCount = 0;
    const failedSocios: string[] = [];

    // Send message to each socio
    for (const socio of socios) {
      try {
        // Get or create conversation for this socio
        let conversation = await Conversation.findOne({
          socioId: (socio._id as any).toString(),
        });

        if (!conversation) {
          // Create new conversation
          conversation = new Conversation({
            socioId: (socio._id as any).toString(),
            socioName: `${socio.nombres} ${socio.apellidos}`,
            status: "active",
            unreadCount: { socio: 0, admin: 0 },
          });
          await conversation.save();
        }

        // Create the message
        const message = new Message({
          conversationId: (conversation._id as any).toString(),
          senderId: user.id,
          senderType: "super_admin",
          senderName: `${user.nombres} ${user.apellidos}`,
          content: content.trim(),
          messageType: "text",
          read: false,
        });

        await message.save();

        // Update conversation
        conversation.lastMessage = message.content;
        conversation.lastMessageTime = message.timestamp;
        conversation.unreadCount.socio += 1;
        await conversation.save();

        // Emit via Socket.IO if available
        if (global.socketManager) {
          global.socketManager.emitNewMessage(
            (conversation._id as any).toString(),
            message
          );
          global.socketManager.emitConversationUpdate(
            (conversation._id as any).toString(),
            conversation
          );
        }

        sentCount++;
      } catch (error) {
        console.error(
          `Error sending message to socio ${socio._id as any}:`,
          error
        );
        failedSocios.push(`${socio.nombres} ${socio.apellidos}`);
      }
    }

    // Create audit log
    await createAuditLog(
      {
        id: user.id,
        tipo: "super_admin",
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: (user as any).username || "",
      },
      "mensaje_global",
      "comunicacion",
      `Mensaje global enviado a ${sentCount} socios`,
      {
        content: content.trim(),
        sentCount,
        totalSocios: socios.length,
        failedCount: failedSocios.length,
        failedSocios,
      },
      "exitoso",
      undefined,
      req
    );

    console.log(
      `📢 Broadcast message sent to ${sentCount}/${socios.length} socios by admin (${user.id})`
    );

    res.status(200).json({
      success: true,
      message: `Mensaje enviado correctamente a ${sentCount} socios`,
      data: {
        sentCount,
        totalSocios: socios.length,
        failedCount: failedSocios.length,
        failedSocios: failedSocios.length > 0 ? failedSocios : undefined,
      },
    });
  }
);
