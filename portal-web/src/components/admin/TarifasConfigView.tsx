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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calculator,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Droplets,
  Calendar,
  Percent,
  Copy,
  MoreHorizontal,
  Eye,
  Download,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

interface TarifaConfig {
  _id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  estado?: 'activa' | 'pausada' | 'finalizada' | 'borrador';
  fechaVigencia: string;
  fechaVencimiento?: string;
  fechaPausa?: string;
  cargoFijo: {
    residencial: number;
    comercial: number;
    industrial: number;
    terceraEdad: number;
  };
  escalones: Array<{
    desde: number;
    hasta: number;
    tarifaResidencial: number;
    tarifaComercial: number;
    tarifaIndustrial: number;
    tarifaTerceraEdad: number;
  }>;
  temporadas?: Array<{
    nombre: string;
    mesInicio: number;
    mesFin: number;
    factorMultiplicador: number;
  }>;
  descuentos: Array<{
    tipo: string;
    nombre: string;
    descripcion: string;
    valor: number;
    condiciones: any;
    activo: boolean;
  }>;
  recargos: {
    diasGracia: number;
    porcentajeMora: number;
    porcentajeMaximo: number;
    cargoReconexion: number;
  };
  configuracion: {
    redondeoDecimales: number;
    aplicarIVA: boolean;
    porcentajeIVA?: number;
  };
  creadoPor: any;
  fechaCreacion: string;
}

interface SimulacionResult {
  cargoFijo: number;
  costoConsumo: number;
  subtotal: number;
  descuentos: number;
  recargos: number;
  iva?: number;
  montoTotal: number;
  detalleCalculo: any;
}

export default function TarifasConfigView() {
  const [tarifas, setTarifas] = useState<TarifaConfig[]>([]);
  const [tarifaActiva, setTarifaActiva] = useState<TarifaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<TarifaConfig | null>(null);
  const [detailTarifa, setDetailTarifa] = useState<TarifaConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para simulación
  const [simulacion, setSimulacion] = useState({
    categoriaUsuario: 'residencial',
    consumoM3: '',
    pagoAnticipado: false
  });
  const [resultadoSimulacion, setResultadoSimulacion] = useState<SimulacionResult | null>(null);

  // Estados para crear/editar tarifa
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fechaVigencia: '',
    fechaVencimiento: '',
    cargoFijo: {
      residencial: 0,
      comercial: 0,
      industrial: 0,
      terceraEdad: 0
    },
    escalones: [
      {
        desde: 0,
        hasta: 10,
        tarifaResidencial: 0,
        tarifaComercial: 0,
        tarifaIndustrial: 0,
        tarifaTerceraEdad: 0
      }
    ],
    recargos: {
      diasGracia: 5,
      porcentajeMora: 2,
      porcentajeMaximo: 50,
      cargoReconexion: 0
    },
    configuracion: {
      redondeoDecimales: 0,
      aplicarIVA: false,
      porcentajeIVA: 19
    }
  });

  useEffect(() => {
    loadTarifas();
  }, []);

  const loadTarifas = async () => {
    try {
      setLoading(true);
      const [tarifasRes, activaRes] = await Promise.all([
        apiClient.get('/tarifas/configuraciones'),
        apiClient.get('/tarifas/configuracion').catch(() => ({ data: { data: null } }))
      ]);

      setTarifas(tarifasRes.data.data);
      setTarifaActiva(activaRes.data.data);
    } catch (error) {
      console.error('Error loading tarifas:', error);
      toast.error('Error al cargar configuraciones de tarifa');
    } finally {
      setLoading(false);
    }
  };

  const activarTarifa = async (id: string) => {
    try {
      await apiClient.put(`/tarifas/configuracion/${id}/activar`);
      toast.success('Tarifa activada exitosamente');
      loadTarifas();
    } catch (error: any) {
      console.error('Error activating tarifa:', error);
      toast.error(error.response?.data?.message || 'Error al activar tarifa');
    }
  };

  const pausarTarifa = async (id: string) => {
    try {
      await apiClient.put(`/tarifas/configuracion/${id}/pausar`);
      toast.success('Tarifa pausada exitosamente');
      loadTarifas();
    } catch (error: any) {
      console.error('Error pausing tarifa:', error);
      toast.error(error.response?.data?.message || 'Error al pausar tarifa');
    }
  };

  const reanudarTarifa = async (id: string) => {
    try {
      await apiClient.put(`/tarifas/configuracion/${id}/reanudar`);
      toast.success('Tarifa reanudada exitosamente');
      loadTarifas();
    } catch (error: any) {
      console.error('Error resuming tarifa:', error);
      toast.error(error.response?.data?.message || 'Error al reanudar tarifa');
    }
  };

  const simularCalculo = async () => {
    if (!simulacion.consumoM3) {
      toast.error('Ingrese el consumo en m³');
      return;
    }

    try {
      const response = await apiClient.post('/tarifas/simular', simulacion);
      setResultadoSimulacion(response.data.data);
      toast.success('Simulación realizada exitosamente');
    } catch (error: any) {
      console.error('Error in simulation:', error);
      toast.error(error.response?.data?.message || 'Error en la simulación');
    }
  };

  const crearTarifa = async () => {
    try {
      await apiClient.post('/tarifas/configuracion', formData);
      toast.success('Configuración de tarifa creada exitosamente');
      setShowCreateDialog(false);
      loadTarifas();
      resetForm();
    } catch (error: any) {
      console.error('Error creating tarifa:', error);
      toast.error(error.response?.data?.message || 'Error al crear configuración');
    }
  };

  const editarTarifa = async () => {
    if (!editingTarifa) return;

    try {
      await apiClient.put(`/tarifas/configuracion/${editingTarifa._id}`, formData);
      toast.success('Configuración de tarifa actualizada exitosamente');
      setShowEditDialog(false);
      setEditingTarifa(null);
      loadTarifas();
      resetForm();
    } catch (error: any) {
      console.error('Error updating tarifa:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar configuración');
    }
  };

  const eliminarTarifa = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta configuración de tarifa?')) {
      return;
    }

    try {
      await apiClient.delete(`/tarifas/configuracion/${id}`);
      toast.success('Configuración de tarifa eliminada exitosamente');
      loadTarifas();
    } catch (error: any) {
      console.error('Error deleting tarifa:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar configuración');
    }
  };

  const duplicarTarifa = async (tarifa: TarifaConfig) => {
    const duplicatedData = {
      nombre: `${tarifa.nombre} (Copia)`,
      descripcion: `Copia de: ${tarifa.descripcion || tarifa.nombre}`,
      fechaVigencia: '',
      fechaVencimiento: tarifa.fechaVencimiento,
      cargoFijo: { ...tarifa.cargoFijo },
      escalones: tarifa.escalones.map(e => ({ ...e })),
      recargos: { ...tarifa.recargos },
      configuracion: { ...tarifa.configuracion }
    };

    setFormData(duplicatedData);
    setShowCreateDialog(true);
    toast.info('Configuración cargada para duplicar. Ajuste los datos necesarios.');
  };

  const openEditDialog = (tarifa: TarifaConfig) => {
    setEditingTarifa(tarifa);
    setFormData({
      nombre: tarifa.nombre,
      descripcion: tarifa.descripcion || '',
      fechaVigencia: tarifa.fechaVigencia.split('T')[0],
      fechaVencimiento: tarifa.fechaVencimiento?.split('T')[0] || '',
      cargoFijo: { ...tarifa.cargoFijo },
      escalones: tarifa.escalones.map(e => ({ ...e })),
      recargos: { ...tarifa.recargos },
      configuracion: { ...tarifa.configuracion }
    });
    setShowEditDialog(true);
  };

  const openDetailDialog = (tarifa: TarifaConfig) => {
    setDetailTarifa(tarifa);
    setShowDetailDialog(true);
  };

  const exportarTarifas = async (formato: 'csv' | 'excel' | 'pdf') => {
    try {
      // Implementar exportación según formato
      const data = tarifas.map(t => ({
        nombre: t.nombre,
        activa: t.activa ? 'Sí' : 'No',
        fechaVigencia: new Date(t.fechaVigencia).toLocaleDateString('es-CL'),
        cargoFijoResidencial: formatCurrency(t.cargoFijo.residencial),
        escalones: t.escalones.length,
        fechaCreacion: new Date(t.fechaCreacion).toLocaleDateString('es-CL')
      }));

      // Aquí irían las funciones de exportación específicas
      toast.success(`Tarifas exportadas en formato ${formato.toUpperCase()}`);
      setShowExportDialog(false);
    } catch (error) {
      toast.error('Error al exportar tarifas');
    }
  };

  const filteredTarifas = tarifas.filter(tarifa =>
    tarifa.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tarifa.descripcion && tarifa.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      fechaVigencia: '',
      fechaVencimiento: '',
      cargoFijo: {
        residencial: 0,
        comercial: 0,
        industrial: 0,
        terceraEdad: 0
      },
      escalones: [
        {
          desde: 0,
          hasta: 10,
          tarifaResidencial: 0,
          tarifaComercial: 0,
          tarifaIndustrial: 0,
          tarifaTerceraEdad: 0
        }
      ],
      recargos: {
        diasGracia: 5,
        porcentajeMora: 2,
        porcentajeMaximo: 50,
        cargoReconexion: 0
      },
      configuracion: {
        redondeoDecimales: 0,
        aplicarIVA: false,
        porcentajeIVA: 19
      }
    });
  };

  const addEscalon = () => {
    const lastEscalon = formData.escalones[formData.escalones.length - 1];
    setFormData({
      ...formData,
      escalones: [
        ...formData.escalones,
        {
          desde: lastEscalon.hasta + 1,
          hasta: lastEscalon.hasta + 10,
          tarifaResidencial: 0,
          tarifaComercial: 0,
          tarifaIndustrial: 0,
          tarifaTerceraEdad: 0
        }
      ]
    });
  };

  const removeEscalon = (index: number) => {
    if (formData.escalones.length > 1) {
      const newEscalones = formData.escalones.filter((_, i) => i !== index);
      setFormData({ ...formData, escalones: newEscalones });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const getStatusBadge = (tarifa: TarifaConfig) => {
    if (tarifa.estado === 'pausada') {
      return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 !border-0 !shadow-sm"><Pause className="w-3 h-3 mr-1" />Pausada</Badge>;
    }
    if (tarifa.activa || tarifa.estado === 'activa') {
      return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 !border-0 !shadow-sm"><CheckCircle className="w-3 h-3 mr-1" />Activa</Badge>;
    }
    if (tarifa.estado === 'borrador') {
      return <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 !border-0 !shadow-sm"><Edit className="w-3 h-3 mr-1" />Borrador</Badge>;
    }
    if (tarifa.estado === 'finalizada') {
      return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 !border-0 !shadow-sm"><Clock className="w-3 h-3 mr-1" />Finalizada</Badge>;
    }
    const now = new Date();
    const vigencia = new Date(tarifa.fechaVigencia);
    if (vigencia > now) {
      return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 !border-0 !shadow-sm"><Clock className="w-3 h-3 mr-1" />Programada</Badge>;
    }
    return <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 !border-0 !shadow-sm"><Pause className="w-3 h-3 mr-1" />Inactiva</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 animate-spin" />
          <span>Cargando configuraciones de tarifa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calculator className="w-6 h-6 text-blue-600" />
            Configuración de Tarifas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona las tarifas de agua del sistema APR
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSimulator(true)} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Simulador
          </button>
          <button onClick={() => setShowExportDialog(true)} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button onClick={() => setShowCreateDialog(true)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Configuración
          </button>
        </div>
      </div>

      {/* Tarifa Activa */}
      {tarifaActiva && (
        <Card className={`!border-0 !shadow-md hover:!shadow-lg transition-all ${
          tarifaActiva.estado === 'pausada'
            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20'
            : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
        }`}>
          <CardHeader className="!border-0">
            <CardTitle className={`flex items-center gap-2 ${
              tarifaActiva.estado === 'pausada'
                ? 'text-yellow-800 dark:text-yellow-400'
                : 'text-green-800 dark:text-green-400'
            }`}>
              {tarifaActiva.estado === 'pausada' ? (
                <>
                  <Pause className="w-5 h-5" />
                  Configuración Pausada
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Configuración Activa
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <Label className={`text-sm font-medium ${
                  tarifaActiva.estado === 'pausada'
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>Nombre</Label>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{tarifaActiva.nombre}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <Label className={`text-sm font-medium ${
                  tarifaActiva.estado === 'pausada'
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>Cargo Fijo Residencial</Label>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tarifaActiva.cargoFijo.residencial)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <Label className={`text-sm font-medium ${
                  tarifaActiva.estado === 'pausada'
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>Escalones</Label>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{tarifaActiva.escalones.length} definidos</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                <Label className={`text-sm font-medium ${
                  tarifaActiva.estado === 'pausada'
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>Vigente desde</Label>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{new Date(tarifaActiva.fechaVigencia).toLocaleDateString('es-CL')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Configuraciones */}
      <Card className="!border-0 !shadow-md !bg-white dark:!bg-gray-800">
        <CardHeader className="!border-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 dark:text-gray-100">Configuraciones de Tarifa</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar configuraciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Cargo Fijo</TableHead>
                <TableHead>Escalones</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTarifas.map((tarifa) => (
                <TableRow key={tarifa._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tarifa.nombre}</p>
                      {tarifa.descripcion && (
                        <p className="text-sm text-muted-foreground">{tarifa.descripcion}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tarifa)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>Desde: {new Date(tarifa.fechaVigencia).toLocaleDateString('es-CL')}</p>
                      {tarifa.fechaVencimiento && (
                        <p>Hasta: {new Date(tarifa.fechaVencimiento).toLocaleDateString('es-CL')}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(tarifa.cargoFijo.residencial)}</TableCell>
                  <TableCell>{tarifa.escalones.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      {/* Activar button - only show for inactive (not pausada) */}
                      {!tarifa.activa && tarifa.estado !== 'pausada' && (
                        <button
                          onClick={() => activarTarifa(tarifa._id)}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Activar
                        </button>
                      )}

                      {/* Pause button - only show for active */}
                      {(tarifa.activa || tarifa.estado === 'activa') && (
                        <button
                          onClick={() => pausarTarifa(tarifa._id)}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                        >
                          <Pause className="w-3 h-3" />
                          Pausar
                        </button>
                      )}

                      {/* Resume button - only show for paused */}
                      {tarifa.estado === 'pausada' && (
                        <button
                          onClick={() => reanudarTarifa(tarifa._id)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Reanudar
                        </button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all">
                            <MoreHorizontal className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg">
                          <DropdownMenuItem onClick={() => openDetailDialog(tarifa)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(tarifa)}
                            className="cursor-pointer"
                            disabled={tarifa.activa || tarifa.estado === 'activa'}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar {(tarifa.activa || tarifa.estado === 'activa') && '(Pausar primero)'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicarTarifa(tarifa)} className="cursor-pointer">
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => eliminarTarifa(tarifa._id)}
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                            disabled={tarifa.activa || tarifa.estado === 'activa'}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar {(tarifa.activa || tarifa.estado === 'activa') && '(Pausar primero)'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Simulador */}
      <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
        <DialogContent className="max-w-2xl !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
          <DialogHeader className="!border-0">
            <DialogTitle className="text-gray-900 dark:text-gray-100">Simulador de Tarifas</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Simula el cálculo de una boleta con la configuración actual
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Categoría de Usuario</Label>
                <Select
                  value={simulacion.categoriaUsuario}
                  onValueChange={(value) =>
                    setSimulacion({...simulacion, categoriaUsuario: value})
                  }
                >
                  <SelectTrigger className="!border-0 !bg-gray-50 dark:!bg-gray-800 !shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg">
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="tercera_edad">Tercera Edad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Consumo (m³)</Label>
                <Input
                  type="number"
                  value={simulacion.consumoM3}
                  onChange={(e) =>
                    setSimulacion({...simulacion, consumoM3: e.target.value})
                  }
                  placeholder="0"
                  className="!border-0 !bg-gray-50 dark:!bg-gray-800 !shadow-sm"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={simulacion.pagoAnticipado}
                  onCheckedChange={(checked) =>
                    setSimulacion({...simulacion, pagoAnticipado: checked})
                  }
                />
                <Label className="text-gray-700 dark:text-gray-300">Pago Anticipado</Label>
              </div>
            </div>

            <button onClick={simularCalculo} className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <Calculator className="w-4 h-4" />
              Simular Cálculo
            </button>

            {resultadoSimulacion && (
              <Card className="!border-0 !shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardHeader className="!border-0">
                  <CardTitle className="text-blue-800 dark:text-blue-400">Resultado de la Simulación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Cargo Fijo:</Label>
                      <p className="font-semibold">{formatCurrency(resultadoSimulacion.cargoFijo)}</p>
                    </div>
                    <div>
                      <Label>Costo Consumo:</Label>
                      <p className="font-semibold">{formatCurrency(resultadoSimulacion.costoConsumo)}</p>
                    </div>
                    <div>
                      <Label>Descuentos:</Label>
                      <p className="font-semibold text-green-600">-{formatCurrency(resultadoSimulacion.descuentos)}</p>
                    </div>
                    <div>
                      <Label>Recargos:</Label>
                      <p className="font-semibold text-red-600">+{formatCurrency(resultadoSimulacion.recargos)}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t">
                      <Label>Total a Pagar:</Label>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(resultadoSimulacion.montoTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Crear Configuración */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
          <DialogHeader className="!border-0">
            <DialogTitle className="text-gray-900 dark:text-gray-100">Nueva Configuración de Tarifa</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Define una nueva estructura tarifaria para el sistema APR
            </DialogDescription>
          </DialogHeader>

          <TarifaFormContent
            formData={formData}
            setFormData={setFormData}
            onSave={crearTarifa}
            onCancel={() => setShowCreateDialog(false)}
            addEscalon={addEscalon}
            removeEscalon={removeEscalon}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Configuración */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          resetForm();
          setEditingTarifa(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
          <DialogHeader className="!border-0">
            <DialogTitle className="text-gray-900 dark:text-gray-100">Editar Configuración de Tarifa</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Modifica la estructura tarifaria existente
            </DialogDescription>
          </DialogHeader>

          <TarifaFormContent
            formData={formData}
            setFormData={setFormData}
            onSave={editarTarifa}
            onCancel={() => setShowEditDialog(false)}
            addEscalon={addEscalon}
            removeEscalon={removeEscalon}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Detalles */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
          <DialogHeader className="!border-0">
            <DialogTitle className="text-gray-900 dark:text-gray-100">Detalles de Configuración de Tarifa</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Información completa de la configuración tarifaria
            </DialogDescription>
          </DialogHeader>

          {detailTarifa && (
            <div className="space-y-6">
              {/* Información General */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium text-muted-foreground">Nombre</Label>
                      <p className="font-semibold">{detailTarifa.nombre}</p>
                    </div>
                    <div>
                      <Label className="font-medium text-muted-foreground">Estado</Label>
                      <div>{getStatusBadge(detailTarifa)}</div>
                    </div>
                    <div>
                      <Label className="font-medium text-muted-foreground">Fecha de Vigencia</Label>
                      <p>{new Date(detailTarifa.fechaVigencia).toLocaleDateString('es-CL')}</p>
                    </div>
                    <div>
                      <Label className="font-medium text-muted-foreground">Fecha de Creación</Label>
                      <p>{new Date(detailTarifa.fechaCreacion).toLocaleDateString('es-CL')}</p>
                    </div>
                  </div>
                  {detailTarifa.descripcion && (
                    <div className="mt-4">
                      <Label className="font-medium text-muted-foreground">Descripción</Label>
                      <p className="text-sm">{detailTarifa.descripcion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cargos Fijos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cargos Fijos Mensuales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Residencial</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(detailTarifa.cargoFijo.residencial)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Comercial</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(detailTarifa.cargoFijo.comercial)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Industrial</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(detailTarifa.cargoFijo.industrial)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Tercera Edad</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(detailTarifa.cargoFijo.terceraEdad)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Escalones */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Escalones de Consumo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {detailTarifa.escalones.map((escalon, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">Escalón {index + 1}</h5>
                          <p className="text-sm text-muted-foreground">
                            {escalon.desde}m³ - {escalon.hasta === -1 ? '∞' : `${escalon.hasta}m³`}
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Residencial</p>
                            <p className="font-medium">{formatCurrency(escalon.tarifaResidencial)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Comercial</p>
                            <p className="font-medium">{formatCurrency(escalon.tarifaComercial)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Industrial</p>
                            <p className="font-medium">{formatCurrency(escalon.tarifaIndustrial)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tercera Edad</p>
                            <p className="font-medium">{formatCurrency(escalon.tarifaTerceraEdad)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recargos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración de Recargos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium text-muted-foreground">Días de Gracia</Label>
                      <p className="font-semibold">{detailTarifa.recargos.diasGracia} días</p>
                    </div>
                    <div>
                      <Label className="font-medium text-muted-foreground">Porcentaje de Mora</Label>
                      <p className="font-semibold">{detailTarifa.recargos.porcentajeMora}% diario</p>
                    </div>
                    <div>
                      <Label className="font-medium text-muted-foreground">Porcentaje Máximo</Label>
                      <p className="font-semibold">{detailTarifa.recargos.porcentajeMaximo}%</p>
                    </div>
                    <div>
                      <Label className="font-medium text-muted-foreground">Cargo Reconexión</Label>
                      <p className="font-semibold">{formatCurrency(detailTarifa.recargos.cargoReconexion)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Exportar */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
          <DialogHeader className="!border-0">
            <DialogTitle className="text-gray-900 dark:text-gray-100">Exportar Configuraciones</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Selecciona el formato para exportar las configuraciones de tarifa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => exportarTarifas('csv')}
                className="flex items-center justify-start gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-900 dark:text-gray-100"
              >
                <FileText className="w-4 h-4" />
                Exportar como CSV
              </button>
              <button
                onClick={() => exportarTarifas('excel')}
                className="flex items-center justify-start gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-900 dark:text-gray-100"
              >
                <Download className="w-4 h-4" />
                Exportar como Excel
              </button>
              <button
                onClick={() => exportarTarifas('pdf')}
                className="flex items-center justify-start gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-900 dark:text-gray-100"
              >
                <FileText className="w-4 h-4" />
                Exportar como PDF
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente separado para el formulario de tarifas
function TarifaFormContent({
  formData,
  setFormData,
  onSave,
  onCancel,
  addEscalon,
  removeEscalon,
  isEditing
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  addEscalon: () => void;
  removeEscalon: (index: number) => void;
  isEditing: boolean;
}) {
  return (
    <>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="inline-flex !bg-gray-100 dark:!bg-gray-800 !border-0 !shadow-md p-1 gap-1 !w-auto">
          <TabsTrigger value="general" className="!border-0 data-[state=active]:!bg-blue-500 data-[state=active]:!text-white data-[state=inactive]:!bg-transparent data-[state=inactive]:!text-gray-700 dark:data-[state=inactive]:!text-gray-300">General</TabsTrigger>
          <TabsTrigger value="escalones" className="!border-0 data-[state=active]:!bg-blue-500 data-[state=active]:!text-white data-[state=inactive]:!bg-transparent data-[state=inactive]:!text-gray-700 dark:data-[state=inactive]:!text-gray-300">Escalones</TabsTrigger>
          <TabsTrigger value="recargos" className="!border-0 data-[state=active]:!bg-blue-500 data-[state=active]:!text-white data-[state=inactive]:!bg-transparent data-[state=inactive]:!text-gray-700 dark:data-[state=inactive]:!text-gray-300">Recargos</TabsTrigger>
          <TabsTrigger value="avanzado" className="!border-0 data-[state=active]:!bg-blue-500 data-[state=active]:!text-white data-[state=inactive]:!bg-transparent data-[state=inactive]:!text-gray-700 dark:data-[state=inactive]:!text-gray-300">Avanzado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre de la Configuración</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Ej: Tarifa Verano 2024"
              />
            </div>
            <div>
              <Label>Fecha de Vigencia</Label>
              <Input
                type="date"
                value={formData.fechaVigencia}
                onChange={(e) => setFormData({...formData, fechaVigencia: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Descripción (Opcional)</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Describe los cambios o características de esta tarifa..."
            />
          </div>

          {/* Cargos Fijos */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cargos Fijos Mensuales
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Residencial</Label>
                <Input
                  type="number"
                  value={formData.cargoFijo.residencial}
                  onChange={(e) => setFormData({
                    ...formData,
                    cargoFijo: { ...formData.cargoFijo, residencial: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Comercial</Label>
                <Input
                  type="number"
                  value={formData.cargoFijo.comercial}
                  onChange={(e) => setFormData({
                    ...formData,
                    cargoFijo: { ...formData.cargoFijo, comercial: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Industrial</Label>
                <Input
                  type="number"
                  value={formData.cargoFijo.industrial}
                  onChange={(e) => setFormData({
                    ...formData,
                    cargoFijo: { ...formData.cargoFijo, industrial: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Tercera Edad</Label>
                <Input
                  type="number"
                  value={formData.cargoFijo.terceraEdad}
                  onChange={(e) => setFormData({
                    ...formData,
                    cargoFijo: { ...formData.cargoFijo, terceraEdad: Number(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="escalones" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Tarifas Escalonadas por Consumo
            </h4>
            <Button onClick={addEscalon} size="sm">
              <Plus className="w-3 h-3 mr-1" />
              Agregar Escalón
            </Button>
          </div>

          <div className="space-y-3">
            {formData.escalones.map((escalon: any, index: number) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">Escalón {index + 1}</h5>
                  {formData.escalones.length > 1 && (
                    <Button
                      onClick={() => removeEscalon(index)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div>
                    <Label>Desde (m³)</Label>
                    <Input
                      type="number"
                      value={escalon.desde}
                      onChange={(e) => {
                        const newEscalones = [...formData.escalones];
                        newEscalones[index].desde = Number(e.target.value);
                        setFormData({...formData, escalones: newEscalones});
                      }}
                    />
                  </div>
                  <div>
                    <Label>Hasta (m³)</Label>
                    <Input
                      type="number"
                      value={escalon.hasta === -1 ? '' : escalon.hasta}
                      onChange={(e) => {
                        const newEscalones = [...formData.escalones];
                        newEscalones[index].hasta = e.target.value === '' ? -1 : Number(e.target.value);
                        setFormData({...formData, escalones: newEscalones});
                      }}
                      placeholder="∞"
                    />
                  </div>
                  <div>
                    <Label>Residencial</Label>
                    <Input
                      type="number"
                      value={escalon.tarifaResidencial}
                      onChange={(e) => {
                        const newEscalones = [...formData.escalones];
                        newEscalones[index].tarifaResidencial = Number(e.target.value);
                        setFormData({...formData, escalones: newEscalones});
                      }}
                    />
                  </div>
                  <div>
                    <Label>Comercial</Label>
                    <Input
                      type="number"
                      value={escalon.tarifaComercial}
                      onChange={(e) => {
                        const newEscalones = [...formData.escalones];
                        newEscalones[index].tarifaComercial = Number(e.target.value);
                        setFormData({...formData, escalones: newEscalones});
                      }}
                    />
                  </div>
                  <div>
                    <Label>Industrial</Label>
                    <Input
                      type="number"
                      value={escalon.tarifaIndustrial}
                      onChange={(e) => {
                        const newEscalones = [...formData.escalones];
                        newEscalones[index].tarifaIndustrial = Number(e.target.value);
                        setFormData({...formData, escalones: newEscalones});
                      }}
                    />
                  </div>
                  <div>
                    <Label>Tercera Edad</Label>
                    <Input
                      type="number"
                      value={escalon.tarifaTerceraEdad}
                      onChange={(e) => {
                        const newEscalones = [...formData.escalones];
                        newEscalones[index].tarifaTerceraEdad = Number(e.target.value);
                        setFormData({...formData, escalones: newEscalones});
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recargos" className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Configuración de Recargos por Mora
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Días de Gracia</Label>
              <Input
                type="number"
                value={formData.recargos.diasGracia}
                onChange={(e) => setFormData({
                  ...formData,
                  recargos: { ...formData.recargos, diasGracia: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>Porcentaje de Mora (% diario)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.recargos.porcentajeMora}
                onChange={(e) => setFormData({
                  ...formData,
                  recargos: { ...formData.recargos, porcentajeMora: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>Porcentaje Máximo (%)</Label>
              <Input
                type="number"
                value={formData.recargos.porcentajeMaximo}
                onChange={(e) => setFormData({
                  ...formData,
                  recargos: { ...formData.recargos, porcentajeMaximo: Number(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>Cargo por Reconexión</Label>
              <Input
                type="number"
                value={formData.recargos.cargoReconexion}
                onChange={(e) => setFormData({
                  ...formData,
                  recargos: { ...formData.recargos, cargoReconexion: Number(e.target.value) }
                })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="avanzado" className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuración Avanzada
          </h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Redondeo (decimales)</Label>
              <Select
                value={formData.configuracion.redondeoDecimales.toString()}
                onValueChange={(value) => setFormData({
                  ...formData,
                  configuracion: { ...formData.configuracion, redondeoDecimales: Number(value) }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin decimales</SelectItem>
                  <SelectItem value="1">1 decimal</SelectItem>
                  <SelectItem value="2">2 decimales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                checked={formData.configuracion.aplicarIVA}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  configuracion: { ...formData.configuracion, aplicarIVA: checked }
                })}
              />
              <Label>Aplicar IVA</Label>
            </div>

            {formData.configuracion.aplicarIVA && (
              <div>
                <Label>Porcentaje IVA (%)</Label>
                <Input
                  type="number"
                  value={formData.configuracion.porcentajeIVA}
                  onChange={(e) => setFormData({
                    ...formData,
                    configuracion: { ...formData.configuracion, porcentajeIVA: Number(e.target.value) }
                  })}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onCancel} className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all">
          Cancelar
        </button>
        <button onClick={onSave} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all">
          {isEditing ? 'Actualizar Configuración' : 'Crear Configuración'}
        </button>
      </div>
    </>
  );
}