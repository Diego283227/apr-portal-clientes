import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, Receipt, Home } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentSuccessProps {
  onNavigate: (view: string) => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onNavigate }) => {
  const searchParams = new URLSearchParams(window.location.search);
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const processPayment = async () => {
      const collection_id = searchParams.get('collection_id');
      const collection_status = searchParams.get('collection_status');
      const payment_id = searchParams.get('payment_id');
      const status = searchParams.get('status');
      const external_reference = searchParams.get('external_reference');
      const preference_id = searchParams.get('preference_id');

      console.log('Payment Success Callback:', {
        collection_id,
        collection_status,
        payment_id,
        status,
        external_reference,
        preference_id
      });

      try {
        const response = await fetch('/api/mercadopago/payment-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            collection_id,
            collection_status,
            payment_id,
            status,
            external_reference
          })
        });

        const data = await response.json();

        if (response.ok) {
          setPaymentData(data.data);
          toast.success('¡Pago completado exitosamente! 🎉', {
            description: 'Redirigiendo al dashboard...',
            duration: 3000
          });

          // Redirigir automáticamente al dashboard después de 3 segundos
          setTimeout(() => {
            onNavigate('socio-dashboard');
          }, 3000);
        } else {
          toast.error(data.message || 'Error al procesar el pago');
        }
      } catch (error) {
        console.error('Error processing payment success:', error);
        toast.error('Error al procesar el pago');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [onNavigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Procesando tu pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
            ¡Pago Exitoso!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-center text-green-800 dark:text-green-400">
              Tu pago ha sido procesado correctamente
            </p>
          </div>

          {paymentData && (
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">ID de Pago:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {paymentData.paymentId}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Pagado:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  ${paymentData.totalAmount?.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {paymentData.status === 'completado' ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => onNavigate('socio-boletas')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Ver Mis Boletas
            </Button>
            <Button
              onClick={() => onNavigate('socio-dashboard')}
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al Dashboard
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
            Recibirás un correo de confirmación con los detalles de tu pago
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
