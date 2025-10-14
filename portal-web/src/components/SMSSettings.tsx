import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Phone, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

interface SMSSettings {
  enabled: boolean;
  nuevaBoleta: boolean;
  recordatorioPago: boolean;
  confirmacionPago: boolean;
  phoneVerified: boolean;
}

interface SMSServiceStatus {
  enabled: boolean;
  configured: boolean;
  fromNumber: string | null;
}

interface SMSSettingsProps {
  onBack?: () => void;
}

export default function SMSSettings({ onBack }: SMSSettingsProps) {
  const [settings, setSettings] = useState<SMSSettings>({
    enabled: false,
    nuevaBoleta: true,
    recordatorioPago: true,
    confirmacionPago: true,
    phoneVerified: false
  });
  
  const [serviceStatus, setServiceStatus] = useState<SMSServiceStatus>({
    enabled: false,
    configured: false,
    fromNumber: null
  });
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Load SMS settings on component mount
  useEffect(() => {
    loadSMSSettings();
  }, []);

  const loadSMSSettings = async () => {
    try {
      const response = await apiClient.get('/sms/settings');
      if (response.data.success) {
        setSettings(response.data.data.settings);
        setServiceStatus(response.data.data.serviceStatus);
        setPhone(response.data.data.phone || '');
      }
    } catch (error: any) {
      console.error('Error loading SMS settings:', error);
      toast.error('Error al cargar configuración SMS');
    } finally {
      setLoading(false);
    }
  };

  const updateSMSSettings = async () => {
    setSaving(true);
    try {
      const response = await apiClient.put('/sms/settings', settings);
      if (response.data.success) {
        toast.success('Configuración SMS actualizada correctamente');
      }
    } catch (error: any) {
      console.error('Error updating SMS settings:', error);
      const message = error.response?.data?.message || 'Error al actualizar configuración SMS';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const sendTestSMS = async () => {
    setSendingTest(true);
    try {
      const response = await apiClient.post('/sms/test');
      if (response.data.success) {
        toast.success('SMS de prueba enviado correctamente');
      }
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      const message = error.response?.data?.message || 'Error al enviar SMS de prueba';
      toast.error(message);
    } finally {
      setSendingTest(false);
    }
  };

  const verifyPhone = async () => {
    setVerifying(true);
    try {
      const response = await apiClient.post('/sms/verify-phone');
      if (response.data.success) {
        setSettings(prev => ({ ...prev, phoneVerified: true }));
        toast.success('Teléfono verificado correctamente');
      }
    } catch (error: any) {
      console.error('Error verifying phone:', error);
      const message = error.response?.data?.message || 'Error al verificar teléfono';
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-white hover:bg-white/10"
              >
                ← Volver
              </Button>
            )}
            <MessageSquare className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Notificaciones SMS
              </h1>
              <p className="text-slate-400">
                Configura las notificaciones por mensaje de texto
              </p>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Estado del Servicio SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {serviceStatus.enabled && serviceStatus.configured ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-400">Servicio activo</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-400">Servicio no disponible</span>
                  </>
                )}
              </div>
              {serviceStatus.fromNumber && (
                <span className="text-slate-400 text-sm">
                  Desde: {serviceStatus.fromNumber}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Phone Verification */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Verificación de Teléfono
            </CardTitle>
            <CardDescription className="text-slate-400">
              Verifica tu número de teléfono para recibir notificaciones SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Número de teléfono</Label>
              <Input
                value={phone}
                disabled
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="No configurado"
              />
              <p className="text-sm text-slate-400 mt-1">
                Para cambiar tu teléfono, contacta al administrador
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.phoneVerified ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-400">Teléfono verificado</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-400">Teléfono no verificado</span>
                  </>
                )}
              </div>

              {!settings.phoneVerified && phone && (
                <Button
                  onClick={verifyPhone}
                  disabled={verifying || !serviceStatus.enabled}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SMS Settings */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Configuración de Notificaciones</CardTitle>
            <CardDescription className="text-slate-400">
              Elige qué notificaciones quieres recibir por SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <div>
                <Label className="text-white font-semibold">
                  Activar notificaciones SMS
                </Label>
                <p className="text-sm text-slate-400">
                  Habilita todas las notificaciones por mensaje de texto
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, enabled: checked }))
                }
                disabled={!phone || !settings.phoneVerified || !serviceStatus.enabled}
              />
            </div>

            <Separator className="bg-slate-600" />

            {/* Individual toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Nueva boleta disponible</Label>
                  <p className="text-sm text-slate-400">
                    Recibe un SMS cuando tengas una nueva boleta
                  </p>
                </div>
                <Switch
                  checked={settings.nuevaBoleta}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, nuevaBoleta: checked }))
                  }
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Recordatorio de pago</Label>
                  <p className="text-sm text-slate-400">
                    Recibe recordatorios cuando una boleta esté próxima a vencer
                  </p>
                </div>
                <Switch
                  checked={settings.recordatorioPago}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, recordatorioPago: checked }))
                  }
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Confirmación de pago</Label>
                  <p className="text-sm text-slate-400">
                    Recibe confirmación cuando un pago sea procesado
                  </p>
                </div>
                <Switch
                  checked={settings.confirmacionPago}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, confirmacionPago: checked }))
                  }
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button
              onClick={updateSMSSettings}
              disabled={saving || !phone || !settings.phoneVerified}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>

            {settings.enabled && phone && settings.phoneVerified && (
              <Button
                onClick={sendTestSMS}
                disabled={sendingTest || !serviceStatus.enabled}
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar SMS de Prueba'
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Help */}
        <Card className="bg-blue-900/20 border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-100">
                <p className="font-semibold mb-2">Información importante:</p>
                <ul className="space-y-1 text-blue-200">
                  <li>• Las notificaciones SMS están sujetas a disponibilidad del servicio</li>
                  <li>• Debes verificar tu teléfono antes de activar las notificaciones</li>
                  <li>• Los mensajes se envían a tu número registrado en el sistema</li>
                  <li>• Puedes desactivar las notificaciones en cualquier momento</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}