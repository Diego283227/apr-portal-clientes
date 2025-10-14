import { apiClient } from './api';

export interface SimulationConfig {
  meterId?: string;
  startDate: string;
  endDate: string;
  profileType: 'residential' | 'commercial' | 'rural';
  intensity: 'low' | 'medium' | 'high';
  seasonality: boolean;
  includeAnomalies: boolean;
  replaceExisting: boolean;
}

export interface ManualReadingData {
  meterId: string;
  currentReading: number;
  timestamp?: string;
  notes?: string;
  photo?: string;
}

export interface DataStats {
  period: { since: Date; days: number };
  totalReadings: number;
  sourceBreakdown: Array<{
    _id: string;
    count: number;
    avgQuality: number;
    lastReading: Date;
  }>;
  qualityDistribution: Array<{
    _id: string;
    count: number;
  }>;
  summary: {
    sources: number;
    avgQualityScore: number;
  };
}

class DataSourceService {
  private baseURL = '/data-sources';

  /**
   * Genera datos simulados realistas
   */
  async generateSimulation(config: SimulationConfig) {
    const response = await apiClient.post(`${this.baseURL}/generate-simulation`, config);
    return response.data;
  }

  /**
   * Agrega lectura manual
   */
  async addManualReading(readingData: ManualReadingData) {
    const response = await apiClient.post(`${this.baseURL}/manual-reading`, readingData);
    return response.data;
  }

  /**
   * Sube archivo CSV con lecturas
   */
  async uploadCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseURL}/upload-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Obtiene estadísticas de fuentes de datos
   */
  async getStats(days: number = 30): Promise<{ success: boolean; data: DataStats }> {
    const response = await apiClient.get(`${this.baseURL}/stats`, {
      params: { days }
    });
    return response.data;
  }

  /**
   * Limpia datos de un período específico
   */
  async cleanDataPeriod(options: {
    startDate?: string;
    endDate?: string;
    meterId?: string;
    source?: string;
  }) {
    const response = await apiClient.post(`${this.baseURL}/clean`, options);
    return response.data;
  }

  /**
   * Genera plantilla CSV de ejemplo
   */
  generateCSVTemplate(): string {
    return `meterId,timestamp,currentReading,flowRate,temperature,pressure,batteryLevel,signalStrength,dataQuality
SM-001,2024-01-15T08:00:00Z,125847.5,2.3,18.5,2.8,95,-65,good
SM-001,2024-01-15T08:15:00Z,125852.1,1.8,18.6,2.8,95,-66,good
SM-001,2024-01-15T08:30:00Z,125856.7,2.1,18.7,2.9,95,-64,good`;
  }

  /**
   * Descarga plantilla CSV
   */
  downloadCSVTemplate() {
    const template = this.generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_lecturas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Valida formato de archivo CSV
   */
  validateCSVFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No se ha seleccionado ningún archivo' };
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return { valid: false, error: 'El archivo debe ser de tipo CSV' };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return { valid: false, error: 'El archivo no debe superar los 10MB' };
    }

    return { valid: true };
  }

  /**
   * Parsea contenido CSV para vista previa
   */
  async previewCSV(file: File): Promise<{
    headers: string[];
    rows: string[][];
    totalRows: number;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.trim().split('\n');
          const headers = lines[0]?.split(',').map(h => h.trim()) || [];
          const rows = lines.slice(1, 6).map(line =>
            line.split(',').map(cell => cell.trim())
          );

          resolve({
            headers,
            rows,
            totalRows: lines.length - 1
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsText(file);
    });
  }

  /**
   * Obtiene configuración de simulación por defecto
   */
  getDefaultSimulationConfig(): SimulationConfig {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      profileType: 'residential',
      intensity: 'medium',
      seasonality: true,
      includeAnomalies: false,
      replaceExisting: false
    };
  }

  /**
   * Calcula estadísticas de un rango de fechas
   */
  calculateDateRangeStats(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Estimación de lecturas esperadas (cada 15 minutos)
    const readingsPerDay = 24 * 4; // 4 lecturas por hora
    const estimatedReadings = diffDays * readingsPerDay;

    return {
      days: diffDays,
      estimatedReadings,
      dataSize: `~${(estimatedReadings * 0.5 / 1024).toFixed(1)} MB` // Estimación aproximada
    };
  }

  /**
   * Obtiene perfiles de consumo predefinidos
   */
  getConsumptionProfiles() {
    return {
      residential: {
        name: 'Residencial',
        description: 'Patrones típicos de consumo doméstico',
        characteristics: [
          'Picos en mañana (6-8 AM) y tarde (6-8 PM)',
          'Menor consumo nocturno',
          'Variación por días de semana'
        ],
        dailyRange: {
          low: '150-200 L/día',
          medium: '250-350 L/día',
          high: '400-600 L/día'
        }
      },
      commercial: {
        name: 'Comercial',
        description: 'Consumo de locales comerciales y oficinas',
        characteristics: [
          'Actividad durante horario comercial (8-18 hrs)',
          'Pico al mediodía',
          'Menor consumo los fines de semana'
        ],
        dailyRange: {
          low: '300-500 L/día',
          medium: '600-900 L/día',
          high: '1200-1800 L/día'
        }
      },
      rural: {
        name: 'Rural',
        description: 'Patrones de consumo rural y agropecuario',
        characteristics: [
          'Actividad temprana (5-7 AM)',
          'Consumo distribuido durante el día',
          'Variaciones estacionales marcadas'
        ],
        dailyRange: {
          low: '200-300 L/día',
          medium: '350-500 L/día',
          high: '600-1000 L/día'
        }
      }
    };
  }
}

export const dataSourceService = new DataSourceService();
export default dataSourceService;