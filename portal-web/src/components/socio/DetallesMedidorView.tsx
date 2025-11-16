import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Droplets,
  Calendar,
  MapPin,
  Activity,
  Info,
  Gauge,
  Factory,
  Package,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useConsumo } from '@/hooks/useConsumo';

interface DetallesMedidorViewProps {
  onBack: () => void;
}

export default function DetallesMedidorView({ onBack }: DetallesMedidorViewProps) {
  const { medidor, isLoadingMedidor } = useConsumo();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getEstadoBadge = (estado?: string) => {
    const estados = {
      active: { label: 'Activo', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
      inactive: { label: 'Inactivo', variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600 dark:text-red-400' },
      maintenance: { label: 'Mantenimiento', variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
      error: { label: 'Error', variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600 dark:text-red-400' }
    };

    return estados[estado as keyof typeof estados] || estados.inactive;
  };

  if (isLoadingMedidor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando información del medidor...</p>
        </div>
      </div>
    );
  }

  if (!medidor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
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

  const estadoInfo = getEstadoBadge(medidor.estado);
  const EstadoIcon = estadoInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
              <ArrowLeft size={16} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 dark:bg-blue-600 p-2 rounded-lg">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Detalles del Medidor
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Información técnica y estado
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información Principal */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Número de Medidor</p>
                <h2 className="text-3xl font-bold mb-2">{medidor.numero}</h2>
                <p className="text-sm opacity-90">Código Socio: {medidor.codigoSocio}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={estadoInfo.variant} className="flex items-center gap-1">
                  <EstadoIcon className="w-3 h-3" />
                  {estadoInfo.label}
                </Badge>
                {medidor.tipo && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {medidor.tipo === 'smart_meter' ? 'Medidor Inteligente' : 'Medidor Tradicional'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Detalles Técnicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between py-3 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fecha de Instalación</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(medidor.fechaInstalacion)}
                </span>
              </div>

              {medidor.ubicacion && (
                <div className="flex items-start justify-between py-3 border-b dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ubicación</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right max-w-[200px]">
                    {medidor.ubicacion}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between py-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Estado</span>
                </div>
                <span className={`text-sm font-medium flex items-center gap-1 ${estadoInfo.color}`}>
                  <EstadoIcon className="w-4 h-4" />
                  {estadoInfo.label}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Especificaciones Técnicas (solo para smart meters) */}
          {medidor.tipo === 'smart_meter' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  Especificaciones Técnicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {medidor.modelo && (
                  <div className="flex items-start justify-between py-3 border-b dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Modelo</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {medidor.modelo}
                    </span>
                  </div>
                )}

                {medidor.fabricante && (
                  <div className="flex items-start justify-between py-3">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Fabricante</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {medidor.fabricante}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Información Adicional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Información Adicional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {medidor.tipo === 'smart_meter'
                  ? 'Este es un medidor inteligente que permite la lectura remota y monitoreo en tiempo real del consumo de agua.'
                  : 'Este es un medidor tradicional. Las lecturas se realizan de forma manual por el personal autorizado.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
