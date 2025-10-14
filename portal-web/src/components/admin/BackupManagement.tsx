import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Download,
  Trash2,
  Upload,
  Database,
  Clock,
  HardDrive,
  RefreshCw,
  Settings,
  Play,
  AlertTriangle
} from 'lucide-react';

interface BackupFile {
  filename: string;
  size: number;
  date: Date;
  sizeFormatted: string;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
  averageSize: number;
}

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retentionDays: number;
  includeFiles: boolean;
  notifyEmails: string[];
}

const BackupManagement = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [config, setConfig] = useState<BackupConfig>({
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retentionDays: 30,
    includeFiles: true,
    notifyEmails: []
  });
  const [loading, setLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');

  useEffect(() => {
    loadBackups();
    loadSystemConfig();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/backups/list', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBackups(data.data.backups || []);
        setStats(data.data.stats || null);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadSystemConfig = async () => {
    try {
      const response = await fetch('/api/system/config', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.backups) {
          setConfig({
            enabled: data.data.backups.automatico,
            frequency: data.data.backups.frecuencia === 'diario' ? 'daily' :
                      data.data.backups.frecuencia === 'semanal' ? 'weekly' : 'monthly',
            time: data.data.backups.horaEjecucion,
            retentionDays: data.data.backups.retencionDias,
            includeFiles: data.data.backups.incluirArchivos,
            notifyEmails: data.data.backups.emailNotificacion || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading system config:', error);
    }
  };

  const createManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await fetch('/api/backups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          includeFiles: config.includeFiles
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Backup creado exitosamente", {
          description: `Archivo: ${data.data.filename} (${data.data.sizeFormatted || formatFileSize(data.data.size)})`,
        });
        loadBackups();
      } else {
        toast.error("Error al crear backup", {
          description: data.message,
        });
      }
    } catch (error) {
      toast.error("Error al crear backup", {
        description: "Error de conexión con el servidor",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backups/download/${filename}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Descarga iniciada", {
          description: `Descargando ${filename}`,
        });
      } else {
        const data = await response.json();
        toast.error("Error al descargar", {
          description: data.message,
        });
      }
    } catch (error) {
      toast.error("Error al descargar", {
        description: "Error de conexión con el servidor",
      });
    }
  };

  const deleteBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backups/delete/${filename}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Backup eliminado", {
          description: `Archivo ${filename} eliminado exitosamente`,
        });
        loadBackups();
      } else {
        toast.error("Error al eliminar", {
          description: data.message,
        });
      }
    } catch (error) {
      toast.error("Error al eliminar", {
        description: "Error de conexión con el servidor",
      });
    }
  };

  const setupAutomaticBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backups/setup-automatic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Configuración actualizada", {
          description: config.enabled ?
            "Backup automático configurado exitosamente" :
            "Backup automático deshabilitado",
        });
      } else {
        toast.error("Error al configurar backup automático", {
          description: data.message,
        });
      }
    } catch (error) {
      toast.error("Error al configurar", {
        description: "Error de conexión con el servidor",
      });
    } finally {
      setLoading(false);
    }
  };

  const addNotificationEmail = () => {
    if (newEmailInput && !config.notifyEmails.includes(newEmailInput)) {
      setConfig(prev => ({
        ...prev,
        notifyEmails: [...prev.notifyEmails, newEmailInput]
      }));
      setNewEmailInput('');
    }
  };

  const removeNotificationEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      notifyEmails: prev.notifyEmails.filter(e => e !== email)
    }));
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Backups</h2>
          <p className="text-muted-foreground">
            Administra los backups del sistema y configura respaldos automáticos
          </p>
        </div>
        <Button
          onClick={createManualBackup}
          disabled={isCreatingBackup}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isCreatingBackup ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Crear Backup Manual
            </>
          )}
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="mr-2 h-5 w-5" />
              Estadísticas de Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalBackups}</div>
                <div className="text-sm text-muted-foreground">Total Backups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatFileSize(stats.totalSize)}
                </div>
                <div className="text-sm text-muted-foreground">Espacio Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatFileSize(stats.averageSize)}
                </div>
                <div className="text-sm text-muted-foreground">Tamaño Promedio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.newestBackup ?
                    format(new Date(stats.newestBackup), 'dd/MM/yyyy', { locale: es }) :
                    'N/A'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Último Backup</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automatic Backup Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Configuración de Backup Automático
          </CardTitle>
          <CardDescription>
            Configura los backups automáticos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="backup-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
            />
            <Label htmlFor="backup-enabled">Habilitar backup automático</Label>
          </div>

          {config.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select
                    value={config.frequency}
                    onValueChange={(frequency: 'daily' | 'weekly' | 'monthly') =>
                      setConfig(prev => ({ ...prev, frequency }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hora de Ejecución</Label>
                  <Input
                    type="time"
                    value={config.time}
                    onChange={(e) => setConfig(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Retención (días)</Label>
                  <Input
                    type="number"
                    min="7"
                    max="365"
                    value={config.retentionDays}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      retentionDays: parseInt(e.target.value) || 30
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="include-files"
                  checked={config.includeFiles}
                  onCheckedChange={(includeFiles) => setConfig(prev => ({ ...prev, includeFiles }))}
                />
                <Label htmlFor="include-files">Incluir archivos del sistema</Label>
              </div>

              <div className="space-y-3">
                <Label>Emails de Notificación</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {config.notifyEmails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeNotificationEmail(email)}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNotificationEmail()}
                  />
                  <Button onClick={addNotificationEmail} variant="outline">
                    Agregar
                  </Button>
                </div>
              </div>

              <Button
                onClick={setupAutomaticBackup}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Aplicar Configuración
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup Files List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Archivos de Backup</CardTitle>
            <CardDescription>
              Lista de todos los backups disponibles
            </CardDescription>
          </div>
          <Button onClick={loadBackups} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay backups disponibles. Crea tu primer backup manual.
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{backup.filename}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(backup.date), 'dd/MM/yyyy HH:mm', { locale: es })} · {backup.sizeFormatted}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadBackup(backup.filename)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar backup?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente el archivo {backup.filename}.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteBackup(backup.filename)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-yellow-800">Información Importante</h4>
              <p className="text-sm text-yellow-700">
                Los backups se almacenan en el directorio <code>/backups</code> del servidor.
                Se recomienda configurar un almacenamiento externo para backups críticos.
                La funcionalidad de restauración está disponible pero debe usarse con precaución.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;