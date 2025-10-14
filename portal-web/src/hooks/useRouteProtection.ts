import { useEffect } from 'react';
import { useAuth } from './useAuth';

type AppView = 
  | 'login'
  | 'register'
  | 'admin-login'
  | 'forgot-password'
  | 'reset-password'
  | 'admin-forgot-password'
  | 'admin-reset-password'
  | 'socio-dashboard'
  | 'socio-boletas'
  | 'socio-boleta-detalle'
  | 'socio-pago'
  | 'socio-chat'
  | 'payment-success'
  | 'payment-failure'
  | 'payment-pending'
  | 'admin-dashboard'
  | 'admin-boletas'
  | 'admin-pagos'
  | 'admin-history'
  | 'admin-sms'
  | 'admin-socios'
  | 'admin-chat';

interface UseRouteProtectionOptions {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export const useRouteProtection = ({ currentView, setCurrentView }: UseRouteProtectionOptions) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Define which routes are protected and which are guest-only
  const protectedRoutes: AppView[] = [
    'socio-dashboard', 
    'socio-boletas', 
    'socio-boleta-detalle', 
    'socio-pago',
    'socio-chat',
    'payment-success',
    'payment-failure',
    'payment-pending',
    'admin-dashboard', 
    'admin-boletas', 
    'admin-pagos',
    'admin-history',
    'admin-sms',
    'admin-socios',
    'admin-chat'
  ];

  const guestOnlyRoutes: AppView[] = ['login', 'register', 'admin-login', 'forgot-password', 'reset-password', 'admin-forgot-password', 'admin-reset-password'];

  const socioRoutes: AppView[] = [
    'socio-dashboard', 
    'socio-boletas', 
    'socio-boleta-detalle', 
    'socio-pago',
    'socio-chat',
    'payment-success',
    'payment-failure',
    'payment-pending'
  ];

  const adminRoutes: AppView[] = [
    'admin-dashboard', 
    'admin-boletas', 
    'admin-pagos',
    'admin-history',
    'admin-sms',
    'admin-socios',
    'admin-chat'
  ];

  useEffect(() => {
    // PRIORITY CHECK: Password reset routes with tokens - NEVER interfere
    const currentHashString = window.location.hash.slice(1);
    const currentHash = currentHashString.includes('/') ? currentHashString.split('/')[0] as AppView : currentHashString as AppView;
    const isPasswordResetRoute = (window.location.hash.includes('#reset-password') ||
                                 window.location.hash.includes('#admin-reset-password')) &&
                                 window.location.search.includes('token=');
    
    if (isPasswordResetRoute) {
      return; // Exit completely, don't do ANYTHING
    }

    // Don't redirect while auth is loading
    if (isLoading) return;


    // Handle URL manipulation detection
    const handleHashChange = () => {
      // Priority check for password reset before any other logic
      const isPasswordResetRoute = (window.location.hash.includes('#reset-password') || 
                                   window.location.hash.includes('#admin-reset-password')) && 
                                   window.location.search.includes('token=');
      
      if (isPasswordResetRoute) {
        const currentHash = window.location.hash.slice(1) as AppView;
        setCurrentView(currentHash);
        return; // Don't run normal enforcement
      }

      enforceRouteProtection();
    };

    const enforceRouteProtection = () => {
      // Don't redirect while auth is loading
      if (isLoading) return;

      // Get current hash and compare with our currentView
      const hashString = window.location.hash.slice(1) || 'login';
      const hash = hashString.includes('/') ? hashString.split('/')[0] as AppView : hashString as AppView;

      // If hash base doesn't match currentView, someone manually changed URL
      if (hash !== currentView) {
        // Special handling for password reset routes with tokens
        if ((hash === 'reset-password' || hash === 'admin-reset-password') && window.location.search.includes('token=')) {
          setCurrentView(hash);
          return;
        }
        
        // Validate if the hash route is allowed for current auth state
        if (!isAuthenticated && protectedRoutes.includes(hash)) {
          window.location.hash = '#login';
          setCurrentView('login');
          return;
        }

        if (isAuthenticated && guestOnlyRoutes.includes(hash)) {
          const redirectTo = user?.role === 'socio' ? 'socio-dashboard' : 'admin-dashboard';
          window.location.hash = `#${redirectTo}`;
          setCurrentView(redirectTo);
          return;
        }

        // Check role-based access
        if (isAuthenticated && user) {
          if (user.role === 'socio' && adminRoutes.includes(hash)) {
            window.location.hash = '#socio-dashboard';
            setCurrentView('socio-dashboard');
            return;
          }

          if ((user.role === 'admin' || user.role === 'super_admin') && socioRoutes.includes(hash)) {
            window.location.hash = '#admin-dashboard';
            setCurrentView('admin-dashboard');
            return;
          }
        }

        // If we get here, the route change is valid, sync the currentView
        setCurrentView(hash);
        return;
      }

      // Standard protection logic - only run if currentView matches hash base
      const currentHashString = window.location.hash.slice(1) || 'login';
      const currentHashBase = currentHashString.includes('/') ? currentHashString.split('/')[0] as AppView : currentHashString as AppView;
      if (currentHashBase !== currentView) return; // Skip if out of sync

      if (!isAuthenticated && protectedRoutes.includes(currentView)) {
        window.location.hash = '#login';
        setCurrentView('login');
        return;
      }

      if (isAuthenticated && guestOnlyRoutes.includes(currentView)) {
        const redirectTo = user?.role === 'socio' ? 'socio-dashboard' : 'admin-dashboard';
        window.location.hash = `#${redirectTo}`;
        setCurrentView(redirectTo);
        return;
      }

      if (isAuthenticated && user) {
        if (user.role === 'socio' && adminRoutes.includes(currentView)) {
          window.location.hash = '#socio-dashboard';
          setCurrentView('socio-dashboard');
          return;
        }

        if ((user.role === 'admin' || user.role === 'super_admin') && socioRoutes.includes(currentView)) {
          window.location.hash = '#admin-dashboard';
          setCurrentView('admin-dashboard');
          return;
        }
      }
    };

    // Enforce protection immediately
    enforceRouteProtection();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentView, isAuthenticated, user, isLoading, setCurrentView]);

  // Keep URL in sync with currentView - but preserve parameters
  useEffect(() => {
    if (!isLoading && isAuthenticated !== undefined) {
      const currentHash = window.location.hash;
      const hashString = currentHash.slice(1);
      const baseRoute = hashString.includes('/') ? hashString.split('/')[0] : hashString;

      // Only sync if the base route doesn't match currentView and we're not dealing with parametered routes
      if (baseRoute !== currentView && !hashString.includes('/')) {
        const newHash = `#${currentView}`;
        window.history.replaceState(null, '', newHash);
      }
    }
  }, [currentView, isLoading, isAuthenticated]);
};