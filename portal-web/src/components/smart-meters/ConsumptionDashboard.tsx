import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Droplets,
  Activity,
  AlertTriangle,
  Battery,
  Wifi,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { smartMeterService } from '@/services/smartMeterService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MeterData {
  id: string;
  meterId: string;
  serialNumber: string;
  model: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  location?: {
    description?: string;
  };
  lastReading?: {
    currentReading: number;
    flowRate?: number;
    batteryLevel?: number;
    timestamp: string;
  };
  todayConsumption?: {
    totalConsumption: number;
    dataQuality: string;
  };
  activeAlerts: number;
}

interface ChartData {
  date: string;
  consumption: number;
  avgFlowRate?: number;
  readingsCount: number;
}

export function ConsumptionDashboard() {
  const { user } = useAuth();
  const [meters, setMeters] = useState<MeterData[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<MeterData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentReadings, setRecentReadings] = useState<any[]>([]);
  const [period, setPeriod] = useState<'hour' | 'day' | 'week'>('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserMeters();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMeter) {
      loadMeterData();
    }
  }, [selectedMeter, period]);

  const loadUserMeters = async () => {
    try {
      setLoading(true);
      const response = await smartMeterService.getMetersByUser(user!.id);
      setMeters(response.data);

      if (response.data.length > 0) {
        setSelectedMeter(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading meters:', error);
      setError('Error al cargar medidores');
    } finally {
      setLoading(false);
    }
  };

  const loadMeterData = async () => {
    if (!selectedMeter) return;

    try {
      const [chartResponse, readingsResponse] = await Promise.all([
        smartMeterService.getConsumptionChart(selectedMeter.meterId, period),
        smartMeterService.getRecentReadings(selectedMeter.meterId, 24)
      ]);

      setChartData(chartResponse.data);
      setRecentReadings(readingsResponse.data.readings);
    } catch (error) {
      console.error('Error loading meter data:', error);
      setError('Error al cargar datos del medidor');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'maintenance': return 'Mantenimiento';
      case 'error': return 'Error';
      case 'inactive': return 'Inactivo';
      default: return 'Desconocido';
    }
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return 'bg-gray-400';
    if (level > 50) return 'bg-green-500';
    if (level > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatConsumption = (consumption: number) => {
    if (consumption < 1000) {
      return `${consumption.toFixed(1)}L`;
    }
    return `${(consumption / 1000).toFixed(2)}m³`;
  };

  const calculateTrend = () => {
    if (chartData.length < 2) return null;

    const recent = chartData.slice(-7);
    const older = chartData.slice(-14, -7);

    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, d) => sum + d.consumption, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.consumption, 0) / older.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    return {
      value: Math.abs(percentChange),
      direction: percentChange >= 0 ? 'up' : 'down'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Cargando datos del medidor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  if (meters.length === 0) {
    return (
      <Alert>
        <Droplets className="h-4 w-4" />
        <AlertDescription>
          No tienes medidores inteligentes asignados. Contacta al administrador para más información.
        </AlertDescription>
      </Alert>
    );
  }

  const trend = calculateTrend();
  const currentConsumption = selectedMeter?.todayConsumption?.totalConsumption || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard de Consumo
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Monitorea tu consumo de agua en tiempo real
        </p>
      </div>

      {/* Meter Selection */}
      {meters.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Medidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meters.map((meter) => (
                <Button
                  key={meter.id}
                  variant={selectedMeter?.id === meter.id ? "default" : "outline"}
                  className="p-4 h-auto justify-start"
                  onClick={() => setSelectedMeter(meter)}
                >
                  <div className="text-left">
                    <div className="font-medium">{meter.meterId}</div>
                    <div className="text-sm text-gray-500">{meter.location?.description}</div>
                    <Badge className={`mt-1 ${getStatusColor(meter.status)}`}>
                      {getStatusText(meter.status)}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMeter && (
        <>
          {/* Current Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Consumption */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consumo Hoy</CardTitle>
                <Droplets className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatConsumption(currentConsumption)}
                </div>
                {trend && (
                  <div className={`flex items-center text-sm ${
                    trend.direction === 'up' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {trend.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {trend.value.toFixed(1)}% vs semana anterior
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flow Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flujo Actual</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {selectedMeter.lastReading?.flowRate?.toFixed(1) || '0.0'} L/min
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Última lectura: {selectedMeter.lastReading ?
                    format(new Date(selectedMeter.lastReading.timestamp), 'HH:mm', { locale: es }) :
                    'N/A'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Battery Level */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Batería</CardTitle>
                <Battery className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {selectedMeter.lastReading?.batteryLevel || 'N/A'}%
                  </div>
                  <Progress
                    value={selectedMeter.lastReading?.batteryLevel || 0}
                    className={`h-2 ${getBatteryColor(selectedMeter.lastReading?.batteryLevel)}`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${
                  selectedMeter.activeAlerts > 0 ? 'text-red-600' : 'text-gray-600'
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  selectedMeter.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {selectedMeter.activeAlerts}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedMeter.activeAlerts === 0 ? 'Todo normal' : 'Revisar alertas'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Consumo</CardTitle>
                  <CardDescription>
                    Consumo de agua en el tiempo
                  </CardDescription>
                </div>
                <Tabs value={period} onValueChange={(value) => setPeriod(value as 'hour' | 'day' | 'week')}>
                  <TabsList>
                    <TabsTrigger value="hour">24h</TabsTrigger>
                    <TabsTrigger value="day">30d</TabsTrigger>
                    <TabsTrigger value="week">12s</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return period === 'hour' ?
                          format(date, 'HH:mm') :
                          format(date, 'dd/MM');
                      }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatConsumption(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatConsumption(value), 'Consumo']}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="consumption"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Meter Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meter Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Información del Medidor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID Medidor</p>
                    <p className="text-sm font-mono">{selectedMeter.meterId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</p>
                    <p className="text-sm">{selectedMeter.model}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Serie</p>
                    <p className="text-sm font-mono">{selectedMeter.serialNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</p>
                    <Badge className={getStatusColor(selectedMeter.status)}>
                      {getStatusText(selectedMeter.status)}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ubicación</p>
                  <p className="text-sm">{selectedMeter.location?.description || 'No especificada'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentReadings.slice(0, 5).map((reading, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">
                          {format(new Date(reading.timestamp), 'HH:mm:ss', { locale: es })}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Lectura: {reading.currentReading.toFixed(1)}L
                        </p>
                      </div>
                      <div className="text-right">
                        {reading.flowRate && (
                          <p className="text-blue-600">
                            {reading.flowRate.toFixed(1)} L/min
                          </p>
                        )}
                        {reading.batteryLevel && (
                          <p className="text-gray-500 dark:text-gray-400">
                            🔋 {reading.batteryLevel}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {recentReadings.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No hay lecturas recientes disponibles
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}