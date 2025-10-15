import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { clearAuthCookies, getTokenFromCookies } from '@/services/api';

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

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  joinConversation: () => {},
  leaveConversation: () => {},
  sendTyping: () => {}
});

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  console.log('🔌 SocketProvider mounting - URL check:', window.location.href);

  // Check if we're on a password reset route to avoid auth conflicts
  const isPasswordResetRoute = (window.location.hash.includes('#reset-password') ||
                               window.location.hash.includes('#admin-reset-password')) &&
                               window.location.search.includes('token=');

  console.log('🔌 SocketProvider - password reset route check:', {
    isPasswordResetRoute,
    hash: window.location.hash,
    search: window.location.search,
    hasResetInHash: window.location.hash.includes('reset-password'),
    hasToken: window.location.search.includes('token=')
  });

  // Only use auth if NOT on password reset route
  const authData = isPasswordResetRoute ?
    { user: null, isAuthenticated: false } :
    useAuth();

  const { user, isAuthenticated } = authData;

  console.log('🔌 SocketProvider - Auth data:', {
    isPasswordResetRoute,
    user: !!user,
    isAuthenticated,
    userEmail: user?.email,
    userRole: user?.role
  });
  const [token, setToken] = useState<string | undefined>();

  // Get token from API endpoint for Socket.IO
  const getSocketToken = async (): Promise<string | null> => {
    try {
      console.log('🔑 Requesting socket token...');
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7782/api';
      const response = await fetch(`${API_URL}/auth/socket-token`, {
        method: 'GET',
        credentials: 'include', // Send cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔑 Socket token response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔑 Socket token response data:', data);
        return data.data?.token || null;
      } else {
        const errorData = await response.json().catch(() => null);
        console.error('🔑 Socket token error response:', response.status, errorData);
        
        // If it's a 401, clear invalid cookies
        if (response.status === 401) {
          console.log('🔑 Clearing invalid auth cookies due to 401 error');
          clearAuthCookies();
        }
        
        return null;
      }
    } catch (error) {
      console.error('🔑 Error fetching socket token:', error);
      return null;
    }
  };

  // Get token from cookies when user is authenticated
  useEffect(() => {
    console.log('🔑 SocketProvider - Auth state changed:', {
      isAuthenticated,
      user: !!user,
      userEmail: user?.email,
      userRole: user?.role
    });

    // Always check cookies, regardless of auth state
    console.log('🍪 Current cookies:', document.cookie);
    const tokenValue = getTokenFromCookies();
    console.log('🔑 Token from cookies, length:', tokenValue?.length);
    console.log('🔑 Token value:', tokenValue ? tokenValue.substring(0, 20) + '...' : 'null');

    if (isAuthenticated && user) {
      if (tokenValue && tokenValue !== 'undefined' && tokenValue !== 'null') {
        console.log('🔑 ✅ Setting valid token for socket connection for user:', user.email);
        setToken(tokenValue);
      } else {
        console.log('🔑 ❌ No valid token found in cookies despite being authenticated for user:', user.email);
        console.log('🔑 Will try to get socket token from server...');

        // Try to get fresh socket token
        getSocketToken().then(freshToken => {
          if (freshToken) {
            console.log('🔑 ✅ Got fresh socket token from server');
            setToken(freshToken);
          } else {
            console.log('🔑 ❌ Failed to get socket token from server');
            setToken(undefined);
          }
        });
      }
    } else {
      console.log('🔑 User not authenticated, clearing token');
      setToken(undefined);
    }
  }, [isAuthenticated, user]);

  // Periodic token refresh for Socket.IO (only when needed)
  useEffect(() => {
    if (!isAuthenticated || !user || !token) return;

    // Refresh token periodically to avoid expiration
    const interval = setInterval(() => {
      console.log('🔑 Refreshing socket token from cookies');
      const tokenValue = getTokenFromCookies();
      if (tokenValue && tokenValue !== token) {
        console.log('🔑 Token refreshed for socket');
        setToken(tokenValue);
      }
    }, 300000); // Refresh every 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, user, token]);

  const socketData = useSocket(token);

  return (
    <SocketContext.Provider value={socketData}>
      {children}
    </SocketContext.Provider>
  );
};