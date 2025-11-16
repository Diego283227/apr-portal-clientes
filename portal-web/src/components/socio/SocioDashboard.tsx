import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationBell from '@/components/shared/NotificationBell';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Receipt,
  CreditCard,
  History,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  LogOut,
  MessageCircle,
  Home,
  User,
  Settings,
  Clock,
  BookOpen,
  TestTube,
  ArrowLeft,
  Menu,
  Droplets,
  Bot,
  UserCheck,
  Shield
} from 'lucide-react';
import {
  SidebarProvider
} from '@/components/ui/sidebar';

// Importar los componentes que se cargarán dinámicamente
import BoletasView from './BoletasView';
import ChatSocioView from './ChatSocioView';
import PerfilSocioView from './PerfilSocioView';
import SocioPagoView from './SocioPagoView';
import HistorialPagosView from './HistorialPagosView';
import TutorialSocio from './TutorialSocio';
import SidebarTutorial, { useSidebarTutorial } from './SidebarTutorial';
import { ConsumptionBilling } from '@/components/smart-meters/ConsumptionBilling';
import MisPagos from '@/pages/MisPagos';
import MisConsumosView from './MisConsumosView';
import { useBoletas } from '@/hooks/useBoletas';
import { usePagos } from '@/hooks/usePagos';
import { useConsumo } from '@/hooks/useConsumo';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';

import type { Socio } from '@/types';

type SocioView = 'dashboard' | 'boletas' | 'pago' | 'historial' | 'chat' | 'perfil' | 'consumo' | 'mis-pagos' | 'mis-consumos';

interface SocioDashboardProps {
  socio: Socio;
  onLogout: () => void;
  initialConversationId?: string; // ID de conversación para abrir directamente
}

export default function SocioDashboard({ socio, onLogout, initialConversationId }: SocioDashboardProps) {
  const [currentView, setCurrentView] = useState<SocioView>('dashboard');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [selectedBoletaIds, setSelectedBoletaIds] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Starts collapsed on mobile
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Use real data hooks
  const { boletas, pendingBoletas, totalDeuda, updateBoletaStatusInDB, refetch, queryClient } = useBoletas();

  // Calcular totales reales basados en boletas
  const totalFacturado = boletas?.reduce((sum: number, boleta: any) => sum + (boleta.montoTotal || 0), 0) || 0;
  const totalPagado = boletas?.filter((b: any) => b.estado === 'pagada')
    .reduce((sum: number, boleta: any) => sum + (boleta.montoTotal || 0), 0) || 0;




  
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const getDeudaStatus = () => {
    if (totalDeuda === 0) return { color: 'bg-green-600', text: 'Sin deuda' };
    if (totalDeuda > 50000) return { color: 'bg-destructive', text: 'Crítica' };
    return { color: 'bg-yellow-600', text: 'Pendiente' };
  };

  const getProximoVencimiento = () => {
    try {
      // Safe checks
      if (!boletas || !Array.isArray(boletas) || boletas.length === 0) {
        return {
          texto: 'Sin boletas pendientes',
          dias: 0,
          vencido: false,
          color: 'text-gray-500'
        };
      }

      // Encontrar boletas pendientes de forma segura
      const boletasPendientes = boletas.filter((boleta: any) => {
        try {
          return boleta &&
                 typeof boleta === 'object' &&
                 boleta.estado === 'pendiente' &&
                 boleta.fechaVencimiento;
        } catch (e) {
          return false;
        }
      });

      if (boletasPendientes.length === 0) {
        return {
          texto: 'Todas las boletas pagadas',
          dias: 0,
          vencido: false,
          color: 'text-green-600 dark:text-green-400'
        };
      }

      // Encontrar la fecha más próxima de forma segura
      let proximaFecha = null;
      let menorTiempo = Infinity;

      for (const boleta of boletasPendientes) {
        try {
          const fecha = new Date(boleta.fechaVencimiento);
          if (!isNaN(fecha.getTime()) && fecha.getTime() < menorTiempo) {
            menorTiempo = fecha.getTime();
            proximaFecha = fecha;
          }
        } catch (e) {
          continue;
        }
      }

      if (!proximaFecha) {
        return {
          texto: 'Sin fechas válidas',
          dias: 0,
          vencido: false,
          color: 'text-gray-500'
        };
      }

      const hoy = new Date();
      const diferenciaDias = Math.ceil((proximaFecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (diferenciaDias < 0) {
        return {
          texto: `Vencido hace ${Math.abs(diferenciaDias)} días`,
          dias: diferenciaDias,
          vencido: true,
          color: 'text-red-600'
        };
      } else if (diferenciaDias === 0) {
        return {
          texto: 'Vence hoy',
          dias: diferenciaDias,
          vencido: true,
          color: 'text-red-600'
        };
      } else if (diferenciaDias <= 7) {
        return {
          texto: `Vence en ${diferenciaDias} días`,
          dias: diferenciaDias,
          vencido: false,
          color: 'text-orange-600'
        };
      } else {
        return {
          texto: `Vence en ${diferenciaDias} días`,
          dias: diferenciaDias,
          vencido: false,
          color: 'text-blue-600'
        };
      }
    } catch (error) {
      console.error('Error calculando próximo vencimiento:', error);
      return {
        texto: 'Calculando...',
        dias: 0,
        vencido: false,
        color: 'text-gray-500'
      };
    }
  };

  const deudaStatus = getDeudaStatus();
  const proximoVencimiento = getProximoVencimiento();

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'boletas': return 'Mis Boletas';
      case 'pago': return 'Realizar Pago';
      case 'historial': return 'Historial de Pagos';
      case 'chat': return 'Chat Soporte';
      case 'perfil': return 'Mi Perfil';
      case 'configuracion': return 'Configuración';
      case 'consumo': return 'Mi Consumo';
      case 'mis-pagos': return 'Mis Pagos';
      case 'mis-consumos': return 'Historial de Consumo';
      default: return 'Dashboard';
    }
  };

  const sidebarItems = [
    {
      id: 'dashboard' as SocioView,
      title: 'Dashboard',
      icon: Home,
      onClick: () => setCurrentView('dashboard')
    },
    {
      id: 'boletas' as SocioView,
      title: 'Mis Boletas',
      icon: FileText,
      onClick: () => setCurrentView('boletas')
    },
    {
      id: 'mis-pagos' as SocioView,
      title: 'Mis Pagos',
      icon: Receipt,
      onClick: () => setCurrentView('mis-pagos')
    },
    {
      id: 'consumo' as SocioView,
      title: 'Mi Consumo',
      icon: Droplets,
      onClick: () => setCurrentView('consumo')
    },
    {
      id: 'historial' as SocioView,
      title: 'Historial',
      icon: History,
      onClick: () => setCurrentView('historial')
    },
    {
      id: 'pago' as SocioView,
      title: 'Realizar Pago',
      icon: CreditCard,
      onClick: () => setCurrentView('pago'),
      disabled: totalDeuda === 0
    },
    {
      id: 'chat' as SocioView,
      title: 'Chat Soporte',
      icon: MessageCircle,
      onClick: () => setCurrentView('chat')
    },
    {
      id: 'chatbot' as const,
      title: 'Asistente Virtual',
      icon: Bot,
      onClick: () => {
        console.log('🤖 Navegando a chatbot independiente: #chatbot/new');
        window.location.hash = '#chatbot/new';
      }
    }
  ];

  const getCurrentLocationText = () => {
    switch (currentView) {
      case 'perfil': return 'Mi Perfil';
      case 'boletas': return 'Mis Boletas';
      case 'pago': return 'Realizar Pago';
      case 'chat': return 'Chat Soporte';
      case 'historial': return 'Historial de Pagos';
      case 'consumo': return 'Mi Consumo';
      default: return 'Dashboard Principal';
    }
  };

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
  };

  const { startSidebarTutorial } = useSidebarTutorial();

  const handleProceedToPay = (boletaIds: string[]) => {
    setSelectedBoletaIds(boletaIds);
    setCurrentView('pago');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'boletas':
        return (
          <BoletasView
            boletas={boletas}
            onBack={() => setCurrentView('dashboard')}
            onPagar={handleProceedToPay}
            onDownloadPDF={(boletaId: string) => {
              console.log('Download PDF for boleta:', boletaId);
            }}
            onViewDetalle={(boletaId: string) => {
              console.log('View detalle for boleta:', boletaId);
            }}
          />
        );
      case 'pago':
        return (
          <SocioPagoView
            socio={socio}
            selectedBoletaIds={selectedBoletaIds}
            onBack={() => setCurrentView('dashboard')}
            onPaymentComplete={(paymentData) => {
              console.log('Payment completed:', paymentData);

              // Recargar la página completamente para asegurar la actualización
              console.log('💳 Payment successful, reloading page...');

              // Mostrar mensaje de éxito
              toast.success('¡Pago exitoso! Actualizando datos...', {
                duration: 2000
              });

              // Recargar la página después de un breve delay
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }}
          />
        );
      case 'chat':
        return (
          <ChatSocioView
            onBack={() => setCurrentView('dashboard')}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        );
      case 'perfil':
        return (
          <PerfilSocioView
            socio={socio}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'historial':
        return (
          <HistorialPagosView socio={socio} onBack={() => setCurrentView('dashboard')} />
        );
      case 'consumo':
        return (
          <ConsumptionBilling onBack={() => setCurrentView('dashboard')} />
        );
      case 'mis-pagos':
        return (
          <MisPagos onBack={() => setCurrentView('dashboard')} />
        );
      case 'mis-consumos':
        return (
          <MisConsumosView onBack={() => setCurrentView('dashboard')} />
        );
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <DashboardContent
      socio={socio}
      formatCurrency={formatCurrency}
      deudaStatus={deudaStatus}
      setCurrentView={setCurrentView}
      totalDeuda={totalDeuda}
      pendingBoletas={pendingBoletas}
      handleProceedToPay={handleProceedToPay}
      proximoVencimiento={proximoVencimiento}
      boletas={boletas}
      totalFacturado={totalFacturado}
      totalPagado={totalPagado}
    />
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-950 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed left-0 top-0 bottom-0 flex flex-col bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
          sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'
        }`}>
          {/* Header con hamburguesa */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              {/* Botón hamburguesa */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {!sidebarCollapsed && (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                    <Droplets className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-lg text-foreground dark:text-gray-100">Portal APR</span>
                </>
              )}
            </div>
          </div>

          {/* Contenido del sidebar */}
          <div className="flex-1 overflow-y-auto px-4 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Perfil de usuario - solo icono cuando está colapsado */}
            {!sidebarCollapsed && (
              <div
                className="relative mb-4 p-3 bg-gradient-to-br from-white via-blue-50/30 to-slate-50 dark:bg-gradient-to-br dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-800/50 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-600/30 cursor-pointer hover:shadow-md hover:border-blue-200/60 dark:hover:border-blue-600/40 transition-all duration-300"
                onClick={() => setCurrentView('perfil')}
                id="socio-profile"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 dark:from-blue-700 dark:via-blue-800 dark:to-blue-900 rounded-xl flex items-center justify-center shadow-md">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground dark:text-white text-sm truncate">{socio.nombres}</h3>
                    <Badge className="text-xs bg-gradient-to-r from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 text-white border-none shadow-sm">
                      Socio
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/60 dark:bg-gray-800/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Deuda</div>
                    <div className={`text-sm font-bold ${totalDeuda === 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {formatCurrency(totalDeuda)}
                    </div>
                  </div>
                  <div className="bg-background/60 dark:bg-gray-800/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Estado</div>
                    <div className={`text-sm font-bold ${totalDeuda === 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {totalDeuda === 0 ? 'Al día' : 'Pendiente'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="mb-4">
              {!sidebarCollapsed && (
                <h4 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">Panel Principal</h4>
              )}
              <div className="space-y-2">
                {sidebarItems.map((item) => {
                  const isActive = item.id === currentView;
                  return (
                    <div
                      key={item.id}
                      onClick={item.disabled ? undefined : item.onClick}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 relative ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-100 to-blue-50 dark:bg-gradient-to-r dark:from-blue-900/70 dark:via-blue-800/60 dark:to-gray-900/50'
                          : 'bg-transparent dark:bg-gray-800/30 hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-50 dark:hover:from-blue-900/80 dark:hover:via-blue-800/70 dark:hover:to-blue-950/90'
                      } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${
                        sidebarCollapsed ? 'justify-center' : ''
                      }`}
                      id={`nav-${item.id}`}
                      title={sidebarCollapsed ? item.title : ''}
                    >
                      <div className={`p-2 rounded-lg ${
                        isActive
                          ? 'bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 text-white'
                          : 'bg-gray-200 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200'
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>

                      {!sidebarCollapsed && (
                        <>
                          <span className={`font-medium flex-1 ${
                            isActive ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-200'
                          }`}>
                            {item.title}
                          </span>

                          {item.id === 'pago' && totalDeuda > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-xs font-bold !border-0"
                            >
                              !
                            </Badge>
                          )}
                        </>
                      )}

                      {!sidebarCollapsed && isActive && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-blue-500 rounded-l-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer con logout */}
          <div className="p-4 border-t border-slate-200 dark:border-gray-800">
            <div
              onClick={() => setLogoutDialogOpen(true)}
              className={`flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-all duration-200 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              id="header-logout-button"
              title={sidebarCollapsed ? 'Cerrar Sesión' : ''}
            >
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <LogOut className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-medium text-red-600">Cerrar Sesión</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal de confirmación de logout */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <LogOut className="w-5 h-5 text-red-500" />
                Cerrar sesión
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                ¿Estás seguro que deseas cerrar sesión? Tendrás que volver a iniciar sesión para acceder a tu portal.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setLogoutDialogOpen(false)}
                className="flex-1 sm:flex-none text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setLogoutDialogOpen(false);
                  onLogout();
                }}
                className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600"
              >
                Sí, cerrar sesión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {/* Header - Oculto en vista de chat */}
          {currentView !== 'chat' && (
            <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-transparent px-4 md:px-6 py-3">
              <div className="flex items-center justify-between">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    {/* Compact title section */}
                    <div>
                      <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-gray-100 tracking-tight leading-tight">{getViewTitle()}</h1>
                      <p className="text-xs text-slate-600 dark:text-gray-400 font-medium hidden sm:block">
                        {currentView === 'dashboard' ? `Bienvenido, ${socio.nombres}` : `${socio.nombres}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  <NotificationBell />

                  <button
                    id="header-tutorial-button"
                    onClick={() => startSidebarTutorial(socio.nombres)}
                    className="hidden md:flex p-1.5 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                    title="Tutorial"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>

                  <Badge
                    className={`shadow-sm font-medium text-xs !border-0 hidden sm:inline-flex ${
                      totalDeuda > 0
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {totalDeuda === 0 ? 'Al día' : `Deuda: ${formatCurrency(totalDeuda)}`}
                  </Badge>

                  <ThemeToggle />
                </div>
              </div>
            </header>
          )}

          {/* Main Content */}
          <main className="flex-1 min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-gray-950 dark:to-gray-900 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Tutorial Modal */}
      <TutorialSocio
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
        currentLocation={getCurrentLocationText()}
        userName={`${socio.nombres} ${socio.apellidos}`}
        onNavigate={setCurrentView}
        onReopenTutorial={() => setIsTutorialOpen(true)}
      />

      {/* Sidebar Tutorial with Driver.js */}
      <SidebarTutorial userName={socio.nombres} />
    </SidebarProvider>
  );
}

// Componente separado para el contenido del dashboard
const DashboardContent = React.memo(function DashboardContent({ socio, formatCurrency, deudaStatus, setCurrentView, totalDeuda, pendingBoletas, handleProceedToPay, proximoVencimiento, totalFacturado, totalPagado, boletas }: any) {
  // Hook para obtener datos de consumo
  const { consumoMesActual, tieneMedidor, isLoadingLecturas } = useConsumo();

  // Removed console.log to prevent loops

  // Generar datos del gráfico de historial basados en boletas reales
  const getHistorialData = () => {
    if (!boletas || boletas.length === 0) {
      return [];
    }

    // Agrupar boletas por mes
    const boletasPorMes: { [key: string]: any[] } = {};
    boletas.forEach((boleta: any) => {
      if (boleta.fechaEmision) {
        const fecha = new Date(boleta.fechaEmision);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const mesNombre = fecha.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');

        if (!boletasPorMes[mesKey]) {
          boletasPorMes[mesKey] = [];
        }
        boletasPorMes[mesKey].push({
          ...boleta,
          mesNombre: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)
        });
      }
    });

    // Convertir a array y ordenar por fecha
    const historialData = Object.keys(boletasPorMes)
      .sort()
      .slice(-6) // Últimos 6 meses
      .map(mesKey => {
        const boletasDelMes = boletasPorMes[mesKey];
        const totalMes = boletasDelMes.reduce((sum, b) => sum + (b.montoTotal || 0), 0);
        const todasPagadas = boletasDelMes.every(b => b.estado === 'pagada');

        return {
          mes: boletasDelMes[0].mesNombre,
          monto: totalMes,
          pagado: todasPagadas
        };
      });

    return historialData.length > 0 ? historialData : [
      { mes: 'Sin datos', monto: 0, pagado: false }
    ];
  };

  const historialData = getHistorialData();

  try {
    return (
    <div className="p-3 md:p-4">
      {/* Resumen de Estado */}
      <div id="welcome-cards" className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
              {/* Card de Consumo - Clickeable */}
              <Card
                className="!bg-white dark:!bg-gray-800 !border-0 shadow-md md:shadow-lg hover:shadow-xl transition-all cursor-pointer"
                onClick={() => setCurrentView('mis-consumos')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Consumo del Mes</CardTitle>
                  <Droplets className="h-3.5 w-3.5 md:h-4 md:w-4 icon-theme-primary" />
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="text-xl md:text-2xl font-bold text-theme-primary">
                    {isLoadingLecturas ? (
                      <span className="text-gray-400">...</span>
                    ) : tieneMedidor ? (
                      `${consumoMesActual} m³`
                    ) : (
                      <span className="text-gray-400 text-sm">Sin medidor</span>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    {tieneMedidor ? 'm³ consumidos' : 'No asignado'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full text-[10px] md:text-xs h-8 md:h-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('mis-consumos');
                    }}
                  >
                    Ver Historial
                  </Button>
                </CardContent>
              </Card>

              <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-md md:shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Próximo Vencimiento</CardTitle>
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                    <CardContent className="px-4 md:px-6">
                  <div className={`text-xl md:text-2xl font-bold ${proximoVencimiento?.color || 'text-gray-500'}`}>
                    {proximoVencimiento?.vencido && proximoVencimiento?.dias < 0 ? (
                      <span className="text-destructive">{Math.abs(proximoVencimiento.dias)} días</span>
                    ) : proximoVencimiento?.vencido && proximoVencimiento?.dias === 0 ? (
                      <span className="text-destructive">HOY</span>
                    ) : proximoVencimiento?.dias ? (
                      <span>{proximoVencimiento.dias} días</span>
                    ) : (
                      <span className="text-gray-500">--</span>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    {proximoVencimiento?.texto || 'Calculando...'}
                  </p>
                </CardContent>
              </Card>

              <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-md md:shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Deuda Total</CardTitle>
                  <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="text-xl md:text-2xl font-bold text-destructive">
                    {formatCurrency(totalDeuda)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${deudaStatus.color}`} />
                    <p className="text-[10px] md:text-xs text-muted-foreground">{deudaStatus.text}</p>
                  </div>
                  {totalDeuda > 0 && (
                    <Button
                      size="sm"
                      className="mt-2 button-theme-success w-full text-[10px] md:text-xs h-8 md:h-9"
                      onClick={() => handleProceedToPay(pendingBoletas.map((b: any) => b.id))}
                    >
                      <CreditCard className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Pagar Todo
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-md md:shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
                  <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Estado General</CardTitle>
                  {totalDeuda === 0 ? (
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 status-dot-success" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 status-dot-warning" />
                  )}
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  <div className="text-lg md:text-2xl font-bold">
                    {totalDeuda === 0 ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0 text-xs md:text-sm">
                        Al día
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0 text-xs md:text-sm">
                        Con deuda
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    Estado de cuenta
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Acciones Rápidas */}
            <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-md md:shadow-lg mb-6 md:mb-8">
              <CardHeader className="px-4 md:px-6 py-4 md:py-6">
                <CardTitle className="flex items-center gap-2 text-sm md:text-base dark:text-gray-100">
                  <Receipt className="w-4 h-4 md:w-5 md:h-5" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <button
                    onClick={() => setCurrentView('consumo')}
                    className="h-20 md:h-24 flex flex-col items-center justify-center gap-1.5 md:gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all cursor-pointer group"
                  >
                    <div className="p-1.5 md:p-2 rounded-lg bg-blue-500 text-white group-hover:scale-110 transition-transform">
                      <Droplets className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Mi Consumo</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('boletas')}
                    className="h-20 md:h-24 flex flex-col items-center justify-center gap-1.5 md:gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all cursor-pointer group"
                  >
                    <div className="p-1.5 md:p-2 rounded-lg bg-purple-500 text-white group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Mis Boletas</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('mis-pagos')}
                    className="h-20 md:h-24 flex flex-col items-center justify-center gap-1.5 md:gap-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all cursor-pointer group"
                  >
                    <div className="p-1.5 md:p-2 rounded-lg bg-indigo-500 text-white group-hover:scale-110 transition-transform">
                      <Receipt className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Mis Pagos</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('pago')}
                    disabled={totalDeuda === 0}
                    className={`h-20 md:h-24 flex flex-col items-center justify-center gap-1.5 md:gap-2 rounded-xl transition-all group ${
                      totalDeuda === 0
                        ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                        : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                    }`}
                  >
                    <div className={`p-1.5 md:p-2 rounded-lg text-white ${
                      totalDeuda === 0 ? 'bg-gray-400' : 'bg-green-500 group-hover:scale-110'
                    } transition-transform`}>
                      <CreditCard className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Pagar</span>
                    {totalDeuda > 0 && (
                      <span className="text-[10px] md:text-xs font-semibold text-green-700 dark:text-green-400">{formatCurrency(totalDeuda)}</span>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentView('historial')}
                    className="h-20 md:h-24 flex flex-col items-center justify-center gap-1.5 md:gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all cursor-pointer group"
                  >
                    <div className="p-1.5 md:p-2 rounded-lg bg-orange-500 text-white group-hover:scale-110 transition-transform">
                      <History className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Historial</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('chat')}
                    className="h-24 flex flex-col items-center justify-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-all cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-500 text-white group-hover:scale-110 transition-transform">
                      <MessageCircle size={24} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat Soporte</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Historial y Deuda */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de Historial de Pagos */}
              <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                    <History size={20} />
                    Historial de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Pagado', value: totalPagado, color: '#10b981' },
                            { name: 'Pendiente', value: totalDeuda, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Pagado', value: totalPagado, color: '#10b981' },
                            { name: 'Pendiente', value: totalDeuda, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`$${value.toLocaleString('es-CL')}`, '']}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value, entry: any) => `${value}: $${entry.payload.value.toLocaleString('es-CL')}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Estado de Deuda */}
              <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                    <DollarSign size={20} />
                    Estado de Deuda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { categoria: 'Facturado', monto: totalFacturado, color: '#3b82f6' },
                          { categoria: 'Pagado', monto: totalPagado, color: '#10b981' },
                          { categoria: 'Pendiente', monto: totalDeuda, color: '#ef4444' }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="categoria" stroke="#64748b" fontSize={12} />
                        <YAxis
                          stroke="#64748b"
                          fontSize={12}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Monto']}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                          {[
                            { categoria: 'Facturado', monto: totalFacturado, color: '#3b82f6' },
                            { categoria: 'Pagado', monto: totalPagado, color: '#10b981' },
                            { categoria: 'Pendiente', monto: totalDeuda, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(totalFacturado)}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400">Total Facturado</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totalPagado)}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400">Total Pagado</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totalDeuda)}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400">Pendiente</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerta de Deuda */}
            {totalDeuda > 0 && (
              <Card className="!bg-white dark:!bg-gray-800 !border-0 shadow-lg mt-6 status-warning">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="status-dot-warning mt-0.5" size={20} />
                    <div>
                      <h3 className="font-semibold text-current dark:text-gray-100">
                        Tienes deuda pendiente
                      </h3>
                      <p className="text-sm text-current opacity-90 mt-1 dark:text-gray-300">
                        Tu deuda actual es de <strong>{formatCurrency(totalDeuda)}</strong>.
                        Te recomendamos realizar el pago lo antes posible para evitar recargos.
                      </p>
                      <Button
                        onClick={() => setCurrentView('pago')}
                        className="mt-3"
                        size="sm"
                      >
                        Pagar Ahora
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      );
  } catch (error) {
    console.error('❌ Error in DashboardContent:', error);
    return (
      <div className="p-6">
        <div className="status-error rounded-lg p-4">
          <h3 className="text-current font-medium">Error al cargar el dashboard</h3>
          <p className="text-current opacity-90 text-sm mt-1">
            Ha ocurrido un error. Por favor, recarga la página.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    return <div>Error al cargar el dashboard</div>;
  }
});