import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { clearAuthCookies, getTokenFromCookies, apiClient } from '@/services/api';

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
      const response = await apiClient.get('/auth/socket-token');

      console.log('🔑 Socket token response status:', response.status);
      console.log('🔑 Socket token response data:', response.data);

      return response.data?.data?.token || null;
    } catch (error: any) {
      console.error('🔑 Error fetching socket token:', error);

      // If it's a 401, clear invalid cookies
      if (error.response?.status === 401) {
        console.log('🔑 Clearing invalid auth cookies due to 401 error');
        clearAuthCookies();
      }

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
    const tokenValue = getTokenFromCookies();

    // Check if there's a user in localStorage (for early load)
    const storedUser = localStorage.getItem('user');
    const hasStoredUser = !!storedUser;

    console.log('🔑 DEBUG - localStorage user:', storedUser ? 'EXISTS' : 'NULL');
    console.log('🔑 DEBUG - tokenValue:', tokenValue ? 'EXISTS' : 'NULL');
    console.log('🔑 DEBUG - hasStoredUser:', hasStoredUser);

    if ((isAuthenticated && user) || (hasStoredUser && tokenValue)) {
      if (tokenValue && tokenValue !== 'undefined' && tokenValue !== 'null') {
        console.log('🔑 ✅ Setting valid token for socket connection');
        setToken(tokenValue);
      } else if (isAuthenticated && user) {
        console.log('🔑 ❌ No valid token found in cookies despite being authenticated');
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
    } else if (!hasStoredUser) {
      // Only clear token if there's definitely no user
      console.log('🔑 No user found, clearing token');
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