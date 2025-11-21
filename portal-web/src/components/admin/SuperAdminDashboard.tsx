import { useState, useEffect } from "react";
import { useSocketContext } from "@/contexts/SocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "@/components/shared/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Receipt,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Settings,
  BarChart3,
  Download,
  LogOut,
  Calendar,
  MessageSquare,
  History,
  MessageCircle,
  Home,
  UserCheck,
  CreditCard,
  Shield,
  Menu,
  FileText,
  FileSpreadsheet,
  Table,
  RefreshCw,
  ChevronDown,
  Bot,
  Gauge,
  Megaphone,
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";

// Importaciones de componentes
import SMSAdminView from "./SMSAdminView";
// WhatsApp admin view removed
import SociosAdminView from "./SociosAdminView";
import ChatAdminView from "./ChatAdminView";
import GlobalMessageView from "./GlobalMessageView";
import PerfilAdminView from "./PerfilAdminView";
import AnalyticsView from "./AnalyticsView";
import AIAssistantManager from "./AIAssistantManager";
import BoletaManagement from "./BoletaManagement";
import ReportesConGraficos from "./ReportesConGraficos";
import { exportToPDF, exportToExcel, exportToCSV } from "@/utils/exportUtils";
import PagosAdminWrapper from "./PagosAdminWrapper";
import HistoryAuditView from "./HistoryAuditView";
import SystemConfigView from "./SystemConfigView";
import TarifasConfigView from "./TarifasConfigView";
import ConsumoView from "./ConsumoView";
import MedidoresView from "./MedidoresView";
import ContactosView from "./ContactosView";

import type { DashboardStats, SuperAdmin } from "@/types";

type AdminView =
  | "dashboard"
  | "boletas"
  | "pagos"
  | "socios"
  | "reportes"
  | "configuracion"
  | "tarifas"
  | "history"
  | "sms"
  | "chat"
  | "analytics"
  | "perfil"
  | "ai-assistant"
  | "consumo"
  | "medidores"
  | "global-message"
  | "contactos";

interface SuperAdminDashboardProps {
  admin: SuperAdmin;
  stats: DashboardStats;
  onLogout: () => void;
}

export default function SuperAdminDashboard({
  admin,
  stats,
  onLogout,
}: SuperAdminDashboardProps) {
  const { socket, isConnected } = useSocketContext();
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [realtimeStats, setRealtimeStats] = useState(stats);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Starts collapsed on mobile
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [ultimosSocios, setUltimosSocios] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Socket.IO integration for real-time PayPal payments
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log("🏛️ AdminDashboard: No socket connection available");
      return;
    }

    console.log("🏛️ AdminDashboard: Setting up socket listeners");

    // Listen for new income from PayPal payments
    const handleNewIncome = (data: any) => {
      console.log("💰 New PayPal income received:", data);

      // Update stats in real-time
      setRealtimeStats((prev) => ({
        ...prev,
        ingresosMes: prev.ingresosMes + (data.data?.amount || 0),
        ingresosTotales: prev.ingresosTotales + (data.data?.amount || 0),
      }));

      // Show notification (optional)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(data.title, {
          body: data.message,
          icon: "/favicon.ico",
        });
      }
    };

    // Listen for dashboard refresh signals
    const handleRefreshDashboard = (data: any) => {
      console.log("🔄 Dashboard refresh requested:", data);

      if (data.reason === "new_payment_received" && data.amount) {
        setRealtimeStats((prev) => ({
          ...prev,
          ingresosMes: prev.ingresosMes + data.amount,
          ingresosTotales: prev.ingresosTotales + data.amount,
        }));
      }
    };

    // Register socket listeners
    socket.on("new_income", handleNewIncome);
    socket.on("refresh_dashboard_stats", handleRefreshDashboard);

    // Cleanup listeners
    return () => {
      console.log("🏛️ AdminDashboard: Cleaning up socket listeners");
      socket.off("new_income", handleNewIncome);
      socket.off("refresh_dashboard_stats", handleRefreshDashboard);
    };
  }, [socket, isConnected]);

  // Initialize and update realtime stats from props
  useEffect(() => {
    // Solo actualizar si:
    // 1. Los stats tienen datos reales (ingresosTotales > 0), O
    // 2. Es la primera carga Y realtimeStats aún está en 0
    const hasRealData =
      stats.ingresosTotales > 0 ||
      stats.boletasPagadas > 0 ||
      stats.totalSocios > 0;
    const isFirstLoad =
      realtimeStats.ingresosTotales === 0 && realtimeStats.boletasPagadas === 0;

    if (hasRealData) {
      console.log("📊 Actualizando stats con datos reales:", stats);
      setRealtimeStats(stats);
    } else if (isFirstLoad) {
      console.log("📊 Primera carga de stats (pueden estar vacíos):", stats);
      setRealtimeStats(stats);
    } else {
      console.log(
        "⚠️ Ignorando actualización con stats vacíos (ya hay datos cargados)"
      );
    }
  }, [
    stats.ingresosTotales,
    stats.boletasPagadas,
    stats.boletasPendientes,
    stats.totalSocios,
  ]); // Actualizar cuando cambien valores clave

  // Fetch últimos socios activos
  useEffect(() => {
    const fetchUltimosSocios = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/socios/ultimos-activos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUltimosSocios(data.slice(0, 5)); // Solo los primeros 5
        }
      } catch (error) {
        console.error('Error al cargar últimos socios:', error);
      }
    };

    fetchUltimosSocios();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getMorosidadStatus = () => {
    if (realtimeStats.morosidad < 5)
      return { color: "text-green-600", icon: TrendingDown, label: "Baja" };
    if (realtimeStats.morosidad < 15)
      return { color: "text-yellow-600", icon: TrendingUp, label: "Media" };
    return { color: "text-red-600", icon: AlertTriangle, label: "Alta" };
  };

  const morosidadStatus = getMorosidadStatus();

  const handleExportDashboard = async (format: "pdf" | "excel" | "csv") => {
    try {
      setIsExporting(true);

      // Preparar datos para exportación
      const exportData = {
        totalSocios: realtimeStats.totalSocios,
        sociosActivos: Math.floor(realtimeStats.totalSocios * 0.85),
        sociosInactivos: Math.floor(realtimeStats.totalSocios * 0.15),
        ingresosMes: realtimeStats.ingresosMes,
        ingresosTotales: realtimeStats.ingresosTotales,
        boletasPendientes: realtimeStats.boletasPendientes,
        boletasPagadas: realtimeStats.boletasPagadas,
        morosidad: realtimeStats.morosidad,
        crecimientoMensual: 12.5,
      };

      // Simular tiempo de procesamiento
      await new Promise((resolve) => setTimeout(resolve, 500));

      switch (format) {
        case "pdf":
          exportToPDF(exportData, "mes");
          break;
        case "excel":
          exportToExcel(exportData, "mes");
          break;
        case "csv":
          exportToCSV(exportData, "mes");
          break;
      }
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Panel de Administración";
      case "boletas":
        return "Gestión de Boletas";
      case "pagos":
        return "Gestión de Pagos";
      case "socios":
        return "Gestión de Socios";
      case "reportes":
        return "Reportes y Analytics";
      case "analytics":
        return "Analytics Dashboard";
      case "configuracion":
        return "Configuración del Sistema";
      case "tarifas":
        return "Configuración de Tarifas";
      case "perfil":
        return "Mi Perfil";
      case "history":
        return "Auditoría y Logs";
      case "sms":
        return "Notificaciones SMS";
      // WhatsApp case removed
      case "chat":
        return "Chat Socio";
      case "ai-assistant":
        return "Asistente Virtual APR";
      case "contactos":
        return "Contactos";
      default:
        return "Panel de Administración";
    }
  };

  const sidebarItems = [
    {
      id: "dashboard" as AdminView,
      title: "Dashboard",
      icon: Home,
      onClick: () => setCurrentView("dashboard"),
    },
    {
      id: "socios" as AdminView,
      title: "Socios",
      icon: Users,
      onClick: () => setCurrentView("socios"),
      badge: realtimeStats.totalSocios,
    },
    {
      id: "boletas" as AdminView,
      title: "Boletas",
      icon: Receipt,
      onClick: () => setCurrentView("boletas"),
      badge:
        realtimeStats.boletasPendientes > 0
          ? realtimeStats.boletasPendientes
          : undefined,
    },
    {
      id: "consumo" as AdminView,
      title: "Consumo",
      icon: Gauge,
      onClick: () => setCurrentView("consumo"),
    },
    {
      id: "medidores" as AdminView,
      title: "Medidores",
      icon: Gauge,
      onClick: () => setCurrentView("medidores"),
    },
    {
      id: "pagos" as AdminView,
      title: "Pagos",
      icon: CreditCard,
      onClick: () => setCurrentView("pagos"),
    },
    {
      id: "reportes" as AdminView,
      title: "Reportes",
      icon: BarChart3,
      onClick: () => setCurrentView("reportes"),
    },
    {
      id: "analytics" as AdminView,
      title: "Analytics",
      icon: TrendingUp,
      onClick: () => setCurrentView("analytics"),
    },
    {
      id: "history" as AdminView,
      title: "Auditoría",
      icon: History,
      onClick: () => setCurrentView("history"),
    },
    {
      id: "sms" as AdminView,
      title: "SMS",
      icon: MessageSquare,
      onClick: () => setCurrentView("sms"),
    },
    // WhatsApp menu item removed
    {
      id: "chat" as AdminView,
      title: "Chat Socio",
      icon: MessageCircle,
      onClick: () => setCurrentView("chat"),
    },
    {
      id: "contactos" as AdminView,
      title: "Contactos",
      icon: MessageSquare,
      onClick: () => setCurrentView("contactos"),
    },
    {
      id: "global-message" as AdminView,
      title: "Mensaje Global",
      icon: Megaphone,
      onClick: () => setCurrentView("global-message"),
    },
    {
      id: "ai-assistant" as AdminView,
      title: "Asistente Virtual",
      icon: Bot,
      onClick: () => setCurrentView("ai-assistant"),
    },
    {
      id: "tarifas" as AdminView,
      title: "Tarifas",
      icon: DollarSign,
      onClick: () => setCurrentView("tarifas"),
    },
    {
      id: "configuracion" as AdminView,
      title: "Configuración",
      icon: Settings,
      onClick: () => setCurrentView("configuracion"),
    },
  ];

  const renderContent = () => {
    switch (currentView) {
      case "boletas":
        return (
          <div className="p-6">
            <BoletaManagement />
          </div>
        );
      case "consumo":
        return <ConsumoView />;
      case "medidores":
        return <MedidoresView />;
      case "pagos":
        return <PagosAdminWrapper />;
      case "socios":
        return <SociosAdminView />;
      case "chat":
        return <ChatAdminView onBack={() => setCurrentView("dashboard")} />;
      case "contactos":
        return <ContactosView />;
      case "global-message":
        return <GlobalMessageView onBack={() => setCurrentView("dashboard")} />;
      case "ai-assistant":
        return <AIAssistantManager />;
      case "history":
        return <HistoryAuditView onBack={() => setCurrentView("dashboard")} />;
      case "sms":
        return <SMSAdminView />;
      // WhatsApp view removed
      case "analytics":
        return (
          <AnalyticsView
            stats={{
              totalSocios: stats.totalSocios,
              sociosActivos: Math.floor(stats.totalSocios * 0.85),
              sociosInactivos: Math.floor(stats.totalSocios * 0.15),
              ingresosMes: stats.ingresosMes,
              ingresosTotales: stats.ingresosTotales,
              boletasPendientes: stats.boletasPendientes,
              boletasPagadas: stats.boletasPagadas,
              morosidad: stats.morosidad,
              crecimientoMensual: 12.5,
            }}
          />
        );
      case "perfil":
        return (
          <PerfilAdminView
            admin={{
              id: admin.id || "admin-001",
              nombres: admin.nombres || "Administrador",
              apellidos: admin.apellidos || "Sistema",
              rut: admin.rut || "12345678-9",
              email: admin.email || "admin@apr.cl",
              telefono: admin.telefono || "",
              direccion: admin.direccion || "",
              rol: admin.rol || "super_admin",
              fechaCreacion: admin.fechaCreacion || new Date().toISOString(),
              ultimoAcceso: admin.ultimoAcceso,
              activo: admin.activo !== undefined ? admin.activo : true,
              permisos: admin.permisos || [],
            }}
            onBack={() => setCurrentView("dashboard")}
          />
        );
      case "reportes":
        return <ReportesConGraficos />;
      case "configuracion":
        return <SystemConfigView />;
      case "tarifas":
        return <TarifasConfigView />;
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <AdminDashboardContent
      admin={admin}
      stats={realtimeStats}
      formatCurrency={formatCurrency}
      formatPercentage={formatPercentage}
      morosidadStatus={morosidadStatus}
      setCurrentView={setCurrentView}
      isExporting={isExporting}
      handleExportDashboard={handleExportDashboard}
      isConnected={isConnected}
      ultimosSocios={ultimosSocios}
    />
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed left-0 top-0 bottom-0 flex flex-col bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
            sidebarCollapsed
              ? "-translate-x-full lg:translate-x-0 lg:w-16"
              : "translate-x-0 w-64"
          }`}
        >
          {/* Header con hamburguesa */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              {/* Botón hamburguesa */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={
                  sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"
                }
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {!sidebarCollapsed && (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-lg flex items-center justify-center shadow-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-lg text-foreground dark:text-gray-100">
                    Admin Portal
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Contenido del sidebar */}
          <div className="flex-1 overflow-y-auto px-4 py-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-700">
            {/* Perfil de admin - solo icono cuando está colapsado */}
            {!sidebarCollapsed && (
              <div
                className="relative mb-4 p-3 bg-gradient-to-br from-white via-red-50/30 to-slate-50 dark:bg-gradient-to-br dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-800/50 rounded-xl shadow-sm border border-slate-200/60 dark:border-gray-600/30 cursor-pointer hover:shadow-md hover:border-red-200/60 dark:hover:border-red-600/40 transition-all duration-300"
                onClick={() => setCurrentView("perfil")}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 via-red-700 to-purple-600 dark:from-red-700 dark:via-red-800 dark:to-purple-700 rounded-xl flex items-center justify-center shadow-md">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground dark:text-white text-sm truncate">
                      {admin.nombres}
                    </h3>
                    <Badge className="text-xs bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-600 dark:to-orange-600 text-white border-none shadow-sm">
                      Super Admin
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="mb-4">
              {!sidebarCollapsed && (
                <h4 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">
                  Panel Principal
                </h4>
              )}
              <div className="space-y-2">
                {sidebarItems.map((item) => {
                  const isActive = item.id === currentView;
                  return (
                    <div
                      key={item.id}
                      onClick={item.onClick}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-150 relative ${
                        isActive
                          ? "bg-gradient-to-r from-red-100 to-red-50 dark:bg-gradient-to-r dark:from-gray-700/70 dark:via-gray-600/60 dark:to-gray-700/50"
                          : "hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gradient-to-r dark:hover:from-gray-700/50 dark:hover:via-gray-600/40 dark:hover:to-gray-700/30"
                      } ${sidebarCollapsed ? "justify-center" : ""}`}
                      title={sidebarCollapsed ? item.title : ""}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isActive
                            ? "bg-gradient-to-br from-red-600 to-red-800 dark:from-red-700 dark:to-red-900 text-white"
                            : "bg-gray-200 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>

                      {!sidebarCollapsed && (
                        <>
                          <span
                            className={`font-medium flex-1 ${
                              isActive
                                ? "text-red-700 dark:text-red-300 font-semibold"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {item.title}
                          </span>

                          {item.badge && (
                            <Badge
                              variant={
                                item.id === "boletas"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs font-bold !border-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}

                      {!sidebarCollapsed && isActive && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-red-600 dark:bg-red-500 rounded-l-full"></div>
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
                sidebarCollapsed ? "justify-center" : ""
              }`}
              title={sidebarCollapsed ? "Cerrar Sesión" : ""}
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
                Cerrar Sesión
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                ¿Estás seguro que deseas cerrar sesión? Tendrás que volver a
                iniciar sesión para acceder al panel de administración.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={() => setLogoutDialogOpen(false)}
                className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setLogoutDialogOpen(false);
                  onLogout();
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                Sí, cerrar sesión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div
          className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
          }`}
        >
          {/* Header - Oculto en vista de chat */}
          {currentView !== "chat" && (
            <header className="bg-white px-4 md:px-6 py-3 sticky top-0 z-20 shadow-sm">
              <div className="flex items-center justify-between">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>

                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                      {getViewTitle()}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium hidden sm:block">
                      {currentView === "dashboard"
                        ? `Bienvenido, ${admin.nombres}`
                        : `${admin.nombres}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  {/* Botón de logout - Solo móvil */}
                  <button
                    onClick={() => setLogoutDialogOpen(true)}
                    className="lg:hidden p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-5 h-5 text-red-600" />
                  </button>

                  <NotificationBell />
                  <Badge
                    variant={
                      realtimeStats.morosidad > 10 ? "destructive" : "secondary"
                    }
                    className={`shadow-sm font-medium text-xs hidden sm:inline-flex ${
                      realtimeStats.morosidad > 10
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    Morosidad: {formatPercentage(realtimeStats.morosidad)}
                  </Badge>
                  {isConnected && (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none shadow-sm animate-pulse text-xs hidden md:inline-flex">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
                      En tiempo real
                    </Badge>
                  )}
                </div>
              </div>
            </header>
          )}

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100/50 min-h-screen overflow-hidden">
            <div className="h-full">{renderContent()}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Función separada para el contenido del dashboard
function AdminDashboardContent({
  admin,
  stats,
  formatCurrency,
  formatPercentage,
  morosidadStatus,
  setCurrentView,
  isExporting,
  handleExportDashboard,
  isConnected,
  ultimosSocios,
}: any) {
  return (
    <div className="p-4 md:p-6">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Socios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSocios}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios registrados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Ingresos
              {isConnected && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  🔴 Real-time
                </span>
              )}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.ingresosTotales)}
            </div>
            <p className="text-xs text-muted-foreground">
              💰 Histórico acumulado
            </p>
            {isConnected && (
              <p className="text-xs text-green-600 mt-1">
                ⚡ Actualizaciones automáticas
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Boletas Pendientes
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.boletasPendientes}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.boletasPagadas} boletas pagadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Morosidad</CardTitle>
            <morosidadStatus.icon
              className={`h-4 w-4 ${morosidadStatus.color}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${morosidadStatus.color}`}>
              {formatPercentage(stats.morosidad)}
            </div>
            <p className="text-xs text-muted-foreground">
              Nivel {morosidadStatus.label.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Últimos Socios Activos - Sin card, directo en fondo */}
      {ultimosSocios.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 px-2">
            Últimos Socios Activos
          </h3>
          <div className="flex items-center justify-start gap-6">
            {ultimosSocios.map((socio, index) => {
              const colors = [
                'bg-purple-100',
                'bg-pink-100', 
                'bg-blue-100',
                'bg-amber-100',
                'bg-cyan-100'
              ];
              return (
                <div 
                  key={socio._id} 
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => setCurrentView('socios')}
                >
                  <div className={`${colors[index % 5]} rounded-full p-3 mb-2 transition-transform group-hover:scale-110`}>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={socio.avatar} alt={socio.nombres} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-bold">
                        {socio.nombres?.charAt(0)}{socio.apellidos?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {socio.nombres?.split(' ')[0]}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {socio.ultimoPago > 0 ? formatCurrency(socio.ultimoPago).replace('$', '$') : '$0'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen Financiero */}
      <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={20} />
              Resumen Financiero
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="!border-0 !bg-green-500 hover:!bg-green-600 !text-white !shadow-md hover:!shadow-lg transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <RefreshCw size={16} className="mr-1 animate-spin" />
                  ) : (
                    <Download size={16} className="mr-1" />
                  )}
                  Exportar
                  <ChevronDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg"
              >
                <DropdownMenuItem
                  onClick={() => handleExportDashboard("pdf")}
                  className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4 text-red-600" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportDashboard("excel")}
                  className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md cursor-pointer"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportDashboard("csv")}
                  className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md cursor-pointer"
                >
                  <Table className="mr-2 h-4 w-4 text-blue-600" />
                  Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Ingresos
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.ingresosTotales)}
              </p>
              <p className="text-xs text-green-700 dark:text-green-500">
                Histórico acumulado
              </p>
            </div>

            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Pagos Este Mes
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.boletasPagadas}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-500">
                Boletas procesadas
              </p>
            </div>

            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Pendientes
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.boletasPendientes}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-500">
                Por cobrar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card
          className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => setCurrentView("boletas")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt size={20} />
              Gestión de Boletas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Ver, crear y gestionar todas las boletas del sistema
            </p>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.boletasPendientes + stats.boletasPagadas}
              </div>
              <button className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-sm font-medium">
                Gestionar
              </button>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => setCurrentView("pagos")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              Pagos Recibidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Revisar y gestionar todos los pagos procesados
            </p>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.ingresosTotales)}
              </div>
              <button className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-sm font-medium">
                Ver Pagos
              </button>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => setCurrentView("reportes")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Reportes Contables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Generar reportes financieros y contables
            </p>
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium text-gray-700">
                Mensual, Anual
              </div>
              <button className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-sm font-medium flex items-center gap-1">
                <Download size={16} />
                Generar
              </button>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          onClick={() => setCurrentView("history")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History size={20} />
              Auditoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Historial de actividades y logs del sistema
            </p>
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium text-gray-700">
                Logs, Actividad
              </div>
              <button className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all text-sm font-medium">
                Ver Historial
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Calendar size={20} />
              Resumen Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">PayPal (Testing):</span>
                <span className="font-semibold text-blue-800">
                  {formatCurrency(stats.ingresosMes)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">Pagos:</span>
                <span className="font-semibold text-blue-800">
                  {stats.boletasPagadas}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">Morosidad:</span>
                <span className={`font-semibold ${morosidadStatus.color}`}>
                  {formatPercentage(stats.morosidad)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Notificaciones */}
      {stats.morosidad > 10 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  Atención: Alta Morosidad
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  La tasa de morosidad es de {formatPercentage(stats.morosidad)}
                  . Se recomienda contactar a los socios con deudas pendientes.
                </p>
                <Button
                  onClick={() => setCurrentView("socios")}
                  className="mt-3 bg-yellow-600 hover:bg-yellow-700"
                  size="sm"
                >
                  Ver Socios Morosos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
