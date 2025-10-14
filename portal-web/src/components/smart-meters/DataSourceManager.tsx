import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Database,
  Upload,
  FileText,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle,
  Calendar,
  BarChart3,
  Trash2,
  Eye,
  RefreshCw,
  Info,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { smartMeterService } from '@/services/smartMeterService';
import { dataSourceService } from '@/services/dataSourceService';
import { toast } from '@/components/ui/enhanced-toast';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface DataStats {
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

interface SimulationConfig {
  meterId?: string;
  startDate: string;
  endDate: string;
  profileType: 'residential' | 'commercial' | 'rural';
  intensity: 'low' | 'medium' | 'high';
  seasonality: boolean;
  includeAnomalies: boolean;
  replaceExisting: boolean;
}

interface ManualReadingData {
  meterId: string;
  currentReading: string;
  timestamp: string;
  notes: string;
}

export function DataSourceManager() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('simulation');
  const [loading, setLoading] = useState(false);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [meters, setMeters] = useState<any[]>([]);

  // Simulation state
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    profileType: 'residential',
    intensity: 'medium',
    seasonality: true,
    includeAnomalies: false,
    replaceExisting: false
  });

  // Manual reading state
  const [manualReading, setManualReading] = useState<ManualReadingData>({
    meterId: '',
    currentReading: '',
    timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: ''
  });

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      const [statsResponse, metersResponse] = await Promise.all([
        dataSourceService.getStats(30),
        smartMeterService.getMetersByUser(user!.id)
      ]);

      setDataStats(statsResponse.data);

      setMeters(metersResponse.data);
      if (metersResponse.data.length > 0) {
        setManualReading(prev => ({
          ...prev,
          meterId: metersResponse.data[0].meterId
        }));
        setSimulationConfig(prev => ({
          ...prev,
          meterId: metersResponse.data[0].meterId
        }));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleGenerateSimulation = async () => {
    try {
      setLoading(true);

      const result = await dataSourceService.generateSimulation(simulationConfig);

      toast({
        title: "✅ Simulación Generada",
        description: `Se generaron ${result.data.readingsGenerated || result.data.totalReadings} lecturas realistas.`,
        variant: "default"
      });
      await loadInitialData(); // Refresh stats
    } catch (error: any) {
      toast({
        title: "❌ Error en Simulación",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualReading = async () => {
    try {
      setLoading(true);

      if (!manualReading.meterId || !manualReading.currentReading) {
        throw new Error('Medidor y lectura son requeridos');
      }

      const result = await dataSourceService.addManualReading({
        ...manualReading,
        currentReading: parseFloat(manualReading.currentReading)
      });

      toast({
        title: "✅ Lectura Registrada",
        description: `Lectura manual de ${manualReading.currentReading}L registrada exitosamente.`,
        variant: "default"
      });

      // Reset form
      setManualReading(prev => ({
        ...prev,
        currentReading: '',
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: ''
      }));

      await loadInitialData(); // Refresh stats
    } catch (error: any) {
      toast({
        title: "❌ Error en Lectura Manual",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: "❌ Error",
        description: "Selecciona un archivo CSV",
        variant: "destructive"
      });
      return;
    }

    try {
      setCsvProcessing(true);

      const result = await dataSourceService.uploadCSV(csvFile);
      setCsvResult(result);

      toast({
        title: "✅ CSV Procesado",
        description: `${result.data.successfulReadings}/${result.data.totalRows} lecturas procesadas exitosamente.`,
        variant: "default"
      });
      await loadInitialData(); // Refresh stats
    } catch (error: any) {
      toast({
        title: "❌ Error procesando CSV",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCsvProcessing(false);
    }
  };

  const downloadCSVTemplate = () => {
    dataSourceService.downloadCSVTemplate();
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'invalid': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'manual': return <FileText className="h-4 w-4" />;
      case 'csv_upload': return <Upload className="h-4 w-4" />;
      case 'generated': return <Zap className="h-4 w-4" />;
      case 'iot': return <Database className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Gestión de Fuentes de Datos
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configura y administra las fuentes de datos de tus medidores inteligentes
          </p>
        </div>

        <Button
          onClick={loadInitialData}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Statistics Overview */}
      {dataStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lecturas</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dataStats.totalReadings.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                Últimos {dataStats.period.days} días
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fuentes Activas</CardTitle>
              <Database className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dataStats.summary.sources}
              </div>
              <p className="text-xs text-gray-500">
                Tipos de fuentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calidad Promedio</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {(dataStats.summary.avgQualityScore * 25).toFixed(0)}%
              </div>
              <p className="text-xs text-gray-500">
                Calidad de datos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-orange-600">
                {dataStats.sourceBreakdown[0]?.lastReading
                  ? format(new Date(dataStats.sourceBreakdown[0].lastReading), 'dd/MM HH:mm', { locale: es })
                  : 'N/A'
                }
              </div>
              <p className="text-xs text-gray-500">
                Última lectura
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Simulación
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CSV
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* Simulation Tab */}
        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Generación de Datos Simulados
              </CardTitle>
              <CardDescription>
                Genera datos realistas basados en patrones de consumo reales de APRs chilenos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meter-select">Medidor (opcional)</Label>
                  <Select
                    value={simulationConfig.meterId || 'all'}
                    onValueChange={(value) => setSimulationConfig(prev => ({
                      ...prev,
                      meterId: value === 'all' ? undefined : value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar medidor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los medidores</SelectItem>
                      {meters.map(meter => (
                        <SelectItem key={meter.meterId} value={meter.meterId}>
                          {meter.meterId} - {meter.location?.description || 'Medidor Principal'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-type">Perfil de Consumo</Label>
                  <Select
                    value={simulationConfig.profileType}
                    onValueChange={(value: any) => setSimulationConfig(prev => ({
                      ...prev,
                      profileType: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={simulationConfig.startDate}
                    onChange={(e) => setSimulationConfig(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">Fecha Fin</Label>
                  <Input
                    type="date"
                    value={simulationConfig.endDate}
                    onChange={(e) => setSimulationConfig(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intensity">Intensidad de Consumo</Label>
                  <Select
                    value={simulationConfig.intensity}
                    onValueChange={(value: any) => setSimulationConfig(prev => ({
                      ...prev,
                      intensity: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bajo (150-300 L/día)</SelectItem>
                      <SelectItem value="medium">Medio (250-600 L/día)</SelectItem>
                      <SelectItem value="high">Alto (400-1200 L/día)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={simulationConfig.seasonality}
                      onCheckedChange={(checked) => setSimulationConfig(prev => ({
                        ...prev,
                        seasonality: checked
                      }))}
                    />
                    <Label>Variaciones estacionales</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={simulationConfig.includeAnomalies}
                      onCheckedChange={(checked) => setSimulationConfig(prev => ({
                        ...prev,
                        includeAnomalies: checked
                      }))}
                    />
                    <Label>Incluir anomalías (fugas, picos)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={simulationConfig.replaceExisting}
                      onCheckedChange={(checked) => setSimulationConfig(prev => ({
                        ...prev,
                        replaceExisting: checked
                      }))}
                    />
                    <Label>Reemplazar datos existentes</Label>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateSimulation}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Generar Datos
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Entrada Manual de Lecturas
              </CardTitle>
              <CardDescription>
                Registra lecturas manualmente desde el display del medidor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-meter">Medidor</Label>
                  <Select
                    value={manualReading.meterId}
                    onValueChange={(value) => setManualReading(prev => ({
                      ...prev,
                      meterId: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar medidor" />
                    </SelectTrigger>
                    <SelectContent>
                      {meters.map(meter => (
                        <SelectItem key={meter.meterId} value={meter.meterId}>
                          {meter.meterId} - {meter.location?.description || 'Medidor Principal'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current-reading">Lectura Actual (Litros)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="ej: 125847.5"
                    value={manualReading.currentReading}
                    onChange={(e) => setManualReading(prev => ({
                      ...prev,
                      currentReading: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-timestamp">Fecha y Hora de Lectura</Label>
                  <Input
                    type="datetime-local"
                    value={manualReading.timestamp}
                    onChange={(e) => setManualReading(prev => ({
                      ...prev,
                      timestamp: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observaciones (opcional)</Label>
                  <Textarea
                    placeholder="ej: Lectura tomada después de reparación de fuga"
                    value={manualReading.notes}
                    onChange={(e) => setManualReading(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleManualReading}
                  disabled={loading || !manualReading.meterId || !manualReading.currentReading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Registrar Lectura
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Upload Tab */}
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-purple-600" />
                Carga Masiva via CSV
              </CardTitle>
              <CardDescription>
                Sube múltiples lecturas desde un archivo CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={downloadCSVTemplate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Plantilla CSV
                </Button>

                <div className="text-sm text-gray-600">
                  Descarga la plantilla para ver el formato requerido
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="csv-file">Archivo CSV</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />
              </div>

              {csvFile && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Archivo seleccionado: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleCsvUpload}
                  disabled={!csvFile || csvProcessing}
                  className="flex items-center gap-2"
                >
                  {csvProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Procesar CSV
                    </>
                  )}
                </Button>
              </div>

              {csvResult && (
                <Alert className={csvResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        <strong>Resultado:</strong> {csvResult.data.successfulReadings}/{csvResult.data.totalRows} lecturas procesadas exitosamente
                      </div>
                      {csvResult.data.errors > 0 && (
                        <div className="text-sm">
                          <strong>Errores:</strong> {csvResult.data.errors} filas con problemas
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Desglose por Fuentes</CardTitle>
                <CardDescription>
                  Distribución de lecturas por tipo de fuente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataStats?.sourceBreakdown.map((source, index) => (
                  <div key={source._id || index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(source._id)}
                      <span className="font-medium capitalize">
                        {source._id || 'Sin especificar'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{source.count.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {((source.count / (dataStats?.totalReadings || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-gray-500 py-8">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Calidad</CardTitle>
                <CardDescription>
                  Calidad de los datos por categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataStats?.qualityDistribution.map((quality, index) => (
                  <div key={quality._id || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getQualityColor(quality._id)} variant="secondary">
                        {quality._id || 'Sin especificar'}
                      </Badge>
                      <span className="font-bold">{quality.count.toLocaleString()}</span>
                    </div>
                    <Progress
                      value={(quality.count / (dataStats?.totalReadings || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                )) || (
                  <div className="text-center text-gray-500 py-8">
                    No hay datos de calidad disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}