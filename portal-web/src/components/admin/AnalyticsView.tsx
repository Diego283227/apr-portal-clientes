import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Receipt,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  FileText,
  Table,
  FileSpreadsheet,
  Menu,
  X
} from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '@/utils/exportUtils';

interface AnalyticsData {
  totalSocios: number;
  sociosActivos: number;
  sociosInactivos: number;
  ingresosMes: number;
  ingresosTotales: number;
  boletasPendientes: number;
  boletasPagadas: number;
  morosidad: number;
  crecimientoMensual: number;
}

interface AnalyticsViewProps {
  stats?: AnalyticsData;
}

export default function AnalyticsView({ stats }: AnalyticsViewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'mes' | 'trimestre' | 'año'>('mes');
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Mock data si no se proporcionan stats
  const defaultStats: AnalyticsData = {
    totalSocios: 245,
    sociosActivos: 230,
    sociosInactivos: 15,
    ingresosMes: 1250000,
    ingresosTotales: 18500000,
    boletasPendientes: 45,
    boletasPagadas: 198,
    morosidad: 8.5,
    crecimientoMensual: 12.5
  };

  const analyticsData = stats || defaultStats;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatPercentage = (value: number) => 
    `${value.toFixed(1)}%`;

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular carga de datos
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setIsLoading(true);
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      switch (format) {
        case 'pdf':
          exportToPDF(analyticsData, selectedPeriod);
          break;
        case 'excel':
          exportToExcel(analyticsData, selectedPeriod);
          break;
        case 'csv':
          exportToCSV(analyticsData, selectedPeriod);
          break;
        default:
          throw new Error('Formato de exportación no válido');
      }
      
      // Show success feedback (optional - you can add a toast library later)
      console.log(`Reporte ${format.toUpperCase()} generado exitosamente`);
      
    } catch (error) {
      console.error('Error al exportar:', error);
      // Show error feedback (optional - you can add a toast library later)
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="lg"
          className="rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
        >
          <Eye className="w-5 h-5 mr-2" />
          Mostrar Analytics
        </Button>
      </div>
    );
  }

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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Opciones</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Contenido del menú */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Selector de período */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Período</h3>
              {(['mes', 'trimestre', 'año'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setSelectedPeriod(period);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                    selectedPeriod === period
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Acciones */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Acciones</h3>

              <button
                onClick={() => {
                  handleRefresh();
                  setMenuOpen(false);
                }}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="font-medium">Actualizar</span>
              </button>

              <button
                onClick={() => {
                  setIsVisible(false);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
              >
                <EyeOff className="w-5 h-5" />
                <span className="font-medium">Ocultar Dashboard</span>
              </button>
            </div>

            {/* Exportar */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Exportar</h3>

              <button
                onClick={() => {
                  handleExport('pdf');
                  setMenuOpen(false);
                }}
                disabled={isLoading}
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
                  handleExport('excel');
                  setMenuOpen(false);
                }}
                disabled={isLoading}
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
                  handleExport('csv');
                  setMenuOpen(false);
                }}
                disabled={isLoading}
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

      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">Análisis detallado del sistema</p>
        </div>

        {/* Botón hamburguesa - Solo en móvil */}
        <button
          onClick={() => setMenuOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Controles - Solo en desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex rounded-xl shadow-sm bg-white dark:bg-gray-800">
            {(['mes', 'trimestre', 'año'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={() => setIsVisible(false)}
            variant="outline"
            size="sm"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Ocultar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Socios</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {analyticsData.totalSocios}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <p className="text-xs text-green-600">
                +{formatPercentage(analyticsData.crecimientoMensual)} este {selectedPeriod}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(analyticsData.ingresosMes)}
            </div>
            <p className="text-xs text-green-600">
              Total histórico: {formatCurrency(analyticsData.ingresosTotales)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Boletas</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {analyticsData.boletasPendientes}
            </div>
            <p className="text-xs text-orange-600">
              {analyticsData.boletasPagadas} pagadas este {selectedPeriod}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Morosidad</CardTitle>
            {analyticsData.morosidad < 10 ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analyticsData.morosidad < 10 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(analyticsData.morosidad)}
            </div>
            <p className="text-xs text-purple-600">
              {analyticsData.morosidad < 10 ? 'Nivel saludable' : 'Requiere atención'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análisis detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Distribución de Socios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Socios Activos</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{analyticsData.sociosActivos}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage((analyticsData.sociosActivos / analyticsData.totalSocios) * 100)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Socios Inactivos</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{analyticsData.sociosInactivos}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage((analyticsData.sociosInactivos / analyticsData.totalSocios) * 100)}
                  </p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(analyticsData.sociosActivos / analyticsData.totalSocios) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Estado de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Boletas Pagadas</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{analyticsData.boletasPagadas}</p>
                  <p className="text-xs text-green-600">
                    {formatPercentage((analyticsData.boletasPagadas / (analyticsData.boletasPagadas + analyticsData.boletasPendientes)) * 100)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Boletas Pendientes</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{analyticsData.boletasPendientes}</p>
                  <p className="text-xs text-yellow-600">
                    {formatPercentage((analyticsData.boletasPendientes / (analyticsData.boletasPagadas + analyticsData.boletasPendientes)) * 100)}
                  </p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${(analyticsData.boletasPagadas / (analyticsData.boletasPagadas + analyticsData.boletasPendientes)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones de exportación - Solo en desktop */}
      <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all hidden lg:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar Reportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isLoading}
              className="flex items-center gap-2 h-16 flex-col justify-center bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl shadow-sm transition-all"
            >
              <FileText className="w-6 h-6 text-red-600" />
              <span className="font-medium">Exportar PDF</span>
              <span className="text-xs text-muted-foreground">Reporte completo</span>
            </button>

            <button
              onClick={() => handleExport('excel')}
              disabled={isLoading}
              className="flex items-center gap-2 h-16 flex-col justify-center bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
              <span className="font-medium">Exportar Excel</span>
              <span className="text-xs text-muted-foreground">Múltiples hojas</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={isLoading}
              className="flex items-center gap-2 h-16 flex-col justify-center bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl shadow-sm transition-all"
            >
              <Table className="w-6 h-6 text-blue-600" />
              <span className="font-medium">Exportar CSV</span>
              <span className="text-xs text-muted-foreground">Datos tabulares</span>
            </button>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Generando reporte...</span>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Los reportes incluyen:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Métricas principales del {selectedPeriod} seleccionado</li>
              <li>Análisis de distribución de socios y pagos</li>
              <li>Indicadores de riesgo y recomendaciones</li>
              <li>Datos financieros detallados</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}