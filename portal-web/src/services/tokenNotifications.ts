import { toast } from 'sonner';

export const tokenNotifications = {
  // Notify about successful token refresh
  refreshSuccess: () => {
    console.log('🔄 Token refreshed successfully');
    // Don't show user notification for successful refresh to avoid spam
  },

  // Notify about token refresh failure
  refreshFailure: (error?: any) => {
    console.error('❌ Token refresh failed:', error);
    toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.', {
      duration: 5000,
      action: {
        label: 'Iniciar Sesión',
        onClick: () => {
          window.location.hash = '#login';
        },
      },
    });
  },

  // Notify about token expiring soon (optional - for debugging)
  tokenExpiringSoon: (minutesLeft: number) => {
    console.log(`⏰ Token expiring in ${minutesLeft} minutes`);
    // Optionally show a subtle notification for admins/developers
    if (process.env.NODE_ENV === 'development') {
      toast.info(`Token expiring in ${minutesLeft} minutes`, {
        duration: 2000,
      });
    }
  },

  // Notify about automatic logout due to refresh failure
  automaticLogout: () => {
    console.log('🚪 Automatic logout due to token refresh failure');
    toast.warning('Tu sesión ha expirado. Serás redirigido al login.', {
      duration: 4000,
    });
  },

  // Notify about session restored after successful refresh
  sessionRestored: () => {
    console.log('✅ Session restored after token refresh');
    // Optionally show success message for better UX
    if (process.env.NODE_ENV === 'development') {
      toast.success('Sesión renovada automáticamente', {
        duration: 2000,
      });
    }
  },
};