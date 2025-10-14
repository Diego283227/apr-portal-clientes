import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Calendar,
  DollarSign,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { usePagos, type Pago } from '@/hooks/usePagos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistorialPagosViewProps {
  socio: any;
  onBack: () => void;
}

const HistorialPagosView: React.FC<HistorialPagosViewProps> = ({
  socio,
  onBack
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { pagos, pagination, isLoading, error, refetch } = usePagos(currentPage, limit);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const getPaymentMethodBadge = (metodoPago: string) => {
    const colors = {
      paypal: 'bg-blue-500 text-white',
      mercadopago: 'bg-cyan-500 text-white',
      webpay: 'bg-red-500 text-white',
      flow: 'bg-purple-500 text-white',
      transferencia: 'bg-green-500 text-white',
      efectivo: 'bg-gray-500 text-white'
    };

    const labels = {
      paypal: 'PayPal',
      mercadopago: 'Mercado Pago',
      webpay: 'WebPay',
      flow: 'Flow',
      transferencia: 'Transferencia',
      efectivo: 'Efectivo'
    };

    return (
      <Badge className={colors[metodoPago as keyof typeof colors] || 'bg-gray-500 text-white'}>
        {labels[metodoPago as keyof typeof labels] || metodoPago}
      </Badge>
    );
  };

  const getStatusBadge = (estadoPago: string) => {
    const statusConfig = {
      completado: { icon: CheckCircle2, color: 'bg-green-500 text-white', label: 'Completado' },
      pendiente: { icon: Clock, color: 'bg-yellow-500 text-white', label: 'Pendiente' },
      fallido: { icon: XCircle, color: 'bg-red-500 text-white', label: 'Fallido' },
      reembolsado: { icon: RefreshCw, color: 'bg-blue-500 text-white', label: 'Reembolsado' }
    };

    const config = statusConfig[estadoPago as keyof typeof statusConfig] || statusConfig.pendiente;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Pagos</h1>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-center">
              <div>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Error al cargar historial</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No se pudo cargar el historial de pagos. Por favor, intenta nuevamente.
                </p>
                <Button onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Pagos</h1>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Summary Stats */}
      {pagination && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Pagos Exitosos</p>
                  <p className="text-2xl font-bold">{pagination.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pagado</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pagos.reduce((sum, pago) => sum + pago.monto, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Páginas</p>
                  <p className="text-2xl font-bold">{pagination.pages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments List */}
      <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Pagos Exitosos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo se muestran los pagos completados exitosamente
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Cargando historial...</span>
            </div>
          ) : pagos.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay pagos registrados</h3>
              <p className="text-muted-foreground">
                Cuando realices pagos, aparecerán aquí en tu historial.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagos.map((pago) => (
                <div key={pago._id} className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-base">
                        {pago.boletaId ? (
                          `Boleta #${pago.boletaId.numeroBoleta}`
                        ) : (
                          'Pago sin boleta asociada'
                        )}
                      </h4>
                      {getPaymentMethodBadge(pago.metodoPago)}
                      {getStatusBadge(pago.estadoPago)}
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(pago.monto)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {pago.boletaId && (
                      <div>
                        <span className="font-medium">Período:</span> {pago.boletaId.periodo}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Fecha:</span> {formatDate(pago.fechaPago)}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium">ID Transacción:</span> {pago.transactionId}
                    </div>
                    {pago.detallesPago?.numeroTransaccion && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Número Transacción:</span> {pago.detallesPago.numeroTransaccion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.pages} ({pagination.total} pagos total)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistorialPagosView;