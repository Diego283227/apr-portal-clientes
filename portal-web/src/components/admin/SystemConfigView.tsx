import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Settings,
  Building,
  Globe,
  FileText,
  Scissors,
  Droplets,
  Bell,
  Shield,
  Database,
  Smartphone,
  Wifi,
  Save,
  RotateCcw,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import BackupManagement from './BackupManagement';

interface SystemConfig {
  organizacion: {
    nombreAPR: string;
    razonSocial?: string;
    rut?: string;
    direccion: string;
    comuna: string;
    region: string;
    telefono: string;
    email: string;
    sitioWeb?: string;
    logoUrl?: string;
  };
  regional: {
    timezone: string;
    moneda: string;
    codigoMoneda: string;
    formatoFecha: string;
    formatoHora: string;
    idioma: string;
  };
  facturacion: {
    diaGeneracionBoletas: number;
    diasVencimientoDefecto: number;
    generacionAutomatica: boolean;
    numeracionConsecutiva: boolean;
    prefijoNumeroBoleta: string;
    digitosNumeroBoleta: number;
    incluirIVA: boolean;
    porcentajeIVA: number;
  };
  servicios: {
    diasGraciaCorte: number;
    costoReconexion: number;
    horarioCorte: {
      inicio: string;
      fin: string;
      diasSemana: number[];
    };
    requiereAviso: boolean;
    diasAvisoCorte: number;
  };
  medidores: {
    lecturaManual: boolean;
    frecuenciaLectura: string;
    toleranciaConsumoAnormal: number;
    alertaFugaConsumo: number;
    requiereFotoLectura: boolean;
    validacionCruzada: boolean;
  };
  notificaciones: {
    habilitadas: boolean;
    emailHabilitado: boolean;
    smsHabilitado: boolean;
    horariosEnvio: {
      inicio: string;
      fin: string;
    };
    diasRecordatorio: number[];
    recordatorioPostVencimiento: boolean;
    frecuenciaRecordatorioVencido: number;
  };
  seguridad: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    passwordMinLength: number;
    passwordRequireSpecialChars: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireUppercase: boolean;
    tokenExpirationHours: number;
    auditLogRetentionDays: number;
  };
  backups: {
    automatico: boolean;
    frecuencia: string;
    horaEjecucion: string;
    retencionDias: number;
    incluirArchivos: boolean;
    notificarResultado: boolean;
    emailNotificacion: string[];
  };
  aplicacion: {
    modoMantenimiento: boolean;
    mensajeMantenimiento?: string;
    versionApp: string;
    entorno: string;
    logLevel: string;
    maxFileUploadSize: number;
    allowedFileTypes: string[];
  };
  integraciones: {
    paypal: {
      habilitado: boolean;
      sandbox: boolean;
      webhook: string;
      currency: string;
    };
    mercadoPago: {
      habilitado: boolean;
      country: string;
      currency: string;
      webhook: string;
    };
    email: {
      provider: string;
      configuracion: any;
    };
    sms: {
      provider: string;
      configuracion: any;
    };
  };
}

export default function SystemConfigView() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetSection, setResetSection] = useState<string>('');

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/system/config');
      setConfig(response.data.data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading system config:', error);
      toast.error('Error al cargar configuración del sistema');
    } finally {
      setLoading(false);
    }
  };

  const saveSystemConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await apiClient.put('/system/config', config);
      toast.success('Configuración guardada exitosamente');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving system config:', error);
      toast.error(error.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async (section?: string) => {
    try {
      setSaving(true);
      await apiClient.post('/system/config/reset', section ? { seccion: section } : {});
      toast.success(`Configuración ${section || 'completa'} restaurada exitosamente`);
      loadSystemConfig();
      setShowResetDialog(false);
    } catch (error: any) {
      console.error('Error resetting config:', error);
      toast.error(error.response?.data?.message || 'Error al restaurar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;

    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
    setHasChanges(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 animate-spin" />
          <span>Cargando configuración del sistema...</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-6 h-6" />
          <span>Error al cargar la configuración del sistema</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground">
            Gestiona la configuración general del portal APR
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <Clock className="w-3 h-3 mr-1" />
              Cambios sin guardar
            </Badge>
          )}
          <Button onClick={() => setShowResetDialog(true)} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
          <Button
            onClick={saveSystemConfig}
            disabled={!hasChanges || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Settings className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs de Configuración */}
      <Tabs defaultValue="organizacion" className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-9 w-full">
          <TabsTrigger value="organizacion" className="text-xs">
            <Building className="w-3 h-3 mr-1" />
            Organización
          </TabsTrigger>
          <TabsTrigger value="regional" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Regional
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="servicios" className="text-xs">
            <Scissors className="w-3 h-3 mr-1" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="medidores" className="text-xs">
            <Droplets className="w-3 h-3 mr-1" />
            Medidores
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="text-xs">
            <Bell className="w-3 h-3 mr-1" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="sistema" className="text-xs">
            <Database className="w-3 h-3 mr-1" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="backups" className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            Backups
          </TabsTrigger>
        </TabsList>

        {/* Tab: Organización */}
        <TabsContent value="organizacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Información de la Organización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del APR *</Label>
                  <Input
                    value={config.organizacion.nombreAPR}
                    onChange={(e) => updateConfig('organizacion.nombreAPR', e.target.value)}
                    placeholder="Ej: APR San Pedro"
                  />
                </div>
                <div>
                  <Label>Razón Social</Label>
                  <Input
                    value={config.organizacion.razonSocial || ''}
                    onChange={(e) => updateConfig('organizacion.razonSocial', e.target.value)}
                    placeholder="Ej: Comité APR San Pedro Ltda."
                  />
                </div>
                <div>
                  <Label>RUT</Label>
                  <Input
                    value={config.organizacion.rut || ''}
                    onChange={(e) => updateConfig('organizacion.rut', e.target.value)}
                    placeholder="12.345.678-9"
                  />
                </div>
                <div>
                  <Label>Teléfono *</Label>
                  <Input
                    value={config.organizacion.telefono}
                    onChange={(e) => updateConfig('organizacion.telefono', e.target.value)}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={config.organizacion.email}
                    onChange={(e) => updateConfig('organizacion.email', e.target.value)}
                    placeholder="contacto@aprsanpedro.cl"
                  />
                </div>
                <div>
                  <Label>Sitio Web</Label>
                  <Input
                    value={config.organizacion.sitioWeb || ''}
                    onChange={(e) => updateConfig('organizacion.sitioWeb', e.target.value)}
                    placeholder="https://www.aprsanpedro.cl"
                  />
                </div>
              </div>

              <div>
                <Label>Dirección *</Label>
                <Input
                  value={config.organizacion.direccion}
                  onChange={(e) => updateConfig('organizacion.direccion', e.target.value)}
                  placeholder="Calle Principal 123"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Comuna *</Label>
                  <Input
                    value={config.organizacion.comuna}
                    onChange={(e) => updateConfig('organizacion.comuna', e.target.value)}
                    placeholder="San Pedro"
                  />
                </div>
                <div>
                  <Label>Región *</Label>
                  <Input
                    value={config.organizacion.region}
                    onChange={(e) => updateConfig('organizacion.region', e.target.value)}
                    placeholder="Región de Los Lagos"
                  />
                </div>
              </div>

              <div>
                <Label>URL del Logo</Label>
                <Input
                  value={config.organizacion.logoUrl || ''}
                  onChange={(e) => updateConfig('organizacion.logoUrl', e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  URL del logo que aparecerá en el sistema
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Regional */}
        <TabsContent value="regional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configuración Regional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Zona Horaria</Label>
                  <Select
                    value={config.regional.timezone}
                    onValueChange={(value) => updateConfig('regional.timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Santiago">Chile Continental</SelectItem>
                      <SelectItem value="Pacific/Easter">Isla de Pascua</SelectItem>
                      <SelectItem value="America/Punta_Arenas">Magallanes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Select
                    value={config.regional.codigoMoneda}
                    onValueChange={(value) => {
                      updateConfig('regional.codigoMoneda', value);
                      updateConfig('regional.moneda', value === 'CLP' ? 'Peso Chileno' : value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLP">Peso Chileno (CLP)</SelectItem>
                      <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formato de Fecha</Label>
                  <Select
                    value={config.regional.formatoFecha}
                    onValueChange={(value) => updateConfig('regional.formatoFecha', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Formato de Hora</Label>
                  <Select
                    value={config.regional.formatoHora}
                    onValueChange={(value) => updateConfig('regional.formatoHora', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HH:mm">24 horas (HH:mm)</SelectItem>
                      <SelectItem value="hh:mm A">12 horas (hh:mm AM/PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Facturación */}
        <TabsContent value="facturacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Configuración de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Día de Generación de Boletas</Label>
                  <Select
                    value={config.facturacion.diaGeneracionBoletas.toString()}
                    onValueChange={(value) => updateConfig('facturacion.diaGeneracionBoletas', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 28}, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          Día {day} del mes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Días de Vencimiento por Defecto</Label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={config.facturacion.diasVencimientoDefecto}
                    onChange={(e) => updateConfig('facturacion.diasVencimientoDefecto', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Prefijo de Número de Boleta</Label>
                  <Input
                    value={config.facturacion.prefijoNumeroBoleta}
                    onChange={(e) => updateConfig('facturacion.prefijoNumeroBoleta', e.target.value)}
                    placeholder="BOL-"
                  />
                </div>
                <div>
                  <Label>Dígitos del Número de Boleta</Label>
                  <Select
                    value={config.facturacion.digitosNumeroBoleta.toString()}
                    onValueChange={(value) => updateConfig('facturacion.digitosNumeroBoleta', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dígitos (001)</SelectItem>
                      <SelectItem value="4">4 dígitos (0001)</SelectItem>
                      <SelectItem value="5">5 dígitos (00001)</SelectItem>
                      <SelectItem value="6">6 dígitos (000001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.facturacion.generacionAutomatica}
                    onCheckedChange={(checked) => updateConfig('facturacion.generacionAutomatica', checked)}
                  />
                  <Label>Generación Automática de Boletas</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.facturacion.numeracionConsecutiva}
                    onCheckedChange={(checked) => updateConfig('facturacion.numeracionConsecutiva', checked)}
                  />
                  <Label>Numeración Consecutiva</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.facturacion.incluirIVA}
                    onCheckedChange={(checked) => updateConfig('facturacion.incluirIVA', checked)}
                  />
                  <Label>Incluir IVA en las Boletas</Label>
                </div>
              </div>

              {config.facturacion.incluirIVA && (
                <div>
                  <Label>Porcentaje de IVA (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={config.facturacion.porcentajeIVA}
                    onChange={(e) => updateConfig('facturacion.porcentajeIVA', parseFloat(e.target.value))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Servicios */}
        <TabsContent value="servicios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="w-5 h-5" />
                Gestión de Servicios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Días de Gracia para Corte</Label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={config.servicios.diasGraciaCorte}
                    onChange={(e) => updateConfig('servicios.diasGraciaCorte', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Días adicionales después del vencimiento antes de corte
                  </p>
                </div>
                <div>
                  <Label>Costo de Reconexión</Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.servicios.costoReconexion}
                    onChange={(e) => updateConfig('servicios.costoReconexion', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(config.servicios.costoReconexion)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Horarios de Corte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Hora de Inicio</Label>
                    <Input
                      type="time"
                      value={config.servicios.horarioCorte.inicio}
                      onChange={(e) => updateConfig('servicios.horarioCorte.inicio', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Hora de Fin</Label>
                    <Input
                      type="time"
                      value={config.servicios.horarioCorte.fin}
                      onChange={(e) => updateConfig('servicios.horarioCorte.fin', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.servicios.requiereAviso}
                    onCheckedChange={(checked) => updateConfig('servicios.requiereAviso', checked)}
                  />
                  <Label>Requerir Aviso Antes del Corte</Label>
                </div>

                {config.servicios.requiereAviso && (
                  <div>
                    <Label>Días de Anticipación para Aviso</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={config.servicios.diasAvisoCorte}
                      onChange={(e) => updateConfig('servicios.diasAvisoCorte', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Medidores */}
        <TabsContent value="medidores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                Configuración de Medidores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Frecuencia de Lectura</Label>
                  <Select
                    value={config.medidores.frecuenciaLectura}
                    onValueChange={(value) => updateConfig('medidores.frecuenciaLectura', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="bimensual">Bimensual</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tolerancia Consumo Anormal (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={config.medidores.toleranciaConsumoAnormal}
                    onChange={(e) => updateConfig('medidores.toleranciaConsumoAnormal', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Alerta Fuga de Agua (m³)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={config.medidores.alertaFugaConsumo}
                    onChange={(e) => updateConfig('medidores.alertaFugaConsumo', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Consumo que activa alerta de posible fuga
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.medidores.lecturaManual}
                    onCheckedChange={(checked) => updateConfig('medidores.lecturaManual', checked)}
                  />
                  <Label>Lectura Manual de Medidores</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.medidores.requiereFotoLectura}
                    onCheckedChange={(checked) => updateConfig('medidores.requiereFotoLectura', checked)}
                  />
                  <Label>Requerir Foto de la Lectura</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.medidores.validacionCruzada}
                    onCheckedChange={(checked) => updateConfig('medidores.validacionCruzada', checked)}
                  />
                  <Label>Validación Cruzada con Lecturas Anteriores</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notificaciones */}
        <TabsContent value="notificaciones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Sistema de Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.notificaciones.habilitadas}
                    onCheckedChange={(checked) => updateConfig('notificaciones.habilitadas', checked)}
                  />
                  <Label>Habilitar Sistema de Notificaciones</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.notificaciones.emailHabilitado}
                    onCheckedChange={(checked) => updateConfig('notificaciones.emailHabilitado', checked)}
                    disabled={!config.notificaciones.habilitadas}
                  />
                  <Label>Notificaciones por Email</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.notificaciones.smsHabilitado}
                    onCheckedChange={(checked) => updateConfig('notificaciones.smsHabilitado', checked)}
                    disabled={!config.notificaciones.habilitadas}
                  />
                  <Label>Notificaciones por SMS</Label>
                </div>
              </div>

              {config.notificaciones.habilitadas && (
                <>
                  <div className="space-y-3">
                    <h4 className="font-medium">Horarios de Envío</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Hora de Inicio</Label>
                        <Input
                          type="time"
                          value={config.notificaciones.horariosEnvio.inicio}
                          onChange={(e) => updateConfig('notificaciones.horariosEnvio.inicio', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Hora de Fin</Label>
                        <Input
                          type="time"
                          value={config.notificaciones.horariosEnvio.fin}
                          onChange={(e) => updateConfig('notificaciones.horariosEnvio.fin', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Días de Recordatorio (separados por coma)</Label>
                    <Input
                      value={config.notificaciones.diasRecordatorio.join(', ')}
                      onChange={(e) => {
                        const dias = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
                        updateConfig('notificaciones.diasRecordatorio', dias);
                      }}
                      placeholder="7, 3, 1"
                    />
                    <p className="text-sm text-muted-foreground">
                      Días antes del vencimiento para enviar recordatorios
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.notificaciones.recordatorioPostVencimiento}
                      onCheckedChange={(checked) => updateConfig('notificaciones.recordatorioPostVencimiento', checked)}
                    />
                    <Label>Recordatorios Después del Vencimiento</Label>
                  </div>

                  {config.notificaciones.recordatorioPostVencimiento && (
                    <div>
                      <Label>Frecuencia de Recordatorio Vencido (días)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={config.notificaciones.frecuenciaRecordatorioVencido}
                        onChange={(e) => updateConfig('notificaciones.frecuenciaRecordatorioVencido', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seguridad */}
        <TabsContent value="seguridad" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configuración de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Timeout de Sesión (minutos)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.seguridad.sessionTimeout}
                    onChange={(e) => updateConfig('seguridad.sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Máximos Intentos de Login</Label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={config.seguridad.maxLoginAttempts}
                    onChange={(e) => updateConfig('seguridad.maxLoginAttempts', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Duración de Bloqueo (minutos)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.seguridad.lockoutDuration}
                    onChange={(e) => updateConfig('seguridad.lockoutDuration', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Longitud Mínima de Contraseña</Label>
                  <Input
                    type="number"
                    min="6"
                    max="50"
                    value={config.seguridad.passwordMinLength}
                    onChange={(e) => updateConfig('seguridad.passwordMinLength', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Expiración de Token (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={config.seguridad.tokenExpirationHours}
                    onChange={(e) => updateConfig('seguridad.tokenExpirationHours', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Retención de Logs de Auditoría (días)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="2555"
                    value={config.seguridad.auditLogRetentionDays}
                    onChange={(e) => updateConfig('seguridad.auditLogRetentionDays', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Requisitos de Contraseña</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.seguridad.passwordRequireSpecialChars}
                      onCheckedChange={(checked) => updateConfig('seguridad.passwordRequireSpecialChars', checked)}
                    />
                    <Label>Requerir Caracteres Especiales</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.seguridad.passwordRequireNumbers}
                      onCheckedChange={(checked) => updateConfig('seguridad.passwordRequireNumbers', checked)}
                    />
                    <Label>Requerir Números</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.seguridad.passwordRequireUppercase}
                      onCheckedChange={(checked) => updateConfig('seguridad.passwordRequireUppercase', checked)}
                    />
                    <Label>Requerir Mayúsculas</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Sistema */}
        <TabsContent value="sistema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Configuración del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.aplicacion.modoMantenimiento}
                    onCheckedChange={(checked) => updateConfig('aplicacion.modoMantenimiento', checked)}
                  />
                  <Label>Modo Mantenimiento</Label>
                  {config.aplicacion.modoMantenimiento && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                </div>

                {config.aplicacion.modoMantenimiento && (
                  <div>
                    <Label>Mensaje de Mantenimiento</Label>
                    <Textarea
                      value={config.aplicacion.mensajeMantenimiento || ''}
                      onChange={(e) => updateConfig('aplicacion.mensajeMantenimiento', e.target.value)}
                      placeholder="El sistema está en mantenimiento. Volveremos pronto."
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Versión de la Aplicación</Label>
                  <Input
                    value={config.aplicacion.versionApp}
                    onChange={(e) => updateConfig('aplicacion.versionApp', e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <Label>Entorno</Label>
                  <Select
                    value={config.aplicacion.entorno}
                    onValueChange={(value) => updateConfig('aplicacion.entorno', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desarrollo">Desarrollo</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nivel de Log</Label>
                  <Select
                    value={config.aplicacion.logLevel}
                    onValueChange={(value) => updateConfig('aplicacion.logLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tamaño Máximo de Archivo (MB)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={config.aplicacion.maxFileUploadSize}
                    onChange={(e) => updateConfig('aplicacion.maxFileUploadSize', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Configuración de Backups</h4>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.backups.automatico}
                    onCheckedChange={(checked) => updateConfig('backups.automatico', checked)}
                  />
                  <Label>Backups Automáticos</Label>
                </div>

                {config.backups.automatico && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Frecuencia</Label>
                      <Select
                        value={config.backups.frecuencia}
                        onValueChange={(value) => updateConfig('backups.frecuencia', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diario</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensual">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Hora de Ejecución</Label>
                      <Input
                        type="time"
                        value={config.backups.horaEjecucion}
                        onChange={(e) => updateConfig('backups.horaEjecucion', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Retención (días)</Label>
                      <Input
                        type="number"
                        min="7"
                        max="365"
                        value={config.backups.retencionDias}
                        onChange={(e) => updateConfig('backups.retencionDias', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Backups */}
        <TabsContent value="backups" className="space-y-6">
          <BackupManagement />
        </TabsContent>
      </Tabs>

      {/* Dialog de Reseteo */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Restaurar Configuración
            </DialogTitle>
            <DialogDescription>
              Selecciona qué configuración deseas restaurar a los valores por defecto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Sección a Restaurar</Label>
              <Select value={resetSection} onValueChange={setResetSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sección..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toda la Configuración</SelectItem>
                  <SelectItem value="facturacion">Facturación</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="medidores">Medidores</SelectItem>
                  <SelectItem value="notificaciones">Notificaciones</SelectItem>
                  <SelectItem value="seguridad">Seguridad</SelectItem>
                  <SelectItem value="backups">Backups</SelectItem>
                  <SelectItem value="aplicacion">Aplicación</SelectItem>
                  <SelectItem value="integraciones">Integraciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Advertencia:</p>
                  <p>
                    Esta acción no se puede deshacer. La configuración actual se guardará como backup.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => resetConfig(resetSection || undefined)}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saving ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}