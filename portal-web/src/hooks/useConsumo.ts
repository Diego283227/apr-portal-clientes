import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

export interface Lectura {
  id: string;
  socioId: string;
  numeroMedidor: string;
  codigoCliente?: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoM3: number;
  periodo: string;
  fechaLectura: string;
  horaLectura?: string;
  nombreLector?: string;
  observaciones?: string;
  incidencias?: string;
  lecturaEsCero?: boolean;
  registradoPor: string;
  boletaGenerada?: string;
  estado: 'pendiente' | 'procesada' | 'cancelada';
  fechaCreacion: string;
}

export interface MedidorInfo {
  numero: string;
  codigoSocio: string;
  fechaInstalacion?: string;
  estado?: string;
}

interface LecturasResponse {
  success: boolean;
  data: Lectura[];
  message?: string;
}

interface MedidorInfoResponse {
  success: boolean;
  data: MedidorInfo;
  message?: string;
}

export const useConsumo = () => {
  const queryClient = useQueryClient();

  // Fetch lecturas del socio logueado
  const lecturasQuery = useQuery({
    queryKey: ['lecturas', 'socio'],
    queryFn: async (): Promise<Lectura[]> => {
      try {
        const response = await apiClient.get('/consumo/lecturas');

        if (response.data.success) {
          return response.data.data || [];
        }
        throw new Error(response.data.message || 'Error al obtener lecturas');
      } catch (error: any) {
        if (error.response?.status === 401) {
          throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
        }
        if (error.response?.status === 404) {
          // Si no hay lecturas, devolver array vacío
          return [];
        }
        throw new Error(error.response?.data?.message || 'Error al cargar lecturas');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Fetch información del medidor asignado
  const medidorQuery = useQuery({
    queryKey: ['medidor', 'socio'],
    queryFn: async (): Promise<MedidorInfo | null> => {
      try {
        const response = await apiClient.get('/consumo/medidor');

        if (response.data.success) {
          return response.data.data || null;
        }
        throw new Error(response.data.message || 'Error al obtener medidor');
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Si no tiene medidor asignado, devolver null
          return null;
        }
        throw new Error(error.response?.data?.message || 'Error al cargar medidor');
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (info del medidor cambia raramente)
    retry: 1
  });

  // Calcular el consumo del mes actual
  const getConsumoMesActual = (): number => {
    if (!lecturasQuery.data || lecturasQuery.data.length === 0) {
      return 0;
    }

    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

    const lecturaDelMes = lecturasQuery.data.find(lectura => {
      const periodoLectura = lectura.periodo.substring(0, 7); // YYYY-MM
      return periodoLectura === mesActual;
    });

    return lecturaDelMes?.consumoM3 || 0;
  };

  // Calcular el total consumido (últimos 12 meses)
  const getTotalConsumo = (): number => {
    if (!lecturasQuery.data || lecturasQuery.data.length === 0) {
      return 0;
    }

    const ahora = new Date();
    const hace12Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 12, 1);

    return lecturasQuery.data
      .filter(lectura => new Date(lectura.periodo) >= hace12Meses)
      .reduce((total, lectura) => total + lectura.consumoM3, 0);
  };

  // Obtener el promedio de consumo mensual
  const getPromedioConsumo = (): number => {
    if (!lecturasQuery.data || lecturasQuery.data.length === 0) {
      return 0;
    }

    const totalConsumo = lecturasQuery.data.reduce((total, lectura) => total + lectura.consumoM3, 0);
    return Math.round(totalConsumo / lecturasQuery.data.length);
  };

  return {
    // Data
    lecturas: lecturasQuery.data || [],
    medidor: medidorQuery.data || null,
    isLoadingLecturas: lecturasQuery.isLoading,
    isLoadingMedidor: medidorQuery.isLoading,
    errorLecturas: lecturasQuery.error,
    errorMedidor: medidorQuery.error,

    // Computed values
    consumoMesActual: getConsumoMesActual(),
    totalConsumo: getTotalConsumo(),
    promedioConsumo: getPromedioConsumo(),
    tieneMedidor: !!medidorQuery.data,

    // Refetch
    refetchLecturas: lecturasQuery.refetch,
    refetchMedidor: medidorQuery.refetch,

    // Query client
    queryClient
  };
};
