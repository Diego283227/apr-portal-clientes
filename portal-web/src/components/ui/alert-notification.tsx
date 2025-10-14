import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertNotificationProps {
  type: AlertType;
  title: string;
  description?: string;
  onClose?: () => void;
  closable?: boolean;
  className?: string;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const colorMap = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800'
};

const iconColorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600'
};

export function AlertNotification({
  type,
  title,
  description,
  onClose,
  closable = true,
  className = ''
}: AlertNotificationProps) {
  const Icon = iconMap[type];

  return (
    <Alert className={`${colorMap[type]} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${iconColorMap[type]} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium mb-1">
            {title}
          </AlertTitle>
          {description && (
            <AlertDescription className="text-sm opacity-90">
              {description}
            </AlertDescription>
          )}
        </div>
        {closable && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-black/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}

// Hook para manejo programático de alertas
export function useAlert() {
  const [alerts, setAlerts] = React.useState<Array<{
    id: string;
    type: AlertType;
    title: string;
    description?: string;
    duration?: number;
  }>>([]);

  const showAlert = React.useCallback((
    type: AlertType,
    title: string,
    description?: string,
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);

    setAlerts(prev => [...prev, { id, type, title, description, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeAlert = React.useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setAlerts([]);
  }, []);

  const AlertContainer = React.useCallback(() => (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {alerts.map(alert => (
        <AlertNotification
          key={alert.id}
          type={alert.type}
          title={alert.title}
          description={alert.description}
          onClose={() => removeAlert(alert.id)}
          className="shadow-lg"
        />
      ))}
    </div>
  ), [alerts, removeAlert]);

  return {
    showAlert,
    removeAlert,
    clearAll,
    alerts,
    AlertContainer
  };
}

// Funciones de conveniencia
export const alertHelpers = {
  success: (title: string, description?: string, duration?: number) => ({
    type: 'success' as const,
    title,
    description,
    duration
  }),
  error: (title: string, description?: string, duration?: number) => ({
    type: 'error' as const,
    title,
    description,
    duration
  }),
  warning: (title: string, description?: string, duration?: number) => ({
    type: 'warning' as const,
    title,
    description,
    duration
  }),
  info: (title: string, description?: string, duration?: number) => ({
    type: 'info' as const,
    title,
    description,
    duration
  })
};