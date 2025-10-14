import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, SuperAdmin } from '../models';
import type { JWTPayload, UserRole } from '../types';

interface AuthenticatedSocket {
  id: string;
  userId: string;
  userType: UserRole;
  userName: string;
}

interface SocketUser {
  id: string;
  name: string;
  role: UserRole;
  socketId: string;
  lastSeen: Date;
}

class SocketManager {
  private io: Server;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private socketToUser: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private async authenticateSocket(socket: any): Promise<AuthenticatedSocket | null> {
    try {
      console.log('🔍 Socket auth attempt - handshake.auth:', socket.handshake.auth);
      console.log('🔍 Socket auth attempt - headers.authorization:', socket.handshake.headers.authorization);
      
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.log('❌ Socket connection rejected: No token provided');
        return null;
      }
      
      console.log('🔍 Token received (first 20 chars):', token.substring(0, 20) + '...');

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        
        // Find user in database
        let user = await User.findById(decoded.userId);
        let userType: UserRole = 'socio';
        
        if (!user) {
          const superAdmin = await SuperAdmin.findById(decoded.userId);
          if (superAdmin) {
            user = superAdmin as any;
            userType = 'super_admin';
          }
        } else {
          userType = user.role as UserRole;
        }
        
        if (!user || !user.activo) {
          console.log('❌ Socket connection rejected: User not found or inactive');
          return null;
        }

        return {
          id: socket.id,
          userId: decoded.userId,
          userType,
          userName: `${user.nombres} ${user.apellidos}`
        };
      } catch (jwtError) {
        console.log('❌ JWT verification failed:', jwtError);
        return null;
      }
    } catch (error) {
      console.log('❌ Socket authentication failed:', error);
      return null;
    }
  }

  private setupSocketHandlers() {
    this.io.on('connection', async (socket) => {
      console.log('🔌 New socket connection attempt:', socket.id);
      console.log('🔌 Connection details:', {
        socketId: socket.id,
        handshakeAuth: socket.handshake.auth,
        hasToken: !!socket.handshake.auth.token,
        headers: socket.handshake.headers
      });

      // Authenticate the socket connection
      const authData = await this.authenticateSocket(socket);
      if (!authData) {
        console.log('❌ Socket authentication failed for:', socket.id);
        socket.emit('auth_error', { message: 'Authentication failed' });
        socket.disconnect(true);
        return;
      }

      console.log(`✅ Socket authenticated: ${authData.userName} (${authData.userType}) - UserId: ${authData.userId}`);

      // Store user connection
      const userData: SocketUser = {
        id: authData.userId,
        name: authData.userName,
        role: authData.userType,
        socketId: socket.id,
        lastSeen: new Date()
      };

      this.connectedUsers.set(authData.userId, userData);
      this.socketToUser.set(socket.id, authData.userId);

      console.log('👥 Current connected users after addition:', Array.from(this.connectedUsers.values()).map(u => `${u.name} (${u.role})`));

      // Join user-specific room
      socket.join(`user:${authData.userId}`);

      // Join role-specific rooms
      if (authData.userType === 'super_admin') {
        socket.join('admins');
        console.log('👑 Admin joined admins room');
      } else {
        socket.join('socios');
        console.log('👤 Socio joined socios room');
      }

      // Notify about user coming online
      this.broadcastUserPresence();

      // Handle joining conversation rooms
      socket.on('join_conversation', (conversationId: string) => {
        console.log(`👥 User ${authData.userName} joined conversation: ${conversationId}`);
        socket.join(`conversation:${conversationId}`);
        
        // Notify others in the conversation that user is active
        socket.to(`conversation:${conversationId}`).emit('user_active_in_conversation', {
          userId: authData.userId,
          userName: authData.userName,
          userType: authData.userType
        });
      });

      // Handle leaving conversation rooms
      socket.on('leave_conversation', (conversationId: string) => {
        console.log(`👋 User ${authData.userName} left conversation: ${conversationId}`);
        socket.leave(`conversation:${conversationId}`);
        
        socket.to(`conversation:${conversationId}`).emit('user_left_conversation', {
          userId: authData.userId,
          userName: authData.userName
        });
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId: authData.userId,
          userName: authData.userName,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
          userId: authData.userId,
          userName: authData.userName,
          isTyping: false
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${authData.userName}`);
        this.handleUserDisconnect(socket.id);
      });

      // Send initial online users list
      socket.emit('online_users', this.getOnlineUsersList());
    });
  }

  private handleUserDisconnect(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      this.connectedUsers.delete(userId);
      this.socketToUser.delete(socketId);
      this.broadcastUserPresence();
    }
  }

  private broadcastUserPresence() {
    const onlineUsers = this.getOnlineUsersList();
    console.log('📡 Broadcasting user presence update:', onlineUsers.map(u => `${u.name} (${u.role})`));
    this.io.emit('online_users', onlineUsers);
  }

  private getOnlineUsersList() {
    return Array.from(this.connectedUsers.values()).map(user => ({
      id: user.id,
      name: user.name,
      role: user.role,
      lastSeen: user.lastSeen
    }));
  }

  // Public methods for emitting events from controllers
  public emitNewMessage(conversationId: string, message: any) {
    console.log(`📨 Broadcasting new message to conversation: ${conversationId}`);
    this.io.to(`conversation:${conversationId}`).emit('new_message', message);
  }

  public emitConversationUpdate(conversationId: string, update: any) {
    console.log(`🔄 Broadcasting conversation update: ${conversationId}`);
    this.io.to(`conversation:${conversationId}`).emit('conversation_updated', update);
    
    // Also notify all admins about conversation changes
    this.io.to('admins').emit('conversation_list_updated', update);
  }

  public emitConversationClosed(conversationId: string, conversation: any) {
    console.log(`❌ Broadcasting conversation closed: ${conversationId}`);
    this.io.to(`conversation:${conversationId}`).emit('conversation_closed', conversation);
    this.io.to('admins').emit('conversation_list_updated', conversation);
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Notification methods
  public sendNotificationToUser(userId: string, notification: any) {
    console.log(`🔔 SocketManager: Sending notification to user ${userId}:`, notification.titulo);
    console.log(`🔍 SocketManager: Currently connected users:`, Array.from(this.connectedUsers.keys()));
    console.log(`🔍 SocketManager: Socket mappings:`, Array.from(this.socketToUser.entries()));
    
    let notificationSent = false;
    
    // Find user's socket(s) and emit notification
    for (const [socketId, mappedUserId] of this.socketToUser.entries()) {
      if (mappedUserId === userId) {
        console.log(`📤 SocketManager: Found socket ${socketId} for user ${userId}, emitting notification`);
        this.io.to(socketId).emit('new_notification', notification);
        notificationSent = true;
      }
    }
    
    if (!notificationSent) {
      console.log(`⚠️ SocketManager: User ${userId} not found in connected sockets - notification not sent via Socket.IO`);
    } else {
      console.log(`✅ SocketManager: Notification sent successfully to user ${userId}`);
    }
  }

  public sendUnreadCountUpdate(userId: string, unreadCount: number) {
    console.log(`🔢 Updating unread count for user ${userId}: ${unreadCount}`);
    
    // Find user's socket(s) and emit count update
    for (const [socketId, mappedUserId] of this.socketToUser.entries()) {
      if (mappedUserId === userId) {
        this.io.to(socketId).emit('unread_count_update', { unreadCount });
      }
    }
  }

  public getOnlineUsersInConversation(conversationId: string): SocketUser[] {
    const room = this.io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
    if (!room) return [];

    const usersInRoom: SocketUser[] = [];
    room.forEach(socketId => {
      const userId = this.socketToUser.get(socketId);
      if (userId) {
        const user = this.connectedUsers.get(userId);
        if (user) {
          usersInRoom.push(user);
        }
      }
    });

    return usersInRoom;
  }

  // Broadcast methods for real-time updates
  public broadcastToAdmins(event: string, data: any) {
    console.log(`📡 Broadcasting ${event} to all admins:`, data);

    // Send to all connected admins
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.role === 'super_admin' || user.role === 'admin') {
        // Find admin's socket(s) and emit
        for (const [socketId, mappedUserId] of this.socketToUser.entries()) {
          if (mappedUserId === userId) {
            console.log(`📤 Sending ${event} to admin ${user.name} (${socketId})`);
            this.io.to(socketId).emit(event, data);
          }
        }
      }
    }

    console.log(`✅ Broadcast ${event} completed to admins`);
  }

  public broadcastToAllUsers(event: string, data: any) {
    console.log(`📡 Broadcasting ${event} to all users:`, data);
    this.io.emit(event, data);
  }

  // Métodos específicos para términos excluidos
  public broadcastExcludedTermUpdate(termData: any) {
    console.log('📡 Broadcasting excluded term update to all users:', termData);
    this.io.emit('excluded_terms_updated', {
      type: 'term_updated',
      term: termData,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastExcludedTermAdded(termData: any) {
    console.log('📡 Broadcasting new excluded term to all users:', termData);
    this.io.emit('excluded_terms_updated', {
      type: 'term_added',
      term: termData,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastExcludedTermRemoved(termId: string) {
    console.log('📡 Broadcasting excluded term removal to all users:', termId);
    this.io.emit('excluded_terms_updated', {
      type: 'term_removed',
      termId: termId,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastExcludedTermToggled(termData: any) {
    console.log('📡 Broadcasting excluded term toggle to all users:', termData);
    this.io.emit('excluded_terms_updated', {
      type: 'term_toggled',
      term: termData,
      timestamp: new Date().toISOString()
    });
  }
}

export default SocketManager;