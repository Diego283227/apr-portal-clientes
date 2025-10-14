import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Bell,
  BellRing,
  CheckCircle,
  Clock,
  Droplets,
  Battery,
  Wifi,
  Shield,
  TrendingUp,
  MapPin,
  X,
  MoreVertical,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSmartMeterNotifications, MeterNotification } from '@/hooks/useSmartMeterNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MeterNotificationsProps {
  showAsSheet?: boolean;
}

export function MeterNotifications({ showAsSheet = false }: MeterNotificationsProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    sendTestAlert
  } = useSmartMeterNotifications();

  const [filterType, setFilterType] = useState<'all' | 'alerts' | 'readings' | 'maintenance'>('all');

  const getNotificationIcon = (notification: MeterNotification) => {
    switch (notification.type) {
      case 'meter_alert':
        switch (notification.alertType) {
          case 'leak': return <Droplets className="h-4 w-4 text-blue-500" />;
          case 'low_battery': return <Battery className="h-4 w-4 text-yellow-500" />;
          case 'communication_loss': return <Wifi className="h-4 w-4 text-red-500" />;
          case 'tamper': return <Shield className="h-4 w-4 text-orange-500" />;
          case 'high_consumption': return <TrendingUp className="h-4 w-4 text-purple-500" />;
          default: return <Bell className="h-4 w-4 text-gray-500" />;
        }
      case 'new_reading': return <Clock className="h-4 w-4 text-green-500" />;
      case 'maintenance': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'consumption_report': return <TrendingUp className="h-4 w-4 text-indigo-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-red-50';
      case 'high': return 'bg-orange-500 text-orange-50';
      case 'medium': return 'bg-yellow-500 text-yellow-50';
      case 'low': return 'bg-blue-500 text-blue-50';
      default: return 'bg-gray-500 text-gray-50';
    }
  };

  const getSeverityText = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return '';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `hace ${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `hace ${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `hace ${diffInDays}d`;
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filterType) {
      case 'alerts': return notification.type === 'meter_alert';
      case 'readings': return notification.type === 'new_reading';
      case 'maintenance': return notification.type === 'maintenance';
      default: return true;
    }
  });

  const NotificationItem = ({ notification }: { notification: MeterNotification }) => (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        (notification as any).read ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-950 border-blue-200'
      }`}
      onClick={() => markAsRead(notification.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1">
            {getNotificationIcon(notification)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                {notification.title}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notification.severity && (
                  <Badge className={`text-xs ${getSeverityColor(notification.severity)}`}>
                    {getSeverityText(notification.severity)}
                  </Badge>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(notification.timestamp)}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {notification.message}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {notification.meterId}
              </span>
              {notification.meterLocation && (
                <span className="truncate">
                  {notification.meterLocation}
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como leído
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => removeNotification(notification.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const NotificationContent = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Notificaciones de Medidores</h2>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        {notifications.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como leídas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearNotifications} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar todas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sendTestAlert}>
                <Bell className="h-4 w-4 mr-2" />
                Enviar alerta de prueba
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'alerts', label: 'Alertas' },
          { key: 'readings', label: 'Lecturas' },
          { key: 'maintenance', label: 'Mantenimiento' }
        ].map((filter) => (
          <Button
            key={filter.key}
            variant={filterType === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(filter.key as any)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay notificaciones
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Las notificaciones de tus medidores aparecerán aquí
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Stats */}
      {notifications.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t">
          {unreadCount > 0 ? `${unreadCount} no leídas de ${notifications.length} total` : `${notifications.length} notificaciones`}
        </div>
      )}
    </div>
  );

  if (showAsSheet) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <BellRing className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Notificaciones de Medidores</SheetTitle>
            <SheetDescription>
              Alertas y actualizaciones en tiempo real
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <NotificationContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Notificaciones de Medidores
            </CardTitle>
            <CardDescription>
              Alertas y actualizaciones en tiempo real
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <NotificationContent />
      </CardContent>
    </Card>
  );
}