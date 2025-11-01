import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { Boleta } from '@/types';

interface BoletasResponse {
  success: boolean;
  data: Boleta[];
  message: string;
}

interface BoletaResponse {
  success: boolean;
  data: Boleta;
  message: string;
}

export const useBoletas = () => {
  const [selectedBoletas, setSelectedBoletas] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Listen for payment success events to refresh boletas
  useEffect(() => {
    const handlePaymentSuccess = (event: any) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
    };

    const handleBoletasUpdated = (event: any) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
    };

    window.addEventListener('payment-success', handlePaymentSuccess);
    window.addEventListener('boletas-updated', handleBoletasUpdated);

    return () => {
      window.removeEventListener('payment-success', handlePaymentSuccess);
      window.removeEventListener('boletas-updated', handleBoletasUpdated);
    };
  }, [queryClient]);

  // No longer need custom token management - apiClient handles it

  // Fetch all boletas
  const boletasQuery = useQuery({
    queryKey: ['boletas'],
    queryFn: async (): Promise<Boleta[]> => {
      try {
        const response = await apiClient.get('/boletas');

        if (response.data.success) {
          // Response should always be an array of boletas
          const boletas = response.data.data || [];
          return boletas;
        }
        throw new Error(response.data.message || 'Error al obtener boletas');
      } catch (error: any) {
        if (error.response) {
          // If it's a 401 (unauthorized), throw the error
          if (error.response?.status === 401) {
            throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
          }

          // If it's a 404, the endpoint doesn't exist
          if (error.response?.status === 404) {
            throw new Error('Endpoint de boletas no encontrado');
          }

          // If it's a 500, server error
          if (error.response?.status === 500) {
            throw new Error('Error interno del servidor');
          }

          // Other HTTP errors
          throw new Error(error.response?.data?.message || `Error HTTP ${error.response?.status}`);
        } else if (error.request) {
          // Network error
          throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
        } else {
          // Other error
          throw new Error(error.message || 'Error desconocido al cargar boletas');
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Fetch specific boleta
  const getBoletaQuery = (boletaId: string) =>
    useQuery({
      queryKey: ['boleta', boletaId],
      queryFn: async (): Promise<Boleta> => {
        try {
          const response = await apiClient.get(`/boletas/${boletaId}`);

          if (response.data.success) {
            return response.data.data;
          }
          throw new Error(response.data.message || 'Error al obtener boleta');
        } catch (error) {
          throw new Error('Boleta no encontrada');
        }
      },
      enabled: !!boletaId
    });

// Mock data removed - using real API only

  // Helper functions
  const getPendingBoletas = (): Boleta[] => {
    // Only include boletas that are pending/vencida AND were never paid
    return boletasQuery.data?.filter(b =>
      (b.estado === 'pendiente' || b.estado === 'vencida') &&
      !(b as any).pagada // Exclude boletas that were already paid
    ) || [];
  };

  const getTotalDeuda = (): number => {
    return getPendingBoletas().reduce((sum, b) => sum + b.montoTotal, 0);
  };

  const getSelectedBoletas = (): Boleta[] => {
    return boletasQuery.data?.filter(b => selectedBoletas.includes(b.id)) || [];
  };

  const getSelectedTotal = (): number => {
    return getSelectedBoletas().reduce((sum, b) => sum + b.montoTotal, 0);
  };

  // Selection handlers
  const selectBoleta = (boletaId: string) => {
    setSelectedBoletas(prev => 
      prev.includes(boletaId) ? prev : [...prev, boletaId]
    );
  };

  const deselectBoleta = (boletaId: string) => {
    setSelectedBoletas(prev => prev.filter(id => id !== boletaId));
  };

  const toggleBoleta = (boletaId: string) => {
    setSelectedBoletas(prev => 
      prev.includes(boletaId) 
        ? prev.filter(id => id !== boletaId)
        : [...prev, boletaId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = getPendingBoletas().map(b => b.id);
    setSelectedBoletas(pendingIds);
  };

  const clearSelection = () => {
    setSelectedBoletas([]);
  };

  // Update boleta status (for mock data simulation)
  const updateBoletaStatus = (boletaIds: string[], newStatus: 'pagada' | 'pendiente' | 'vencida') => {
    queryClient.setQueryData(['boletas'], (oldBoletas: Boleta[] | undefined) => {
      if (!oldBoletas) {
        return oldBoletas;
      }

      const updatedBoletas = oldBoletas.map(boleta => {
        const shouldUpdate = boletaIds.includes(boleta.id);

        if (shouldUpdate) {
          return { ...boleta, estado: newStatus };
        }
        return boleta;
      });

      return updatedBoletas;
    });

    // Force a re-render by invalidating queries
    queryClient.invalidateQueries({ queryKey: ['boletas'] });
  };

  // Update boleta status mutation
  const updateBoletaStatusMutation = useMutation({
    mutationFn: async (data: { boletaIds: string[], status: 'pagada' | 'pendiente' | 'vencida' }): Promise<void> => {
      try {
        const requestPayload = {
          boletaIds: data.boletaIds,
          status: data.status
        };

        const response = await apiClient.patch('/boletas/status', requestPayload);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al actualizar boletas');
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al actualizar estado de boletas');
      }
    },
    onSuccess: (_, variables) => {
      // Update cache immediately
      queryClient.setQueryData(['boletas'], (oldBoletas: Boleta[] | undefined) => {
        if (!oldBoletas) return oldBoletas;

        return oldBoletas.map(boleta =>
          variables.boletaIds.includes(boleta.id)
            ? { ...boleta, estado: variables.status }
            : boleta
        );
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
    }
  });

  // Remove paid boletas mutation
  const removePaidBoletasMutation = useMutation({
    mutationFn: async (data: {
      boletaIds: string[],
      paymentMethod?: string,
      paymentId?: string
    }): Promise<void> => {
      try {
        const requestPayload = {
          boletaIds: data.boletaIds,
          paymentMethod: data.paymentMethod,
          paymentId: data.paymentId
        };

        const response = await apiClient.delete('/boletas/paid', {
          data: requestPayload
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al eliminar boletas pagadas');
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Error al eliminar boletas pagadas');
      }
    },
    onSuccess: (_, variables) => {
      // Remove boletas from cache immediately
      queryClient.setQueryData(['boletas'], (oldBoletas: Boleta[] | undefined) => {
        if (!oldBoletas) return oldBoletas;

        const updatedBoletas = oldBoletas.filter(boleta => !variables.boletaIds.includes(boleta.id));
        return updatedBoletas;
      });

      // Clear selection since boletas were removed
      setSelectedBoletas([]);

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['boletas'] });

      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('boletas-removed', {
        detail: { removedIds: variables.boletaIds }
      }));
    }
  });

  // Delete boleta mutation
  const deleteBoleta = useMutation({
    mutationFn: async (boletaId: string): Promise<void> => {
      try {
        const response = await apiClient.delete(`/boletas/${boletaId}`);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al eliminar boleta');
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          throw new Error('No tienes permisos para eliminar boletas');
        }
        throw new Error(error.response?.data?.message || 'Error al eliminar boleta');
      }
    },
    onSuccess: (_, boletaId) => {
      // Remove the boleta from the cache
      queryClient.setQueryData(['boletas'], (oldBoletas: Boleta[] | undefined) => {
        if (!oldBoletas) return oldBoletas;
        return oldBoletas.filter(boleta => boleta.id !== boletaId);
      });
      
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
    },
    onError: (error: any) => {
      // Handle error silently
    }
  });

  return {
    // Data
    boletas: boletasQuery.data || [],
    isLoading: boletasQuery.isLoading,
    error: boletasQuery.error,

    // Computed values
    pendingBoletas: getPendingBoletas(),
    totalDeuda: getTotalDeuda(),
    selectedBoletas,
    selectedBoletasData: getSelectedBoletas(),
    selectedTotal: getSelectedTotal(),

    // Selection handlers
    selectBoleta,
    deselectBoleta,
    toggleBoleta,
    selectAllPending,
    clearSelection,
    updateBoletaStatus,

    // Mutations
    updateBoletaStatusInDB: updateBoletaStatusMutation.mutate,
    isUpdatingStatus: updateBoletaStatusMutation.isPending,
    updateStatusError: updateBoletaStatusMutation.error,
    removePaidBoletas: removePaidBoletasMutation.mutate,
    isRemovingBoletas: removePaidBoletasMutation.isPending,
    removeBoletasError: removePaidBoletasMutation.error,
    deleteBoleta: deleteBoleta.mutate,
    isDeleting: deleteBoleta.isPending,
    deleteError: deleteBoleta.error,

    // Queries
    getBoletaQuery,

    // Refetch
    refetch: boletasQuery.refetch,

    // Query client
    queryClient
  };
};