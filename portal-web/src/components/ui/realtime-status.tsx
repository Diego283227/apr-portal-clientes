import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Wifi,
  WifiOff,
  Shield,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RealtimeStatusProps {
  isConnected?: boolean;
  lastUpdate?: Date | null;
  activeTermsCount?: number;
  connectedUsers?: number;
  variant?: 'minimal' | 'detailed';
  className?: string;
}

export function RealtimeStatus({
  isConnected = true,
  lastUpdate,
  activeTermsCount = 0,
  connectedUsers,
  variant = 'minimal',
  className = ''
}: RealtimeStatusProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  // Mostrar animación cuando hay actualizaciones
  useEffect(() => {
    if (lastUpdate) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdate]);

  if (variant === 'minimal') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 transition-all duration-200 ${
              showAnimation ? 'bg-green-100 border-green-300' : ''
            } ${className}`}
          >
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className={`h-3 w-3 ${showAnimation ? 'text-green-600' : 'text-blue-600'}`} />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {activeTermsCount > 0 && (
                <>
                  <Shield className="h-3 w-3 text-orange-600" />
                  <span className="text-xs font-medium">{activeTermsCount}</span>
                </>
              )}
              {showAnimation && (
                <Zap className="h-3 w-3 text-green-600 animate-pulse" />
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="bottom" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Estado en Tiempo Real</h4>
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className="text-xs"
              >
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-orange-600" />
                <span>Términos activos: {activeTermsCount}</span>
              </div>

              {connectedUsers !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Usuarios conectados: {connectedUsers}</span>
                </div>
              )}

              {lastUpdate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span>
                    Última actualización: {format(lastUpdate, 'HH:mm:ss', { locale: es })}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-start gap-2">
                {isConnected ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div className="text-xs text-gray-600">
                  {isConnected ? (
                    'Los términos excluidos se actualizan automáticamente sin necesidad de recargar la página.'
                  ) : (
                    'Sin conexión en tiempo real. Los cambios se aplicarán al recargar la página.'
                  )}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Variant 'detailed'
  return (
    <Card className={`${className} ${showAnimation ? 'ring-2 ring-green-300 shadow-lg' : ''} transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">Sistema en Tiempo Real</h4>
              {showAnimation && (
                <Badge variant="default" className="bg-green-100 text-green-700 animate-pulse">
                  Actualizado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className="text-xs"
              >
                {isConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="font-medium">{activeTermsCount}</span>
                <span className="text-gray-600">términos activos</span>
              </div>

              {connectedUsers !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{connectedUsers}</span>
                  <span className="text-gray-600">usuarios online</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {lastUpdate && (
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">Última actualización</span>
                  </div>
                  <div className="font-mono text-xs">
                    {format(lastUpdate, 'dd/MM HH:mm:ss', { locale: es })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-start gap-2">
              {isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="text-xs text-gray-600">
                {isConnected ? (
                  <>
                    <strong>Sincronización activa:</strong> Los cambios en términos excluidos
                    se aplican instantáneamente a todos los usuarios sin recargar.
                  </>
                ) : (
                  <>
                    <strong>Sin conexión:</strong> Los términos se actualizarán
                    cuando se restaure la conexión o al recargar la página.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RealtimeStatus;