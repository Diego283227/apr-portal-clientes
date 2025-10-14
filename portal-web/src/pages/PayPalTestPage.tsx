import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import PayPalCheckout from '@/components/payment/PayPalCheckout';
import {
  CreditCard,
  TestTube,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const PayPalTestPage: React.FC = () => {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
  const urlAmount = urlParams.get('amount');
  const urlCurrency = urlParams.get('currency');
  const urlDescription = urlParams.get('description');
  const urlBoletas = urlParams.get('boletas');

  const [amount, setAmount] = useState<string>(urlAmount || '10.00');
  const [currency, setCurrency] = useState<string>(urlCurrency || 'USD');
  const [description, setDescription] = useState<string>(urlDescription || 'Pago de prueba Portal Online');
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const handlePaymentSuccess = (details: any) => {
    console.log('Payment successful:', details);
    setLastTransaction(details);

    toast.success('¡Pago exitoso!', {
      description: `ID: ${details.id} - ${details.status}`,
      duration: 5000,
    });

    // If this was a real payment from the portal, handle the success
    if (urlBoletas) {
      // Get pending payment data from localStorage
      const pendingPayment = localStorage.getItem('pendingPayPalPayment');
      if (pendingPayment) {
        try {
          const paymentData = JSON.parse(pendingPayment);
          console.log('Processing real payment for boletas:', paymentData);

          // Here you would normally send the payment confirmation to your backend
          // For now, we'll just show a success message and redirect

          setTimeout(() => {
            toast.success('Pago procesado exitosamente!', {
              description: 'Redirigiendo al dashboard...'
            });

            // Clear the pending payment
            localStorage.removeItem('pendingPayPalPayment');

            // Redirect to payment success page
            window.location.hash = '#payment-success';
          }, 2000);

        } catch (error) {
          console.error('Error processing payment data:', error);
        }
      }
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast.error('Error en el pago', {
      description: 'Ha ocurrido un error procesando el pago',
    });
  };

  const handlePaymentCancel = () => {
    console.log('Payment cancelled');
    toast.info('Pago cancelado', {
      description: 'El usuario canceló el pago',
    });
  };

  const resetTest = () => {
    setLastTransaction(null);
    setAmount('10.00');
    setDescription('Pago de prueba Portal Online');
  };

  const goBack = () => {
    window.location.hash = '#socio-dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TestTube className="w-6 h-6" />
              Prueba de PayPal
            </h1>
            <Badge variant="secondary">Test Environment</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Configuración de Prueba
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                      <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                      <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción del pago"
                  />
                </div>

                <Button
                  onClick={resetTest}
                  variant="outline"
                  className="w-full"
                  disabled={!lastTransaction}
                >
                  Reset Prueba
                </Button>
              </CardContent>
            </Card>

            {/* Test Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Instrucciones de Prueba
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Para probar PayPal en Sandbox:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Usa la cuenta de prueba de PayPal</li>
                        <li>Email: sb-buyer@example.com</li>
                        <li>Password: test1234</li>
                        <li>O crea tu propia cuenta en developer.paypal.com</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Importante:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Este es un entorno de prueba (Sandbox)</li>
                    <li>No se realizarán cobros reales</li>
                    <li>Los datos son solo para testing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PayPal Checkout Panel */}
          <div className="space-y-6">
            <PayPalCheckout
              amount={parseFloat(amount) || 10.00}
              currency={currency}
              description={description}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handlePaymentCancel}
            />

            {/* Transaction Result */}
            {lastTransaction && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    Última Transacción Exitosa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-green-700">ID:</span>
                      <p className="font-mono text-xs break-all">{lastTransaction.id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Estado:</span>
                      <p className="capitalize">{lastTransaction.status}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Monto:</span>
                      <p>
                        {lastTransaction.purchase_units?.[0]?.amount?.currency_code} {' '}
                        {lastTransaction.purchase_units?.[0]?.amount?.value}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Email:</span>
                      <p className="text-xs">{lastTransaction.payer?.email_address}</p>
                    </div>
                  </div>

                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-green-700">
                      Ver detalles completos
                    </summary>
                    <pre className="mt-2 p-2 bg-green-100 rounded text-xs overflow-auto">
                      {JSON.stringify(lastTransaction, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Información del Entorno</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <p><strong>Client ID:</strong> {import.meta.env.VITE_PAYPAL_CLIENT_ID || 'No configurado'}</p>
                  <p><strong>Entorno:</strong> Sandbox (Pruebas)</p>
                  <p><strong>Monedas soportadas:</strong> USD, EUR, CLP, MXN, ARS</p>
                  <p><strong>Tipo de integración:</strong> PayPal Checkout</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayPalTestPage;