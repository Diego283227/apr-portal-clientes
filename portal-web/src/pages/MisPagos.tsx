import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Receipt, Download, FileText, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../services/api';
import { Badge } from '../components/ui/badge';

interface Pago {
  _id: string;
  numeroComprobante: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  estadoPago: string;
  boleta: {
    numeroBoleta: string;
    periodo: string;
  } | null;
  tieneComprobante: boolean;
}

interface MisPagosProps {
  onBack?: () => void;
}

const MisPagos: React.FC<MisPagosProps> = ({ onBack }) => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/comprobantes/mis-pagos');
      if (response.data.success) {
        setPagos(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading payments:', error);
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const descargarComprobante = async (pagoId: string, numeroComprobante: string) => {
    try {
      setDownloading(pagoId);

      const response = await apiClient.get(`/comprobantes/${pagoId}`, {
        responseType: 'blob'
      });

      // Crear blob y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Comprobante_${numeroComprobante}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Comprobante descargado exitosamente');
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      toast.error('Error al descargar el comprobante');
    } finally {
      setDownloading(null);
    }
  };

  const formatMetodoPago = (metodo: string) => {
    const metodos: Record<string, string> = {
      'mercadopago': 'Mercado Pago',
      'paypal': 'PayPal',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria'
    };
    return metodos[metodo] || metodo;
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Mis Pagos y Comprobantes
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Descarga tus comprobantes de pago en formato PDF
              </p>
            </div>
          </div>
        </div>

        {/* Lista de pagos */}
        {pagos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No tienes pagos completados aún
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pagos.map((pago) => (
              <Card key={pago._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Información del pago */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Comprobante */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Comprobante
                          </p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {pago.numeroComprobante}
                          </p>
                        </div>
                      </div>

                      {/* Fecha */}
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Fecha
                          </p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {formatFecha(pago.fecha)}
                          </p>
                        </div>
                      </div>

                      {/* Monto */}
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Monto
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            ${pago.monto.toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>

                      {/* Método de pago */}
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Método
                          </p>
                          <Badge variant="outline">
                            {formatMetodoPago(pago.metodoPago)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Botón de descarga */}
                    <div className="ml-4">
                      <Button
                        onClick={() => descargarComprobante(pago._id, pago.numeroComprobante)}
                        disabled={downloading === pago._id}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {downloading === pago._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Descargando...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Información de boleta */}
                  {pago.boleta && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Boleta: <span className="font-medium text-gray-900 dark:text-gray-100">
                          {pago.boleta.numeroBoleta}
                        </span> | Período: <span className="font-medium text-gray-900 dark:text-gray-100">
                          {pago.boleta.periodo}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info footer */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              💡 <strong>Tip:</strong> Todos los comprobantes también son enviados automáticamente a tu correo electrónico cuando realizas un pago.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MisPagos;
