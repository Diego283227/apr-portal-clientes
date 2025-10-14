import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  CreditCard, 
  Receipt,
  Droplets,
  DollarSign,
  Info
} from 'lucide-react';
import type { Boleta } from '@/types';

interface BoletaDetalleProps {
  boleta: Boleta;
  onBack: () => void;
  onPagar: (boletaId: string) => void;
  onDownloadPDF: (boletaId: string) => void;
}

export default function BoletaDetalle({ boleta, onBack, onPagar, onDownloadPDF }: BoletaDetalleProps) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('es-CL');

  const getEstadoBadge = (estado: Boleta['estado']) => {
    switch (estado) {
      case 'pagada':
        return <Badge className="bg-green-500">Pagada</Badge>;
      case 'vencida':
        return <Badge variant="destructive">Vencida</Badge>;
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const isOverdue = () => {
    return new Date(boleta.fechaVencimiento) < new Date() && boleta.estado !== 'pagada';
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
              <ArrowLeft size={16} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Boleta #{boleta.numeroBoleta}
              </h1>
              <p className="text-sm text-gray-600">
                Detalle completo de la boleta
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadPDF(boleta.id)}
              >
                <Download size={16} className="mr-1" />
                Descargar PDF
              </Button>
              {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                <Button
                  size="sm"
                  onClick={() => onPagar(boleta.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CreditCard size={16} className="mr-1" />
                  Pagar Ahora
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerta de vencimiento */}
        {isOverdue() && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Info className="text-red-600" size={20} />
                <div>
                  <h3 className="font-semibold text-red-800">
                    Boleta Vencida
                  </h3>
                  <p className="text-sm text-red-700">
                    Esta boleta venció el {formatDate(boleta.fechaVencimiento)}. 
                    Por favor, realiza el pago lo antes posible para evitar recargos adicionales.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos de la Boleta */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt size={20} />
                    Información de la Boleta
                  </CardTitle>
                  {getEstadoBadge(boleta.estado)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Número de Boleta</p>
                    <p className="font-semibold">{boleta.numeroBoleta}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Período</p>
                    <p className="font-semibold">{boleta.periodo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Emisión</p>
                    <p className="font-semibold">{formatDate(boleta.fechaEmision)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Vencimiento</p>
                    <p className={`font-semibold ${isOverdue() ? 'text-red-600' : ''}`}>
                      {formatDate(boleta.fechaVencimiento)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del Consumo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets size={20} />
                  Detalles de Consumo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Lectura Anterior</p>
                    <p className="font-semibold">{boleta.lecturaAnterior} m³</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lectura Actual</p>
                    <p className="font-semibold">{boleta.lecturaActual} m³</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Consumo del Período</p>
                    <p className="font-semibold text-blue-600">{boleta.consumoM3} m³</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tarifa por m³</p>
                    <p className="font-semibold">{formatCurrency(boleta.detalle.tarifaM3)}</p>
                  </div>
                </div>

                <Separator />

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Progreso de Consumo</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Consumo actual: {boleta.consumoM3} m³</span>
                      <span>vs. período anterior: {boleta.detalle.consumoAnterior} m³</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((boleta.consumoM3 / Math.max(boleta.detalle.consumoAnterior, boleta.consumoM3)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      {boleta.consumoM3 > boleta.detalle.consumoAnterior 
                        ? `Incremento de ${boleta.consumoM3 - boleta.detalle.consumoAnterior} m³`
                        : `Reducción de ${boleta.detalle.consumoAnterior - boleta.consumoM3} m³`
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de Pago */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} />
                  Resumen de Cobro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cargo fijo</span>
                    <span className="font-medium">{formatCurrency(boleta.detalle.cargoFijo)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Consumo ({boleta.consumoM3} m³)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(boleta.consumoM3 * boleta.detalle.tarifaM3)}
                    </span>
                  </div>

                  {boleta.detalle.otrosCargos && boleta.detalle.otrosCargos > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Otros cargos</span>
                      <span className="font-medium">{formatCurrency(boleta.detalle.otrosCargos)}</span>
                    </div>
                  )}

                  {boleta.detalle.descuentos && boleta.detalle.descuentos > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">Descuentos</span>
                      <span className="font-medium">-{formatCurrency(boleta.detalle.descuentos)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total a Pagar</span>
                  <span className="text-blue-600">{formatCurrency(boleta.montoTotal)}</span>
                </div>

                {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                  <>
                    <Separator />
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                      onClick={() => onPagar(boleta.id)}
                    >
                      <CreditCard size={20} className="mr-2" />
                      Pagar {formatCurrency(boleta.montoTotal)}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Información del Socio */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Socio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-medium">{boleta.socio.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">RUT</p>
                  <p className="font-medium">{boleta.socio.rut}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Código de Socio</p>
                  <p className="font-medium">{boleta.socio.codigoSocio}</p>
                </div>
                {boleta.socio.direccion && (
                  <div>
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-medium">{boleta.socio.direccion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}