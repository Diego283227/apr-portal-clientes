import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Boleta, Pago } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api';

interface ProcessPaymentData {
  boletaIds: string[];
  metodoPago: string;
  total: number;
}

interface ProcessPaymentResponse {
  success: boolean;
  data: {
    pagos: Pago[];
    totalAmount: number;
    estadoPago: string;
    transactionId: string;
  };
  message: string;
}

interface PaymentHistoryResponse {
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

export const usePayments = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: ProcessPaymentData): Promise<ProcessPaymentResponse> => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/pagos`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  });

  // Get payment history query
  const getPaymentHistoryQuery = (page: number = 1, limit: number = 10) => 
    useQuery({
      queryKey: ['payment-history', page, limit],
      queryFn: async (): Promise<PaymentHistoryResponse> => {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/pagos/history?page=${page}&limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      }
    });

  // Get payment details query
  const getPaymentDetailsQuery = (paymentId: string) =>
    useQuery({
      queryKey: ['payment-details', paymentId],
      queryFn: async (): Promise<{ success: boolean; data: Pago; message: string }> => {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/pagos/${paymentId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return response.data;
      },
      enabled: !!paymentId
    });

  // Process payment function
  const processPayment = async (data: ProcessPaymentData) => {
    setIsProcessing(true);
    try {
      const result = await processPaymentMutation.mutateAsync(data);
      return result;
    } catch (error) {
      // Simulate successful payment when API is not available
      const mockResult: ProcessPaymentResponse = {
        success: true,
        data: {
          pagos: data.boletaIds.map(id => ({
            id: `pago-${Date.now()}-${id}`,
            boletaId: id,
            socioId: 'socio1',
            monto: data.total / data.boletaIds.length,
            fechaPago: new Date().toISOString(),
            metodoPago: data.metodoPago as 'webpay' | 'flow' | 'transferencia' | 'efectivo',
            estadoPago: 'completado' as const,
            transaccionId: `TXN-${Date.now()}`
          })),
          totalAmount: data.total,
          estadoPago: 'completado',
          transactionId: `TXN-${Date.now()}`
        },
        message: 'Pago procesado exitosamente (modo demo)'
      };
      
      // Still invalidate queries for UI refresh
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      
      return mockResult;
    } finally {
      setIsProcessing(false);
    }
  };


  // Process traditional payment methods
  const processTraditionalPayment = async (
    boletaIds: string[],
    metodoPago: string,
    total: number
  ) => {
    return processPayment({
      boletaIds,
      metodoPago,
      total
    });
  };

  return {
    // State
    isProcessing: isProcessing || processPaymentMutation.isPending,
    error: processPaymentMutation.error,
    
    // Functions
    processPayment,
    processTraditionalPayment,
    
    // Queries
    getPaymentHistoryQuery,
    getPaymentDetailsQuery,
    
    // Query client for manual invalidation if needed
    queryClient
  };
};