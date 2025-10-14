import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PayPalSimpleProps {
  amount: number;
  currency?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  description?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PayPalSimple: React.FC<PayPalSimpleProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel,
  description = 'Pago Portal Online',
  disabled = false
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [scriptError, setScriptError] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R';

  useEffect(() => {
    console.log('PayPal Simple Debug:', {
      clientId: clientId.substring(0, 10) + '...',
      amount,
      currency,
      disabled
    });

    if (!clientId || clientId === 'test') {
      setScriptError(true);
      setLoading(false);
      return;
    }

    const initializePayPal = () => {
      if (window.paypal && paypalRef.current) {
        console.log('Initializing PayPal buttons...');

        // Limpiar contenedor
        paypalRef.current.innerHTML = '';

        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay',
            height: 45
          },
          createOrder: (data: any, actions: any) => {
            console.log('Creating PayPal order...');
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: amount.toFixed(2),
                  currency_code: currency
                },
                description: description
              }],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
                brand_name: 'Portal Online'
              }
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.order.capture();
              console.log('PayPal payment successful:', details);

              toast.success('¡Pago exitoso!', {
                description: `Transacción ID: ${details.id}`,
              });

              onSuccess?.(details);
            } catch (error) {
              console.error('Error capturing payment:', error);
              toast.error('Error al procesar el pago');
              onError?.(error);
            }
          },
          onError: (error: any) => {
            console.error('PayPal error:', error);
            toast.error('Error en PayPal');
            onError?.(error);
          },
          onCancel: () => {
            console.log('PayPal payment cancelled');
            toast.info('Pago cancelado');
            onCancel?.();
          }
        }).render(paypalRef.current).then(() => {
          console.log('PayPal buttons rendered successfully');
          setPaypalReady(true);
          setLoading(false);
          setScriptError(false);
        }).catch((error: any) => {
          console.error('Error rendering PayPal buttons:', error);
          setScriptError(true);
          setLoading(false);
        });
      } else {
        console.error('PayPal not available or container not found');
        setTimeout(initializePayPal, 500);
      }
    };

    const loadPayPalScript = () => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`;
      script.async = true;

      script.onload = () => {
        console.log('PayPal script loaded successfully');
        setTimeout(initializePayPal, 100);
      };

      script.onerror = (error) => {
        console.error('Error loading PayPal script:', error);
        setLoading(false);
        setScriptError(true);
      };

      document.head.appendChild(script);
    };

    // Verificar si PayPal ya está cargado
    if (window.paypal) {
      console.log('PayPal already loaded, initializing...');
      setTimeout(initializePayPal, 100);
    } else {
      console.log('Loading PayPal script...');
      loadPayPalScript();
    }
  }, [amount, currency, clientId]);

  const handleRetry = () => {
    setLoading(true);
    setScriptError(false);
    setPaypalReady(false);

    // Forzar recarga del componente
    window.location.reload();
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
                  Para usar PayPal, necesitas configurar VITE_PAYPAL_CLIENT_ID
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
        ) : loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando PayPal...</span>
          </div>
        ) : scriptError ? (
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
        ) : (
          <div className="min-h-[100px]">
            <div ref={paypalRef} id="paypal-button-container"></div>

            {!paypalReady && (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  ¿No ves los botones de PayPal?{' '}
                  <button
                    onClick={handleRetry}
                    className="text-blue-600 underline"
                  >
                    Recargar
                  </button>
                </p>
              </div>
            )}
          </div>
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

export default PayPalSimple;