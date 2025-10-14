import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { apiClient, clearAuthCookies, hasRefreshToken } from '../services/api';
import { toast } from 'sonner';

interface UseAutoLogoutOptions {
  onSessionExpired?: () => void;
  checkInterval?: number; // in milliseconds
  showNotification?: boolean;
}

export const useAutoLogout = (options: UseAutoLogoutOptions = {}) => {
  const { 
    onSessionExpired, 
    checkInterval = 30000, // Check every 30 seconds by default
    showNotification = true 
  } = options;
  
  const { user, logout, isAuthenticated } = useAuth();
  const logoutCalledRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const performAutoLogout = async (reason: string = 'Sesión expirada') => {
    if (logoutCalledRef.current || !isAuthenticated) {
      return;
    }

    logoutCalledRef.current = true;
    
    if (showNotification) {
      toast.error(`${reason}. Redirigiendo al login...`, {
        duration: 3000,
      });
    }

    // Clear auth data immediately
    clearAuthCookies();
    
    try {
      // Attempt graceful logout
      await logout();
    } catch (error) {
      // Handle error silently
    }

    // Call custom callback if provided
    if (onSessionExpired) {
      onSessionExpired();
    }

    // Reset flag after logout completes
    setTimeout(() => {
      logoutCalledRef.current = false;
    }, 1000);
  };

  const checkTokenValidity = async () => {
    // Don't check during initial load or if user is not fully authenticated
    if (!isAuthenticated || !user || logoutCalledRef.current) {
      return;
    }

    try {
      // Check if refresh token still exists
      if (!hasRefreshToken()) {
        await performAutoLogout('Token de sesión no válido');
        return;
      }

      // Test the socket token endpoint that's failing
      const response = await apiClient.get('/auth/socket-token');
      
      if (response.status !== 200) {
        await performAutoLogout('Token de sesión expirado');
      }
    } catch (error: any) {
      // If it's a 401 (Unauthorized) error, trigger auto-logout
      // But only if the user was already authenticated (not during login process)
      if (error.response?.status === 401 && isAuthenticated && user) {
        await performAutoLogout('Token de sesión expirado');
      }
    }
  };

  useEffect(() => {
    // Only start checking if user is authenticated
    if (isAuthenticated && user) {
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start periodic checks with a delay to avoid interfering with login
      intervalRef.current = setInterval(checkTokenValidity, checkInterval);

      // Don't check immediately after login - give it some time
      // Only start checking after 30 seconds to avoid login interference
      setTimeout(() => {
        if (isAuthenticated && user && !logoutCalledRef.current) {
          checkTokenValidity();
        }
      }, 30000);
    } else if (intervalRef.current) {
      // Clear interval if user is not authenticated
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, user, checkInterval]);

  // Listen for custom auth events from the API service
  useEffect(() => {
    const handleSessionExpired = (event: any) => {
      const reason = event.detail?.reason || 'Sesión expirada';
      performAutoLogout(reason);
    };

    // Listen for session expiration events
    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  // Listen for API errors globally and handle 401s
  useEffect(() => {
    const handleApiError = (error: any) => {
      // Only handle 401s if user is fully authenticated and it's not a login/auth endpoint
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                            error.config?.url?.includes('/auth/refresh') ||
                            error.config?.url?.includes('/auth/logout');
      
      if (error.response?.status === 401 &&
          isAuthenticated &&
          user &&
          !logoutCalledRef.current &&
          !isAuthEndpoint) {
        performAutoLogout('Sesión expirada');
      }
    };

    // Only add interceptor if user is authenticated
    if (isAuthenticated && user) {
      // Add global error handler to axios interceptors
      const interceptor = apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
          handleApiError(error);
          return Promise.reject(error);
        }
      );

      return () => {
        apiClient.interceptors.response.eject(interceptor);
      };
    }
  }, [isAuthenticated, user]);

  return {
    performAutoLogout,
    isMonitoring: !!intervalRef.current
  };
};