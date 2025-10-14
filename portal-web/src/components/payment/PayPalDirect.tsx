import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/enhanced-toast';
import { apiClient } from '@/services/api';
import { useBoletas } from '@/hooks/useBoletas';

interface PayPalDirectProps {
  amount: number;
  currency?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  description?: string;
  disabled?: boolean;
  boletaIds?: string[];
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PayPalDirect: React.FC<PayPalDirectProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel,
  description = 'Pago Portal Online',
  disabled = false,
  boletaIds = []
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const clientId = 'AcBtgZ6--WOPxGT12tdgdfeXM1gGXnlmZDUNoa4OGMpSWFxUzOR1cKEYZULGlAf2VCo7ve3-LmegOjSn';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api';
  const { updateBoletaStatusInDB, updateBoletaStatus } = useBoletas();

  // Simple error logging for debugging
  const logError = (errorType: string, error: any, additionalData?: any) => {
    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      type: errorType,
      error: error?.message || error,
      response: error?.response?.data,
      status: error?.response?.status,
      additionalData
    };

    console.error('🚨 ================== ERROR CAPTURED ==================');
    console.error('🕐 Timestamp:', timestamp);
    console.error('📝 Type:', errorType);
    console.error('❌ Error:', error);
    console.error('📊 Additional Data:', additionalData);
    console.error('🔍 Full Error Object:', errorLog);
    console.error('====================================================');

    // Save to localStorage for persistence
    const existingErrors = JSON.parse(localStorage.getItem('paypal_errors') || '[]');
    existingErrors.push(errorLog);
    localStorage.setItem('paypal_errors', JSON.stringify(existingErrors));

    // Show error toast
    toast.error(`ERROR: ${errorType}`, {
      description: `${error?.message || error}`,
      duration: 8000,
    });

    // Show toast for critical errors
    toast.error(`Error de PayPal: ${errorType}`, {
      description: `${error?.message || error}\n\nRevisa la consola para más detalles.`,
      duration: 8000
    });
  };

  // Global function to view errors and fix auth
  useEffect(() => {
    (window as any).viewPayPalErrors = () => {
      const errors = JSON.parse(localStorage.getItem('paypal_errors') || '[]');
      console.log('🔍 ============ STORED PAYPAL ERRORS ============');
      console.log('📊 Total errors:', errors.length);
      errors.forEach((error: any, index: number) => {
        console.log(`\n--- ERROR ${index + 1} ---`);
        console.log('🕐 Timestamp:', error.timestamp);
        console.log('📝 Type:', error.type);
        console.log('❌ Error:', error.error);
        console.log('📊 Additional Data:', error.additionalData);
      });
      console.log('============================================');
      return errors;
    };

    (window as any).clearPayPalErrors = () => {
      localStorage.removeItem('paypal_errors');
      console.log('🧹 PayPal errors cleared from localStorage');
    };

    (window as any).fixAuthTokens = () => {
      console.log('🔧 Clearing corrupted auth tokens...');

      // Clear all auth cookies
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost';

      // Clear localStorage
      localStorage.removeItem('user');

      console.log('✅ Auth tokens cleared. Please login again.');
      toast.warning('Tokens de autenticación eliminados', {
        description: 'Por favor recarga la página e inicia sesión nuevamente.'
      });
    };

    console.log('🔧 Auth fix function added: fixAuthTokens()');
  }, []);

  useEffect(() => {
    // Crear script solo si no existe
    let script = document.querySelector(`script[src*="paypal.com/sdk/js"]`) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
      script.async = true;
      script.id = 'paypal-sdk';
      document.head.appendChild(script);
    }

    const initPayPal = () => {
      if (window.paypal && paypalRef.current) {
        // Limpiar contenedor
        paypalRef.current.innerHTML = '';

        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
          },
          createOrder: async (data: any, actions: any) => {
            try {
              console.log('🔄 Creating PayPal order directly...');

              // Create order directly using PayPal SDK
              const order = await actions.order.create({
                purchase_units: [{
                  amount: {
                    currency_code: currency,
                    value: amount.toFixed(2)
                  },
                  description: description,
                  custom_id: JSON.stringify({
                    boletaIds: boletaIds,
                    timestamp: Date.now()
                  })
                }],
                intent: 'CAPTURE',
                application_context: {
                  brand_name: 'Portal Online',
                  locale: 'es-ES',
                  landing_page: 'LOGIN',
                  user_action: 'PAY_NOW'
                }
              });

              console.log('✅ PayPal order created:', order);

              // Store order data for later processing
              sessionStorage.setItem('paypal_order_data', JSON.stringify({
                orderId: order,
                boletaIds: boletaIds,
                amount: amount,
                currency: currency,
                description: description
              }));

              return order;

            } catch (error) {
              console.error('❌ Error creating PayPal order:', error);
              toast.error('Error al crear el pedido');
              throw error;
            }
          },
          onApprove: async (data: any, actions: any) => {
            try {
              console.log('🔄 Capturing PayPal order directly...');

              // Capture the order directly using PayPal SDK
              const details = await actions.order.capture();

              console.log('✅ PayPal order captured:', details);

              // Get stored order data
              const orderData = JSON.parse(sessionStorage.getItem('paypal_order_data') || '{}');

              // Update boleta status immediately in cache
              console.log('🔄 Updating boleta status to "pagada" in cache...');
              if (orderData.boletaIds && orderData.boletaIds.length > 0) {
                updateBoletaStatus(orderData.boletaIds, 'pagada');
                console.log('✅ Boletas updated in cache:', orderData.boletaIds);
              }

              // Register payment and update boletas in database
              setTimeout(async () => {
                try {
                  console.log('🔄 Attempting to register PayPal payment and update boletas...');
                  console.log('🍪 Current cookies:', document.cookie);

                  if (orderData.boletaIds && orderData.boletaIds.length > 0) {
                    // First, register the payment in the database for history
                    console.log('💰 Registering PayPal payment in database...');
                    try {
                      const paymentResponse = await apiClient.post('/pagos/paypal/register', {
                        boletaIds: orderData.boletaIds,
                        paypalOrderId: details.id,
                        amount: orderData.amount,
                        currency: orderData.currency || 'USD'
                      });
                      console.log('✅ PayPal payment registered successfully:', paymentResponse.data);
                    } catch (paymentError) {
                      console.error('❌ Failed to register PayPal payment:', paymentError);
                      // Continue with boleta update even if payment registration fails
                    }

                    // Then update boleta status
                    console.log('🔧 Using updateBoletaStatusInDB to mark as paid...');
                    updateBoletaStatusInDB({
                      boletaIds: orderData.boletaIds,
                      status: 'pagada'
                    });
                    console.log('✅ Boleta status update initiated');
                  }
                } catch (dbError) {
                  console.error('❌ Database operations failed:', dbError);
                  console.error('🔍 Error details:', {
                    message: dbError?.message,
                    status: dbError?.response?.status,
                    data: dbError?.response?.data
                  });

                  logError('BOLETA_UPDATE_DATABASE_ERROR', dbError, {
                    step: 'database_update',
                    boletaIds: orderData.boletaIds,
                    paymentId: details.id,
                    cookies: document.cookie
                  });
                }

                console.log('💰 Payment completed - payment registered and boletas marked as paid');
              }, 500);

              toast.success('¡Pago exitoso!', {
                description: `ID: ${details.id}`,
                duration: 5000
              });

              // Clear stored data
              sessionStorage.removeItem('paypal_order_data');

              // Trigger data refresh
              window.dispatchEvent(new CustomEvent('payment-success'));

              // Return payment details
              onSuccess?.({
                id: details.id,
                status: details.status,
                amount: orderData.amount,
                boletas: orderData.boletaIds,
                method: 'paypal',
                details: details
              });

            } catch (error) {
              logError('PAYPAL_CAPTURE_ERROR', error, {
                step: 'paypal_capture',
                paypalOrderId: data?.orderID
              });
              onError?.(error);
            }
          },
          onError: (error: any) => {
            logError('PAYPAL_SDK_ERROR', error, {
              step: 'paypal_sdk_error'
            });
            sessionStorage.removeItem('paypal_order_data');
            onError?.(error);
          },
          onCancel: () => {
            console.log('❌ Payment cancelled by user');
            toast.info('Pago cancelado');
            sessionStorage.removeItem('paypal_order_data');
            onCancel?.();
          }
        }).render(paypalRef.current);
      }
    };

    if (script.readyState === 'complete' || window.paypal) {
      initPayPal();
    } else {
      script.onload = initPayPal;
    }

    // No cleanup - dejar el script para reutilización
  }, [amount, currency]);

  if (disabled) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p className="text-gray-600">PayPal temporalmente deshabilitado</p>
          </div>
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

        <div ref={paypalRef} id="paypal-button-container" className="min-h-[50px]"></div>

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

export default PayPalDirect;