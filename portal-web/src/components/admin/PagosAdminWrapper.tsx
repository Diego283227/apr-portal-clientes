import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import PagosAdminView from './PagosAdminView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

interface Pago {
  id: string;
  boletaId: string;
  socioId: string;
  monto: number;
  metodoPago: 'paypal' | 'webpay' | 'flow' | 'mercadopago' | 'transferencia' | 'efectivo';
  estadoPago: 'completado' | 'pendiente' | 'fallido' | 'reembolsado';
  transactionId?: string;
  fechaPago: string;
  detallesPago?: any;
  metadata?: any;
  boleta: {
    _id: string;
    numeroBoleta: string;
    periodo: string;
    montoTotal: number;
  };
  socio: {
    _id: string;
    nombres: string;
    apellidos: string;
    rut: string;
    codigoSocio: string;
    email: string;
  };
}

interface PagosStats {
  total: number;
  completados: number;
  pendientes: number;
  fallidos: number;
  montoTotal: number;
}

export default function PagosAdminWrapper() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [stats, setStats] = useState<PagosStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const transformPagoData = (rawPago: any): Pago => {
    return {
      id: rawPago._id,
      boletaId: rawPago.boletaId?._id || rawPago.boletaId,
      socioId: rawPago.socioId?._id || rawPago.socioId,
      monto: rawPago.monto,
      metodoPago: rawPago.metodoPago,
      estadoPago: rawPago.estadoPago,
      transactionId: rawPago.transactionId,
      fechaPago: rawPago.fechaPago,
      detallesPago: rawPago.detallesPago,
      metadata: rawPago.metadata,
      boleta: {
        _id: rawPago.boletaId?._id || rawPago.boletaId,
        numeroBoleta: rawPago.boletaId?.numeroBoleta || 'N/A',
        periodo: rawPago.boletaId?.periodo || 'N/A',
        montoTotal: rawPago.boletaId?.montoTotal || rawPago.monto
      },
      socio: {
        _id: rawPago.socioId?._id || rawPago.socioId,
        nombres: rawPago.socioId?.nombres || 'N/A',
        apellidos: rawPago.socioId?.apellidos || '',
        rut: rawPago.socioId?.rut || 'N/A',
        codigoSocio: rawPago.socioId?.codigoSocio || 'N/A',
        email: rawPago.socioId?.email || 'N/A'
      }
    };
  };

  const loadPagos = async () => {
    try {
      setError(null);
      const response = await apiClient.get('/pagos/admin/all?limit=100');

      if (response.data.success) {
        const transformedPagos = response.data.data.pagos.map(transformPagoData);
        setPagos(transformedPagos);
        setStats(response.data.data.stats);
        console.log('✅ Pagos loaded successfully:', transformedPagos.length);
      } else {
        throw new Error(response.data.message || 'Error al cargar pagos');
      }
    } catch (error: any) {
      console.error('Error loading pagos:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al cargar el historial de pagos';
      setError(errorMessage);
      toast.error('Error al cargar pagos', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshPagos = async () => {
    setRefreshing(true);
    toast.info('Actualizando historial de pagos...');
    await loadPagos();
    toast.success('Historial actualizado');
  };

  const handleViewPago = (pagoId: string) => {
    const pago = pagos.find(p => p.id === pagoId);
    if (pago) {
      // Show pago details in a modal or navigate to detail view
      toast.info('Funcionalidad de detalle en desarrollo', {
        description: `Pago ID: ${pagoId}`
      });
    }
  };

  const handleExportData = async (dateRange?: { from: Date; to: Date }) => {
    try {
      toast.info('Generando exportación...', {
        description: 'Preparando archivo de datos'
      });

      // Create CSV content
      const headers = [
        'Fecha/Hora',
        'Nº Boleta',
        'Socio',
        'RUT',
        'Código Socio',
        'Monto (CLP)',
        'Método Pago',
        'Estado',
        'PayPal Transaction ID'
      ];

      let filteredPagos = pagos;
      if (dateRange) {
        filteredPagos = pagos.filter(pago => {
          const pagoDate = new Date(pago.fechaPago);
          return pagoDate >= dateRange.from && pagoDate <= dateRange.to;
        });
      }

      const csvContent = [
        headers.join(','),
        ...filteredPagos.map(pago => [
          new Date(pago.fechaPago).toLocaleString('es-CL'),
          pago.boleta.numeroBoleta,
          `"${pago.socio.nombres} ${pago.socio.apellidos}"`,
          pago.socio.rut,
          pago.socio.codigoSocio,
          pago.monto,
          pago.metodoPago,
          pago.estadoPago,
          pago.transactionId || 'N/A'
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `historial-pagos-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Exportación completada', {
        description: `Se exportaron ${filteredPagos.length} registros`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar datos');
    }
  };

  useEffect(() => {
    loadPagos();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Cargando historial de pagos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Error al cargar pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                loadPagos();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Transform data for PagosAdminView component
  const transformedPagosForView = pagos.map(pago => ({
    ...pago,
    boleta: {
      ...pago.boleta,
      socio: {
        nombre: `${pago.socio.nombres} ${pago.socio.apellidos}`.trim(),
        rut: pago.socio.rut,
        codigoSocio: pago.socio.codigoSocio
      }
    }
  }));

  return (
    <PagosAdminView
      pagos={transformedPagosForView as any}
      onBack={() => window.history.back()}
      onViewPago={handleViewPago}
      onRefreshPagos={handleRefreshPagos}
      onExportData={handleExportData}
    />
  );
}