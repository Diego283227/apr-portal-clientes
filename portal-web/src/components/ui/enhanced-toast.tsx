import { toast as sonnerToast } from 'sonner';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise';

interface ToastOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  closeButton?: boolean;
}

// Iconos para cada tipo de toast
const ToastIcon = {
  success: () => <CheckCircle className="h-5 w-5 text-green-600" />,
  error: () => <AlertCircle className="h-5 w-5 text-red-600" />,
  warning: () => <AlertTriangle className="h-5 w-5 text-amber-600" />,
  info: () => <Info className="h-5 w-5 text-blue-600" />,
  loading: () => (
    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
  )
};

// Wrapper mejorado para Sonner
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      closeButton: options?.closeButton ?? true,
      icon: <ToastIcon.success />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      style: {
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        color: '#166534',
      },
      className: 'toast-success',
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 6000,
      position: options?.position || 'top-right',
      closeButton: options?.closeButton ?? true,
      icon: <ToastIcon.error />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      style: {
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#dc2626',
      },
      className: 'toast-error',
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      closeButton: options?.closeButton ?? true,
      icon: <ToastIcon.warning />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      style: {
        background: '#fffbeb',
        border: '1px solid #fed7aa',
        color: '#d97706',
      },
      className: 'toast-warning',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      closeButton: options?.closeButton ?? true,
      icon: <ToastIcon.info />,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      style: {
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#2563eb',
      },
      className: 'toast-info',
    });
  },

  loading: (message: string, options?: Omit<ToastOptions, 'duration'>) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      position: options?.position || 'top-right',
      closeButton: options?.closeButton ?? true,
      icon: <ToastIcon.loading />,
      style: {
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#475569',
      },
      className: 'toast-loading',
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
      ...options
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    } & ToastOptions
  ) => {
    return sonnerToast.promise(promise, {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      closeButton: options?.closeButton ?? true,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options?.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
    });
  },

  // Función personalizada para toasts con contenido rico
  custom: (
    content: React.ReactNode,
    type: ToastType = 'info',
    options?: ToastOptions
  ) => {
    const styles = {
      success: {
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        color: '#166534',
      },
      error: {
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#dc2626',
      },
      warning: {
        background: '#fffbeb',
        border: '1px solid #fed7aa',
        color: '#d97706',
      },
      info: {
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#2563eb',
      },
      loading: {
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#475569',
      },
      promise: {
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#475569',
      }
    };

    return sonnerToast.custom(() => (
      <div
        className={`flex items-start gap-3 p-4 rounded-lg shadow-lg min-w-[300px] max-w-[500px] toast-${type}`}
        style={styles[type]}
      >
        {type !== 'loading' && type !== 'promise' && (
          <div className="flex-shrink-0 mt-0.5">
            {React.createElement(ToastIcon[type as keyof typeof ToastIcon])}
          </div>
        )}
        {type === 'loading' && (
          <div className="flex-shrink-0 mt-0.5">
            <ToastIcon.loading />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {content}
        </div>
      </div>
    ), {
      duration: options?.duration || (type === 'error' ? 6000 : 4000),
      position: options?.position || 'top-right',
    });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  // Función para mostrar confirmación con toast
  confirmAction: (
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'warning' | 'info';
      description?: string;
    }
  ) => {
    const type = options?.type || 'warning';
    const confirmText = options?.confirmText || 'Confirmar';
    const cancelText = options?.cancelText || 'Cancelar';

    return toast.custom(
      <div>
        <div className="font-medium mb-1">{message}</div>
        {options?.description && (
          <div className="text-sm opacity-90 mb-3">{options.description}</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onConfirm();
              sonnerToast.dismiss();
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={() => sonnerToast.dismiss()}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>,
      type,
      { duration: 0, closeButton: true }
    );
  }
};

// Hook para manejo de toasts
export function useToast() {
  return {
    toast,
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
    loading: toast.loading,
    promise: toast.promise,
    custom: toast.custom,
    dismiss: toast.dismiss,
    confirmAction: toast.confirmAction
  };
}