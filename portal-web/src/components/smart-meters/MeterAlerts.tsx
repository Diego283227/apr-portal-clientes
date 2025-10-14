import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Droplets,
  Battery,
  Wifi,
  Shield,
  TrendingUp,
  MapPin,
  Calendar,
  User,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { smartMeterService, MeterAlert } from '@/services/smartMeterService';

interface AlertWithMeter extends MeterAlert {
  meterInfo: {
    meterId: string;
    serialNumber: string;
    location?: {
      description?: string;
    };
  };
}

export function MeterAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertWithMeter[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertWithMeter[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'all' | 'resolved'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [selectedTab]);

  const loadAlerts = async () => {
    try {
      setLoading(true);

      if (selectedTab === 'active') {
        const response = await smartMeterService.getActiveAlerts(user?.id);
        setActiveAlerts(response.data.alerts);
      } else {
        const params = {
          status: selectedTab === 'resolved' ? 'resolved' : undefined,
          socioId: user?.id,
          limit: 50
        };
        const response = await smartMeterService.getAlerts(params);
        setAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      setError('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'leak': return <Droplets className="h-4 w-4" />;
      case 'tamper': return <Shield className="h-4 w-4" />;
      case 'low_battery': return <Battery className="h-4 w-4" />;
      case 'communication_loss': return <Wifi className="h-4 w-4" />;
      case 'high_consumption': return <TrendingUp className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertTypeText = (alertType: string) => {
    switch (alertType) {
      case 'leak': return 'Posible Fuga';
      case 'tamper': return 'Manipulación';
      case 'low_battery': return 'Batería Baja';
      case 'communication_loss': return 'Sin Comunicación';
      case 'high_consumption': return 'Consumo Alto';
      case 'sensor_error': return 'Error de Sensor';
      default: return 'Alerta';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-500 text-blue-50';
      case 'medium': return 'bg-yellow-500 text-yellow-50';
      case 'high': return 'bg-orange-500 text-orange-50';
      case 'critical': return 'bg-red-500 text-red-50';
      default: return 'bg-gray-500 text-gray-50';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'low': return 'Baja';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
      case 'critical': return 'Crítica';
      default: return 'Desconocida';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - alertDate.getTime()) / (1000 * 60));
      return `hace ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `hace ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `hace ${diffInDays}d`;
    }
  };

  const AlertCard = ({ alert }: { alert: AlertWithMeter }) => (
    <Card className={`border-l-4 ${
      alert.severity === 'critical' ? 'border-l-red-500' :
      alert.severity === 'high' ? 'border-l-orange-500' :
      alert.severity === 'medium' ? 'border-l-yellow-500' :
      'border-l-blue-500'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              alert.severity === 'critical' ? 'bg-red-50 text-red-600' :
              alert.severity === 'high' ? 'bg-orange-50 text-orange-600' :
              alert.severity === 'medium' ? 'bg-yellow-50 text-yellow-600' :
              'bg-blue-50 text-blue-600'
            }`}>
              {getAlertIcon(alert.alertType)}
            </div>
            <div>
              <CardTitle className="text-base">{alert.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getSeverityColor(alert.severity)}>
                  {getSeverityText(alert.severity)}
                </Badge>
                <Badge variant="outline">
                  {getAlertTypeText(alert.alertType)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatTimeAgo(alert.triggeredAt)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {alert.description}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {alert.meterInfo?.location?.description || 'Ubicación no especificada'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {format(new Date(alert.triggeredAt), 'dd/MM/yyyy HH:mm', { locale: es })}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Medidor:</span> {alert.meterInfo?.meterId}
          </div>

          {alert.status === 'active' && user?.role === 'super_admin' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs">
                Resolver
              </Button>
              <Button size="sm" variant="ghost" className="text-xs">
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {alert.metadata && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Detalles Técnicos
            </p>
            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
              {alert.metadata.avgFlowRate && (
                <div>Flujo promedio: {alert.metadata.avgFlowRate.toFixed(2)} L/min</div>
              )}
              {alert.metadata.batteryLevel && (
                <div>Nivel de batería: {alert.metadata.batteryLevel}%</div>
              )}
              {alert.metadata.threshold && (
                <div>Umbral: {alert.metadata.threshold}</div>
              )}
              {alert.metadata.duration && (
                <div>Duración: {alert.metadata.duration} minutos</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Cargando alertas...</span>
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

  const displayAlerts = selectedTab === 'active' ? activeAlerts : alerts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Alertas de Medidores
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Monitorea y gestiona las alertas de tus medidores inteligentes
        </p>
      </div>

      {/* Summary Cards */}
      {selectedTab === 'active' && activeAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['critical', 'high', 'medium', 'low'].map((severity) => {
            const count = activeAlerts.filter(a => a.severity === severity).length;
            return (
              <Card key={severity}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getSeverityText(severity)}
                  </CardTitle>
                  <AlertTriangle className={`h-4 w-4 ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {count}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'active' | 'all' | 'resolved')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Activas
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resueltas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {displayAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {selectedTab === 'active' ? 'No hay alertas activas' :
                     selectedTab === 'resolved' ? 'No hay alertas resueltas' :
                     'No hay alertas disponibles'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {selectedTab === 'active' ? 'Todos tus medidores están funcionando correctamente.' :
                     'No se encontraron alertas en esta categoría.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {displayAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}