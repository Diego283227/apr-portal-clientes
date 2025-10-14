import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  DollarSign,
  Receipt,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  Droplets,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { smartMeterService } from '@/services/smartMeterService';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface TarifaCalculation {
  tramo: string;
  consumoTramo: number;
  precioUnitario: number;
  subtotal: number;
}

interface BillingData {
  meterId: string;
  periodo: string;
  consumoTotal: number; // en litros
  consumoM3: number; // en m3
  cargoFijo: number;
  cargoConsumo: number;
  otrosCargos: number;
  descuentos: number;
  montoTotal: number;
  fechaVencimiento: string;
  detalleCalculo: TarifaCalculation[];
  lecturaAnterior: number;
  lecturaActual: number;
  diasFacturados: number;
  promedioLitrosDia: number;
}

interface ConsumptionBillingProps {
  onBack?: () => void;
}

export function ConsumptionBilling({ onBack }: ConsumptionBillingProps = {}) {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [meters, setMeters] = useState<any[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM');
  });

  useEffect(() => {
    if (user) {
      loadUserMeters();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMeter) {
      loadBillingData();
    }
  }, [selectedMeter, periodo]);

  const loadUserMeters = async () => {
    try {
      setLoading(true);
      const response = await smartMeterService.getMetersByUser(user!.id);
      setMeters(response.data);

      if (response.data.length > 0) {
        setSelectedMeter(response.data[0].meterId);
      }
    } catch (error) {
      console.error('Error loading meters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBillingData = async () => {
    if (!selectedMeter || !periodo) return;

    try {
      setLoading(true);

      // Calcular fechas del período
      const [year, month] = periodo.split('-');
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const endDate = endOfMonth(startDate);

      // Obtener lecturas del período
      const readingsResponse = await smartMeterService.getReadings({
        meterId: selectedMeter,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Safely access the readings data with proper checks
      const readings = readingsResponse?.data || [];

      if (!Array.isArray(readings) || readings.length === 0) {
        setBillingData(null);
        return;
      }

      // Calcular consumo del período
      const validReadings = readings.filter((r: any) => r && typeof r.currentReading === 'number');

      if (validReadings.length === 0) {
        setBillingData(null);
        return;
      }

      const lecturaInicial = Math.min(...validReadings.map((r: any) => r.currentReading));
      const lecturaFinal = Math.max(...validReadings.map((r: any) => r.currentReading));
      const consumoLitros = lecturaFinal - lecturaInicial;
      const consumoM3 = consumoLitros / 1000;

      // Simular cálculo de tarifas (esto debería venir de tu API de tarifas)
      const billingCalculation = await calculateBilling(consumoM3, startDate, endDate);

      setBillingData({
        meterId: selectedMeter,
        periodo: format(startDate, 'MMMM yyyy', { locale: es }),
        consumoTotal: consumoLitros,
        consumoM3: consumoM3,
        lecturaAnterior: lecturaInicial,
        lecturaActual: lecturaFinal,
        diasFacturados: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        promedioLitrosDia: consumoLitros / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        ...billingCalculation
      });

    } catch (error) {
      console.error('Error loading billing data:', error);
      setBillingData(null);
    } finally {
      setLoading(false);
    }
  };

  // Simulación de cálculo de tarifas (reemplazar con API real)
  const calculateBilling = async (consumoM3: number, startDate: Date, endDate: Date) => {
    // Tarifas ejemplo (estas deberían venir de tu API de tarifas)
    const tarifas = [
      { limite: 10, precio: 450 }, // Primeros 10 m3
      { limite: 20, precio: 650 }, // Siguientes 10 m3 (11-20)
      { limite: Infinity, precio: 950 } // Más de 20 m3
    ];

    const cargoFijo = 8500; // Cargo fijo mensual
    let cargoConsumo = 0;
    let consumoRestante = consumoM3;
    const detalleCalculo: TarifaCalculation[] = [];

    for (const tarifa of tarifas) {
      if (consumoRestante <= 0) break;

      const consumoTramo = Math.min(consumoRestante, tarifa.limite - (consumoM3 - consumoRestante));
      if (consumoTramo > 0) {
        const subtotal = consumoTramo * tarifa.precio;
        cargoConsumo += subtotal;

        detalleCalculo.push({
          tramo: tarifa.limite === Infinity ?
            `Más de ${tarifas[tarifas.length - 2].limite} m³` :
            `${Math.max(0, tarifa.limite - 10)} - ${tarifa.limite} m³`,
          consumoTramo: Math.round(consumoTramo * 100) / 100,
          precioUnitario: tarifa.precio,
          subtotal: Math.round(subtotal)
        });

        consumoRestante -= consumoTramo;
      }
    }

    const otrosCargos = 0;
    const descuentos = 0;
    const montoTotal = cargoFijo + cargoConsumo + otrosCargos - descuentos;

    return {
      cargoFijo,
      cargoConsumo: Math.round(cargoConsumo),
      otrosCargos,
      descuentos,
      montoTotal: Math.round(montoTotal),
      fechaVencimiento: format(new Date(endDate.getTime() + 15 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy'),
      detalleCalculo
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatConsumption = (liters: number) => {
    if (liters < 1000) {
      return `${liters.toFixed(1)} L`;
    }
    return `${(liters / 1000).toFixed(2)} m³`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Calculando tu facturación...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Mi Consumo
            </h1>
          </div>
        </div>
      </div>

      {/* Meter and Period Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meters.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Seleccionar Medidor</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedMeter || ''}
                onChange={(e) => setSelectedMeter(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                {meters.map((meter) => (
                  <option key={meter.id} value={meter.meterId}>
                    {meter.meterId} - {meter.location?.description || 'Medidor Principal'}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Período de Facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full p-2 border rounded-lg"
              max={format(new Date(), 'yyyy-MM')}
            />
          </CardContent>
        </Card>
      </div>

      {billingData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consumo Total</CardTitle>
                <Droplets className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {billingData.consumoM3.toFixed(1)} m³
                </div>
                <p className="text-xs text-gray-500">
                  {formatConsumption(billingData.consumoTotal)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(billingData.montoTotal)}
                </div>
                <p className="text-xs text-gray-500">
                  Vence: {billingData.fechaVencimiento}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {billingData.promedioLitrosDia.toFixed(0)} L
                </div>
                <p className="text-xs text-gray-500">
                  {billingData.diasFacturados} días facturados
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Costo por m³</CardTitle>
                <Calculator className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(billingData.cargoConsumo / billingData.consumoM3)}
                </div>
                <p className="text-xs text-gray-500">
                  Promedio este período
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Billing Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cálculo Detallado
                </CardTitle>
                <CardDescription>
                  Desglose completo de tu facturación del período {billingData.periodo}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Consumption Detail */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                    📊 Detalle de Consumo
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Lectura Anterior</p>
                      <p className="font-bold">{billingData.lecturaAnterior.toLocaleString()} L</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Lectura Actual</p>
                      <p className="font-bold">{billingData.lecturaActual.toLocaleString()} L</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600 dark:text-gray-400">Consumo Total</p>
                      <p className="font-bold text-blue-600 text-lg">
                        {billingData.consumoM3.toFixed(1)} m³
                        <span className="text-sm text-gray-500 ml-2">
                          ({formatConsumption(billingData.consumoTotal)})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tariff Breakdown */}
                <div>
                  <h4 className="font-medium mb-3">💰 Cálculo por Tramos</h4>
                  <div className="space-y-3">
                    {billingData.detalleCalculo.map((tramo, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{tramo.tramo}</p>
                          <p className="text-xs text-gray-500">
                            {tramo.consumoTramo} m³ × {formatCurrency(tramo.precioUnitario)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(tramo.subtotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Final Calculation */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cargo Fijo</span>
                    <span>{formatCurrency(billingData.cargoFijo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cargo por Consumo</span>
                    <span>{formatCurrency(billingData.cargoConsumo)}</span>
                  </div>
                  {billingData.otrosCargos > 0 && (
                    <div className="flex justify-between">
                      <span>Otros Cargos</span>
                      <span>{formatCurrency(billingData.otrosCargos)}</span>
                    </div>
                  )}
                  {billingData.descuentos > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuentos</span>
                      <span>-{formatCurrency(billingData.descuentos)}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total a Pagar</span>
                    <span className="text-green-600">{formatCurrency(billingData.montoTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Análisis de tu Consumo
                </CardTitle>
                <CardDescription>
                  Insights y comparaciones para optimizar tu uso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Efficiency Score */}
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    🌱 Eficiencia del Consumo
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tu consumo vs promedio APR</span>
                      <span className="font-medium">15% menos</span>
                    </div>
                    <Progress value={85} className="h-2" />
                    <p className="text-xs text-green-700 dark:text-green-300">
                      ¡Excelente! Tu consumo está por debajo del promedio
                    </p>
                  </div>
                </div>

                {/* Monthly Comparison */}
                <div>
                  <h4 className="font-medium mb-3">📈 Comparación Mensual</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Mes Anterior</span>
                      <span>12.5 m³</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Este Mes</span>
                      <span className="text-green-600">{billingData.consumoM3.toFixed(1)} m³</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Diferencia</span>
                      <span className="text-green-600">
                        {billingData.consumoM3 < 12.5 ? '↓' : '↑'}
                        {Math.abs(billingData.consumoM3 - 12.5).toFixed(1)} m³
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown Pie */}
                <div>
                  <h4 className="font-medium mb-3">💡 Composición del Costo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Cargo Fijo</span>
                      <span>{((billingData.cargoFijo / billingData.montoTotal) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cargo Variable</span>
                      <span>{((billingData.cargoConsumo / billingData.montoTotal) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    💡 Tip de Ahorro
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {billingData.promedioLitrosDia > 400
                      ? "Considera revisar posibles fugas. Un consumo promedio de más de 400L/día puede indicar desperdicio."
                      : "¡Excelente consumo! Mantén tus hábitos eficientes para seguir ahorrando."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Actions */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">💳 Opciones de Pago</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">
                  Total a Pagar: {formatCurrency(billingData.montoTotal)}
                </p>
                <p className="text-sm text-green-700">
                  Vencimiento: {billingData.fechaVencimiento}
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="bg-green-600 hover:bg-green-700">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pagar Ahora
                </Button>
                <Button variant="outline" className="border-green-600 text-green-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar Boleta
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay datos para este período
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona un período diferente o verifica que tu medidor esté enviando lecturas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}