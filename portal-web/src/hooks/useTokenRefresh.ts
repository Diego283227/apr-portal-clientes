import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getTokenFromCookies, isTokenExpiringSoon, hasRefreshToken, clearAuthCookies } from '@/services/api';
import { apiClient } from '@/services/api';
import { tokenNotifications } from '@/services/tokenNotifications';

interface UseTokenRefreshOptions {
  refreshThresholdMinutes?: number;
  checkIntervalMinutes?: number;
}

export const useTokenRefresh = (options: UseTokenRefreshOptions = {}) => {
  const { refreshThresholdMinutes = 5, checkIntervalMinutes = 1 } = options;
  const { isAuthenticated, logout } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const attemptTokenRefresh = async (): Promise<boolean> => {
    if (isRefreshingRef.current || !hasRefreshToken()) {
      return false;
    }

    try {
      isRefreshingRef.current = true;
      await apiClient.post('/auth/refresh');
      tokenNotifications.refreshSuccess();
      tokenNotifications.sessionRestored();
      return true;
    } catch (error) {
      tokenNotifications.refreshFailure(error);
      // Don't clear auth cookies immediately - allow user to stay logged in

      // Don't force logout on refresh failure - let the user stay logged in with stored data
      tokenNotifications.automaticLogout();
      
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const checkTokenExpiration = async () => {
    if (!isAuthenticated) return;

    const currentToken = getTokenFromCookies();
    if (!currentToken) {
      return;
    }

    if (isTokenExpiringSoon(currentToken, refreshThresholdMinutes)) {
      tokenNotifications.tokenExpiringSoon(refreshThresholdMinutes);

      const refreshSuccess = await attemptTokenRefresh();

      if (!refreshSuccess) {
        // Handle error silently
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if user is not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkTokenExpiration();

    // Set up periodic check
    intervalRef.current = setInterval(
      checkTokenExpiration, 
      checkIntervalMinutes * 60 * 1000
    );

    // Token refresh monitor started

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshThresholdMinutes, checkIntervalMinutes]);

  // Manual refresh function
  const refreshToken = async (): Promise<boolean> => {
    if (!isAuthenticated || !hasRefreshToken()) {
      return false;
    }

    return await attemptTokenRefresh();
  };

  return {
    refreshToken,
    isRefreshing: isRefreshingRef.current,
  };
};