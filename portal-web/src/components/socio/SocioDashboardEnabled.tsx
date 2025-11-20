import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Menu,
  X,
  BookOpen,
  TrendingUp,
  Calendar,
  Droplets,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator
} from '@/components/ui/sidebar';

// Import enabled components
import BoletasViewEnabled from './BoletasViewEnabled';
import BoletaDetalle from './BoletaDetalle';
import PagoCheckoutEnabled from './PagoCheckoutEnabled';
import ChatSocioView from './ChatSocioView';
import PerfilSocioView from './PerfilSocioView';
import TutorialSocio from './TutorialSocio';
import SidebarTutorial, { useSidebarTutorial } from './SidebarTutorial';
import FloatingChatbot from '@/components/ui/FloatingChatbot';

// Import hooks
import { useBoletas } from '@/hooks/useBoletas';
import { usePayments } from '@/hooks/usePayments';

import type { Socio } from '@/types';

type SocioView = 'dashboard' | 'boletas' | 'pago' | 'historial' | 'chat' | 'perfil' | 'boleta-detalle';

interface SocioDashboardEnabledProps {
  socio: Socio;
  onLogout: () => void;
}

export default function SocioDashboardEnabled({ socio, onLogout }: SocioDashboardEnabledProps) {
  const [currentView, setCurrentView] = useState<SocioView>('dashboard');
  const [selectedBoletaIds, setSelectedBoletaIds] = useState<string[]>([]);
  const [selectedBoletaId, setSelectedBoletaId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [pagosDropdownOpen, setPagosDropdownOpen] = useState(false);

  // Use our custom hooks
  const {
    boletas,
    isLoading: boletasLoading,
    pendingBoletas,
    totalDeuda,
    refetch: refetchBoletas,
    getBoletaQuery
  } = useBoletas();

  const { getPaymentHistoryQuery } = usePayments();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('es-CL');

  const getDeudaStatus = () => {
    if (totalDeuda === 0) return { color: 'bg-green-500', text: 'Sin deuda' };
    if (totalDeuda > 50000) return { color: 'bg-red-500', text: 'Crítica' };
    return { color: 'bg-yellow-500', text: 'Pendiente' };
  };

  const deudaStatus = getDeudaStatus();

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'boletas': return 'Mis Boletas';
      case 'pago': return 'Realizar Pago';
      case 'historial': return 'Historial de Pagos';
      case 'chat': return 'Chat de Soporte';
      case 'perfil': return 'Mi Perfil';
      case 'boleta-detalle': return 'Detalle de Boleta';
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
      id: 'pago' as SocioView,
      title: 'Realizar Pago',
      icon: CreditCard,
      onClick: () => setCurrentView('pago'),
      disabled: totalDeuda === 0
    },
    {
      id: 'historial' as SocioView,
      title: 'Historial',
      icon: History,
      onClick: () => setCurrentView('historial')
    },
    {
      id: 'chat' as SocioView,
      title: 'Soporte',
      icon: MessageCircle,
      onClick: () => setCurrentView('chat')
    }
  ];

  const { startSidebarTutorial } = useSidebarTutorial();

  const tutorialItems = [
    {
      id: 'sidebar-tutorial',
      title: 'Tutorial del Menú',
      icon: BookOpen,
      onClick: () => startSidebarTutorial(socio.nombres)
    }
  ];

  const handleProceedToPay = (boletaIds: string[]) => {
    setSelectedBoletaIds(boletaIds);
    setCurrentView('pago');
  };

  const handleViewBoleta = (boletaId: string) => {
    setSelectedBoletaId(boletaId);
    setCurrentView('boleta-detalle');
  };

  const handlePaymentSuccess = (result: any) => {
    setPaymentSuccess(true);
    refetchBoletas(); // Refresh boletas after successful payment
    setTimeout(() => {
      setCurrentView('dashboard');
      setPaymentSuccess(false);
      setSelectedBoletaIds([]);
    }, 3000);
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    // You could show a toast or alert here
  };

  const renderDashboard = () => {
    const recentBoletas = boletas.slice(0, 3);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return (
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            ¡Bienvenido, {socio.nombres}!
          </h2>
          <p className="opacity-90">
            Código de socio: {socio.codigoSocio}
          </p>
        </div>

        {/* Payment Success Message */}
        {paymentSuccess && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  ¡Pago procesado exitosamente! Tus boletas han sido actualizadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Deuda</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalDeuda)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
              <div className="mt-4 flex items-center">
                <Badge className={deudaStatus.color}>
                  {deudaStatus.text}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Boletas Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {pendingBoletas.length}
                  </p>
                </div>
                <Receipt className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {pendingBoletas.filter(b => b.estado === 'vencida').length} vencidas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Boletas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {boletas.length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {boletas.filter(b => b.estado === 'pagada').length} pagadas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Último Consumo</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {recentBoletas[0]?.consumoM3 || 0} m³
                  </p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {recentBoletas[0]?.periodo || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {totalDeuda > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={20} />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => handleProceedToPay(pendingBoletas.map(b => b.id))}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar Toda la Deuda ({formatCurrency(totalDeuda)})
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentView('boletas')}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Ver Boletas Pendientes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Boletas */}
        <Card>
          <CardHeader>
            <CardTitle>Boletas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBoletas.map((boleta) => (
                <div key={boleta.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">#{boleta.numeroBoleta}</span>
                      <Badge variant={
                        boleta.estado === 'pagada' ? 'default' : 
                        boleta.estado === 'vencida' ? 'destructive' : 'secondary'
                      }>
                        {boleta.estado === 'pagada' ? 'Pagada' : 
                         boleta.estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Período: {boleta.periodo} • Consumo: {boleta.consumoM3} m³
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(boleta.montoTotal)}</div>
                    <div className="text-sm text-gray-500">
                      Vence: {formatDate(boleta.fechaVencimiento)}
                    </div>
                  </div>
                </div>
              ))}
              
              {boletas.length === 0 && !boletasLoading && (
                <div className="text-center py-8 text-gray-500">
                  No hay boletas registradas
                </div>
              )}
              
              {boletasLoading && (
                <div className="text-center py-8 text-gray-500">
                  Cargando boletas...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'boletas':
        return (
          <BoletasViewEnabled
            onBack={() => setCurrentView('dashboard')}
            onProceedToPay={handleProceedToPay}
            onViewDetalle={handleViewBoleta}
          />
        );

      case 'pago':
        return (
          <PagoCheckoutEnabled
            selectedBoletaIds={selectedBoletaIds}
            onBack={() => setCurrentView('dashboard')}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        );

      case 'boleta-detalle':
        const boletaQuery = getBoletaQuery(selectedBoletaId!);
        if (boletaQuery.data) {
          return (
            <BoletaDetalle
              boleta={boletaQuery.data}
              onBack={() => setCurrentView('boletas')}
              onPagar={(id) => handleProceedToPay([id])}
              onDownloadPDF={(id) => console.log('Download PDF:', id)}
            />
          );
        }
        return <div>Cargando detalle de boleta...</div>;

      case 'chat':
        return (
          <ChatSocioView
            onBack={() => setCurrentView('dashboard')}
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
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Historial de Pagos</h2>
            <p className="text-gray-600">Funcionalidad en desarrollo...</p>
            <Button onClick={() => setCurrentView('dashboard')} className="mt-4">
              Volver al Dashboard
            </Button>
          </div>
        );

      default:
        return renderDashboard();
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">Portal APR</h2>
                <p className="text-xs text-muted-foreground">Socio</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    className={`w-full justify-start ${
                      currentView === item.id ? 'bg-accent' : ''
                    } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={item.disabled}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.title}
                    {item.id === 'boletas' && pendingBoletas.length > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {pendingBoletas.length}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <SidebarSeparator />

            <SidebarMenu>
              {tutorialItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={item.onClick} className="w-full justify-start">
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{socio.nombres}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {socio.codigoSocio}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView('perfil')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{getViewTitle()}</span>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>

      <FloatingChatbot />
      <SidebarTutorial />
    </SidebarProvider>
  );
}