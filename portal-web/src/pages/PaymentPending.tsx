import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, Receipt, Home } from 'lucide-react';

interface PaymentPendingProps {
  onNavigate: (view: string) => void;
}

const PaymentPending: React.FC<PaymentPendingProps> = ({ onNavigate }) => {
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
            <Clock className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
            Pago Pendiente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-center text-yellow-800 dark:text-yellow-400">
              Tu pago está siendo procesado
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Tu pago puede tardar hasta 48 horas en acreditarse
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                <strong>¿Qué sucede ahora?</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
                <li>Recibirás un email cuando se confirme el pago</li>
                <li>Puedes revisar el estado en "Mis Boletas"</li>
                <li>El pago se confirmará automáticamente</li>
              </ul>
            </div>
          </div>

          {payment_id && (
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ID de transacción: {payment_id}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                Guarda este número para hacer seguimiento
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => onNavigate('socio-boletas')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Ver Estado de Mis Boletas
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
            Si tienes dudas, contacta con soporte técnico
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPending;
