import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { XCircle, Receipt, Home, RefreshCw } from 'lucide-react';

interface PaymentFailureProps {
  onNavigate: (view: string) => void;
}

const PaymentFailure: React.FC<PaymentFailureProps> = ({ onNavigate }) => {
  const searchParams = new URLSearchParams(window.location.search);

  const collection_id = searchParams.get('collection_id');
  const collection_status = searchParams.get('collection_status');
  const payment_id = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const external_reference = searchParams.get('external_reference');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
            Pago Rechazado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-center text-red-800 dark:text-red-400">
              Tu pago no pudo ser procesado
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Posibles causas:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
              <li>Fondos insuficientes</li>
              <li>Datos de tarjeta incorrectos</li>
              <li>Límite de compra excedido</li>
              <li>Problema con el banco emisor</li>
            </ul>
          </div>

          {payment_id && (
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ID de transacción: {payment_id}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => onNavigate('socio-boletas')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar Nuevamente
            </Button>
            <Button
              onClick={() => onNavigate('socio-dashboard')}
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
            Si el problema persiste, contacta con tu banco o prueba con otro método de pago
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure;
