import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7782/api';

// Flag to disable auto refresh after logout
let isLoggingOut = false;
// Flag to prevent multiple refresh attempts
let isRefreshing = false;
// Queue for requests waiting for token refresh
let refreshQueue: Array<(token: string) => void> = [];

export const setLoggingOut = (value: boolean) => {
  isLoggingOut = value;
};

// Helper function to check if refresh token exists
export const hasRefreshToken = (): boolean => {
  // Check if refresh token exists in cookies
  const cookies = document.cookie.split(';');
  const refreshTokenExists = cookies.some(cookie => 
    cookie.trim().startsWith('refreshToken=') && 
    cookie.split('=')[1] && 
    cookie.split('=')[1] !== 'undefined' && 
    cookie.split('=')[1] !== 'null'
  );
  return refreshTokenExists;
};

// Helper function to get token from cookies
export const getTokenFromCookies = (): string | null => {
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
  if (tokenCookie) {
    const token = tokenCookie.split('=')[1];
    return token && token !== 'undefined' && token !== 'null' ? token : null;
  }
  return null;
};

// Helper function to decode token and check expiration
export const isTokenExpiringSoon = (token: string, thresholdMinutes: number = 5): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp) {
      const expirationTime = new Date(decoded.exp * 1000);
      const now = new Date();
      const threshold = new Date(now.getTime() + (thresholdMinutes * 60 * 1000));
      
      return expirationTime <= threshold;
    }
    return true;
  } catch (error) {
    return true;
  }
};

// Helper function to clear auth cookies
export const clearAuthCookies = (): void => {
  const cookiesToClear = ['token', 'refreshToken'];
  cookiesToClear.forEach(name => {
    // Clear for current path
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    // Clear for root path
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost`;
  });
  
  // Also clear localStorage
  localStorage.removeItem('user');
};

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Check if token is expiring soon and refresh it preventively
    // Only for non-polling endpoints to avoid excessive refresh attempts
    const currentToken = getTokenFromCookies();
    if (currentToken && isTokenExpiringSoon(currentToken, 10) &&
        !isRefreshing && !isLoggingOut && hasRefreshToken() &&
        !config.url?.includes('/auth/refresh') &&
        !config.url?.includes('/auth/logout') &&
        !config.url?.includes('/notifications') &&
        !config.url?.includes('/socket')) {

      try {
        isRefreshing = true;
        await apiClient.post('/auth/refresh');
      } catch (error) {
        clearAuthCookies();
      } finally {
        isRefreshing = false;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Don't attempt refresh if we're logging out, no refresh token, or if the request was to logout endpoint
    if (error.response?.status === 401 &&
        !originalRequest._retry &&
        !isLoggingOut &&
        hasRefreshToken() &&
        !originalRequest.url?.includes('/auth/logout')) {

      originalRequest._retry = true;

      // If already refreshing, add to queue
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');

        // Process queued requests
        refreshQueue.forEach(callback => callback('refreshed'));
        refreshQueue = [];

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Reject all queued requests
        refreshQueue.forEach(callback => callback('failed'));
        refreshQueue = [];

        clearAuthCookies();
        isLoggingOut = false;

        // Trigger a custom event that the auto-logout hook can listen to
        window.dispatchEvent(new CustomEvent('auth:session-expired', {
          detail: { reason: 'Token refresh failed' }
        }));

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);