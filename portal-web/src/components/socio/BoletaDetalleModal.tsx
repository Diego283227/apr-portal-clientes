import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  CreditCard,
  Receipt,
  Droplets,
  DollarSign,
  Info,
  X
} from 'lucide-react';
import type { Boleta } from '@/types';

interface BoletaDetalleModalProps {
  boleta: Boleta | null;
  isOpen: boolean;
  onClose: () => void;
  onPagar: (boletaIds: string[]) => void;
  onDownloadPDF: (boletaId: string) => void;
}

export default function BoletaDetalleModal({
  boleta,
  isOpen,
  onClose,
  onPagar,
  onDownloadPDF
}: BoletaDetalleModalProps) {
  if (!boleta) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CL');

  const getEstadoBadge = (estado: Boleta['estado']) => {
    switch (estado) {
      case 'pagada':
        return <Badge className="bg-green-500 text-white">Pagada</Badge>;
      case 'vencida':
        return <Badge variant="destructive">Vencida</Badge>;
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'anulada':
        return <Badge variant="outline">Anulada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const isOverdue = () => {
    return new Date(boleta.fechaVencimiento) < new Date() && boleta.estado !== 'pagada';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        {/* Header oficial APR */}
        <div className="border-b border-blue-200 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-3 rounded-lg">
                <Droplets className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-800">APR RURAL</h1>
                <p className="text-sm text-gray-600">Agua Potable Rural</p>
                <p className="text-xs text-gray-500">Comité de Agua Potable Rural</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {getEstadoBadge(boleta.estado)}
              </div>
              <p className="text-sm text-gray-600">RUT: 65.432.100-K</p>
              <p className="text-xs text-gray-500">Fono: +56 9 1234 5678</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold text-gray-800">BOLETA DE COBRO</h2>
            <p className="text-sm text-gray-600">Servicio de Agua Potable</p>
          </div>
        </div>

        <DialogHeader className="hidden">
          <DialogTitle>Boleta #{boleta.numeroBoleta}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerta de vencimiento */}
          {isOverdue() && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Info className="text-red-600" size={20} />
                <div>
                  <h3 className="font-semibold text-red-800">
                    Boleta Vencida
                  </h3>
                  <p className="text-sm text-red-700">
                    Esta boleta venció el {formatDate(boleta.fechaVencimiento)}.
                    Por favor, realiza el pago lo antes posible.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información de la Boleta en formato oficial */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-sm">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800">DATOS DE LA BOLETA</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">N° Boleta:</span>
                    <span className="font-bold">{boleta.numeroBoleta}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Período:</span>
                    <span>{boleta.periodo}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Fecha Emisión:</span>
                    <span>{formatDate(boleta.fechaEmision)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Vencimiento:</span>
                    <span className={isOverdue() ? 'text-red-600 font-bold' : ''}>{formatDate(boleta.fechaVencimiento)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-800">DATOS DEL SOCIO</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Nombre:</span>
                    <span>{boleta.socio?.nombre || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">RUT:</span>
                    <span className="font-mono">{boleta.socio?.rut || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-medium">Código:</span>
                    <span className="font-mono">{boleta.socio?.codigoSocio || 'N/A'}</span>
                  </div>
                  {boleta.socio?.direccion && (
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium">Dirección:</span>
                      <span className="text-xs">{boleta.socio.direccion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información Principal */}
            <div className="space-y-6">

              {/* Información del Consumo */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Droplets size={20} />
                  <h3 className="font-semibold">Detalles de Consumo</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Lectura Anterior</p>
                    <p className="font-semibold">{boleta.lecturaAnterior} m³</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lectura Actual</p>
                    <p className="font-semibold">{boleta.lecturaActual} m³</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Consumo del Período</p>
                    <p className="font-semibold text-blue-600">{boleta.consumoM3} m³</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tarifa por m³</p>
                    <p className="font-semibold">{formatCurrency(boleta.detalle.tarifaM3)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">Progreso de Consumo</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Actual: {boleta.consumoM3} m³</span>
                      <span>Anterior: {boleta.detalle.consumoAnterior} m³</span>
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
                        : boleta.consumoM3 < boleta.detalle.consumoAnterior
                        ? `Reducción de ${boleta.detalle.consumoAnterior - boleta.consumoM3} m³`
                        : 'Sin variación'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de Pago y Acciones */}
            <div className="space-y-6">
              {/* Resumen de Cobro Oficial */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 shadow-sm">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg text-blue-800">DETALLE DE COBRO</h3>
                  <p className="text-xs text-gray-600">Período: {boleta.periodo}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 font-bold">CONCEPTO</th>
                        <th className="text-right py-2 font-bold">MONTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-2">Cargo Fijo Mensual</td>
                        <td className="text-right py-2 font-mono">{formatCurrency(boleta.detalle.cargoFijo)}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2">Consumo de Agua ({boleta.consumoM3} m³ × {formatCurrency(boleta.detalle.tarifaM3)})</td>
                        <td className="text-right py-2 font-mono">{formatCurrency(boleta.consumoM3 * boleta.detalle.tarifaM3)}</td>
                      </tr>
                      {boleta.detalle.otrosCargos && boleta.detalle.otrosCargos > 0 && (
                        <tr className="border-b border-gray-200">
                          <td className="py-2">Otros Cargos</td>
                          <td className="text-right py-2 font-mono">{formatCurrency(boleta.detalle.otrosCargos)}</td>
                        </tr>
                      )}
                      {boleta.detalle.descuentos && boleta.detalle.descuentos > 0 && (
                        <tr className="border-b border-gray-200 text-green-600">
                          <td className="py-2">Descuentos Aplicados</td>
                          <td className="text-right py-2 font-mono">-{formatCurrency(boleta.detalle.descuentos)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-blue-500 bg-blue-100 dark:bg-blue-900/40">
                        <td className="py-3 font-bold text-lg">TOTAL A PAGAR</td>
                        <td className="text-right py-3 font-bold text-xl text-blue-800 font-mono">{formatCurrency(boleta.montoTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-center text-xs text-gray-600">
                  <p>Vencimiento: <span className={`font-bold ${isOverdue() ? 'text-red-600' : 'text-blue-600'}`}>{formatDate(boleta.fechaVencimiento)}</span></p>
                  {isOverdue() && (
                    <p className="text-red-600 font-bold mt-1">⚠️ BOLETA VENCIDA</p>
                  )}
                </div>
              </div>

              {/* Información del Socio */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold mb-4">Información del Socio</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Nombre</p>
                    <p className="font-medium">{boleta.socio?.nombre || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">RUT</p>
                    <p className="font-medium">{boleta.socio?.rut || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Código de Socio</p>
                    <p className="font-medium">{boleta.socio?.codigoSocio || 'N/A'}</p>
                  </div>
                  {boleta.socio?.direccion && (
                    <div>
                      <p className="text-gray-600">Dirección</p>
                      <p className="font-medium">{boleta.socio.direccion}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onDownloadPDF(boleta.id)}
                >
                  <Download size={16} className="mr-2" />
                  Descargar PDF
                </Button>

                {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onPagar([boleta.id]);
                      onClose();
                    }}
                  >
                    <CreditCard size={16} className="mr-2" />
                    Pagar {formatCurrency(boleta.montoTotal)}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Footer oficial */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <h4 className="font-bold text-blue-800 mb-2">FORMAS DE PAGO</h4>
                  <p>• PayPal Online</p>
                  <p>• Transferencia Bancaria</p>
                  <p>• Efectivo en Oficina</p>
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-blue-800 mb-2">HORARIOS DE ATENCIÓN</h4>
                  <p>Lunes a Viernes</p>
                  <p>09:00 - 17:00 hrs</p>
                  <p>Sábados: 09:00 - 12:00 hrs</p>
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-blue-800 mb-2">CONTACTO</h4>
                  <p>Fono: +56 9 1234 5678</p>
                  <p>Email: admin@apr-rural.cl</p>
                  <p>Dirección: Calle Principal 123</p>
                </div>
              </div>

              <div className="text-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600">
                  <strong>IMPORTANTE:</strong> El no pago en fecha de vencimiento puede generar corte del suministro de agua.
                  Para consultas sobre su consumo, contacte a nuestras oficinas.
                </p>
                <p className="text-xs text-blue-600 mt-2 font-bold">
                  APR RURAL - Comprometidos con el agua potable para todos
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}