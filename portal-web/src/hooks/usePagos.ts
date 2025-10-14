import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

export interface Pago {
  _id: string;
  boletaId: {
    _id: string;
    numeroBoleta: string;
    periodo: string;
    montoTotal: number;
  } | null;
  socioId: string;
  monto: number;
  fechaPago: string;
  metodoPago: 'webpay' | 'flow' | 'mercadopago' | 'paypal' | 'transferencia' | 'efectivo';
  estadoPago: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  transactionId: string;
  detallesPago?: {
    numeroTransaccion?: string;
    codigoAutorizacion?: string;
    numeroTarjeta?: string;
    tipoTarjeta?: string;
    banco?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface PagosResponse {
  success: boolean;
  data: Pago[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message: string;
}

export const usePagos = (page: number = 1, limit: number = 10) => {
  const query = useQuery({
    queryKey: ['pagos', 'history', page, limit],
    queryFn: async (): Promise<PagosResponse> => {
      try {
        const response = await apiClient.get('/pagos/history', {
          params: {
            page,
            limit,
            status: 'completado' // Only fetch completed payments
          }
        });

        if (response.data.success) {
          return response.data;
        }
        throw new Error(response.data.message || 'Error al obtener historial de pagos');
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al obtener historial de pagos');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  return {
    pagos: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};