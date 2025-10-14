import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  RefreshCw,
  Globe,
  Mail,
  Phone,
  CreditCard,
  Shield,
  Bell,
  Database,
  Server,
  Users,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

interface SystemConfig {
  // Información general del sistema
  organizacion: {
    nombre: string;
    rut: string;
    direccion: string;
    telefono: string;
    email: string;
    sitioWeb?: string;
    logo?: string;
  };
  
  // Configuración de pagos
  pagos: {
    habilitado: boolean;
    metodosPermitidos: string[];
    montoMinimo: number;
    comisionTarjeta: number;
    diasGraciaVencimiento: number;
  };
  
  // Configuración de notificaciones
  notificaciones: {
    emailHabilitado: boolean;
    smsHabilitado: boolean;
    recordatoriosPago: boolean;
    diasAntesVencimiento: number;
    notificacionesAdmin: boolean;
  };
  
  // Configuración del sistema
  sistema: {
    mantenimiento: boolean;
    registroSociosAbierto: boolean;
    versionApp: string;
    ultimaActualizacion: string;
    backupAutomatico: boolean;
  };
}

export default function ConfiguracionSistemaView() {
  const [config, setConfig] = useState<SystemConfig>({
    organizacion: {
      nombre: 'APR Agua Potable Rural',
      rut: '12.345.678-9',
      direccion: 'Calle Principal 123, Comuna, Región',
      telefono: '+56 9 1234 5678',
      email: 'contacto@apr.cl',
      sitioWeb: 'https://apr.cl',
      logo: ''
    },
    pagos: {
      habilitado: true,
      metodosPermitidos: ['mercadopago', 'paypal', 'tarjeta_credito', 'tarjeta_debito', 'transferencia'],
      montoMinimo: 1000,
      comisionTarjeta: 2.5,
      diasGraciaVencimiento: 10
    },
    notificaciones: {
      emailHabilitado: true,
      smsHabilitado: false,
      recordatoriosPago: true,
      diasAntesVencimiento: 7,
      notificacionesAdmin: true
    },
    sistema: {
      mantenimiento: false,
      registroSociosAbierto: true,
      versionApp: '1.0.0',
      ultimaActualizacion: new Date().toISOString(),
      backupAutomatico: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/configuracion');
      if (response.data.success) {
        setConfig(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading configuration:', error);
      // Use default config if API fails
      toast.error('Usando configuración por defecto');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put('/admin/configuracion', config);
      if (response.data.success) {
        toast.success('Configuración guardada correctamente');
        setConfig(prev => ({
          ...prev,
          sistema: {
            ...prev.sistema,
            ultimaActualizacion: new Date().toISOString()
          }
        }));
      }
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section: keyof SystemConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (section: keyof SystemConfig, field: string, item: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: checked 
          ? [...(prev[section][field] as string[]), item]
          : (prev[section][field] as string[]).filter(i => i !== item)
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
            <p className="text-gray-600">Administra la configuración general de la plataforma</p>
          </div>
        </div>
        
        <Button 
          onClick={saveConfiguration}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Información de la Organización */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Información de la Organización
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div>
              <Label htmlFor="org-nombre">Nombre de la Organización</Label>
              <Input
                id="org-nombre"
                value={config.organizacion.nombre}
                onChange={(e) => handleInputChange('organizacion', 'nombre', e.target.value)}
                placeholder="APR Agua Potable Rural"
              />
            </div>

            <div>
              <Label htmlFor="org-rut">RUT</Label>
              <Input
                id="org-rut"
                value={config.organizacion.rut}
                onChange={(e) => handleInputChange('organizacion', 'rut', e.target.value)}
                placeholder="12.345.678-9"
              />
            </div>

            <div>
              <Label htmlFor="org-direccion">Dirección</Label>
              <Textarea
                id="org-direccion"
                value={config.organizacion.direccion}
                onChange={(e) => handleInputChange('organizacion', 'direccion', e.target.value)}
                placeholder="Calle Principal 123, Comuna, Región"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-telefono">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Teléfono
                </Label>
                <Input
                  id="org-telefono"
                  value={config.organizacion.telefono}
                  onChange={(e) => handleInputChange('organizacion', 'telefono', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
              
              <div>
                <Label htmlFor="org-email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </Label>
                <Input
                  id="org-email"
                  type="email"
                  value={config.organizacion.email}
                  onChange={(e) => handleInputChange('organizacion', 'email', e.target.value)}
                  placeholder="contacto@apr.cl"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="org-sitio">Sitio Web</Label>
              <Input
                id="org-sitio"
                value={config.organizacion.sitioWeb || ''}
                onChange={(e) => handleInputChange('organizacion', 'sitioWeb', e.target.value)}
                placeholder="https://apr.cl"
              />
            </div>

          </CardContent>
        </Card>

        {/* Configuración de Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Configuración de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Pagos en línea habilitados</Label>
                <p className="text-sm text-gray-600">Permite a los socios pagar por la plataforma</p>
              </div>
              <Switch
                checked={config.pagos.habilitado}
                onCheckedChange={(checked) => handleInputChange('pagos', 'habilitado', checked)}
              />
            </div>

            <div>
              <Label>Métodos de Pago Permitidos</Label>
              <div className="space-y-2 mt-2">
                {[
                  { id: 'mercadopago', label: 'Mercado Pago', icon: '💳' },
                  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                  { id: 'tarjeta_credito', label: 'Tarjeta de Crédito', icon: '💳' },
                  { id: 'tarjeta_debito', label: 'Tarjeta de Débito', icon: '💳' },
                  { id: 'transferencia', label: 'Transferencia Bancaria', icon: '🏦' }
                ].map((metodo) => (
                  <div key={metodo.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={metodo.id}
                      checked={config.pagos.metodosPermitidos.includes(metodo.id)}
                      onChange={(e) => handleArrayChange('pagos', 'metodosPermitidos', metodo.id, e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={metodo.id} className="flex items-center gap-2">
                      <span>{metodo.icon}</span>
                      {metodo.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monto-minimo">Monto Mínimo</Label>
                <Input
                  id="monto-minimo"
                  type="number"
                  value={config.pagos.montoMinimo}
                  onChange={(e) => handleInputChange('pagos', 'montoMinimo', parseInt(e.target.value))}
                  placeholder="1000"
                />
              </div>
              
              <div>
                <Label htmlFor="comision">Comisión Tarjeta (%)</Label>
                <Input
                  id="comision"
                  type="number"
                  step="0.1"
                  value={config.pagos.comisionTarjeta}
                  onChange={(e) => handleInputChange('pagos', 'comisionTarjeta', parseFloat(e.target.value))}
                  placeholder="2.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dias-gracia">Días de Gracia después del Vencimiento</Label>
              <Input
                id="dias-gracia"
                type="number"
                value={config.pagos.diasGraciaVencimiento}
                onChange={(e) => handleInputChange('pagos', 'diasGraciaVencimiento', parseInt(e.target.value))}
                placeholder="10"
              />
            </div>

          </CardContent>
        </Card>

        {/* Configuración de Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-gray-600">Enviar emails a los socios</p>
                </div>
                <Switch
                  checked={config.notificaciones.emailHabilitado}
                  onCheckedChange={(checked) => handleInputChange('notificaciones', 'emailHabilitado', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones por SMS</Label>
                  <p className="text-sm text-gray-600">Enviar SMS a los socios</p>
                </div>
                <Switch
                  checked={config.notificaciones.smsHabilitado}
                  onCheckedChange={(checked) => handleInputChange('notificaciones', 'smsHabilitado', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Recordatorios de Pago</Label>
                  <p className="text-sm text-gray-600">Enviar recordatorios antes del vencimiento</p>
                </div>
                <Switch
                  checked={config.notificaciones.recordatoriosPago}
                  onCheckedChange={(checked) => handleInputChange('notificaciones', 'recordatoriosPago', checked)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dias-recordatorio">Días antes del vencimiento para recordatorio</Label>
              <Input
                id="dias-recordatorio"
                type="number"
                value={config.notificaciones.diasAntesVencimiento}
                onChange={(e) => handleInputChange('notificaciones', 'diasAntesVencimiento', parseInt(e.target.value))}
                placeholder="7"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Notificaciones para Administradores</Label>
                <p className="text-sm text-gray-600">Recibir notificaciones de actividad</p>
              </div>
              <Switch
                checked={config.notificaciones.notificacionesAdmin}
                onCheckedChange={(checked) => handleInputChange('notificaciones', 'notificacionesAdmin', checked)}
              />
            </div>

          </CardContent>
        </Card>

        {/* Estado del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Modo Mantenimiento</Label>
                <p className="text-sm text-gray-600">Bloquea el acceso a los socios</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.sistema.mantenimiento}
                  onCheckedChange={(checked) => handleInputChange('sistema', 'mantenimiento', checked)}
                />
                <Badge variant={config.sistema.mantenimiento ? "destructive" : "secondary"}>
                  {config.sistema.mantenimiento ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Registro de Socios Abierto</Label>
                <p className="text-sm text-gray-600">Permite nuevos registros</p>
              </div>
              <Switch
                checked={config.sistema.registroSociosAbierto}
                onCheckedChange={(checked) => handleInputChange('sistema', 'registroSociosAbierto', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Backup Automático</Label>
                <p className="text-sm text-gray-600">Respaldo automático diario</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.sistema.backupAutomatico}
                  onCheckedChange={(checked) => handleInputChange('sistema', 'backupAutomatico', checked)}
                />
                <Badge variant={config.sistema.backupAutomatico ? "default" : "secondary"}>
                  {config.sistema.backupAutomatico ? "Habilitado" : "Deshabilitado"}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Versión:</span>
                <Badge variant="outline">{config.sistema.versionApp}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Última actualización:</span>
                <span className="text-sm">{new Date(config.sistema.ultimaActualizacion).toLocaleString('es-CL')}</span>
              </div>
            </div>

          </CardContent>
        </Card>
        
      </div>

      {/* Sistema de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Estado Actual del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Pagos</p>
                <p className="text-xs text-green-600">{config.pagos.habilitado ? 'Habilitados' : 'Deshabilitados'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Email</p>
                <p className="text-xs text-blue-600">{config.notificaciones.emailHabilitado ? 'Activo' : 'Inactivo'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <Phone className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">SMS</p>
                <p className="text-xs text-yellow-600">{config.notificaciones.smsHabilitado ? 'Activo' : 'Inactivo'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Registro</p>
                <p className="text-xs text-purple-600">{config.sistema.registroSociosAbierto ? 'Abierto' : 'Cerrado'}</p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

    </div>
  );
}