import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth';
import type { LoginCredentials, RegisterData, User } from '../services/auth';
import { toast } from 'sonner';
import { setLoggingOut, hasRefreshToken } from '../services/api';

export const useAuth = () => {
  const queryClient = useQueryClient();

  // Listen for payment success events to refresh user data
  useEffect(() => {
    const handlePaymentSuccess = () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    };

    window.addEventListener('payment-success', handlePaymentSuccess);
    return () => window.removeEventListener('payment-success', handlePaymentSuccess);
  }, [queryClient]);

  const profileQuery = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await authService.getProfile();
        const user = response.data;
        
        // Store user in localStorage for persistence
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        
        return user || null;
      } catch (error) {
        // Clear any stale data on auth error
        queryClient.setQueryData(['user'], null);
        localStorage.removeItem('user');
        throw error;
      }
    },
    retry: false,
    enabled: false, // Disable auto-run on load
    staleTime: Infinity, // Never go stale automatically
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: () => {
      // Try to get user from localStorage on initialization
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch {
          localStorage.removeItem('user');
          return null;
        }
      }
      return null;
    }
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      if (data.success && data.data?.user) {
        // Store user data
        queryClient.setQueryData(['user'], data.data.user);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        toast.success(data.message || 'Inicio de sesión exitoso');

        // Redirect based on user role
        const user = data.data.user;

        // Use hash navigation instead of location.replace to preserve cookies
        if (user.role === 'super_admin') {
          window.location.hash = '#admin-dashboard';
        } else if (user.role === 'socio') {
          window.location.hash = '#socio-dashboard';
        }
      } else {
        toast.error('Error: Respuesta de login inválida');
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error al iniciar sesión';
      toast.error(message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      if (data.success) {
        // Don't auto-login after register
        toast.success(data.message || 'Registro exitoso. Ahora puedes iniciar sesión.');
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Error en el registro';
      toast.error(message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Get current user role before clearing
      const currentUser = queryClient.getQueryData(['user']) as any;
      
      // Clear all queries and disable profile query
      queryClient.clear();
      queryClient.setQueryData(['user'], null);
      localStorage.removeItem('user');
      // Stop the profile query from trying to refresh
      queryClient.cancelQueries({ queryKey: ['user'] });
      toast.success('Sesión cerrada exitosamente');
      
      // App.tsx now handles the immediate redirect, but this is a backup
      if (currentUser?.role === 'super_admin') {
        window.location.hash = '#admin-login';
      } else {
        window.location.hash = '#login';
      }
    },
    onError: () => {
      // Get current user role before clearing
      const currentUser = queryClient.getQueryData(['user']) as any;
      
      // Even on error, clear the client to avoid loops
      queryClient.clear();
      queryClient.setQueryData(['user'], null);
      localStorage.removeItem('user');
      queryClient.cancelQueries({ queryKey: ['user'] });
      toast.error('Error al cerrar sesión');
      
      // App.tsx now handles the immediate redirect, but this is a backup
      if (currentUser?.role === 'super_admin') {
        window.location.hash = '#admin-login';
      } else {
        window.location.hash = '#login';
      }
    },
  });

  const login = (credentials: LoginCredentials) => {
    loginMutation.mutate(credentials);
  };

  const register = (data: RegisterData, onSuccess?: () => void) => {
    registerMutation.mutate(data, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(response.message || 'Registro exitoso. Ahora puedes iniciar sesión.');
          onSuccess?.();
        }
      }
    });
  };

  const logout = () => {
    return new Promise((resolve, reject) => {
      // Set flag to prevent auto-refresh during logout
      setLoggingOut(true);
      
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          setLoggingOut(false);
          resolve(true);
        },
        onError: (error) => {
          setLoggingOut(false);
          reject(error);
        }
      });
    });
  };

  const checkAuth = async () => {
    // Check if we have a stored user and refresh token
    const storedUser = localStorage.getItem('user');
    
    if (storedUser && hasRefreshToken()) {
      try {
        // Validate with server that the session is still valid
        const response = await profileQuery.refetch();
        if (response.data) {
          return true;
        }
      } catch (error) {
        localStorage.removeItem('user');
        queryClient.setQueryData(['user'], null);
        return false;
      }
    } else if (!hasRefreshToken() && storedUser) {
      // Use stored user data without server validation to avoid loops
      try {
        const userData = JSON.parse(storedUser);
        // Only set if not already set to avoid re-renders
        const currentUser = queryClient.getQueryData(['user']);
        if (!currentUser || JSON.stringify(currentUser) !== JSON.stringify(userData)) {
          queryClient.setQueryData(['user'], userData);
        }
        return true;
      } catch (error) {
        localStorage.removeItem('user');
        queryClient.setQueryData(['user'], null);
        return false;
      }
    }
    
    return false;
  };

  return {
    user: profileQuery.data as User | undefined,
    isLoading: profileQuery.isLoading || loginMutation.isPending || registerMutation.isPending,
    isAuthenticated: !!profileQuery.data && !profileQuery.isError,
    login,
    register,
    logout,
    checkAuth,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
};