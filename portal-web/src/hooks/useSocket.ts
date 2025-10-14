import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface OnlineUser {
  id: string;
  name: string;
  role: 'socio' | 'admin' | 'super_admin';
  lastSeen: Date;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
}

export const useSocket = (token?: string): SocketContextType => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!token) {
      // Don't connect without token
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    // Initialize socket connection
    const socket = io('http://localhost:7782', {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setOnlineUsers([]);
    });

    socket.on('auth_error', (error) => {
      setIsConnected(false);
      setOnlineUsers([]);

      // Disconnect the socket if authentication fails
      socket.disconnect();
    });

    socket.on('online_users', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [token]);

  const joinConversation = (conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  };

  const sendTyping = (conversationId: string, isTyping: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(isTyping ? 'typing_start' : 'typing_stop', {
        conversationId
      });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendTyping
  };
};

export default useSocket;