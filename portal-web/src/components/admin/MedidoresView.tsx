import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import {
  Gauge,
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  MapPin,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wrench
} from 'lucide-react';

interface Socio {
  _id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  codigoSocio: string;
  medidor?: {
    numero: string;
    ubicacion?: string;
    fechaInstalacion?: string;
    lecturaInicial?: number;
    estado?: 'active' | 'inactive' | 'maintenance' | 'error';
  };
  categoriaUsuario?: string;
}

interface MedidorFormData {
  socioId: string;
  numero: string;
  ubicacion: string;
  fechaInstalacion: string;
  lecturaInicial: number;
  categoriaUsuario: string;
  estado: 'active' | 'inactive' | 'maintenance' | 'error';
}

export default function MedidoresView() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSocio, setEditingSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(false);

  const getEstadoBadge = (estado?: string) => {
    switch (estado) {
      case 'active':
        return {
          label: 'Activo',
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: CheckCircle
        };
      case 'inactive':
        return {
          label: 'Inactivo',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          icon: XCircle
        };
      case 'maintenance':
        return {
          label: 'Mantenimiento',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
          icon: Wrench
        };
      case 'error':
        return {
          label: 'Error',
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: AlertTriangle
        };
      default:
        return {
          label: 'Activo',
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: CheckCircle
        };
    }
  };

  const [formData, setFormData] = useState<MedidorFormData>({
    socioId: '',
    numero: '',
    ubicacion: '',
    fechaInstalacion: '',
    lecturaInicial: 0,
    categoriaUsuario: 'residencial',
    estado: 'active'
  });

  useEffect(() => {
    cargarSocios();
  }, []);

  const cargarSocios = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/socios', {
        params: { limit: 1000 }
      });
      const sociosData = response.data.data.socios || [];
      console.log('DEBUG: Socios cargados:', sociosData.length);
      console.log('DEBUG: Socios con medidor:', sociosData.filter(s => s.medidor).map(s => ({
        nombre: s.nombres,
        medidor: s.medidor
      })));
      setSocios(sociosData);
    } catch (error: any) {
      console.error('Error loading socios:', error);
      toast.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogoAsignar = (socio: Socio) => {
    setEditingSocio(socio);
    // Set form data with socio information - use id instead of _id
    setFormData({
      socioId: (socio as any).id || socio._id,
      numero: socio.medidor?.numero || '',
      ubicacion: socio.medidor?.ubicacion || '',
      fechaInstalacion: socio.medidor?.fechaInstalacion
        ? new Date(socio.medidor.fechaInstalacion).toISOString().split('T')[0]
        : '',
      lecturaInicial: socio.medidor?.lecturaInicial || 0,
      categoriaUsuario: socio.categoriaUsuario || 'residencial',
      estado: socio.medidor?.estado || 'active'
    });
    setShowDialog(true);
  };

  const cerrarDialogo = () => {
    setShowDialog(false);
    setEditingSocio(null);
    setFormData({
      socioId: '',
      numero: '',
      ubicacion: '',
      fechaInstalacion: '',
      lecturaInicial: 0,
      categoriaUsuario: 'residencial',
      estado: 'active'
    });
  };

  const guardarMedidor = async () => {
    if (!formData.numero.trim()) {
      toast.error('El número de medidor es obligatorio');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        medidor: {
          numero: formData.numero,
          ubicacion: formData.ubicacion || undefined,
          fechaInstalacion: formData.fechaInstalacion || undefined,
          lecturaInicial: formData.lecturaInicial,
          estado: formData.estado
        },
        categoriaUsuario: formData.categoriaUsuario
      };
      console.log('🔧 DEBUG Frontend: Sending payload:', JSON.stringify(payload, null, 2));
      console.log('🔧 DEBUG Frontend: formData.estado:', formData.estado);
      await apiClient.put(`/admin/socios/${formData.socioId}`, payload);

      const mensaje = editingSocio?.medidor?.numero ? 'Medidor actualizado exitosamente' : 'Medidor asignado exitosamente';
      toast.success(mensaje);
      cerrarDialogo();
      cargarSocios();
    } catch (error: any) {
      console.error('Error saving medidor:', error);
      toast.error(error.response?.data?.message || 'Error al guardar medidor');
    } finally {
      setLoading(false);
    }
  };

  const eliminarMedidor = async (socio: Socio) => {
    if (!confirm(`¿Está seguro de eliminar el medidor de ${socio.nombres} ${socio.apellidos}?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.put(`/admin/socios/${socio._id}`, {
        medidor: {
          numero: '',
          ubicacion: undefined,
          fechaInstalacion: undefined,
          lecturaInicial: 0
        }
      });

      toast.success('Medidor eliminado exitosamente');
      cargarSocios();
    } catch (error: any) {
      console.error('Error deleting medidor:', error);
      toast.error('Error al eliminar medidor');
    } finally {
      setLoading(false);
    }
  };

  const sociosFiltrados = socios.filter(socio =>
    `${socio.nombres} ${socio.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    socio.rut.includes(busqueda) ||
    socio.codigoSocio.includes(busqueda) ||
    socio.medidor?.numero?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const sociosConMedidor = sociosFiltrados.filter(s => s.medidor && s.medidor.numero);
  const sociosSinMedidor = sociosFiltrados.filter(s => !s.medidor || !s.medidor.numero);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Medidores</h1>
          <p className="text-gray-500">Asigne y administre los medidores de agua de los socios</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{sociosConMedidor.length}</div>
          <div className="text-sm text-gray-500">Medidores asignados</div>
        </div>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, RUT, código o número de medidor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Socios con medidor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Socios con Medidor Asignado ({sociosConMedidor.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sociosConMedidor.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sociosConMedidor.map(socio => (
                <Card key={socio._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="font-semibold text-lg">{socio.nombres} {socio.apellidos}</div>
                        <div className="text-sm text-gray-500">
                          {socio.rut} | {socio.codigoSocio}
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Gauge className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">{socio.medidor?.numero}</span>
                        </div>

                        {socio.medidor?.ubicacion && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{socio.medidor.ubicacion}</span>
                          </div>
                        )}

                        {socio.medidor?.fechaInstalacion && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(socio.medidor.fechaInstalacion).toLocaleDateString()}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Activity className="w-4 h-4" />
                          <span>Lectura inicial: {socio.medidor?.lecturaInicial || 0} m³</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {socio.categoriaUsuario || 'residencial'}
                          </div>
                          <Badge className={`flex items-center gap-1 ${getEstadoBadge(socio.medidor?.estado).className}`}>
                            {(() => {
                              const EstadoIcon = getEstadoBadge(socio.medidor?.estado).icon;
                              return <EstadoIcon className="w-3 h-3" />;
                            })()}
                            {getEstadoBadge(socio.medidor?.estado).label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialogoAsignar(socio)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => eliminarMedidor(socio)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No hay medidores asignados aún
            </div>
          )}
        </CardContent>
      </Card>

      {/* Socios sin medidor */}
      {sociosSinMedidor.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Socios sin Medidor ({sociosSinMedidor.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sociosSinMedidor.map(socio => (
                <Card key={socio._id} className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{socio.nombres} {socio.apellidos}</div>
                        <div className="text-sm text-gray-600">{socio.rut}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => abrirDialogoAsignar(socio)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Asignar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de asignación/edición */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-white shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingSocio?.medidor?.numero ? 'Editar' : 'Asignar'} Medidor
            </DialogTitle>
          </DialogHeader>

          {editingSocio && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                <div className="font-semibold text-base text-blue-900">{editingSocio.nombres} {editingSocio.apellidos}</div>
                <div className="text-sm text-blue-700 mt-1">{editingSocio.rut} | {editingSocio.codigoSocio}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Número de Medidor *</Label>
                <Input
                  type="text"
                  placeholder="Ej: MED-001"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Ubicación</Label>
                <Input
                  type="text"
                  placeholder="Ej: Calle Principal #123"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Fecha de Instalación</Label>
                <Input
                  type="date"
                  value={formData.fechaInstalacion}
                  onChange={(e) => setFormData({ ...formData, fechaInstalacion: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Lectura Inicial (m³)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.lecturaInicial}
                  onChange={(e) => setFormData({ ...formData, lecturaInicial: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Categoría de Usuario</Label>
                <select
                  className="w-full h-9 border border-gray-300 rounded-md px-3 py-1 text-sm bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 focus:ring-[3px] focus:outline-none transition-[color,box-shadow] dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  value={formData.categoriaUsuario}
                  onChange={(e) => setFormData({ ...formData, categoriaUsuario: e.target.value })}
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="tercera_edad">Tercera Edad</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Estado del Medidor</Label>
                <select
                  className="w-full h-9 border border-gray-300 rounded-md px-3 py-1 text-sm bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 focus:ring-[3px] focus:outline-none transition-[color,box-shadow] dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'active' | 'inactive' | 'maintenance' | 'error' })}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={cerrarDialogo} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={guardarMedidor} disabled={loading} className="flex-1">
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
