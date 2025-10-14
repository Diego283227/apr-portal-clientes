import React, { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PayPalCheckoutProps {
  amount: number;
  currency?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  description?: string;
  disabled?: boolean;
}

// Componente interno para los botones de PayPal
const PayPalButtonWrapper: React.FC<{
  amount: number;
  currency: string;
  description: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}> = ({ amount, currency, description, onSuccess, onError, onCancel, disabled }) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [retryCount, setRetryCount] = useState(0);

  const createOrder = (data: any, actions: any) => {
    console.log('Creating PayPal order with:', { amount, currency, description });

    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: amount.toFixed(2),
            currency_code: currency
          },
          description: description
        }
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        brand_name: 'Portal Online'
      }
    }).then((orderID: string) => {
      console.log('PayPal order created successfully:', orderID);
      return orderID;
    }).catch((error: any) => {
      console.error('Error creating PayPal order:', error);
      throw error;
    });
  };

  const onApprove = async (data: any, actions: any) => {
    try {
      const details = await actions.order.capture();

      console.log('PayPal payment successful:', details);

      toast.success('¡Pago exitoso!', {
        description: `Transacción ID: ${details.id}`,
      });

      onSuccess?.(details);

    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      toast.error('Error al procesar el pago', {
        description: 'Por favor, intenta nuevamente',
      });
      onError?.(error);
    }
  };

  const onErrorHandler = (error: any) => {
    console.error('PayPal error:', error);
    toast.error('Error en PayPal', {
      description: 'Ha ocurrido un error con PayPal. Intenta nuevamente.',
    });
    onError?.(error);
  };

  const onCancelHandler = () => {
    console.log('PayPal payment cancelled');
    toast.info('Pago cancelado', {
      description: 'El pago fue cancelado por el usuario',
    });
    onCancel?.();
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando PayPal...</span>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
        <p className="text-gray-600 mb-3">Error al cargar PayPal</p>
        <Button
          onClick={handleRetry}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
        height: 45
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onErrorHandler}
      onCancel={onCancelHandler}
      disabled={disabled}
      forceReRender={[amount, currency]}
    />
  );
};

const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel,
  description = 'Pago Portal Online',
  disabled = false
}) => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';
  const environment = import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox';

  // Debug info
  console.log('PayPal Component Debug:', {
    clientId: clientId ? clientId.substring(0, 10) + '...' : 'not found',
    environment,
    amount,
    currency,
    disabled
  });

  // PayPal script options
  const initialOptions = {
    'client-id': clientId,
    currency: currency,
    intent: 'capture'
  };

  if (!clientId || clientId === 'test') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            PayPal Checkout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Configuración de PayPal requerida</p>
                <p className="text-sm">
                  Para usar PayPal, necesitas configurar las variables de entorno:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li><code>VITE_PAYPAL_CLIENT_ID</code> - Client ID de PayPal</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  Obtén estas credenciales en el{' '}
                  <a
                    href="https://developer.paypal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Portal de Desarrolladores de PayPal
                  </a>
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          PayPal Checkout
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currency} ${amount.toFixed(2)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Seguro y Confiable
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Pago seguro con PayPal</p>
              <p className="text-xs">
                Puedes pagar con tu cuenta PayPal, tarjeta de débito o crédito
              </p>
            </div>
          </div>
        </div>

        {disabled ? (
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p className="text-gray-600">PayPal temporalmente deshabilitado</p>
          </div>
        ) : (
          <PayPalScriptProvider
            options={initialOptions}
            deferLoading={false}
          >
            <div className="min-h-[100px] flex flex-col">
              <PayPalButtonWrapper
                amount={amount}
                currency={currency}
                description={description}
                onSuccess={onSuccess}
                onError={onError}
                onCancel={onCancel}
                disabled={disabled}
              />

              {/* Fallback en caso de que PayPal no cargue */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  ¿No ves los botones de PayPal?{' '}
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 underline"
                  >
                    Recargar página
                  </button>
                </p>
              </div>
            </div>
          </PayPalScriptProvider>
        )}

        <div className="text-xs text-gray-500 text-center">
          <p>
            Al hacer clic en "Pagar con PayPal" aceptas los{' '}
            <a href="#" className="text-blue-600 underline">términos y condiciones</a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayPalCheckout;