import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, UserX, Shield, Info, CheckCircle } from 'lucide-react';

interface ConfirmDialogProps {
  children: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

const iconMap = {
  destructive: Trash2,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle
};

const colorMap = {
  destructive: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
  success: 'text-green-600'
};

const buttonVariantMap = {
  destructive: 'destructive' as const,
  warning: 'default' as const,
  info: 'default' as const,
  success: 'default' as const
};

export function ConfirmDialog({
  children,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  onConfirm,
  isLoading = false
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  const Icon = iconMap[variant];

  const handleConfirm = async () => {
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      // El error será manejado por el componente padre
      console.error('Error in confirm dialog:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${
              variant === 'destructive' ? 'bg-red-100' :
              variant === 'warning' ? 'bg-amber-100' :
              variant === 'info' ? 'bg-blue-100' :
              'bg-green-100'
            }`}>
              <Icon className={`h-5 w-5 ${colorMap[variant]}`} />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            className="hover:bg-gray-100"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            variant={buttonVariantMap[variant]}
            className={`
              ${variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              ${variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              ${variant === 'info' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
              ${variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Procesando...
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook personalizado para usar el dialog de confirmación de manera programática
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'destructive' | 'warning' | 'info' | 'success';
    confirmText: string;
    cancelText: string;
    onConfirm: () => void | Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {},
    isLoading: false
  });

  const confirm = React.useCallback((options: {
    title: string;
    description: string;
    variant?: 'destructive' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setDialogState({
      isOpen: true,
      title: options.title,
      description: options.description,
      variant: options.variant || 'warning',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      onConfirm: options.onConfirm,
      isLoading: false
    });
  }, []);

  const handleConfirm = async () => {
    setDialogState(prev => ({ ...prev, isLoading: true }));
    try {
      await dialogState.onConfirm();
      setDialogState(prev => ({ ...prev, isOpen: false, isLoading: false }));
    } catch (error) {
      setDialogState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const ConfirmDialogComponent = () => (
    <AlertDialog
      open={dialogState.isOpen}
      onOpenChange={(open) => setDialogState(prev => ({ ...prev, isOpen: open }))}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${
              dialogState.variant === 'destructive' ? 'bg-red-100' :
              dialogState.variant === 'warning' ? 'bg-amber-100' :
              dialogState.variant === 'info' ? 'bg-blue-100' :
              'bg-green-100'
            }`}>
              {React.createElement(iconMap[dialogState.variant], {
                className: `h-5 w-5 ${colorMap[dialogState.variant]}`
              })}
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {dialogState.title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600 leading-relaxed">
            {dialogState.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={dialogState.isLoading}
            className="hover:bg-gray-100"
          >
            {dialogState.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={dialogState.isLoading}
            variant={buttonVariantMap[dialogState.variant]}
            className={`
              ${dialogState.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              ${dialogState.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              ${dialogState.variant === 'info' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
              ${dialogState.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              ${dialogState.isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {dialogState.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Procesando...
              </div>
            ) : (
              dialogState.confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}