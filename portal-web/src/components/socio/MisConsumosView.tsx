import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Droplets,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useConsumo } from '@/hooks/useConsumo';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface MisConsumosViewProps {
  onBack: () => void;
  onVerDetallesMedidor?: () => void;
}

export default function MisConsumosView({ onBack, onVerDetallesMedidor }: MisConsumosViewProps) {
  const {
    lecturas,
    medidor,
    isLoadingLecturas,
    isLoadingMedidor,
    errorLecturas,
    errorMedidor,
    consumoMesActual,
    promedioConsumo,
    tieneMedidor
  } = useConsumo();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPeriodo = (periodoString: string) => {
    const date = new Date(periodoString);
    return date.toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Preparar datos para el gráfico - Mostrar los últimos 12 meses
  const chartData = (() => {
    const now = new Date();
    const months = [];

    // Generar los últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Buscar si hay lectura para este mes
      const lectura = lecturas.find(l => {
        const lecturaDate = new Date(l.periodo);
        const lecturaKey = `${lecturaDate.getFullYear()}-${String(lecturaDate.getMonth() + 1).padStart(2, '0')}`;
        return lecturaKey === monthKey;
      });

      months.push({
        periodo: date.toLocaleDateString('es-CL', { month: 'short' }),
        consumo: lectura?.consumoM3 || 0,
        fecha: lectura?.fechaLectura || null
      });
    }

    return months;
  })();

  const getTrendencia = () => {
    if (lecturas.length < 2) return null;

    const ultimoConsumo = lecturas[0]?.consumoM3 || 0;
    const penultimoConsumo = lecturas[1]?.consumoM3 || 0;

    if (ultimoConsumo > penultimoConsumo) {
      return {
        tipo: 'aumento',
        porcentaje: penultimoConsumo > 0
          ? Math.round(((ultimoConsumo - penultimoConsumo) / penultimoConsumo) * 100)
          : 0,
        icon: TrendingUp,
        color: 'text-red-600 dark:text-red-400'
      };
    } else if (ultimoConsumo < penultimoConsumo) {
      return {
        tipo: 'disminución',
        porcentaje: penultimoConsumo > 0
          ? Math.round(((penultimoConsumo - ultimoConsumo) / penultimoConsumo) * 100)
          : 0,
        icon: TrendingDown,
        color: 'text-green-600 dark:text-green-400'
      };
    }
    return null;
  };

  const tendencia = getTrendencia();

  if (isLoadingLecturas || isLoadingMedidor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando información de consumo...</p>
        </div>
      </div>
    );
  }

  if (!tieneMedidor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-gray-400 mb-4">
              <Droplets size={64} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
              No tienes un medidor asignado
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Por favor, contacta al administrador para que te asigne un medidor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi Consumo de Agua</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Historial y estadísticas de consumo
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información del Medidor */}
        <Card
          className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02]"
          onClick={onVerDetallesMedidor}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-lg">
                <Droplets className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Medidor Asignado</h3>
                <p className="text-2xl font-bold">{medidor?.numero || 'N/A'}</p>
                <p className="text-sm opacity-90 mt-1">Código Socio: {medidor?.codigoSocio || 'N/A'}</p>
              </div>
              <div className="text-white/70">
                <ArrowLeft className="w-6 h-6 transform rotate-180" />
              </div>
            </div>
            <p className="text-xs opacity-75 mt-2">Haz clic para ver detalles completos</p>
          </CardContent>
        </Card>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">Consumo Este Mes</CardTitle>
              <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {consumoMesActual} m³
              </div>
              {tendencia && (
                <div className={`flex items-center gap-1 mt-1 ${tendencia.color}`}>
                  <tendencia.icon className="w-4 h-4" />
                  <p className="text-xs font-medium">
                    {tendencia.porcentaje}% {tendencia.tipo} vs mes anterior
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">Promedio Mensual</CardTitle>
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {promedioConsumo} m³
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                Basado en {lecturas.length} {lecturas.length === 1 ? 'lectura' : 'lecturas'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">Última Lectura</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {lecturas[0] ? `${lecturas[0].lecturaActual} m³` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                {lecturas[0] ? formatDate(lecturas[0].fechaLectura) : 'Sin lecturas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Consumo */}
        {lecturas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Activity size={20} />
                Historial de Consumo (Últimos 12 Meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" />
                    <XAxis
                      dataKey="periodo"
                      stroke="#64748b"
                      className="dark:stroke-gray-400"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#64748b"
                      className="dark:stroke-gray-400"
                      fontSize={12}
                      label={{ value: 'm³', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`${value} m³`, 'Consumo']}
                    />
                    <Bar dataKey="consumo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Lecturas Detalladas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <FileText size={20} />
              Historial Detallado de Lecturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lecturas.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  No hay lecturas registradas
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Aún no se han registrado lecturas para tu medidor.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Lectura Anterior
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Lectura Actual
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Consumo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Fecha Lectura
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {lecturas.map((lectura) => (
                      <tr key={lectura.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatPeriodo(lectura.periodo)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {lectura.lecturaAnterior} m³
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {lectura.lecturaActual} m³
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {lectura.consumoM3} m³
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(lectura.fechaLectura)}
                          {lectura.horaLectura && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {lectura.horaLectura}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge
                            className={
                              lectura.estado === 'procesada'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : lectura.estado === 'pendiente'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }
                          >
                            {lectura.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
