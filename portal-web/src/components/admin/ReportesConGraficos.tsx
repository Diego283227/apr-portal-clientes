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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

// Interfaces (reutilizando las del componente anterior)
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
  };
  pagosPorMetodo: Array<{
    _id: {
      metodoPago: string;
      estado: string;
    };
    cantidad: number;
    montoTotal: number;
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

// Colores para los gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ReportesConGraficos() {
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
      console.log('🔍 Estado actual antes de solicitar:', {
        periodoFinanciero,
        fechaFinanciero,
        fechaFinancieroType: typeof fechaFinanciero
      });

      console.log('🔍 Solicitando reporte financiero con:', {
        periodo: periodoFinanciero,
        fecha: fechaFinanciero
      });

      const response = await apiClient.get('/reportes/financiero', {
        params: {
          periodo: periodoFinanciero,
          fecha: fechaFinanciero
        }
      });

      console.log('📊 RESPUESTA COMPLETA DEL BACKEND:', response.data);
      console.log('📊 REPORTE FINANCIERO COMPLETO:', JSON.stringify(response.data.data, null, 2));
      console.log('📊 Ingresos:', response.data.data?.ingresos);
      console.log('📊 Egresos:', response.data.data?.egresos);
      console.log('📊 Boletas Stats:', response.data.data?.boletasEstadisticas);

      setReporteFinanciero(response.data.data);
    } catch (error) {
      console.error('❌ Error loading financial report:', error);
      if (error.response) {
        console.error('❌ Response error:', error.response.data);
      }
    }
  };

  const loadReporteSocios = async () => {
    try {
      const response = await apiClient.get('/reportes/socios');
      console.log('👥 REPORTE SOCIOS RECIBIDO:', response.data.data);
      console.log('👥 Socios Activos:', response.data.data?.sociosActivos);
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
      console.log('💳 REPORTE PAGOS RECIBIDO:', response.data.data);
      console.log('💳 Pagos por día:', response.data.data?.pagosPorDia);
      setReportePagos(response.data.data);
    } catch (error) {
      console.error('Error loading payments report:', error);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv', reportType: string) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Reporte ${reportType} exportado como ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar el reporte');
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para gráficos
  const prepareIncomeData = () => {
    if (!reporteFinanciero) return [];

    const allData = [
      { name: 'PayPal', value: reporteFinanciero.ingresos.paypal, color: '#0088FE' },
      { name: 'Efectivo', value: reporteFinanciero.ingresos.efectivo, color: '#00C49F' },
      { name: 'Transferencia', value: reporteFinanciero.ingresos.transferencia, color: '#FFBB28' },
      { name: 'MercadoPago', value: reporteFinanciero.ingresos.mercadopago, color: '#FF8042' },
    ];

    // Filtrar solo los que tienen valor > 0
    const data = allData.filter(item => item.value > 0);

    console.log('💰 Todos los ingresos:', allData);
    console.log('💰 Datos de ingresos preparados (filtrados):', data);

    // Si no hay datos, retornar un mensaje indicativo
    return data.length > 0 ? data : allData;
  };

  const prepareBoletasData = () => {
    if (!reporteFinanciero) return [];

    const data = [
      { name: 'Pagadas', value: reporteFinanciero.boletasEstadisticas.pagadas, color: '#00C49F' },
      { name: 'Pendientes', value: reporteFinanciero.boletasEstadisticas.pendientes, color: '#FFBB28' },
      { name: 'Vencidas', value: reporteFinanciero.boletasEstadisticas.vencidas, color: '#FF8042' },
    ];

    console.log('📄 Datos de boletas preparados:', data);
    return data;
  };

  const preparePagosTimeline = () => {
    if (!reportePagos) return [];

    const data = reportePagos.pagosPorDia.map(item => ({
      fecha: `${item._id.día}/${item._id.mes}`,
      cantidad: item.cantidad,
      monto: item.montoTotal
    }));

    console.log('📈 Datos de timeline de pagos preparados:', data);
    return data;
  };

  const prepareSociosData = () => {
    if (!reporteSocios) return [];

    const data = [
      { name: 'Sin Deuda', value: reporteSocios.resumen.sociosSinDeuda, color: '#00C49F' },
      { name: 'Con Deuda', value: reporteSocios.resumen.sociosConDeuda, color: '#FF8042' },
    ];

    console.log('👥 Datos de socios preparados:', data);
    return data;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${typeof entry.value === 'number' && entry.dataKey === 'monto'
                ? formatCurrency(entry.value)
                : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
                <BarChart3 className="w-5 h-5" />
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

            {/* Filtros de la sección activa */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Filtros</h3>

              {activeTab === 'financiero' && (
                <>
                  <div className="px-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Período</Label>
                    <Select value={periodoFinanciero} onValueChange={setPeriodoFinanciero}>
                      <SelectTrigger className="w-full mt-1 border-0 bg-gray-100 dark:bg-gray-700 shadow-sm">
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

                  <div className="px-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Fecha de Referencia</Label>
                    <Input
                      type="date"
                      value={fechaFinanciero}
                      onChange={(e) => setFechaFinanciero(e.target.value)}
                      className="w-full mt-1 border-0 bg-gray-100 dark:bg-gray-700 shadow-sm"
                    />
                  </div>
                </>
              )}

              {activeTab === 'socios' && (
                <div className="px-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Fecha de Referencia</Label>
                  <Input
                    type="date"
                    value={fechaInicioReporte}
                    onChange={(e) => setFechaInicioReporte(e.target.value)}
                    className="w-full mt-1 border-0 bg-gray-100 dark:bg-gray-700 shadow-sm"
                  />
                </div>
              )}

              {activeTab === 'pagos' && (
                <div className="px-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Fecha de Referencia</Label>
                  <Input
                    type="date"
                    value={fechaInicioReporte}
                    onChange={(e) => setFechaInicioReporte(e.target.value)}
                    className="w-full mt-1 border-0 bg-gray-100 dark:bg-gray-700 shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Acciones</h3>

              <button
                onClick={() => {
                  if (activeTab === 'financiero') loadReporteFinanciero();
                  else if (activeTab === 'socios') loadReporteSocios();
                  else if (activeTab === 'pagos') loadReportePagos();
                  setMenuOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
                <span className="font-medium">Generar Reporte</span>
              </button>

              <button
                onClick={() => {
                  loadReportes();
                  setMenuOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span className="font-medium">Actualizar Todo</span>
              </button>
            </div>

            {/* Exportar */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Exportar Reporte</h3>

              <button
                onClick={() => {
                  exportReport('pdf', activeTab);
                  setMenuOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition-all disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Exportar PDF</div>
                  <div className="text-xs opacity-75">Reporte completo</div>
                </div>
              </button>

              <button
                onClick={() => {
                  exportReport('excel', activeTab);
                  setMenuOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Exportar Excel</div>
                  <div className="text-xs opacity-75">Múltiples hojas</div>
                </div>
              </button>

              <button
                onClick={() => {
                  exportReport('csv', activeTab);
                  setMenuOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition-all disabled:opacity-50"
              >
                <Table className="w-5 h-5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Exportar CSV</div>
                  <div className="text-xs opacity-75">Datos tabulares</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Reportes y Analytics</h1>
          <p className="text-muted-foreground">
            Análisis completo con visualizaciones avanzadas
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
            <BarChart3 className="w-4 h-4 mr-2" />
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

        {/* Reporte Financiero con Gráficos */}
        <TabsContent value="financiero" className="space-y-6">
          {/* Filtros - Solo visible en desktop */}
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all hidden lg:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Análisis Financiero Avanzado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Período</Label>
                  <Select value={periodoFinanciero} onValueChange={setPeriodoFinanciero}>
                    <SelectTrigger className="w-32 border-0 bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
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
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Referencia</Label>
                  <Input
                    type="date"
                    value={fechaFinanciero}
                    onChange={(e) => setFechaFinanciero(e.target.value)}
                    className="w-40 border-0 bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-md transition-all"
                  />
                </div>
                <button
                  onClick={loadReporteFinanciero}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  Generar
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Exportar
                    </button>
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
            </CardContent>
          </Card>

          {/* Datos y Gráficos - Visible en todas las pantallas */}
          {reporteFinanciero && (
                <div className="space-y-6">
                  {/* KPIs principales */}
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

                  {/* Gráficos principales */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfico de torta - Ingresos por método */}
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="w-5 h-5" />
                          Distribución de Ingresos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {prepareIncomeData().filter(item => item.value > 0).length > 0 ? (
                          <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <RechartsPieChart>
                                <Pie
                                  data={prepareIncomeData().filter(item => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {prepareIncomeData().filter(item => item.value > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <DollarSign className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-center">No hay ingresos registrados en este período</p>
                            <p className="text-sm text-center mt-2">Los gráficos se mostrarán cuando haya pagos completados</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Gráfico de barras - Estado de boletas */}
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Estado de Boletas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <BarChart data={prepareBoletasData()}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#8884d8">
                                {prepareBoletasData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gráfico de área - Flujo de ingresos vs egresos */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="w-5 h-5" />
                        Análisis de Flujo de Caja
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reporteFinanciero.ingresos.total > 0 || reporteFinanciero.egresos.total > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <AreaChart
                              data={[
                                {
                                  periodo: reporteFinanciero.periodo.label,
                                  ingresos: reporteFinanciero.ingresos.total,
                                  egresos: reporteFinanciero.egresos.total,
                                  utilidad: reporteFinanciero.utilidad
                                }
                              ]}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="periodo" />
                              <YAxis tickFormatter={(value) => formatCurrency(value).replace('CLP', '')} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Area
                                type="monotone"
                                dataKey="ingresos"
                                stroke="#00C49F"
                                fill="#00C49F"
                                fillOpacity={0.6}
                                name="Ingresos"
                              />
                              <Area
                                type="monotone"
                                dataKey="egresos"
                                stroke="#FF8042"
                                fill="#FF8042"
                                fillOpacity={0.6}
                                name="Egresos"
                              />
                              <Area
                                type="monotone"
                                dataKey="utilidad"
                                stroke="#0088FE"
                                fill="#0088FE"
                                fillOpacity={0.3}
                                name="Utilidad"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-center">No hay datos de flujo de caja en este período</p>
                          <p className="text-sm text-center mt-2">El gráfico se mostrará cuando haya ingresos o egresos registrados</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
        </TabsContent>

        {/* Reporte de Socios con Gráficos */}
        <TabsContent value="socios" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Análisis de Socios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reporteSocios && (
                <div className="space-y-6">
                  {/* KPIs de socios */}
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

                  {/* Gráficos de socios */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Distribución de socios por estado de deuda */}
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="w-5 h-5" />
                          Distribución por Estado de Deuda
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <RechartsPieChart>
                              <Pie
                                data={prepareSociosData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {prepareSociosData().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top 5 socios más activos */}
                    <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Top 5 Socios Más Activos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reporteSocios.sociosActivos && reporteSocios.sociosActivos.length > 0 ? (
                          <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <BarChart
                                data={reporteSocios.sociosActivos.slice(0, 5).map(socio => ({
                                  nombre: `${socio.nombres.split(' ')[0]} ${socio.apellidos.split(' ')[0]}`,
                                  pagos: socio.totalPagos,
                                  monto: socio.montoTotal
                                }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="nombre" />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="pagos" fill="#0088FE" name="Número de Pagos" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Users className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-center">No hay socios activos con pagos registrados</p>
                            <p className="text-sm text-center mt-2">El gráfico se mostrará cuando los socios realicen pagos</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporte de Pagos con Gráficos */}
        <TabsContent value="pagos" className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all hidden lg:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Análisis de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={fechaInicioReporte}
                    onChange={(e) => setFechaInicioReporte(e.target.value)}
                    className="w-40 border-0 bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-md transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha Fin</Label>
                  <Input
                    type="date"
                    value={fechaFinReporte}
                    onChange={(e) => setFechaFinReporte(e.target.value)}
                    className="w-40 border-0 bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-md transition-all"
                  />
                </div>
                <button
                  onClick={loadReportePagos}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Generar
                </button>
              </div>

              {reportePagos && (
                <div className="space-y-6">
                  {/* KPIs de pagos */}
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

                  {/* Gráfico de línea - Evolución de pagos por día */}
                  <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="w-5 h-5" />
                        Evolución de Pagos en el Tiempo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {preparePagosTimeline().length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <RechartsLineChart data={preparePagosTimeline()}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="fecha" />
                              <YAxis yAxisId="left" />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatCurrency(value).replace('CLP', '')} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Line yAxisId="left" type="monotone" dataKey="cantidad" stroke="#0088FE" strokeWidth={2} name="Cantidad de Pagos" />
                              <Line yAxisId="right" type="monotone" dataKey="monto" stroke="#00C49F" strokeWidth={3} name="Monto Total" />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <Clock className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-center">No hay pagos registrados en el período seleccionado</p>
                          <p className="text-sm text-center mt-2">Ajusta las fechas o espera a que se registren nuevos pagos</p>
                        </div>
                      )}
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