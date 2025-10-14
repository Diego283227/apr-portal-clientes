import { apiClient } from './api';

export interface SmartMeter {
  id: string;
  meterId: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  location?: {
    lat?: number;
    lng?: number;
    description?: string;
  };
  lastReadingDate?: string;
  configuration: {
    readingIntervalMinutes: number;
    transmissionIntervalMinutes: number;
    leakThresholdLPM: number;
    highConsumptionThresholdLD: number;
    lowBatteryThreshold: number;
    tamperSensitivity: 'low' | 'medium' | 'high';
    dataRetentionDays: number;
  };
}

export interface MeterReading {
  id: string;
  meterId: string;
  timestamp: string;
  currentReading: number;
  flowRate?: number;
  temperature?: number;
  pressure?: number;
  batteryLevel?: number;
  signalStrength?: number;
  dataQuality: 'good' | 'fair' | 'poor' | 'invalid';
  consumptionSinceLast?: number;
}

export interface MeterAlert {
  id: string;
  meterId: string;
  alertType: 'leak' | 'tamper' | 'low_battery' | 'communication_loss' | 'high_consumption' | 'sensor_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeredAt: string;
  resolvedAt?: string;
  status: 'active' | 'resolved' | 'false_positive';
  metadata?: any;
}

export interface ChartDataPoint {
  date: string;
  consumption: number;
  avgFlowRate?: number;
  readingsCount: number;
}

export interface MeterStatistics {
  totalMeters: number;
  activeMeters: number;
  onlineMeters: number;
  activeAlerts: number;
  criticalAlerts: number;
  onlinePercentage: string;
}

class SmartMeterService {
  private baseURL = '/smart-meters';
  private alertsURL = '/meter-alerts';

  // Smart Meters
  async getMeters(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await apiClient.get(this.baseURL, { params });
    return response.data;
  }

  async getMeterById(id: string) {
    const response = await apiClient.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  async getMetersByUser(userId: string) {
    const response = await apiClient.get(`${this.baseURL}/user/${userId}`);
    return response.data;
  }

  async createMeter(meterData: Partial<SmartMeter>) {
    const response = await apiClient.post(this.baseURL, meterData);
    return response.data;
  }

  async updateMeter(id: string, meterData: Partial<SmartMeter>) {
    const response = await apiClient.put(`${this.baseURL}/${id}`, meterData);
    return response.data;
  }

  async deleteMeter(id: string) {
    const response = await apiClient.delete(`${this.baseURL}/${id}`);
    return response.data;
  }

  async getMeterStatistics() {
    const response = await apiClient.get(`${this.baseURL}/statistics`);
    return response.data;
  }

  // Readings
  async getReadings(params?: {
    meterId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    dataQuality?: string;
  }) {
    const response = await apiClient.get(`${this.baseURL}/readings`, { params });
    return response.data;
  }

  async addReading(readingData: {
    meterId: string;
    currentReading: number;
    flowRate?: number;
    temperature?: number;
    pressure?: number;
    batteryLevel?: number;
    signalStrength?: number;
    dataQuality?: string;
  }) {
    const response = await apiClient.post(`${this.baseURL}/readings`, readingData);
    return response.data;
  }

  async bulkAddReadings(readings: any[]) {
    const response = await apiClient.post(`${this.baseURL}/readings/bulk`, {
      readings
    });
    return response.data;
  }

  async getRecentReadings(meterId: string, hours: number = 24) {
    const response = await apiClient.get(`${this.baseURL}/readings/${meterId}/recent`, {
      params: { hours }
    });
    return response.data;
  }

  async getConsumptionChart(meterId: string, period: 'hour' | 'day' | 'week' = 'day') {
    const response = await apiClient.get(`${this.baseURL}/readings/${meterId}/chart`, {
      params: { period }
    });
    return response.data;
  }

  // Alerts
  async getAlerts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    severity?: string;
    alertType?: string;
    socioId?: string;
  }) {
    const response = await apiClient.get(this.alertsURL, { params });
    return response.data;
  }

  async getActiveAlerts(socioId?: string) {
    const response = await apiClient.get(`${this.alertsURL}/active`, {
      params: socioId ? { socioId } : undefined
    });
    return response.data;
  }

  async createAlert(alertData: {
    meterId: string;
    alertType: string;
    severity: string;
    title: string;
    description: string;
    metadata?: any;
  }) {
    const response = await apiClient.post(this.alertsURL, alertData);
    return response.data;
  }

  async resolveAlert(alertId: string, data: {
    resolvedBy: string;
    resolutionNotes?: string;
  }) {
    const response = await apiClient.put(`${this.alertsURL}/${alertId}/resolve`, data);
    return response.data;
  }

  async markAlertAsFalsePositive(alertId: string, data: {
    resolvedBy: string;
    resolutionNotes?: string;
  }) {
    const response = await apiClient.put(`${this.alertsURL}/${alertId}/false-positive`, data);
    return response.data;
  }

  async bulkResolveAlerts(data: {
    alertIds: string[];
    resolvedBy: string;
    resolutionNotes?: string;
  }) {
    const response = await apiClient.put(`${this.alertsURL}/bulk-resolve`, data);
    return response.data;
  }

  async getAlertStatistics() {
    const response = await apiClient.get(`${this.alertsURL}/statistics`);
    return response.data;
  }

  // Real-time data simulation (for development)
  async simulateReading(meterId: string) {
    const mockReading = {
      meterId,
      currentReading: Math.random() * 1000 + 500,
      flowRate: Math.random() * 5 + 0.1,
      temperature: Math.random() * 10 + 15,
      pressure: Math.random() * 2 + 1,
      batteryLevel: Math.floor(Math.random() * 100),
      signalStrength: Math.floor(Math.random() * 40) - 80,
      dataQuality: 'good'
    };

    return this.addReading(mockReading);
  }

  // Helper functions
  formatConsumption(liters: number): string {
    if (liters < 1000) {
      return `${liters.toFixed(1)}L`;
    }
    return `${(liters / 1000).toFixed(2)}m³`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'maintenance': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'inactive': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  getBatteryIcon(level: number): string {
    if (level > 75) return '🔋';
    if (level > 50) return '🔋';
    if (level > 25) return '🪫';
    return '🪫';
  }

  getSignalIcon(strength: number): string {
    if (strength > -50) return '📶';
    if (strength > -70) return '📶';
    if (strength > -90) return '📶';
    return '📵';
  }
}

export const smartMeterService = new SmartMeterService();
export default smartMeterService;