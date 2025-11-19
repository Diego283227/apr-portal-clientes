import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import { useBoletas } from '@/hooks/useBoletas';
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute';
import { apiClient } from '@/services/api';
import { toast } from '@/components/ui/enhanced-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Landing Components
import Homepage from '@/components/landing/Homepage';

// Auth Components
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import ForgotPasswordAdminForm from '@/components/auth/ForgotPasswordAdminForm';
import ResetPasswordAdminForm from '@/components/auth/ResetPasswordAdminForm';
import PasswordResetHandler from '@/components/PasswordResetHandler';

// Socio Components
import SocioDashboard from '@/components/socio/SocioDashboard';
import BoletasView from '@/components/socio/BoletasView';
import BoletaDetalle from '@/components/socio/BoletaDetalle';
import ChatSocioView from '@/components/socio/ChatSocioView';
import ChatbotPage from '@/pages/ChatbotPage';

// Payment Components
import PaymentResult from '@/components/payment/PaymentResult';
import PaymentInterface from '@/components/socio/PaymentInterface';
import PayPalTestPage from '@/pages/PayPalTestPage';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentFailure from '@/pages/PaymentFailure';
import PaymentPending from '@/pages/PaymentPending';
import MisPagos from '@/pages/MisPagos';

// Admin Components
import SuperAdminDashboard from '@/components/admin/SuperAdminDashboard';
import BoletasAdminView from '@/components/admin/BoletasAdminView';
import PagosAdminView from '@/components/admin/PagosAdminView';
import HistoryAuditView from '@/components/admin/HistoryAuditView';
import SMSAdminView from '@/components/admin/SMSAdminView';
import SociosAdminView from '@/components/admin/SociosAdminView';
import ChatAdminView from '@/components/admin/ChatAdminView';

// Types
import type { 
  User,
  Boleta,  
  DashboardStats,
} from '@/types';

// Mock data removed - using real API calls only


const mockDashboardStats: DashboardStats = {
  totalSocios: 0,
  boletasPendientes: 0,
  boletasPagadas: 0,
  ingresosTotales: 0,
  ingresosMes: 0,
  morosidad: 0
};

type AppView =
  | 'homepage'
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
  | 'chatbot'
  | 'payment-success'
  | 'payment-failure'
  | 'payment-pending'
  | 'paypal-test'
  | 'admin-dashboard'
  | 'admin-boletas'
  | 'admin-pagos'
  | 'admin-history'
  | 'admin-sms'
  | 'admin-socios'
  | 'admin-chat';

function App() {


  // Check if we're on a password reset route to avoid auth conflicts
  const isPasswordResetRoute = (window.location.hash.includes('reset-password') ||
                               window.location.hash.includes('admin-reset-password')) &&
                               window.location.hash.includes('token=');
  

  // Only use auth if NOT on password reset route
  const { user, logout, checkAuth } = isPasswordResetRoute ? 
    { user: null, logout: () => Promise.resolve(), checkAuth: () => Promise.resolve(false) } : 
    useAuth();
  
  // Use boletas hook for real data
  const { 
    boletas, 
    isLoading: boletasLoading, 
    error: boletasError, 
    refetch: refetchBoletas,
    deleteBoleta,
    isDeleting,
    deleteError
  } = useBoletas();
  const [currentView, setCurrentView] = useState<AppView>('homepage');
  const [selectedBoletaId, setSelectedBoletaId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(mockDashboardStats);
  const [statsLoading, setStatsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Use route protection hook
  useRouteProtection({ currentView, setCurrentView });
  
  // Use token refresh hook - TEMPORARILY DISABLED while debugging
  // useTokenRefresh({
  //   refreshThresholdMinutes: 15, // Refresh when token expires in 15 minutes (now we have 2h tokens)
  //   checkIntervalMinutes: 5, // Check every 5 minutes (less frequent)
  // });

  // Use auto-logout hook - TEMPORARILY DISABLED while debugging token issues
  // useAutoLogout({
  //   checkInterval: 30000, // Check every 30 seconds
  //   showNotification: true,
  //   onSessionExpired: () => {
  //     // Redirect to appropriate login page based on current view
  //     const targetView = currentView.startsWith('admin-') ? 'admin-login' : 'login';
  //     setCurrentView(targetView);
  //     setSelectedBoletaId(null);
  //     window.location.hash = `#${targetView}`;
  //   }
  // });

  // Check auth and initialize app
  useEffect(() => {
    const initializeApp = async () => {
      // Check if we need to redirect to login after password reset
      try {
        const redirectFlag = sessionStorage.getItem('redirect_to_login');
        if (redirectFlag === 'true') {
          sessionStorage.removeItem('redirect_to_login');
          setCurrentView('login');
          window.location.hash = '#login';
          setInitialized(true);
          return;
        }
      } catch {
        // Ignore
      }

      const hashString = window.location.hash.slice(1);

      // Extract token from hash (for URLs like /#/reset-password?token=xxx)
      const [hashPath, hashQuery] = hashString.split('?');
      const urlParams = new URLSearchParams(hashQuery || window.location.search);
      const token = urlParams.get('token');

      // Remove leading slash if present
      const cleanHashPath = hashPath.startsWith('/') ? hashPath.slice(1) : hashPath;

      // Parsear hash para extraer view y parámetros
      let hash: AppView;
      let extractedConversationId: string | null = null;

      if (cleanHashPath.includes('/')) {
        const [viewPart, ...params] = cleanHashPath.split('/');
        hash = viewPart as AppView;

        // Si es socio-dashboard o chatbot, el primer parámetro es el conversation ID
        if ((hash === 'socio-dashboard' || hash === 'chatbot') && params[0]) {
          extractedConversationId = params[0];
        }
      } else {
        hash = cleanHashPath as AppView;
      }

      // Establecer el conversationId si se extrajo
      if (extractedConversationId) {
        setConversationId(extractedConversationId);
      } else {
        setConversationId(null);
      }

      // PRIORITY: Handle password reset routes immediately
      if (isPasswordResetRoute && (hash === 'reset-password' || hash === 'admin-reset-password') && token) {
        // Clear any existing authentication to avoid conflicts
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        setCurrentView(hash);
        setResetToken(token);
        setInitialized(true);
        return;
      }

      // Continue with normal auth logic only if NOT a password reset
      if (!isPasswordResetRoute) {
        const authResult = await checkAuth();

        // Get user from localStorage since hook user might not be ready yet
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : user;

        if (authResult && currentUser) {
          // User is authenticated, redirect to appropriate dashboard if on guest route
          const guestRoutes = ['login', 'register', 'admin-login', 'forgot-password', 'reset-password', 'admin-forgot-password', 'admin-reset-password'];
          if (!hash || guestRoutes.includes(hash)) {
            const redirectTo = currentUser.role === 'socio' ? 'socio-dashboard' : 'admin-dashboard';
            setCurrentView(redirectTo);
            window.location.hash = currentUser.role === 'socio' ? '#socio-dashboard' : `#${redirectTo}`;
          } else {
            // Check if hash route is valid for their role
            const validSocioRoutes = ['socio-dashboard', 'socio-boletas', 'socio-boleta-detalle', 'socio-pago', 'socio-chat', 'chatbot', 'paypal-test', 'payment-success', 'payment-failure', 'payment-pending'];
            const validAdminRoutes = ['admin-dashboard', 'admin-boletas', 'admin-pagos', 'admin-history', 'admin-sms', 'admin-socios', 'admin-chat', 'paypal-test', 'payment-success', 'payment-failure', 'payment-pending'];

            // Para rutas con parámetros (como socio-dashboard/conversationId), extraer solo la parte base
            const baseRoute = hash.split('/')[0];

            if (currentUser.role === 'socio' && validSocioRoutes.includes(baseRoute)) {
              setCurrentView(baseRoute as AppView);
            } else if ((currentUser.role === 'super_admin') && validAdminRoutes.includes(baseRoute)) {
              setCurrentView(baseRoute as AppView);
            } else {
              // Invalid route for user role, redirect to appropriate dashboard
              const redirectTo = currentUser.role === 'socio' ? 'socio-dashboard' : 'admin-dashboard';
              setCurrentView(redirectTo);
              window.location.hash = currentUser.role === 'socio' ? '#socio-dashboard' : `#${redirectTo}`;
            }
          }
        } else if (authResult === false) {
          // User is definitely not authenticated
          const guestRoutes = ['homepage', 'login', 'register', 'admin-login', 'forgot-password', 'reset-password', 'admin-forgot-password', 'admin-reset-password'];
          if (hash && guestRoutes.includes(hash)) {
            setCurrentView(hash);

            // Extract reset token from URL if on reset-password routes
            if (hash === 'reset-password' || hash === 'admin-reset-password') {
              if (token) {
                setResetToken(token);
              }
            }
          } else {
            // Default to login for unauthenticated users
            setCurrentView('login');
            window.location.hash = '#login';
          }
        } else {
          // Auth is still loading or failed, but we have a hash - try to preserve it temporarily
          const protectedRoutes = [
            'socio-dashboard', 'socio-boletas', 'socio-boleta-detalle', 'socio-pago', 'socio-chat',
            'admin-dashboard', 'admin-boletas', 'admin-pagos', 'admin-history', 'admin-sms', 'admin-socios', 'admin-chat'
          ];
          
          const baseRoute = hashString ? hashString.split('/')[0] : '';
          if (baseRoute && protectedRoutes.includes(baseRoute)) {
            // Don't change the view yet, wait for auth to complete
            setCurrentView(baseRoute as AppView);
          } else {
            // Default to login when not authenticated
            setCurrentView('login');
            window.location.hash = '#login';
          }
        }
      }
      
      setInitialized(true);
    };

    // Always run on mount to check authentication
    initializeApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // useEffect para manejar cambios de hash durante la navegación
  useEffect(() => {
    const handleHashChange = () => {
      const hashString = window.location.hash.slice(1);

      if (hashString.includes('/')) {
        const [viewPart, ...params] = hashString.split('/');

        if ((viewPart === 'socio-dashboard' || viewPart === 'chatbot') && params[0]) {
          const newConversationId = params[0];
          setConversationId(newConversationId);
        }
      } else {
        // Si no hay parámetros, limpiar conversationId
        setConversationId(null);
        // Actualizar currentView cuando el hash cambia
        if (hashString && hashString !== currentView) {
          setCurrentView(hashString as AppView);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  // Load dashboard stats when admin user accesses dashboard
  useEffect(() => {
    if (user && user.role === 'super_admin' && currentView === 'admin-dashboard') {
      loadDashboardStats();
    }
  }, [user, currentView]);

  const handleLogout = async () => {
    try {
      await logout();

      // Redirect to login after logout
      setCurrentView('login');
      setSelectedBoletaId(null);

      // Update the hash to login
      window.location.hash = '#login';
    } catch (error) {
      console.error('Logout error:', error);

      // Even on error, redirect to login
      setCurrentView('login');
      setSelectedBoletaId(null);
      window.location.hash = '#login';
    }
  };

  const loadDashboardStats = async () => {
    if (!user || user.role !== 'super_admin') return;

    try {
      setStatsLoading(true);
      const response = await apiClient.get('/admin/dashboard/stats');

      if (response.data.success) {
        console.log('📊 Stats cargados desde el backend:', response.data.data);
        setDashboardStats(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error cargando stats:', error);
      // Keep using mock data on error
    } finally {
      setStatsLoading(false);
    }
  };

  const handleNavigateToView = (view: string) => {
    let targetView: AppView;
    
    switch (view) {
      case 'boletas':
        targetView = user?.role === 'socio' ? 'socio-boletas' : 'admin-boletas';
        break;
      case 'pago':
        targetView = 'socio-pago';
        break;
      case 'pagos':
        targetView = 'admin-pagos';
        break;
      case 'history':
        targetView = 'admin-history';
        break;
      case 'sms':
        targetView = 'admin-sms';
        break;
      case 'socios':
        targetView = 'admin-socios';
        break;
      case 'chat':
        targetView = user?.role === 'socio' ? 'socio-chat' : 'admin-chat';
        break;
      default:
        targetView = view as AppView;
    }
    
    setCurrentView(targetView);
    window.location.hash = `#${targetView}`;
  };

  const handleViewBoletaDetalle = (boletaId: string) => {
    setSelectedBoletaId(boletaId);
    setCurrentView('socio-boleta-detalle');
    window.location.hash = '#socio-boleta-detalle';
  };

  const handleDeleteBoleta = async (boletaId: string) => {
    try {
      await deleteBoleta(boletaId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const selectedBoleta = selectedBoletaId 
    ? boletas.find(b => b.id === selectedBoletaId)
    : null;

  const renderCurrentView = () => {
    // Determine if current view should have theme support
    const privateViews = [
      'socio-dashboard', 'socio-boletas', 'socio-boleta-detalle', 'socio-pago', 'socio-chat', 'chatbot',
      'admin-dashboard', 'admin-boletas', 'admin-pagos', 'admin-history', 'admin-sms', 'admin-socios', 'admin-chat',
      'payment-success', 'payment-failure', 'payment-pending', 'paypal-test'
    ];

    const shouldUseTheme = privateViews.includes(currentView);

    switch (currentView) {
      case 'homepage':
        return (
          <GuestRoute>
            <Homepage
              onLogin={() => {
                setCurrentView('login');
                window.location.hash = '#login';
              }}
            />
          </GuestRoute>
        );

      case 'login':
        return (
          <GuestRoute>
            <LoginForm
              onRegister={() => {
                setCurrentView('register');
                window.location.hash = '#register';
              }}
              onAdminAccess={() => {
                setCurrentView('admin-login');
                window.location.hash = '#admin-login';
              }}
              onForgotPassword={() => {
                setCurrentView('forgot-password');
                window.location.hash = '#forgot-password';
              }}
              onBackToHome={() => {
                setCurrentView('homepage');
                window.location.hash = '#homepage';
              }}
            />
          </GuestRoute>
        );

      case 'register':
        return (
          <GuestRoute>
            <RegisterForm
              onBackToLogin={() => {
                setCurrentView('login');
                window.location.hash = '#login';
              }}
              onForgotPassword={() => {
                setCurrentView('forgot-password');
                window.location.hash = '#forgot-password';
              }}
            />
          </GuestRoute>
        );

      case 'admin-login':
        return (
          <GuestRoute>
            <AdminLoginForm
              onBackToMain={() => {
                setCurrentView('homepage');
                window.location.hash = '#homepage';
              }}
              onForgotPassword={() => {
                setCurrentView('admin-forgot-password');
                window.location.hash = '#admin-forgot-password';
              }}
            />
          </GuestRoute>
        );

      case 'forgot-password':
        return (
          <GuestRoute>
            <ForgotPasswordForm
              onBack={() => {
                setCurrentView('login');
                window.location.hash = '#login';
              }}
            />
          </GuestRoute>
        );

      case 'reset-password':
      case 'admin-reset-password':
        return (
          <PasswordResetHandler
            onSuccess={() => {
              const targetView = currentView === 'admin-reset-password' ? 'admin-login' : 'login';
              setCurrentView(targetView);
              setResetToken('');
              window.location.hash = `#${targetView}`;
            }}
          />
        );

      case 'admin-forgot-password':
        return (
          <GuestRoute>
            <ForgotPasswordAdminForm
              onBack={() => {
                setCurrentView('admin-login');
                window.location.hash = '#admin-login';
              }}
            />
          </GuestRoute>
        );

      case 'socio-dashboard':
        return (
          <ThemeProvider>
            <ProtectedRoute requiredRole="socio">
              <SocioDashboard
                socio={user as any}
                onLogout={handleLogout}
                initialConversationId={conversationId || undefined}
              />
            </ProtectedRoute>
          </ThemeProvider>
        );

      case 'socio-boletas':
        return (
          <ThemeProvider>
            <ProtectedRoute requiredRole="socio">
              <BoletasView
                boletas={boletas}
                isLoading={boletasLoading}
                error={boletasError}
                onBack={() => {
                  setCurrentView('socio-dashboard');
                  window.location.hash = '#socio-dashboard';
                }}
                onPagar={(boletaIds) => {
                  if (Array.isArray(boletaIds)) {
                    setSelectedBoletaId(boletaIds[0] || null);
                  } else {
                    setSelectedBoletaId(boletaIds);
                  }
                  setCurrentView('socio-pago');
                  window.location.hash = '#socio-pago';
                }}
                onDownloadPDF={(boletaId) => {
                  console.log('Download PDF for boleta:', boletaId);
                }}
                onViewDetalle={handleViewBoletaDetalle}
                onRefresh={refetchBoletas}
              />
            </ProtectedRoute>
          </ThemeProvider>
        );

      case 'socio-boleta-detalle':
        return selectedBoleta ? (
          <ThemeProvider>
            <ProtectedRoute requiredRole="socio">
              <BoletaDetalle
                boleta={selectedBoleta}
                onBack={() => {
                  setCurrentView('socio-boletas');
                  window.location.hash = '#socio-boletas';
                }}
                onPagar={(boletaIds) => {
                  if (Array.isArray(boletaIds)) {
                    setSelectedBoletaId(boletaIds[0] || null);
                  } else {
                    setSelectedBoletaId(boletaIds);
                  }
                  setCurrentView('socio-pago');
                  window.location.hash = '#socio-pago';
                }}
                onDownloadPDF={(boletaId) => {
                  console.log('Download PDF for boleta:', boletaId);
                }}
              />
            </ProtectedRoute>
          </ThemeProvider>
        ) : null;

      case 'socio-pago': {
        // Get selected boletas for payment
        const boletasForPayment = selectedBoletaId
          ? boletas.filter(b => b.id === selectedBoletaId || selectedBoletaId.includes(b.id))
          : boletas.filter(b => b.estado === 'pendiente' || b.estado === 'vencida');

        return (
          <ThemeProvider>
            <ProtectedRoute requiredRole="socio">
              <PaymentInterface
                selectedBoletas={boletasForPayment}
                onBack={() => {
                  setCurrentView('socio-dashboard');
                  window.location.hash = '#socio-dashboard';
                }}
                onPaymentMethodSelect={async (method, boletas) => {
                  if (method === 'paypal') {
                    try {
                      // Create PayPal payment
                      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api'}/paypal/create-payment`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                          boletaIds: boletas.map(b => b._id || b.id)
                        })
                      });

                      const data = await response.json();

                      if (data.success && data.data.approvalUrl) {
                        // Redirect to PayPal
                        window.location.href = data.data.approvalUrl;
                      } else {
                        console.error('Error creating PayPal payment:', data.message);
                        toast.error('Error al crear el pago de PayPal', {
                          description: data.message
                        });
                      }
                    } catch (error) {
                      console.error('Error creating PayPal payment:', error);
                      toast.error('Error al crear el pago de PayPal', {
                        description: 'Ocurrió un error inesperado. Inténtalo de nuevo.'
                      });
                    }
                  } else if (method === 'flow') {
                    try {
                      // Create Flow payment
                      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api'}/flow/create-payment`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                          boletaIds: boletas.map(b => b._id || b.id)
                        })
                      });

                      const data = await response.json();

                      if (data.success && data.data.paymentUrl) {
                        // Redirect to Flow
                        window.location.href = data.data.paymentUrl;
                      } else {
                        console.error('Error creating Flow payment:', data.message);
                        toast.error('Error al crear el pago de Flow', {
                          description: data.message
                        });
                      }
                    } catch (error) {
                      console.error('Error creating Flow payment:', error);
                      toast.error('Error al crear el pago de Flow', {
                        description: 'Ocurrió un error inesperado. Inténtalo de nuevo.'
                      });
                    }
                  } else {
                    toast.info('Método de pago no disponible', {
                      description: `${method} estará disponible próximamente`
                    });
                  }
                }}
              />
            </ProtectedRoute>
          </ThemeProvider>
        );
      }

      case 'admin-dashboard':
        return (
          <ProtectedRoute requiredRole="super_admin">
            <SuperAdminDashboard
              admin={user as any}
              stats={dashboardStats}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        );

      case 'admin-boletas':
        return (
          <ProtectedRoute requiredRole="super_admin">
            <BoletasAdminView
              boletas={boletas}
              isLoading={boletasLoading}
              error={boletasError}
              onBack={() => setCurrentView('admin-dashboard')}
              onEditBoleta={(id) => console.log('Edit boleta:', id)}
              onViewBoleta={handleViewBoletaDetalle}
              onMarkAsPaid={(id) => console.log('Mark as paid:', id)}
              onDownloadPDF={(id) => console.log('Download PDF:', id)}
              onExportData={() => console.log('Export data')}
              onRefresh={refetchBoletas}
              onDeleteBoleta={handleDeleteBoleta}
            />
          </ProtectedRoute>
        );

      case 'admin-pagos': {
        const mockPagos: Array<{
          id: string;
          boletaId: string;
          socioId: string;
          monto: number;
          fechaPago: string;
          metodoPago: 'webpay';
          estadoPago: 'completado';
          transactionId: string;
          boleta: Boleta;
        }> = [
          {
            id: '507f1f77bcf86cd799439014',
            boletaId: '68c3bed4c2c3bb798b519c1d',
            socioId: '68c3bed3c2c3bb798b519c1a',
            monto: 25000,
            fechaPago: '2025-01-15T10:30:00Z',
            metodoPago: 'webpay',
            estadoPago: 'completado',
            transactionId: 'WP123456789',
            boleta: boletas[0]
          }
        ];

        return (
          <ProtectedRoute requiredRole="super_admin">
            <PagosAdminView
              pagos={mockPagos}
              onBack={() => {
                setCurrentView('admin-dashboard');
                window.location.hash = '#admin-dashboard';
              }}
              onViewPago={(id) => console.log('View pago:', id)}
              onRefreshPagos={() => console.log('Refresh pagos')}
              onExportData={(dateRange) => console.log('Export pagos:', dateRange)}
            />
          </ProtectedRoute>
        );
      }

      case 'admin-history':
        return (
          <ProtectedRoute requiredRole="super_admin">
            <HistoryAuditView
              onBack={() => {
                setCurrentView('admin-dashboard');
                window.location.hash = '#admin-dashboard';
              }}
            />
          </ProtectedRoute>
        );

      case 'admin-sms':
        return (
          <ProtectedRoute requiredRole="super_admin">
            <SMSAdminView
              onBack={() => {
                setCurrentView('admin-dashboard');
                window.location.hash = '#admin-dashboard';
              }}
            />
          </ProtectedRoute>
        );

      case 'admin-socios':
        return (
          <ProtectedRoute requiredRole="super_admin">
            <SociosAdminView
              onBack={() => {
                setCurrentView('admin-dashboard');
                window.location.hash = '#admin-dashboard';
              }}
            />
          </ProtectedRoute>
        );

      case 'admin-chat':
        return (
          <ProtectedRoute requiredRole="super_admin">
            <ChatAdminView
              onBack={() => {
                setCurrentView('admin-dashboard');
                window.location.hash = '#admin-dashboard';
              }}
            />
          </ProtectedRoute>
        );

      case 'socio-chat':
        return (
          <ThemeProvider>
            <ProtectedRoute requiredRole="socio">
              <ChatSocioView
                onBack={() => {
                  setCurrentView('socio-dashboard');
                  window.location.hash = '#socio-dashboard';
                }}
              />
            </ProtectedRoute>
          </ThemeProvider>
        );

      case 'chatbot':
        return (
          <ProtectedRoute requiredRole="socio">
            <ChatbotPage initialConversationId={conversationId || undefined} />
          </ProtectedRoute>
        );

      case 'mis-pagos':
        return (
          <ThemeProvider>
            <ProtectedRoute requiredRole="socio">
              <MisPagos />
            </ProtectedRoute>
          </ThemeProvider>
        );

      case 'payment-success':
        return (
          <ProtectedRoute requiredRole="socio">
            <PaymentSuccess onNavigate={setCurrentView} />
          </ProtectedRoute>
        );

      case 'payment-failure':
        return (
          <ProtectedRoute requiredRole="socio">
            <PaymentFailure onNavigate={setCurrentView} />
          </ProtectedRoute>
        );

      case 'payment-pending':
        return (
          <ProtectedRoute requiredRole="socio">
            <PaymentPending onNavigate={setCurrentView} />
          </ProtectedRoute>
        );

      case 'paypal-test':
        return (
          <ProtectedRoute requiredRole={["socio", "super_admin"]}>
            <PayPalTestPage />
          </ProtectedRoute>
        );

      default:
        return <div>Vista no encontrada</div>;
    }
  };

  // Show loading while initializing auth
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Inicializando...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;
