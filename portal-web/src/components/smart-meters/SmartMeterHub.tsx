import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Bell,
  Droplets,
  BarChart3,
  Settings,
  Smartphone,
  Receipt
} from 'lucide-react';
import { ConsumptionDashboard } from './ConsumptionDashboard';
import { MeterAlerts } from './MeterAlerts';
import { MeterNotifications } from './MeterNotifications';
import { ConsumptionBilling } from './ConsumptionBilling';
import { DataSourceManager } from './DataSourceManager';
import { useSmartMeterNotifications } from '@/hooks/useSmartMeterNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function SmartMeterHub() {
  const { user } = useAuth();
  const { unreadCount, isConnected } = useSmartMeterNotifications();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="h-4 w-4" />,
      component: <ConsumptionDashboard />
    },
    {
      value: 'billing',
      label: 'Mi Facturación',
      icon: <Receipt className="h-4 w-4" />,
      component: <ConsumptionBilling />
    },
    {
      value: 'alerts',
      label: 'Alertas',
      icon: <AlertTriangle className="h-4 w-4" />,
      component: <MeterAlerts />
    },
    {
      value: 'notifications',
      label: 'Notificaciones',
      icon: <Bell className="h-4 w-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
      component: <MeterNotifications />
    },
    {
      value: 'data-sources',
      label: 'Fuentes de Datos',
      icon: <Settings className="h-4 w-4" />,
      component: <DataSourceManager />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Medidores Inteligentes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitorea tu consumo de agua en tiempo real y recibe alertas instantáneas
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            isConnected
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <Smartphone className="h-4 w-4" />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </div>

          {/* Quick Stats */}
          <Card className="w-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Consumo Hoy</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">--</div>
                  <div className="text-xs text-gray-500">L</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado del Sistema</CardTitle>
          <CardDescription>
            Resumen rápido de tus medidores inteligentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Active Meters */}
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="p-2 bg-green-100 rounded-full">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Medidores Activos</p>
                <p className="text-2xl font-bold text-green-600">--</p>
              </div>
            </div>

            {/* Alerts */}
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-900">Alertas Activas</p>
                <p className="text-2xl font-bold text-red-600">--</p>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="p-2 bg-blue-100 rounded-full">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Notificaciones</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
            </div>

            {/* Connection */}
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
              isConnected
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`p-2 rounded-full ${
                isConnected ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Smartphone className={`h-5 w-5 ${
                  isConnected ? 'text-green-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  isConnected ? 'text-green-900' : 'text-gray-900'
                }`}>
                  Conexión
                </p>
                <p className={`text-lg font-bold ${
                  isConnected ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {isConnected ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 relative"
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-6">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>

      {/* Help Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">
            💡 Acerca de los Medidores Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">🔄 Monitoreo en Tiempo Real</h4>
              <p>Recibe lecturas automáticas cada 15 minutos con datos precisos de consumo, presión y temperatura.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚨 Detección de Fugas</h4>
              <p>Algoritmos inteligentes detectan patrones anómalos y te alertan inmediatamente sobre posibles fugas.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📊 Análisis de Consumo</h4>
              <p>Visualiza tu histórico de consumo y compara con períodos anteriores para optimizar tu uso.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📱 Notificaciones Inteligentes</h4>
              <p>Recibe alertas por SMS, email y en la plataforma sobre situaciones que requieren atención.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}