import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Receipt,
  Plus,
  Send,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Check,
  X,
  Calendar,
  User,
  DollarSign,
  Menu,
  Filter,
  Archive,
  FolderArchive
} from 'lucide-react';
import { toast } from 'sonner';

interface Socio {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono: string;
  activo: boolean;
}

interface Boleta {
  _id: string;
  numeroBoleta: string;
  socioId: {
    _id: string;
    nombres: string;
    apellidos: string;
    rut: string;
  };
  fechaEmision: string;
  fechaVencimiento: string;
  consumoM3: number;
  montoTotal: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada' | 'archivada';
  periodo: string;
  lecturaAnterior: number;
  lecturaActual: number;
  detalle: {
    tarifaM3: number;
    cargoFijo: number;
    otrosCargos: number;
    descuentos: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const BoletaManagement: React.FC = () => {
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  const [boletasArchivadas, setBoletasArchivadas] = useState<Boleta[]>([]);
  const [activeTab, setActiveTab] = useState<'activas' | 'archivadas'>('activas');
  const [socios, setSocios] = useState<Socio[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Menú hamburguesa
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Archive confirmation dialog
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [boletaToArchive, setBoletaToArchive] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    estado: 'all',
    search: '',
    periodo: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Create boleta form
  const [createForm, setCreateForm] = useState({
    socioId: '',
    lecturaAnterior: '',
    lecturaActual: '',
    periodo: '',
    fechaVencimiento: '',
    sendNotifications: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoadingSocios, setIsLoadingSocios] = useState(false);
  const [tarifaActiva, setTarifaActiva] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'activas') {
      loadBoletas();
    } else {
      loadBoletasArchivadas();
    }
    loadSocios();
    loadTarifaActiva();
  }, [pagination.page, filters, activeTab]);

  const loadTarifaActiva = async () => {
    try {
      const response = await fetch('/api/tarifas/configuracion', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setTarifaActiva(data.data);
          console.log('✅ Tarifa activa cargada:', data.data);
        } else {
          console.warn('⚠️ No hay tarifa activa configurada');
          toast.warning("No hay configuración de tarifas activa");
        }
      } else {
        console.error('❌ Error al cargar tarifa activa:', response.status);
      }
    } catch (error) {
      console.error('❌ Error al cargar tarifa activa:', error);
    }
  };

  const loadBoletas = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.estado !== 'all' && { estado: filters.estado }),
        ...(filters.search && { search: filters.search }),
        ...(filters.periodo && { periodo: filters.periodo }),
        ...(filters.fechaDesde && { fechaDesde: filters.fechaDesde }),
        ...(filters.fechaHasta && { fechaHasta: filters.fechaHasta })
      });

      const response = await fetch(`/api/boletas/admin/all?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBoletas(data.data.boletas);
        setPagination(data.data.pagination);
      } else {
        toast.error("Error al cargar boletas");
      }
    } catch (error) {
      toast.error("Error de conexión al cargar boletas");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSocios = async () => {
    try {
      setIsLoadingSocios(true);
      const response = await fetch('/api/admin/socios?limit=1000', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Filtrar solo socios activos y con datos completos
        const sociosActivos = data.data.socios.filter((socio: Socio) => 
          socio.activo && socio.nombres && socio.apellidos
        );
        setSocios(sociosActivos);
        console.log(`Cargados ${sociosActivos.length} socios activos:`, sociosActivos.map(s => s.nombres + ' ' + s.apellidos));
      } else {
        console.error('Error response:', response.status, response.statusText);
        toast.error("Error al cargar la lista de socios");
      }
    } catch (error) {
      console.error('Error loading socios:', error);
      toast.error("Error de conexión al cargar socios");
    } finally {
      setIsLoadingSocios(false);
    }
  };

  const createBoleta = async () => {
    // Verificar que exista una tarifa activa
    if (!tarifaActiva) {
      toast.error("No hay configuración de tarifas activa. Configure las tarifas primero.");
      return;
    }

    // Validate each field individually with specific messages
    if (!createForm.socioId || createForm.socioId.trim() === '') {
      toast.error("Debe seleccionar un socio");
      return;
    }

    if (!createForm.lecturaAnterior || createForm.lecturaAnterior.trim() === '') {
      toast.error("Debe ingresar la lectura anterior");
      return;
    }

    if (!createForm.lecturaActual || createForm.lecturaActual.trim() === '') {
      toast.error("Debe ingresar la lectura actual");
      return;
    }

    if (!createForm.periodo || createForm.periodo.trim() === '') {
      toast.error("Debe ingresar el período");
      return;
    }

    if (!createForm.fechaVencimiento || createForm.fechaVencimiento.trim() === '') {
      toast.error("Debe ingresar la fecha de vencimiento");
      return;
    }

    if (parseFloat(createForm.lecturaActual) < parseFloat(createForm.lecturaAnterior)) {
      toast.error("La lectura actual no puede ser menor que la anterior");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/boletas/admin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          socioId: createForm.socioId,
          lecturaAnterior: parseFloat(createForm.lecturaAnterior),
          lecturaActual: parseFloat(createForm.lecturaActual),
          periodo: createForm.periodo,
          fechaVencimiento: createForm.fechaVencimiento,
          sendNotifications: createForm.sendNotifications
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Boleta creada exitosamente");
        setIsCreateModalOpen(false);
        resetCreateForm();
        loadBoletas();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al crear boleta");
      }
    } catch (error) {
      toast.error("Error de conexión al crear boleta");
    } finally {
      setIsCreating(false);
    }
  };

  const updateBoletaStatus = async (boletaId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/boletas/admin/${boletaId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ estado: newStatus })
      });

      if (response.ok) {
        toast.success("Estado actualizado correctamente");
        loadBoletas();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error de conexión al actualizar estado");
    }
  };

  const resendNotifications = async (boletaId: string) => {
    try {
      const response = await fetch(`/api/boletas/admin/${boletaId}/resend-notifications`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success("Notificaciones enviadas correctamente");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al enviar notificaciones");
      }
    } catch (error) {
      toast.error("Error de conexión al enviar notificaciones");
    }
  };

  const handleArchiveClick = (boletaId: string) => {
    setBoletaToArchive(boletaId);
    setArchiveDialogOpen(true);
  };

  const archiveBoleta = async () => {
    if (!boletaToArchive) return;

    try {
      const response = await fetch(`/api/boletas/admin/${boletaToArchive}/archive`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success("Boleta archivada correctamente");
        if (activeTab === 'activas') {
          loadBoletas();
        } else {
          loadBoletasArchivadas();
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al archivar boleta");
      }
    } catch (error) {
      toast.error("Error de conexión al archivar boleta");
    } finally {
      setArchiveDialogOpen(false);
      setBoletaToArchive(null);
    }
  };

  const loadBoletasArchivadas = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.periodo && { periodo: filters.periodo })
      });

      const response = await fetch(`/api/boletas/admin/archived?${queryParams}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBoletasArchivadas(data.data);
        setPagination(data.pagination);
      } else {
        toast.error("Error al cargar boletas archivadas");
      }
    } catch (error) {
      toast.error("Error de conexión al cargar boletas archivadas");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      socioId: '',
      lecturaAnterior: '',
      lecturaActual: '',
      periodo: '',
      fechaVencimiento: '',
      sendNotifications: true
    });
  };

  const getStatusBadge = (estado: string) => {
    const statusConfig = {
      pendiente: { variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
      pagada: { variant: 'default' as const, color: 'bg-green-100 text-green-800', label: 'Pagada' },
      vencida: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', label: 'Vencida' },
      anulada: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800', label: 'Anulada' },
      archivada: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-600', label: 'Archivada' }
    };

    const config = statusConfig[estado as keyof typeof statusConfig];

    // Si no existe el estado, usar un valor por defecto
    if (!config) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          {estado || 'Sin estado'}
        </Badge>
      );
    }

    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadBoletas();
  };

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Generate current month period
  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  };

  // Calculate default due date (30 days from now)
  const getDefaultDueDate = () => {
    const now = new Date();
    now.setDate(now.getDate() + 30);
    return now.toISOString().split('T')[0];
  };

  // Determinar qué boletas mostrar según la pestaña activa
  const boletasToShow = activeTab === 'activas' ? boletas : boletasArchivadas;

  return (
    <div className="space-y-6">
      {/* Overlay del menú */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menú lateral desplegable desde la derecha */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header del menú */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Opciones</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Opciones del menú */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Crear Nueva Boleta */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <button
                  onClick={() => {
                    resetCreateForm();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Crear Nueva Boleta</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl !bg-white dark:!bg-gray-900 !border-0 !shadow-2xl !rounded-2xl">
                <DialogHeader className="!border-0">
                  <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">Crear Nueva Boleta</DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-400">
                    Complete los datos para generar una nueva boleta. Se enviarán notificaciones automáticamente si está habilitado.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="socio" className="text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar socio ({socios.length} disponibles)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={loadSocios}
                        disabled={isLoadingSocios}
                        className="h-6 px-2 text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingSocios ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <Select
                      value={createForm.socioId}
                      onValueChange={(value) => setCreateForm(prev => ({ ...prev, socioId: value }))}
                      disabled={isLoadingSocios}
                    >
                      <SelectTrigger className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg">
                        <SelectValue placeholder={
                          isLoadingSocios
                            ? "Cargando socios..."
                            : socios.length === 0
                              ? "No hay socios disponibles"
                              : `Seleccionar socio (${socios.length} disponibles)`
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {socios.length === 0 && !isLoadingSocios ? (
                          <div className="px-2 py-2 text-sm text-gray-500">
                            No hay socios activos disponibles
                          </div>
                        ) : (
                          socios.map(socio => (
                            <SelectItem key={socio.id} value={socio.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {socio.nombres} {socio.apellidos}
                                </span>
                                <span className="text-xs text-gray-500">
                                  RUT: {socio.rut} {socio.telefono && `• Tel: ${socio.telefono}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {socios.length === 0 && !isLoadingSocios && (
                      <p className="text-xs text-amber-600">
                        ⚠️ No se encontraron socios activos. Verifique que haya usuarios con rol "socio" activos en el sistema.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 dark:text-gray-300">YYYY-MM (ej: 2025-01)</Label>
                    <Input
                      id="periodo"
                      placeholder="YYYY-MM (ej: 2025-01)"
                      value={createForm.periodo}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, periodo: e.target.value }))}
                      onFocus={(e) => {
                        if (!e.target.value) {
                          setCreateForm(prev => ({ ...prev, periodo: getCurrentPeriod() }));
                        }
                      }}
                      className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lecturaAnterior" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      Lectura Anterior del Medidor (m³)
                    </Label>
                    <Input
                      id="lecturaAnterior"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ingrese la lectura anterior del medidor"
                      value={createForm.lecturaAnterior}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, lecturaAnterior: e.target.value }))}
                      className="!border-2 !border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-800 !shadow-sm hover:!shadow-md transition-all !rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lecturaActual" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-red-500">*</span>
                      Lectura Actual del Medidor (m³)
                    </Label>
                    <Input
                      id="lecturaActual"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ingrese la lectura actual del medidor"
                      value={createForm.lecturaActual}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, lecturaActual: e.target.value }))}
                      className="!border-2 !border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-800 !shadow-sm hover:!shadow-md transition-all !rounded-lg"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 p-4 !bg-blue-50 dark:!bg-blue-900/20 !border-0 !rounded-xl !shadow-sm">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                        ℹ
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-blue-900 mb-1">Cálculo Automático de Tarifas</p>
                        <p className="text-blue-700">
                          Los montos se calcularán automáticamente usando la configuración de tarifas activa.
                          Incluye cargo fijo, consumo escalonado, descuentos y recargos según corresponda.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="fechaVencimiento" className="text-sm font-medium text-gray-700 dark:text-gray-300">dd/mm/aaaa</Label>
                    <Input
                      id="fechaVencimiento"
                      type="date"
                      value={createForm.fechaVencimiento}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                      onFocus={(e) => {
                        if (!e.target.value) {
                          setCreateForm(prev => ({ ...prev, fechaVencimiento: getDefaultDueDate() }));
                        }
                      }}
                      className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sendNotifications"
                        checked={createForm.sendNotifications}
                        onCheckedChange={(checked) => 
                          setCreateForm(prev => ({ ...prev, sendNotifications: checked as boolean }))
                        }
                      />
                      <Label htmlFor="sendNotifications" className="text-sm">
                        Enviar notificaciones automáticas (SMS)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 !border-t-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={createBoleta}
                    disabled={isCreating}
                    className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                  >
                    {isCreating ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Creando...</>
                    ) : (
                      <><Plus className="h-4 w-4" /> Crear Boleta</>
                    )}
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Buscador */}
            <button
              onClick={() => {
                setSearchModalOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Buscar Boletas</span>
            </button>

            {/* Filtros por Estado */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                <Filter className="w-4 h-4 inline mr-1" />
                Filtrar por Estado
              </label>
              <div className="space-y-2">
                {['all', 'pendiente', 'pagada', 'vencida', 'anulada'].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => {
                      setFilters(prev => ({ ...prev, estado }));
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                      filters.estado === estado
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {estado === 'all' ? 'Todos' : estado.charAt(0).toUpperCase() + estado.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Búsqueda */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="max-w-2xl !bg-white dark:!bg-gray-900 !border-0 !shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Search className="w-5 h-5 text-blue-500" />
              Buscar Boletas
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Busque boletas por nombre del socio, RUT, email o número de boleta
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSearch(e); setSearchModalOpen(false); }} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="modal-search" className="text-sm font-medium text-gray-700 dark:text-gray-300">Búsqueda</Label>
              <Input
                id="modal-search"
                placeholder="Buscar por nombre, RUT, email o número..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="modal-periodo" className="text-sm font-medium text-gray-700 dark:text-gray-300">Período (YYYY-MM)</Label>
              <Input
                id="modal-periodo"
                placeholder="YYYY-MM"
                value={filters.periodo}
                onChange={(e) => setFilters(prev => ({ ...prev, periodo: e.target.value }))}
                className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <Card className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg hover:!shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              <span className="text-gray-800 dark:text-gray-100">Gestión de Boletas ({pagination.total})</span>
            </div>

            {/* Botón hamburguesa - Solo en móvil */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Botón Crear Nueva Boleta - Solo en desktop */}
            <button
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(true);
              }}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Crear Nueva Boleta</span>
            </button>
          </CardTitle>

          {/* Pestañas - Boletas Activas vs Históricas */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={activeTab === 'activas' ? 'default' : 'ghost'}
              onClick={() => {
                setActiveTab('activas');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`flex items-center gap-2 ${activeTab === 'activas' ? 'bg-blue-500 hover:bg-blue-600 text-white border-0' : ''}`}
            >
              <Receipt className="h-4 w-4" />
              Boletas Activas
              <Badge variant="secondary" className="ml-1">{activeTab === 'activas' ? pagination.total : boletas.length}</Badge>
            </Button>
            <Button
              variant={activeTab === 'archivadas' ? 'default' : 'ghost'}
              onClick={() => {
                setActiveTab('archivadas');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`flex items-center gap-2 ${activeTab === 'archivadas' ? 'bg-blue-500 hover:bg-blue-600 text-white border-0' : ''}`}
            >
              <FolderArchive className="h-4 w-4" />
              Históricas
              <Badge variant="secondary" className="ml-1">{activeTab === 'archivadas' ? pagination.total : boletasArchivadas.length}</Badge>
            </Button>
          </div>
        </CardHeader>

        {/* Filters - Visibles solo en desktop */}
        <CardContent className="space-y-4 hidden lg:block">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar por nombre, RUT, email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="estado" className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</Label>
              <Select
                value={filters.estado}
                onValueChange={(value) => setFilters(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg">
                  <SelectItem value="all" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Todos</SelectItem>
                  <SelectItem value="pendiente" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Pendiente</SelectItem>
                  <SelectItem value="pagada" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Pagada</SelectItem>
                  <SelectItem value="vencida" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Vencida</SelectItem>
                  <SelectItem value="anulada" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 dark:text-gray-300">Período</Label>
              <Input
                id="periodo"
                placeholder="YYYY-MM"
                value={filters.periodo}
                onChange={(e) => setFilters(prev => ({ ...prev, periodo: e.target.value }))}
                className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg mt-1.5"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Boletas List */}
      <Card className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Cargando boletas...</span>
            </div>
          ) : boletas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron boletas
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Móvil */}
              <div className="lg:hidden p-4 space-y-4">
                {boletasToShow.map((boleta) => (
                  <Card key={boleta._id} className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-gray-50 dark:!bg-gray-700">
                    <CardContent className="p-4">
                      {/* Header de la tarjeta */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Receipt className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {boleta.numeroBoleta}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Período: {boleta.periodo}
                          </div>
                        </div>
                        {getStatusBadge(boleta.estado)}
                      </div>

                      {/* Información del Socio */}
                      <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {boleta.socioId?.nombres || 'N/A'} {boleta.socioId?.apellidos || ''}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                          RUT: {boleta.socioId?.rut || 'N/A'}
                        </div>
                      </div>

                      {/* Detalles de Consumo y Monto */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Consumo</div>
                          <div className="font-semibold text-blue-700 dark:text-blue-400">
                            {boleta.consumoM3} m³
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monto Total</div>
                          <div className="font-semibold text-green-700 dark:text-green-400">
                            ${boleta.montoTotal.toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>

                      {/* Vencimiento */}
                      <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Vencimiento</div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {new Date(boleta.fechaVencimiento).toLocaleDateString('es-CL')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Cambiar Estado</label>
                          <Select
                            value={boleta.estado}
                            onValueChange={(value) => updateBoletaStatus(boleta._id, value)}
                            disabled={boleta.estado === 'pagada'}
                          >
                            <SelectTrigger className="w-full !border-0 !bg-white dark:!bg-gray-800 !shadow-sm hover:!shadow-md transition-all !rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg">
                              <SelectItem value="pendiente" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Pendiente</SelectItem>
                              <SelectItem value="pagada" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Pagada</SelectItem>
                              <SelectItem value="vencida" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Vencida</SelectItem>
                              <SelectItem value="anulada" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Anulada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          onClick={() => resendNotifications(boleta._id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
                        >
                          <Send className="h-4 w-4" />
                          Reenviar Notificaciones
                        </button>

                        {activeTab === 'activas' && ['vencida', 'pagada', 'anulada'].includes(boleta.estado) && (
                          <button
                            onClick={() => handleArchiveClick(boleta._id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
                          >
                            <Archive className="h-4 w-4" />
                            Archivar Boleta
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vista de Tabla para Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Boleta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Socio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Consumo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Vencimiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Opciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {boletasToShow.map((boleta) => (
                      <tr key={boleta._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {boleta.numeroBoleta}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {boleta.socioId?.nombres || 'N/A'} {boleta.socioId?.apellidos || ''}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {boleta.socioId?.rut || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {boleta.periodo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {boleta.consumoM3} m³
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          ${boleta.montoTotal.toLocaleString('es-CL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(boleta.estado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(boleta.fechaVencimiento).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center gap-2 justify-end">
                            <Select
                              value={boleta.estado}
                              onValueChange={(value) => updateBoletaStatus(boleta._id, value)}
                              disabled={boleta.estado === 'pagada'}
                            >
                              <SelectTrigger className="w-32 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg">
                                <SelectItem value="pendiente" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Pendiente</SelectItem>
                                <SelectItem value="pagada" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Pagada</SelectItem>
                                <SelectItem value="vencida" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Vencida</SelectItem>
                                <SelectItem value="anulada" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">Anulada</SelectItem>
                              </SelectContent>
                            </Select>

                            <button
                              onClick={() => resendNotifications(boleta._id)}
                              title="Reenviar notificaciones"
                              className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                            >
                              <Send className="h-4 w-4" />
                            </button>

                            {activeTab === 'activas' && ['vencida', 'pagada', 'anulada'].includes(boleta.estado) && (
                              <button
                                onClick={() => handleArchiveClick(boleta._id)}
                                title="Archivar boleta"
                                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <>
              <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Página {pagination.page} de {pagination.pages} ({pagination.total} boletas)
                  </div>
                  <Select
                    value={pagination.limit.toString()}
                    onValueChange={(value) => {
                      setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-24 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="!bg-white dark:!bg-gray-800 !border-0 !shadow-lg !rounded-lg">
                      <SelectItem value="5" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">5 / pág</SelectItem>
                      <SelectItem value="10" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">10 / pág</SelectItem>
                      <SelectItem value="15" className="!bg-white dark:!bg-gray-800 hover:!bg-gray-50 dark:hover:!bg-gray-700 !rounded-md">15 / pág</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alert Dialog para confirmar archivo */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="!bg-white dark:!bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              ¿Archivar esta boleta?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              La boleta se moverá a la sección de Históricas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-0"
              onClick={() => {
                setArchiveDialogOpen(false);
                setBoletaToArchive(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={archiveBoleta}
              className="bg-blue-500 hover:bg-blue-600 text-white border-0"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BoletaManagement;