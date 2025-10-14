import { startOfDay, addHours, addMinutes, format } from 'date-fns';
import MeterReading from '../models/MeterReading';
import SmartMeter from '../models/SmartMeter';

interface SimulationConfig {
  profileType: 'residential' | 'commercial' | 'rural';
  intensity: 'low' | 'medium' | 'high';
  seasonality: boolean;
  includeAnomalies: boolean;
}

interface DailyPattern {
  hour: number;
  multiplier: number;
  variance: number;
}

export class RealisticDataService {
  // Patrones de consumo horario basados en datos reales de APRs chilenos
  private static readonly CONSUMPTION_PATTERNS: Record<string, DailyPattern[]> = {
    residential: [
      { hour: 0, multiplier: 0.2, variance: 0.1 },   // Madrugada
      { hour: 1, multiplier: 0.15, variance: 0.05 },
      { hour: 2, multiplier: 0.1, variance: 0.05 },
      { hour: 3, multiplier: 0.1, variance: 0.05 },
      { hour: 4, multiplier: 0.15, variance: 0.1 },
      { hour: 5, multiplier: 0.3, variance: 0.15 },
      { hour: 6, multiplier: 1.4, variance: 0.3 },   // Pico mañana
      { hour: 7, multiplier: 1.6, variance: 0.2 },   // Máximo matutino
      { hour: 8, multiplier: 1.2, variance: 0.2 },
      { hour: 9, multiplier: 0.8, variance: 0.15 },
      { hour: 10, multiplier: 0.6, variance: 0.1 },
      { hour: 11, multiplier: 0.7, variance: 0.1 },
      { hour: 12, multiplier: 0.8, variance: 0.15 },  // Mediodía
      { hour: 13, multiplier: 0.9, variance: 0.15 },
      { hour: 14, multiplier: 0.7, variance: 0.1 },
      { hour: 15, multiplier: 0.6, variance: 0.1 },
      { hour: 16, multiplier: 0.8, variance: 0.15 },
      { hour: 17, multiplier: 1.0, variance: 0.2 },
      { hour: 18, multiplier: 1.6, variance: 0.3 },   // Pico vespertino
      { hour: 19, multiplier: 1.8, variance: 0.3 },   // Máximo vespertino
      { hour: 20, multiplier: 1.4, variance: 0.25 },
      { hour: 21, multiplier: 1.0, variance: 0.2 },
      { hour: 22, multiplier: 0.6, variance: 0.15 },
      { hour: 23, multiplier: 0.4, variance: 0.1 },
    ],

    commercial: [
      { hour: 0, multiplier: 0.1, variance: 0.05 },
      { hour: 1, multiplier: 0.05, variance: 0.02 },
      { hour: 2, multiplier: 0.05, variance: 0.02 },
      { hour: 3, multiplier: 0.05, variance: 0.02 },
      { hour: 4, multiplier: 0.05, variance: 0.02 },
      { hour: 5, multiplier: 0.1, variance: 0.05 },
      { hour: 6, multiplier: 0.3, variance: 0.1 },
      { hour: 7, multiplier: 0.8, variance: 0.15 },
      { hour: 8, multiplier: 1.5, variance: 0.2 },    // Apertura comercial
      { hour: 9, multiplier: 1.8, variance: 0.2 },    // Pico matutino
      { hour: 10, multiplier: 1.6, variance: 0.2 },
      { hour: 11, multiplier: 1.4, variance: 0.15 },
      { hour: 12, multiplier: 1.9, variance: 0.25 },  // Almuerzo - máximo
      { hour: 13, multiplier: 1.7, variance: 0.2 },
      { hour: 14, multiplier: 1.5, variance: 0.15 },
      { hour: 15, multiplier: 1.3, variance: 0.15 },
      { hour: 16, multiplier: 1.4, variance: 0.15 },
      { hour: 17, multiplier: 1.2, variance: 0.15 },
      { hour: 18, multiplier: 0.8, variance: 0.1 },   // Cierre comercial
      { hour: 19, multiplier: 0.4, variance: 0.1 },
      { hour: 20, multiplier: 0.3, variance: 0.05 },
      { hour: 21, multiplier: 0.2, variance: 0.05 },
      { hour: 22, multiplier: 0.15, variance: 0.05 },
      { hour: 23, multiplier: 0.1, variance: 0.05 },
    ],

    rural: [
      { hour: 0, multiplier: 0.1, variance: 0.05 },
      { hour: 1, multiplier: 0.05, variance: 0.02 },
      { hour: 2, multiplier: 0.05, variance: 0.02 },
      { hour: 3, multiplier: 0.05, variance: 0.02 },
      { hour: 4, multiplier: 0.1, variance: 0.05 },
      { hour: 5, multiplier: 0.8, variance: 0.2 },    // Actividades rurales tempranas
      { hour: 6, multiplier: 1.2, variance: 0.25 },
      { hour: 7, multiplier: 1.0, variance: 0.2 },
      { hour: 8, multiplier: 0.8, variance: 0.15 },
      { hour: 9, multiplier: 0.6, variance: 0.1 },
      { hour: 10, multiplier: 0.7, variance: 0.1 },
      { hour: 11, multiplier: 0.8, variance: 0.15 },
      { hour: 12, multiplier: 1.1, variance: 0.2 },   // Almuerzo rural
      { hour: 13, multiplier: 0.9, variance: 0.15 },
      { hour: 14, multiplier: 0.6, variance: 0.1 },
      { hour: 15, multiplier: 0.7, variance: 0.1 },
      { hour: 16, multiplier: 0.9, variance: 0.15 },
      { hour: 17, multiplier: 1.2, variance: 0.2 },   // Regreso actividades
      { hour: 18, multiplier: 1.4, variance: 0.25 },  // Pico vespertino rural
      { hour: 19, multiplier: 1.3, variance: 0.2 },
      { hour: 20, multiplier: 1.0, variance: 0.15 },
      { hour: 21, multiplier: 0.7, variance: 0.15 },
      { hour: 22, multiplier: 0.4, variance: 0.1 },
      { hour: 23, multiplier: 0.2, variance: 0.05 },
    ]
  };

  // Consumos base por perfil (litros/día)
  private static readonly BASE_CONSUMPTION: Record<string, Record<string, number>> = {
    residential: { low: 150, medium: 250, high: 400 },
    commercial: { low: 300, medium: 600, high: 1200 },
    rural: { low: 200, medium: 350, high: 600 }
  };

  /**
   * Genera lecturas realistas para un medidor en un período específico
   */
  async generateRealisticReadings(
    meterId: string,
    startDate: Date,
    endDate: Date,
    config: SimulationConfig,
    lastReading?: number
  ): Promise<any[]> {
    const meter = await SmartMeter.findOne({ meterId });
    if (!meter) {
      throw new Error('Medidor no encontrado');
    }

    const readings = [];
    const pattern = RealisticDataService.CONSUMPTION_PATTERNS[config.profileType];
    const baseDaily = RealisticDataService.BASE_CONSUMPTION[config.profileType][config.intensity];
    const baseHourly = baseDaily / 24;

    // Lectura inicial
    let currentReading = lastReading || this.generateInitialReading(meterId);
    let currentTime = new Date(startDate);

    // Generar lecturas cada 15 minutos
    while (currentTime <= endDate) {
      const hour = currentTime.getHours();
      const dayPattern = pattern.find(p => p.hour === hour) || pattern[0];

      // Calcular consumo para este período (15 minutos)
      const baseConsumption = (baseHourly / 4) * dayPattern.multiplier; // 4 períodos de 15min por hora

      // Aplicar variaciones realistas
      const seasonalFactor = config.seasonality ? this.getSeasonalFactor(currentTime) : 1;
      const randomVariance = (Math.random() - 0.5) * dayPattern.variance * 2;
      const weekendFactor = this.getWeekendFactor(currentTime, config.profileType);

      let consumption = baseConsumption * seasonalFactor * weekendFactor * (1 + randomVariance);

      // Aplicar anomalías si están habilitadas
      if (config.includeAnomalies) {
        consumption = this.applyAnomalies(consumption, currentTime, readings.length);
      }

      // Asegurar que el consumo no sea negativo
      consumption = Math.max(0, consumption);

      currentReading += consumption;

      // Crear lectura con datos adicionales realistas
      const reading = {
        meterId: meter._id,
        timestamp: new Date(currentTime),
        currentReading: Math.round(currentReading * 100) / 100,
        flowRate: this.calculateFlowRate(consumption, dayPattern),
        temperature: this.generateTemperature(currentTime),
        pressure: this.generatePressure(),
        batteryLevel: this.generateBatteryLevel(currentTime),
        signalStrength: this.generateSignalStrength(),
        dataQuality: this.determineDataQuality(),
        consumptionSinceLast: Math.round(consumption * 100) / 100,
        metadata: {
          pattern: config.profileType,
          intensity: config.intensity,
          hour: hour,
          multiplier: dayPattern.multiplier,
          generated: true,
          generationTime: new Date()
        }
      };

      readings.push(reading);

      // Avanzar 15 minutos
      currentTime = addMinutes(currentTime, 15);
    }

    return readings;
  }

  /**
   * Genera una lectura inicial realista basada en el ID del medidor
   */
  private generateInitialReading(meterId: string): number {
    // Usar hash del meterId para generar una lectura inicial consistente
    const hash = meterId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 100000 + (hash % 900000); // Entre 100,000 y 999,999 litros
  }

  /**
   * Calcula el factor estacional
   */
  private getSeasonalFactor(date: Date): number {
    const month = date.getMonth();
    // Verano chileno (Dic-Feb): mayor consumo
    if (month === 11 || month === 0 || month === 1) return 1.3;
    // Invierno (Jun-Ago): menor consumo
    if (month >= 5 && month <= 7) return 0.8;
    // Primavera/Otoño: consumo normal
    return 1.0;
  }

  /**
   * Factor de fin de semana
   */
  private getWeekendFactor(date: Date, profileType: string): number {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    switch (profileType) {
      case 'residential':
        return isWeekend ? 1.2 : 1.0; // Más consumo en casa los fines de semana
      case 'commercial':
        return isWeekend ? 0.3 : 1.0; // Menos consumo comercial los fines de semana
      case 'rural':
        return isWeekend ? 1.1 : 1.0; // Ligeramente más los fines de semana
      default:
        return 1.0;
    }
  }

  /**
   * Aplica anomalías realistas (fugas, alto consumo, etc.)
   */
  private applyAnomalies(consumption: number, currentTime: Date, readingIndex: number): number {
    // 0.5% probabilidad de fuga por período
    if (Math.random() < 0.005) {
      return consumption * (2 + Math.random() * 3); // 2-5x consumo normal
    }

    // 0.1% probabilidad de consumo anómalamente alto
    if (Math.random() < 0.001) {
      return consumption * (5 + Math.random() * 5); // 5-10x consumo normal
    }

    return consumption;
  }

  /**
   * Calcula flujo basado en consumo
   */
  private calculateFlowRate(consumption: number, pattern: DailyPattern): number {
    // Convertir consumo de 15min a litros por minuto
    const lpm = consumption / 15;
    // Agregar variación basada en el patrón
    return Math.max(0, lpm * (0.8 + Math.random() * 0.4));
  }

  /**
   * Genera temperatura ambiente realista
   */
  private generateTemperature(date: Date): number {
    const month = date.getMonth();
    const hour = date.getHours();

    // Temperaturas base por mes (Chile)
    const monthlyTemp = [25, 24, 20, 16, 12, 10, 9, 11, 14, 18, 21, 24][month];

    // Variación por hora del día
    const hourVariation = Math.sin((hour - 6) * Math.PI / 12) * 5;

    // Variación aleatoria
    const randomVariation = (Math.random() - 0.5) * 4;

    return Math.round((monthlyTemp + hourVariation + randomVariation) * 10) / 10;
  }

  /**
   * Genera presión realista
   */
  private generatePressure(): number {
    // Presión típica de red de agua: 2-4 bar
    const basePressure = 2.5;
    const variation = (Math.random() - 0.5) * 1.5;
    return Math.round((basePressure + variation) * 100) / 100;
  }

  /**
   * Simula descarga gradual de batería
   */
  private generateBatteryLevel(currentTime: Date): number {
    const daysSinceEpoch = Math.floor(currentTime.getTime() / (1000 * 60 * 60 * 24));
    // Batería dura aprox 2 años (730 días)
    const batteryAge = daysSinceEpoch % 730;
    const batteryDecay = batteryAge / 730;

    const baseBattery = 100 - (batteryDecay * 80); // Decae de 100% a 20%
    const randomVariation = (Math.random() - 0.5) * 5;

    return Math.max(5, Math.min(100, Math.round(baseBattery + randomVariation)));
  }

  /**
   * Genera fuerza de señal realista
   */
  private generateSignalStrength(): number {
    // Señal típica: -40 a -100 dBm
    const baseSignal = -70;
    const variation = (Math.random() - 0.5) * 40;
    return Math.round(baseSignal + variation);
  }

  /**
   * Determina calidad de datos basada en factores realistas
   */
  private determineDataQuality(): string {
    const random = Math.random();
    if (random < 0.85) return 'good';
    if (random < 0.95) return 'fair';
    if (random < 0.99) return 'poor';
    return 'invalid';
  }

  /**
   * Inserta lecturas generadas en la base de datos
   */
  async insertGeneratedReadings(readings: any[]): Promise<void> {
    if (readings.length === 0) return;

    try {
      await MeterReading.insertMany(readings);

      // Actualizar fecha de última lectura del medidor
      const lastReading = readings[readings.length - 1];
      await SmartMeter.findByIdAndUpdate(lastReading.meterId, {
        lastReadingDate: lastReading.timestamp
      });

      console.log(`📊 Generated and inserted ${readings.length} realistic readings`);
    } catch (error) {
      console.error('❌ Error inserting generated readings:', error);
      throw error;
    }
  }

  /**
   * Genera datos para múltiples medidores
   */
  async generateForAllMeters(
    startDate: Date,
    endDate: Date,
    defaultConfig: SimulationConfig
  ): Promise<void> {
    const meters = await SmartMeter.find({ status: 'active' });

    for (const meter of meters) {
      // Obtener última lectura para continuidad
      const lastReading = await MeterReading
        .findOne({ meterId: meter._id })
        .sort({ timestamp: -1 });

      const readings = await this.generateRealisticReadings(
        meter.meterId,
        startDate,
        endDate,
        defaultConfig,
        lastReading?.currentReading
      );

      await this.insertGeneratedReadings(readings);
    }
  }
}