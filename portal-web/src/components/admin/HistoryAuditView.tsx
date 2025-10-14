import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

// Types
interface AuditLog {
  _id: string;
  usuario: {
    id: string;
    tipo: 'socio' | 'super_admin';
    nombre: string;
    identificador: string;
  };
  accion: string;
  modulo: string;
  descripcion: string;
  detalles?: {
    entidadTipo?: string;
    entidadId?: string;
    datosAnteriores?: any;
    datosNuevos?: any;
    ip?: string;
    userAgent?: string;
  };
  resultado: 'exitoso' | 'fallido' | 'error';
  timestamp: string;
  metadata?: {
    duracion?: number;
    errorCode?: string;
    errorMessage?: string;
  };
}

interface AuditStats {
  period: string;
  dateRange: {
    from: string;
    to: string;
  };
  totals: {
    total: number;
    exitoso: number;
    fallido: number;
    error: number;
    successRate: number;
  };
  moduleStats: Record<string, number>;
  userTypeStats: Record<string, number>;
  recentActivity: AuditLog[];
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface HistoryAuditViewProps {
  onBack: () => void;
}

// API functions
const fetchAuditLogs = async (params: {
  page?: number;
  limit?: number;
  modulo?: string;
  resultado?: string;
  usuarioTipo?: string;
  usuarioId?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'todos') {
      query.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/audit/logs?${query.toString()}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

const fetchAuditStats = async (period: string = '7d') => {
  const response = await fetch(`/api/audit/stats?period=${period}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

const exportAuditLogs = async (params: {
  modulo?: string;
  resultado?: string;
  usuarioTipo?: string;
  usuarioId?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  format?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'todos') {
      query.append(key, value.toString());
    }
  });
  query.append('format', 'csv');

  const response = await fetch(`/api/audit/export?${query.toString()}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  
  return response.blob();
};

const MODULOS = [
  'autenticacion',
  'usuarios',
  'boletas',
  'pagos',
  'perfil',
  'sistema',
  'reportes',
  'configuracion',
  'gestion',
  'comunicacion',
  'notificaciones',
  'seguridad',
  'auditoria'
];

const RESULTADOS = ['todos', 'exitoso', 'fallido', 'error'];

export default function HistoryAuditView({ onBack }: HistoryAuditViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('todos');
  const [selectedResult, setSelectedResult] = useState('todos');
  const [selectedUser, setSelectedUser] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  });
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(logs.map(log => `${log.usuario.tipo}:${log.usuario.id}`)))
    .map(key => {
      const log = logs.find(l => `${l.usuario.tipo}:${l.usuario.id}` === key);
      return log?.usuario;
    })
    .filter(Boolean);

  // Load audit logs from API
  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 50,
        modulo: selectedModule !== 'todos' ? selectedModule : undefined,
        resultado: selectedResult !== 'todos' ? selectedResult : undefined,
        usuarioTipo: selectedUser !== 'todos' ? selectedUser.split(':')[0] : undefined,
        usuarioId: selectedUser !== 'todos' ? selectedUser.split(':')[1] : undefined,
        fechaDesde: dateFrom || undefined,
        fechaHasta: dateTo || undefined,
        search: searchTerm || undefined
      };

      const response = await fetchAuditLogs(params);
      
      if (response.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Error al cargar los logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchAuditStats('7d');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error loading audit stats:', error);
      }
    };

    loadStats();
  }, []);

  // Load logs when filters change
  useEffect(() => {
    loadAuditLogs(1);
  }, [selectedModule, selectedResult, selectedUser, dateFrom, dateTo, searchTerm]);

  // Load logs on page change
  const handlePageChange = (page: number) => {
    loadAuditLogs(page);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedModule('todos');
    setSelectedResult('todos');
    setSelectedUser('todos');
    setDateFrom('');
    setDateTo('');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResultIcon = (resultado: string) => {
    switch (resultado) {
      case 'exitoso':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'fallido':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getModuleColor = (modulo: string) => {
    const colors: Record<string, string> = {
      autenticacion: 'bg-blue-100 text-blue-700 border-blue-200',
      usuarios: 'bg-purple-100 text-purple-700 border-purple-200',
      boletas: 'bg-green-100 text-green-700 border-green-200',
      pagos: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      perfil: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      sistema: 'bg-red-100 text-red-700 border-red-200',
      reportes: 'bg-orange-100 text-orange-700 border-orange-200',
      configuracion: 'bg-gray-100 text-gray-700 border-gray-200',
      gestion: 'bg-teal-100 text-teal-700 border-teal-200',
      comunicacion: 'bg-pink-100 text-pink-700 border-pink-200',
      notificaciones: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      seguridad: 'bg-rose-100 text-rose-700 border-rose-200',
      auditoria: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return colors[modulo] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getResultColor = (resultado: string) => {
    switch (resultado) {
      case 'exitoso':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'fallido':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'error':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const exportData = async () => {
    try {
      const params = {
        modulo: selectedModule !== 'todos' ? selectedModule : undefined,
        resultado: selectedResult !== 'todos' ? selectedResult : undefined,
        usuarioTipo: selectedUser !== 'todos' ? selectedUser.split(':')[0] : undefined,
        usuarioId: selectedUser !== 'todos' ? selectedUser.split(':')[1] : undefined,
        fechaDesde: dateFrom || undefined,
        fechaHasta: dateTo || undefined,
        format: 'csv'
      };

      const blob = await exportAuditLogs(params);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Logs exportados exitosamente');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Error al exportar los logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Historial de Auditoría</h1>
            <p className="text-gray-600">Registro completo de actividades del sistema</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="pb-3 !border-0">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Logs</CardTitle>
            </CardHeader>
            <CardContent className="!border-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totals.total}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 7 días</p>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="pb-3 !border-0">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Exitosos</CardTitle>
            </CardHeader>
            <CardContent className="!border-0">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totals.exitoso}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.totals.successRate}% tasa éxito</p>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="pb-3 !border-0">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Fallidos</CardTitle>
            </CardHeader>
            <CardContent className="!border-0">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totals.fallido}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Operaciones fallidas</p>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="pb-3 !border-0">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Errores</CardTitle>
            </CardHeader>
            <CardContent className="!border-0">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totals.error}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Errores del sistema</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overlay del menú */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menú lateral desplegable desde la derecha - Solo móvil */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 lg:hidden ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header del menú */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Opciones</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Contenido del menú */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Buscador */}
            <button
              onClick={() => {
                setSearchModalOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-all text-gray-700 dark:text-gray-300"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Buscar Logs</span>
            </button>

            {/* Filtros por Módulo */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Filtrar por Módulo</h3>
              {['todos', ...MODULOS].map((modulo) => (
                <button
                  key={modulo}
                  onClick={() => {
                    setSelectedModule(modulo);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    selectedModule === modulo
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {modulo === 'todos' ? 'Todos los módulos' : modulo.charAt(0).toUpperCase() + modulo.slice(1)}
                  </span>
                </button>
              ))}
            </div>

            {/* Filtros por Resultado */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Filtrar por Resultado</h3>
              {RESULTADOS.map((resultado) => (
                <button
                  key={resultado}
                  onClick={() => {
                    setSelectedResult(resultado);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    selectedResult === resultado
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {resultado === 'todos' ? 'Todos los resultados' : resultado.charAt(0).toUpperCase() + resultado.slice(1)}
                  </span>
                </button>
              ))}
            </div>

            {/* Filtros por Usuario */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 px-2">Filtrar por Usuario</h3>
              <button
                onClick={() => {
                  setSelectedUser('todos');
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                  selectedUser === 'todos'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-sm font-medium">Todos los usuarios</span>
              </button>
              {uniqueUsers.map(user => user && (
                <button
                  key={`${user.tipo}:${user.id}`}
                  onClick={() => {
                    setSelectedUser(`${user.tipo}:${user.id}`);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    selectedUser === `${user.tipo}:${user.id}`
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium">{user.nombre} ({user.identificador})</span>
                </button>
              ))}
            </div>

            {/* Exportar */}
            <button
              onClick={() => {
                exportData();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Exportar Datos</span>
            </button>

            {/* Actualizar */}
            <button
              onClick={() => {
                loadAuditLogs(pagination.currentPage);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="font-medium">Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Búsqueda */}
      {searchModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSearchModalOpen(false)}
          />
          <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl !border-0 !shadow-2xl !bg-white dark:!bg-gray-800">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center justify-between text-gray-800 dark:text-gray-100">
                <span>Buscar Logs de Auditoría</span>
                <button
                  onClick={() => setSearchModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 !border-0">
              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Buscar</Label>
                <Input
                  type="text"
                  placeholder="Buscar por acción, descripción, usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!bg-gray-50 dark:!bg-gray-700 !border-0 !text-gray-800 dark:!text-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Fecha desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="!bg-gray-50 dark:!bg-gray-700 !border-0 !text-gray-800 dark:!text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Fecha hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="!bg-gray-50 dark:!bg-gray-700 !border-0 !text-gray-800 dark:!text-gray-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Limpiar
                </Button>
                <Button
                  onClick={() => {
                    loadAuditLogs(1);
                    setSearchModalOpen(false);
                  }}
                >
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Main Content */}
      <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
        <CardHeader className="!border-0">
          <CardTitle className="flex items-center justify-between text-gray-800 dark:text-gray-100">
            <span>Logs de Auditoría</span>

            {/* Botón hamburguesa - Solo en móvil */}
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Menu className="w-4 h-4" />
              Opciones
            </button>

            {/* Botones de acciones - Solo en desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
              <button
                onClick={exportData}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                onClick={() => loadAuditLogs(pagination.currentPage)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Mostrando página {pagination.currentPage} de {pagination.totalPages} ({pagination.totalItems} registros total)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 !border-0 hidden lg:block">
          {/* Filters Panel - Visible en desktop */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 border-0 shadow-md">
              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Módulo</Label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border-0 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 text-sm shadow-sm hover:shadow-md transition-all"
                >
                  <option value="todos">Todos los módulos</option>
                  {MODULOS.map(modulo => (
                    <option key={modulo} value={modulo}>
                      {modulo.charAt(0).toUpperCase() + modulo.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Resultado</Label>
                <select
                  value={selectedResult}
                  onChange={(e) => setSelectedResult(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border-0 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 text-sm shadow-sm hover:shadow-md transition-all"
                >
                  {RESULTADOS.map(resultado => (
                    <option key={resultado} value={resultado}>
                      {resultado === 'todos' ? 'Todos los resultados' :
                       resultado.charAt(0).toUpperCase() + resultado.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Usuario</Label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border-0 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 text-sm shadow-sm hover:shadow-md transition-all"
                >
                  <option value="todos">Todos los usuarios</option>
                  {uniqueUsers.map(user => user && (
                    <option key={`${user.tipo}:${user.id}`} value={`${user.tipo}:${user.id}`}>
                      {user.nombre} ({user.identificador})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Fecha desde</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="!bg-gray-50 dark:!bg-gray-700 !border-0 !text-gray-800 dark:!text-gray-200 text-sm !shadow-sm hover:!shadow-md transition-all"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Fecha hasta</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="!bg-gray-50 dark:!bg-gray-700 !border-0 !text-gray-800 dark:!text-gray-200 text-sm !shadow-sm hover:!shadow-md transition-all"
                />
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
        <CardHeader className="!border-0">
          <CardTitle className="flex items-center justify-between text-gray-800 dark:text-gray-100">
            <span>Registros de Auditoría</span>
            {stats && (
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400 font-medium">✓ {stats.totals.exitoso} exitosos</span>
                <span className="text-red-600 dark:text-red-400 font-medium">✗ {stats.totals.fallido + stats.totals.error} fallidos</span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">📊 {stats.totals.successRate}% éxito</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="!border-0">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando logs de auditoría...</p>
          </div>
        ) : (
          <>
            {/* Vista de Tarjetas para Móvil */}
            <div className="lg:hidden space-y-3">
              {logs.map((log) => (
                <Card
                  key={log._id}
                  className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-gray-50 dark:!bg-gray-700 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <CardContent className="p-4">
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getResultIcon(log.resultado)}
                        <Badge variant="outline" className={`${getModuleColor(log.modulo)} !border-0 !shadow-sm`}>
                          {log.modulo}
                        </Badge>
                      </div>
                      <Badge className={`${getResultColor(log.resultado)} !border-0 !shadow-sm`}>
                        {log.resultado}
                      </Badge>
                    </div>

                    {/* Acción */}
                    <div className="mb-2">
                      <span className="text-gray-700 dark:text-gray-300 text-sm font-semibold">{log.accion}</span>
                    </div>

                    {/* Descripción */}
                    <p className="text-gray-900 dark:text-gray-100 font-medium mb-3 text-sm">{log.descripcion}</p>

                    {/* Usuario y Detalles */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                          {log.usuario.nombre}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {log.usuario.identificador} - {log.usuario.tipo}
                      </div>
                    </div>

                    {/* Grid de detalles adicionales */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {log.detalles?.ip && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">IP</div>
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{log.detalles.ip}</div>
                        </div>
                      )}
                      {log.metadata?.duracion && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Duración</div>
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{log.metadata.duracion}ms</div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {logs.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron registros de auditoría</p>
                </div>
              )}
            </div>

            {/* Vista de Tabla para Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Módulo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Acción</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Descripción</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Usuario</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">IP</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Duración</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getResultIcon(log.resultado)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`${getModuleColor(log.modulo)} !border-0 !shadow-sm text-xs`}>
                          {log.modulo}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{log.accion}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{log.descripcion}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{log.usuario.nombre}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{log.usuario.identificador}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{log.detalles?.ip || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {log.metadata?.duracion ? `${log.metadata.duracion}ms` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logs.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron registros de auditoría</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        {logs.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-medium"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Página {pagination.currentPage} de {pagination.totalPages}
            </span>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-white dark:!bg-gray-900 !border-0 !shadow-2xl !rounded-2xl">
          <DialogHeader className="!border-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
              <Eye className="w-5 h-5 text-blue-500" />
              Detalle del Log de Auditoría
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Timestamp</Label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1 font-medium">{new Date(selectedLog.timestamp).toLocaleString('es-CL')}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Resultado</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getResultIcon(selectedLog.resultado)}
                    <Badge className={`${getResultColor(selectedLog.resultado)} !border-0 !shadow-sm`}>
                      {selectedLog.resultado}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuario</Label>
                <p className="text-gray-900 dark:text-gray-100 mt-1 font-medium">
                  {selectedLog.usuario.nombre} ({selectedLog.usuario.identificador}) - {selectedLog.usuario.tipo}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Módulo</Label>
                  <Badge className={`${getModuleColor(selectedLog.modulo)} !border-0 !shadow-sm mt-1`}>
                    {selectedLog.modulo}
                  </Badge>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Acción</Label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1 font-medium">{selectedLog.accion}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Descripción</Label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedLog.descripcion}</p>
              </div>

              {selectedLog.detalles && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Detalles</Label>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-sm border-0 shadow-inner">
                    <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono text-xs">
                      {JSON.stringify(selectedLog.detalles, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.metadata && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-0 shadow-sm">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Metadata</Label>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-sm border-0 shadow-inner">
                    <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono text-xs">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}