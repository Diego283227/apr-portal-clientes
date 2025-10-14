import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  CreditCard, 
  Receipt, 
  Calculator,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Smartphone,
  Globe,
  Shield,
  Info
} from 'lucide-react';

interface Boleta {
  _id?: string;
  id: string;
  numeroBoleta: string;
  periodo: string;
  montoTotal: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  fechaVencimiento: string;
  fechaEmision: string;
  consumoM3: number;
  detalles?: {
    consumoBase: number;
    exceso: number;
    mantenimiento: number;
    otros: number;
  };
}

interface PaymentInterfaceProps {
  selectedBoletas: Boleta[];
  onBack: () => void;
  onPaymentMethodSelect: (method: string, boletas: Boleta[]) => void;
}

const PaymentInterface: React.FC<PaymentInterfaceProps> = ({
  selectedBoletas,
  onBack,
  onPaymentMethodSelect
}) => {
  const [selectedBoletasForPayment, setSelectedBoletasForPayment] = useState<string[]>(
    selectedBoletas.map(b => b._id || b.id)
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleBoletaToggle = (boletaId: string, checked: boolean) => {
    if (checked) {
      setSelectedBoletasForPayment(prev => [...prev, boletaId]);
    } else {
      setSelectedBoletasForPayment(prev => prev.filter(id => id !== boletaId));
    }
  };

  const getBoletasForPayment = () => {
    return selectedBoletas.filter(boleta => selectedBoletasForPayment.includes(boleta._id || boleta.id));
  };

  const getTotalAmount = () => {
    return getBoletasForPayment().reduce((sum, boleta) => sum + boleta.montoTotal, 0);
  };

  const getEstadoBadge = (estado: Boleta['estado']) => {
    switch (estado) {
      case 'pagada':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pagada</Badge>;
      case 'vencida':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Vencida</Badge>;
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendiente</Badge>;
    }
  };

  const paymentMethods = [
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pago seguro internacional',
      icon: Globe,
      features: ['PayPal, tarjetas de crédito y débito', 'Aceptado mundialmente', 'Máxima seguridad'],
      comingSoon: false,
      recommended: true
    },
    {
      id: 'webpay',
      name: 'WebPay Plus',
      description: 'Pago seguro con tarjetas chilenas',
      icon: Shield,
      features: ['Tarjetas de crédito chilenas', 'Tarjetas de débito', 'Máxima seguridad'],
      comingSoon: true
    },
    {
      id: 'transfer',
      name: 'Transferencia Bancaria',
      description: 'Transfiere desde tu banco',
      icon: Banknote,
      features: ['Desde cualquier banco', 'Sin comisiones adicionales', 'Validación automática'],
      comingSoon: true
    }
  ];

  const handleProceedToPayment = () => {
    if (selectedPaymentMethod && selectedBoletasForPayment.length > 0) {
      const boletasToPayFor = getBoletasForPayment();
      onPaymentMethodSelect(selectedPaymentMethod, boletasToPayFor);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Pagar Boletas</h1>
              <p className="text-sm text-gray-600">
                Selecciona las boletas y método de pago
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Boletas Selection */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Boletas to Pay */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <CardTitle>Boletas Seleccionadas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedBoletas.map((boleta) => {
                  const boletaId = boleta._id || boleta.id;
                  return (
                  <div key={boletaId} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                      id={boletaId}
                      checked={selectedBoletasForPayment.includes(boletaId)}
                      onCheckedChange={(checked) =>
                        handleBoletaToggle(boletaId, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Boleta {boleta.numeroBoleta}
                        </h4>
                        {getEstadoBadge(boleta.estado)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Período:</span> {boleta.periodo}
                        </div>
                        <div>
                          <span className="font-medium">Consumo:</span> {boleta.consumoM3} m³
                        </div>
                        <div>
                          <span className="font-medium">Vencimiento:</span> {formatDate(boleta.fechaVencimiento)}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(boleta.montoTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}

                {selectedBoletasForPayment.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Debes seleccionar al menos una boleta para continuar con el pago.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <CardTitle>Método de Pago</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <div
                      key={method.id}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${method.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => !method.comingSoon && setSelectedPaymentMethod(method.id)}
                    >
                      {method.recommended && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500">
                          Recomendado
                        </Badge>
                      )}
                      {method.comingSoon && (
                        <Badge variant="outline" className="absolute -top-2 -right-2">
                          Próximamente
                        </Badge>
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          selectedPaymentMethod === method.id ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`h-6 w-6 ${
                            selectedPaymentMethod === method.id ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{method.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                          
                          <ul className="text-xs text-gray-500 space-y-1">
                            {method.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {selectedPaymentMethod === method.id && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Summary */}
          <div className="space-y-6">
            
            {/* Payment Summary */}
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <CardTitle>Resumen de Pago</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Selected boletas summary */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Boletas seleccionadas:</h4>
                  {getBoletasForPayment().map((boleta) => (
                    <div key={boleta._id || boleta.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Boleta {boleta.numeroBoleta}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(boleta.montoTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total a Pagar:</span>
                  <span className="text-blue-600">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>

                {/* Payment button */}
                <Button
                  onClick={handleProceedToPayment}
                  disabled={selectedBoletasForPayment.length === 0 || !selectedPaymentMethod}
                  className="w-full"
                  size="lg"
                >
                  {selectedPaymentMethod === 'paypal' && 'Pagar con PayPal'}
                  {selectedPaymentMethod === 'webpay' && 'Pagar con WebPay'}
                  {selectedPaymentMethod === 'transfer' && 'Pagar con Transferencia'}
                  {!selectedPaymentMethod && 'Selecciona método de pago'}
                </Button>

                {/* Security notice */}
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-xs text-green-800">
                      <p className="font-medium mb-1">Pago 100% Seguro</p>
                      <p>Todos los pagos son procesados de forma segura y encriptada.</p>
                    </div>
                  </div>
                </div>

                {/* Help info */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">¿Necesitas ayuda?</p>
                      <p>Contacta a soporte si tienes problemas con el pago.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentInterface;