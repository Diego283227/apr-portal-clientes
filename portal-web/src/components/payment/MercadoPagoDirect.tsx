import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useBoletas } from '@/hooks/useBoletas';

interface MercadoPagoDirectProps {
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
    MercadoPago?: any;
  }
}

const MercadoPagoDirect: React.FC<MercadoPagoDirectProps> = ({
  amount,
  currency = 'CLP',
  onSuccess,
  onError,
  onCancel,
  description = 'Pago Portal Online',
  disabled = false,
  boletaIds = []
}) => {
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const { updateBoletaStatusInDB, updateBoletaStatus } = useBoletas();

  // Mercado Pago Public Key (Chile) - PRODUCTION
  const publicKey = 'APP_USR-5e227da9-df69-4f83-8df4-e4bc20c030b1';

  const createPreference = async () => {
    setIsCreatingPreference(true);

    try {
      console.log('🔄 Creating Mercado Pago preference...');
      console.log('📊 Boletas to pay:', boletaIds);
      console.log('💰 Amount:', amount);

      const response = await apiClient.post('/mercadopago/create-preference', {
        boletaIds,
        amount,
        currency,
        description
      });

      if (response.data.success) {
        const { preferenceId, initPoint } = response.data.data;

        console.log('✅ Mercado Pago preference created:', preferenceId);
        console.log('🔗 Checkout URL:', initPoint);

        setPreferenceId(preferenceId);
        setCheckoutUrl(initPoint);

        // Store data for webhook processing
        sessionStorage.setItem('mp_payment_data', JSON.stringify({
          preferenceId,
          boletaIds,
          amount,
          currency,
          description
        }));

        toast.success('Redirigiendo a Mercado Pago...');

        // Redirect to Mercado Pago checkout
        window.location.href = initPoint;

      } else {
        throw new Error(response.data.message || 'Error al crear preferencia');
      }

    } catch (error: any) {
      console.error('❌ Error creating Mercado Pago preference:', error);
      toast.error('Error al procesar el pago', {
        description: error?.response?.data?.message || error.message
      });
      onError?.(error);
    } finally {
      setIsCreatingPreference(false);
    }
  };

  // Check for payment status on page load (return from Mercado Pago)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const paymentId = urlParams.get('payment_id');
    const preferenceId = urlParams.get('preference_id');

    if (status && paymentId) {
      console.log('🔍 Detected return from Mercado Pago:', {
        status,
        paymentId,
        preferenceId
      });

      const paymentData = sessionStorage.getItem('mp_payment_data');

      if (paymentData) {
        const data = JSON.parse(paymentData);

        if (status === 'approved') {
          console.log('✅ Payment approved:', paymentId);

          // Update boletas status
          if (data.boletaIds && data.boletaIds.length > 0) {
            updateBoletaStatus(data.boletaIds, 'pagada');

            setTimeout(() => {
              updateBoletaStatusInDB({
                boletaIds: data.boletaIds,
                status: 'pagada'
              });
            }, 500);
          }

          toast.success('¡Pago exitoso!', {
            description: `ID de pago: ${paymentId}`
          });

          // Trigger success callback
          onSuccess?.({
            id: paymentId,
            status: 'approved',
            amount: data.amount,
            boletas: data.boletaIds,
            method: 'mercadopago',
            preferenceId: data.preferenceId
          });

          // Clear stored data
          sessionStorage.removeItem('mp_payment_data');

          // Trigger data refresh
          window.dispatchEvent(new CustomEvent('payment-success'));

          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);

        } else if (status === 'pending') {
          toast.info('Pago pendiente', {
            description: 'Tu pago está siendo procesado'
          });
        } else {
          toast.error('Pago rechazado', {
            description: 'El pago no pudo ser procesado'
          });
          onError?.(new Error('Payment rejected'));
        }
      }
    }
  }, []);

  if (disabled) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-400">Mercado Pago temporalmente deshabilitado</p>
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
          Mercado Pago Checkout
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currency} ${amount.toLocaleString('es-CL')}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Pago Seguro
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Pago seguro con Mercado Pago</p>
              <p className="text-xs">
                Acepta tarjetas de crédito, débito y otros medios de pago en Chile
              </p>
            </div>
          </div>
        </div>

        <div ref={paymentContainerRef} className="min-h-[50px]">
          <button
            onClick={createPreference}
            disabled={isCreatingPreference}
            className="w-full bg-[#00AAFF] hover:bg-[#0099EE] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreatingPreference ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Preparando pago...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pagar con Mercado Pago
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>
            Al hacer clic en "Pagar con Mercado Pago" aceptas los{' '}
            <a href="https://www.mercadopago.cl/ayuda/terminos-y-condiciones_299" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
              términos y condiciones
            </a>
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            🔒 Pago 100% seguro procesado por Mercado Pago
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MercadoPagoDirect;
