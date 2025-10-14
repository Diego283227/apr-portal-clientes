import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Receipt,
  CreditCard,
  BarChart3,
  PieChart,
  LineChart,
  FileSpreadsheet,
  Table,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Menu,
  X
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

interface ReporteFinanciero {
  periodo: {
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    label: string;
  };
  ingresos: {
    total: number;
    paypal: number;
    efectivo: number;
    transferencia: number;
    mercadopago: number;
  };
  egresos: {
    total: number;
    mantenimiento: number;
    operacion: number;
    administracion: number;
  };
  utilidad: number;
  morosidad: number;
  boletasEstadisticas: {
    total: number;
    pagadas: number;
    pendientes: number;
    vencidas: number;
    montoTotal: number;
    montoPagado: number;
    montoPendiente: number;
  };
  resumen: {
    totalFacturado: number;
    totalCobrado: number;
    eficienciaCobranza: number;
    margenUtilidad: number;
  };
}

interface ReporteSocios {
  resumen: {
    totalSocios: number;
    sociosConDeuda: number;
    sociosSinDeuda: number;
    deudaTotalAcumulada: number;
    deudaPromedio: number;
  };
  distribucionSaldos: Array<{
    _id: number;
    count: number;
    saldoPromedio: number;
  }>;
  sociosActivos: Array<{
    nombres: string;
    apellidos: string;
    codigoSocio: string;
    totalPagos: number;
    montoTotal: number;
    ultimoPago: string;
  }>;
  crecimientoMensual: Array<{
    _id: { año: number; mes: number };
    nuevos: number;
  }>;
}

interface ReportePagos {
  periodo: {
    fechaInicio: string;
    fechaFin: string;
  };
  resumen: {
    totalPagos: number;
    montoTotal: number;
    eficienciaCobranza: number;
    tiempoPromedioPago: number;
    pagosCompletados?: number;
  };
  pagosPorMetodo: Array<{
    _id: {
      metodoPago: string;
      estado: string;
    };
    cantidad: number;
    montoTotal: number;
  }>;
  todosPagos?: Array<{
    _id: string;
    cantidad: number;
    montoTotal: number;
    completados: number;
    pendientes: number;
  }>;
  pagosPorDia: Array<{
    _id: { día: number; mes: number; año: number };
    cantidad: number;
    montoTotal: number;
  }>;
  estadisticas: {
    totalBoletas: number;
    boletasPagadas: number;
    pendientesCobro: number;
  };
}

export default function ReportesAdminView() {
  const [reporteFinanciero, setReporteFinanciero] = useState<ReporteFinanciero | null>(null);
  const [reporteSocios, setReporteSocios] = useState<ReporteSocios | null>(null);
  const [reportePagos, setReportePagos] = useState<ReportePagos | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('financiero');
  const [menuOpen, setMenuOpen] = useState(false);

  // Filtros
  const [periodoFinanciero, setPeriodoFinanciero] = useState('mes');
  const [fechaFinanciero, setFechaFinanciero] = useState(new Date().toISOString().split('T')[0]);
  const [fechaInicioReporte, setFechaInicioReporte] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [fechaFinReporte, setFechaFinReporte] = useState(
    new Date().toISOString().split('T')[0]
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CL');

  // Cargar reportes al montar el componente
  useEffect(() => {
    loadReportes();
  }, []);

  const loadReportes = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadReporteFinanciero(),
        loadReporteSocios(),
        loadReportePagos()
      ]);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const loadReporteFinanciero = async () => {
    try {
      const response = await apiClient.get('/reportes/financiero', {
        params: {
          periodo: periodoFinanciero,
          fecha: fechaFinanciero
        }
      });
      setReporteFinanciero(response.data.data);
    } catch (error) {
      console.error('Error loading financial report:', error);
    }
  };

  const loadReporteSocios = async () => {
    try {
      const response = await apiClient.get('/reportes/socios');
      setReporteSocios(response.data.data);
    } catch (error) {
      console.error('Error loading members report:', error);
    }
  };

  const loadReportePagos = async () => {
    try {
      const response = await apiClient.get('/reportes/pagos', {
        params: {
          fechaInicio: fechaInicioReporte,
          fechaFin: fechaFinReporte
        }
      });
      setReportePagos(response.data.data);
    } catch (error) {
      console.error('Error loading payments report:', error);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv', reportType: string) => {
    try {
      setLoading(true);

      // Simular exportación (implementar lógica real según necesidades)
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Reporte ${reportType} exportado como ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'positivo':
        return <Badge className="bg-green-100 text-green-800">Positivo</Badge>;
      case 'negativo':
        return <Badge className="bg-red-100 text-red-800">Negativo</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Neutral</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Overlay del menú */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menú lateral desplegable desde la derecha - Solo móvil */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 lg:hidden ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header del menú */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Navegación</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Contenido del menú */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Secciones de reportes */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Secciones</h3>

              <button
                onClick={() => {
                  setActiveTab('financiero');
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'financiero'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Financiero</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('socios');
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'socios'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Socios</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('pagos');
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'pagos'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Pagos</span>
              </button>
            </div>

            {/* Acción Actualizar */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Acciones</h3>

              <button
                onClick={() => {
                  loadReportes();
                  setMenuOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span className="font-medium">Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes Administrativos</h1>
          <p className="text-muted-foreground">
            Análisis completo y reportes del sistema APR
          </p>
        </div>

        {/* Botón hamburguesa - Solo en móvil */}
        <button
          onClick={() => setMenuOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Botón Actualizar - Solo en desktop */}
        <div className="hidden lg:flex items-center gap-3">
          <Button
            onClick={loadReportes}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs principales - Solo en desktop */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden lg:grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="financiero">
            <DollarSign className="w-4 h-4 mr-2" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="socios">
            <Users className="w-4 h-4 mr-2" />
            Socios
          </TabsTrigger>
          <TabsTrigger value="pagos">
            <CreditCard className="w-4 h-4 mr-2" />
            Pagos
          </TabsTrigger>
        </TabsList>

        {/* Reporte Financiero */}
        <TabsContent value="financiero" className="space-y-6">
          {/* Filtros */}
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Reporte Financiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={periodoFinanciero} onValueChange={setPeriodoFinanciero}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mes">Mes</SelectItem>
                      <SelectItem value="trimestre">Trimestre</SelectItem>
                      <SelectItem value="semestre">Semestre</SelectItem>
                      <SelectItem value="año">Año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Referencia</Label>
                  <Input
                    type="date"
                    value={fechaFinanciero}
                    onChange={(e) => setFechaFinanciero(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={loadReporteFinanciero} disabled={loading}>
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  Generar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportReport('pdf', 'financiero')}>
                      <FileText className="w-4 h-4 mr-2 text-red-600" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportReport('excel', 'financiero')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportReport('csv', 'financiero')}>
                      <Table className="w-4 h-4 mr-2 text-blue-600" />
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {reporteFinanciero && (
                <div className="space-y-6">
                  {/* Resumen Principal */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(reporteFinanciero.ingresos.total)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-8 h-8 text-red-600" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Egresos</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(reporteFinanciero.egresos.total)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Target className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Utilidad</p>
                            <p className={`text-2xl font-bold ${reporteFinanciero.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(reporteFinanciero.utilidad)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-8 h-8 text-orange-600" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Morosidad</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {formatPercentage(reporteFinanciero.morosidad)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Desglose de Ingresos */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle>Desglose de Ingresos por Método de Pago</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">PayPal</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(reporteFinanciero.ingresos.paypal)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Efectivo</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(reporteFinanciero.ingresos.efectivo)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Transferencia</p>
                          <p className="text-xl font-bold text-purple-600">
                            {formatCurrency(reporteFinanciero.ingresos.transferencia)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">MercadoPago</p>
                          <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(reporteFinanciero.ingresos.mercadopago)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Estadísticas de Boletas */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle>Estadísticas de Boletas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Boletas Pagadas</p>
                          <p className="text-2xl font-bold text-green-600">
                            {reporteFinanciero.boletasEstadisticas.pagadas}
                          </p>
                          <p className="text-xs text-green-700">
                            {formatCurrency(reporteFinanciero.boletasEstadisticas.montoPagado)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Pendientes</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {reporteFinanciero.boletasEstadisticas.pendientes}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Vencidas</p>
                          <p className="text-2xl font-bold text-red-600">
                            {reporteFinanciero.boletasEstadisticas.vencidas}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Indicadores de Rendimiento */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle>Indicadores de Rendimiento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Eficiencia Cobranza</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatPercentage(reporteFinanciero.resumen.eficienciaCobranza)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Margen Utilidad</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatPercentage(reporteFinanciero.resumen.margenUtilidad)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Total Facturado</p>
                          <p className="text-xl font-bold text-purple-600">
                            {formatCurrency(reporteFinanciero.resumen.totalFacturado)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow-sm">
                          <p className="text-sm text-muted-foreground">Total Cobrado</p>
                          <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(reporteFinanciero.resumen.totalCobrado)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporte de Socios */}
        <TabsContent value="socios" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Reporte de Socios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportReport('pdf', 'socios')}>
                      <FileText className="w-4 h-4 mr-2 text-red-600" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportReport('excel', 'socios')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                      Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {reporteSocios && (
                <div className="space-y-6">
                  {/* Resumen de Socios */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-sm text-muted-foreground">Total Socios</p>
                          <p className="text-2xl font-bold">{reporteSocios.resumen.totalSocios}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <p className="text-sm text-muted-foreground">Sin Deuda</p>
                          <p className="text-2xl font-bold text-green-600">
                            {reporteSocios.resumen.sociosSinDeuda}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                          <p className="text-sm text-muted-foreground">Con Deuda</p>
                          <p className="text-2xl font-bold text-red-600">
                            {reporteSocios.resumen.sociosConDeuda}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                          <p className="text-sm text-muted-foreground">Deuda Total</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(reporteSocios.resumen.deudaTotalAcumulada)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <p className="text-sm text-muted-foreground">Deuda Promedio</p>
                          <p className="text-lg font-bold text-purple-600">
                            {formatCurrency(reporteSocios.resumen.deudaPromedio)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Socios Más Activos */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle>Top 10 Socios Más Activos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {reporteSocios.sociosActivos.map((socio, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium">{socio.nombres} {socio.apellidos}</p>
                                <p className="text-sm text-muted-foreground">{socio.codigoSocio}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{socio.totalPagos} pagos</p>
                              <p className="text-sm text-green-600">{formatCurrency(socio.montoTotal)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporte de Pagos */}
        <TabsContent value="pagos" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Reporte de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={fechaInicioReporte}
                    onChange={(e) => setFechaInicioReporte(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={fechaFinReporte}
                    onChange={(e) => setFechaFinReporte(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={loadReportePagos} disabled={loading}>
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Generar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportReport('pdf', 'pagos')}>
                      <FileText className="w-4 h-4 mr-2 text-red-600" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportReport('excel', 'pagos')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                      Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {reportePagos && (
                <div className="space-y-6">
                  {/* Resumen de Pagos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Receipt className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-sm text-muted-foreground">Total Pagos</p>
                          <p className="text-2xl font-bold">{reportePagos.resumen.totalPagos}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <p className="text-sm text-muted-foreground">Monto Total</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(reportePagos.resumen.montoTotal)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Target className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <p className="text-sm text-muted-foreground">Eficiencia</p>
                          <p className="text-xl font-bold text-purple-600">
                            {formatPercentage(reportePagos.resumen.eficienciaCobranza)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                          <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                          <p className="text-xl font-bold text-orange-600">
                            {Math.abs(reportePagos.resumen.tiempoPromedioPago).toFixed(1)} días
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pagos por Método */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle>Pagos por Método de Pago</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Resumen general por método */}
                        {reportePagos.todosPagos && reportePagos.todosPagos.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Resumen General</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {reportePagos.todosPagos.map((metodo, index) => (
                                <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                      metodo._id === 'paypal' ? 'bg-blue-500' :
                                      metodo._id === 'efectivo' ? 'bg-green-500' :
                                      metodo._id === 'transferencia' ? 'bg-purple-500' :
                                      metodo._id === 'mercadopago' ? 'bg-orange-500' :
                                      'bg-gray-500'
                                    }`} />
                                    <span className="font-medium capitalize">{metodo._id}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Total</p>
                                      <p className="font-semibold">{metodo.cantidad}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Monto</p>
                                      <p className="font-semibold">{formatCurrency(metodo.montoTotal)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Completados</p>
                                      <p className="font-semibold text-green-600">{metodo.completados}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Pendientes</p>
                                      <p className="font-semibold text-yellow-600">{metodo.pendientes}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detalle por estado */}
                        <div>
                          <h4 className="font-semibold mb-3">Detalle por Estado</h4>
                          <div className="space-y-3">
                            {reportePagos.pagosPorMetodo.map((metodo, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    metodo._id.metodoPago === 'paypal' ? 'bg-blue-500' :
                                    metodo._id.metodoPago === 'efectivo' ? 'bg-green-500' :
                                    metodo._id.metodoPago === 'transferencia' ? 'bg-purple-500' :
                                    metodo._id.metodoPago === 'mercadopago' ? 'bg-orange-500' :
                                    'bg-gray-500'
                                  }`} />
                                  <div>
                                    <p className="font-medium capitalize">{metodo._id.metodoPago}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Estado: <span className={`font-medium ${
                                        metodo._id.estado === 'completado' ? 'text-green-600' :
                                        metodo._id.estado === 'pendiente' ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`}>{metodo._id.estado}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{metodo.cantidad} pagos</p>
                                  <p className="text-sm text-green-600">
                                    {formatCurrency(metodo.montoTotal)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mensaje si no hay datos */}
                        {(!reportePagos.pagosPorMetodo || reportePagos.pagosPorMetodo.length === 0) && (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No se encontraron pagos en el período seleccionado</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Verifica las fechas o realiza algunos pagos para ver datos
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}