import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  ExternalLink,
  Receipt,
  AlertCircle
} from 'lucide-react';
// import mercadoPagoService, { PaymentStatus } from '@/services/mercadoPagoService'; // REMOVED
import { toast } from 'sonner';

interface PaymentResultProps {
  type: 'success' | 'failure' | 'pending';
}

const PaymentResult: React.FC<PaymentResultProps> = ({ type }) => {
  // const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null); // REMOVED
  const [loading, setLoading] = useState(true);

  // Get URL parameters from current URL
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      collection_id: params.get('collection_id'),
      collection_status: params.get('collection_status'),
      payment_id: params.get('payment_id'),
      status: params.get('status'),
      external_reference: params.get('external_reference'),
      payment_type: params.get('payment_type'),
      merchant_order_id: params.get('merchant_order_id'),
      preference_id: params.get('preference_id'),
      site_id: params.get('site_id'),
      processing_mode: params.get('processing_mode'),
      merchant_account_id: params.get('merchant_account_id')
    };
  };

  const urlParams = getUrlParams();
  const {
    collection_id,
    collection_status,
    payment_id,
    status,
    external_reference,
    payment_type,
    merchant_order_id,
    preference_id,
    site_id,
    processing_mode,
    merchant_account_id
  } = urlParams;

  useEffect(() => {
    const processPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('paymentId') || urlParams.get('payment_id');
      const PayerID = urlParams.get('PayerID');
      const provider = urlParams.get('provider');

      // Check if this is a PayPal return
      if (provider === 'paypal' && paymentId && PayerID && type === 'success') {
        try {
          console.log('Processing PayPal payment...', { paymentId, PayerID });

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api'}/paypal/execute-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              paymentId,
              PayerID
            })
          });

          const data = await response.json();

          if (data.success) {
            console.log('PayPal payment processed successfully:', data);
            toast.success('¡Pago procesado exitosamente!');

            // Trigger a reload of boletas data to show updated status
            setTimeout(() => {
              // Force a refresh by dispatching a custom event
              window.dispatchEvent(new CustomEvent('payment-success'));
            }, 1000);
          } else {
            console.error('Error processing PayPal payment:', data.message);
            toast.error('Error al procesar el pago: ' + data.message);
          }
        } catch (error) {
          console.error('Error processing PayPal payment:', error);
          toast.error('Error al procesar el pago de PayPal');
        }
      }

      // Check if this is a MercadoPago return
      else if (type === 'success' && (collection_id || payment_id)) {
        try {
          console.log('Processing MercadoPago payment...', { collection_id, payment_id, status, external_reference });

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api'}/mercadopago/payment-success`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              collection_id,
              collection_status,
              payment_id,
              status,
              external_reference,
              payment_type,
              merchant_order_id,
              preference_id,
              site_id,
              processing_mode,
              merchant_account_id
            })
          });

          const data = await response.json();

          if (data.success) {
            console.log('MercadoPago payment processed successfully:', data);
            toast.success('¡Pago procesado exitosamente!');

            // Trigger a reload of boletas data to show updated status
            setTimeout(() => {
              // Force a refresh by dispatching a custom event
              window.dispatchEvent(new CustomEvent('payment-success'));
            }, 1000);
          } else {
            console.error('Error processing MercadoPago payment:', data.message);
            toast.error('Error al procesar el pago: ' + data.message);
          }
        } catch (error) {
          console.error('Error processing MercadoPago payment:', error);
          toast.error('Error al procesar el pago de MercadoPago');
        }
      }

      setLoading(false);
    };

    processPayment();
  }, [type, collection_id, payment_id, status, external_reference]);

  const getResultConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: '¡Pago Exitoso!',
          description: 'Tu pago ha sido procesado correctamente.',
          badgeVariant: 'default' as const,
          badgeColor: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'failure':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Pago Rechazado',
          description: 'No se pudo procesar tu pago. Puedes intentar nuevamente.',
          badgeVariant: 'destructive' as const,
          badgeColor: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Pago Pendiente',
          description: 'Tu pago está siendo procesado. Te notificaremos cuando esté completo.',
          badgeVariant: 'secondary' as const,
          badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
    }
  };

  const config = getResultConfig();
  const IconComponent = config.icon;

  const handleBackToDashboard = () => {
    // Trigger data refresh before going back
    window.dispatchEvent(new CustomEvent('payment-success'));
    setTimeout(() => {
      window.location.hash = '#socio-dashboard';
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Verificando estado del pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Main Result Card */}
        <Card className={`mb-8 ${config.borderColor}`}>
          <CardHeader className={`${config.bgColor} rounded-t-lg`}>
            <div className="flex items-center justify-center">
              <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center border-2 ${config.borderColor}`}>
                <IconComponent className={`w-8 h-8 ${config.color}`} />
              </div>
            </div>
            <CardTitle className={`text-center text-2xl ${config.color} mt-4`}>
              {config.title}
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              {config.description}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 p-6">
            {/* Payment Details - Simplified without MercadoPago service */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Estado:</span>
                <Badge className={config.badgeColor}>
                  {config.title}
                </Badge>
              </div>

              {external_reference && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Referencia:</span>
                  <span className="text-sm text-gray-600 font-mono">
                    {external_reference}
                  </span>
                </div>
              )}

              {payment_id && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">ID de Pago:</span>
                  <span className="text-sm text-gray-600 font-mono">
                    {payment_id}
                  </span>
                </div>
              )}
            </div>

            {/* MercadoPago Query Parameters */}
            {(collection_id || payment_id || status) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Información de MercadoPago:</p>
                    {collection_id && <p>Collection ID: {collection_id}</p>}
                    {collection_status && <p>Estado: {collection_status}</p>}
                    {payment_type && <p>Tipo de pago: {payment_type}</p>}
                    {status && <p>Status: {status}</p>}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleBackToDashboard}
                className="flex-1"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Dashboard
              </Button>
              
              {type === 'failure' && (
                <Button
                  variant="outline"
                  onClick={() => window.location.hash = '#socio-pago'}
                  className="flex-1"
                  size="lg"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Intentar Nuevamente
                </Button>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">¿Necesitas ayuda?</p>
                  <p>
                    Si tienes alguna consulta sobre tu pago, puedes contactar a soporte 
                    o usar el chat del sistema.
                  </p>
                  {external_reference && (
                    <p className="mt-2">
                      <strong>Número de referencia:</strong> {external_reference}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentResult;