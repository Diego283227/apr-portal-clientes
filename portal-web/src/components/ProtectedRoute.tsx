import { useAuth } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiredRole?: 'socio' | 'admin' | 'super_admin';
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  // Not authenticated - don't render protected content
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role if required
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-red-400 text-lg">No tienes permisos para acceder a esta sección</div>
      </div>
    );
  }

  return <>{children}</>;
};

// Component for routes that should NOT be accessible when authenticated
export const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  // If authenticated, don't show login/register forms
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};