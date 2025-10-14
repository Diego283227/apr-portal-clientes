import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/enhanced-toast';
import {
  Users,
  Search,
  MessageSquare,
  UserX,
  UserCheck,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Edit,
  Send,
  Eye,
  Filter,
  MapPin,
  User
} from 'lucide-react';
import { apiClient } from '@/services/api';
import OnlineStatus from '@/components/ui/OnlineStatus';
import { useSocketContext } from '@/contexts/SocketContext';

interface Socio {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono: string;
  codigoSocio: string;
  activo: boolean;
  saldoActual: number;
  deudaTotal: number;
  fechaIngreso: string;
  smsEnabled: boolean;
  phoneVerified: boolean;
  hasPhone: boolean;
  direccion?: string;
  profileImage?: string;
}

interface SociosAdminViewProps {}

export default function SociosAdminView() {
  const { onlineUsers } = useSocketContext();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [smsMessage, setSmsMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    withPhone: 0,
    smsEnabled: 0
  });

  useEffect(() => {
    loadSocios();
  }, [pagination.page, search, statusFilter]);

  // Debug: log online users  
  console.log('👥 Online users in admin view:', onlineUsers);

  // Helper function to check if a socio is online
  const getSocioOnlineStatus = (socioId: string) => {
    const onlineUser = onlineUsers.find(user => user.id === socioId && user.role === 'socio');
    console.log(`🔍 Checking socio ${socioId}:`, onlineUser ? 'ONLINE' : 'OFFLINE');
    return {
      isOnline: !!onlineUser,
      lastSeen: onlineUser?.lastSeen
    };
  };

  const loadSocios = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/socios', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: search.trim(),
          status: statusFilter
        }
      });

      if (response.data.success) {
        setSocios(response.data.data.socios);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
        setStatistics(response.data.data.statistics);
      }
    } catch (error: any) {
      console.error('Error loading socios:', error);
      toast.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (socioId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'block' : 'unblock';
    const actionText = currentStatus ? 'bloquear' : 'desbloquear';

    try {
      setActionLoading(socioId);
      const response = await apiClient.patch(`/admin/socios/${socioId}/status`, { action });

      if (response.data.success) {
        toast.success(response.data.message);
        loadSocios();
      }
    } catch (error: any) {
      console.error('Error toggling socio status:', error);
      const message = error.response?.data?.message || `Error al ${actionText} socio`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSocio = async (socioId: string) => {
    try {
      setActionLoading(socioId);
      const response = await apiClient.delete(`/admin/socios/${socioId}`, {
        data: { confirm: 'DELETE' }
      });
      
      if (response.data.success) {
        toast.success('Socio eliminado exitosamente');
        loadSocios();
        setShowDeleteConfirm(null);
      }
    } catch (error: any) {
      console.error('Error deleting socio:', error);
      const message = error.response?.data?.message || 'Error al eliminar socio';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendSMS = async () => {
    if (!selectedSocio || !smsMessage.trim()) {
      toast.error('Mensaje requerido');
      return;
    }

    try {
      setActionLoading('sms');
      const response = await apiClient.post(`/admin/socios/${selectedSocio.id}/sms`, {
        message: smsMessage
      });
      
      if (response.data.success) {
        toast.success('SMS enviado exitosamente');
        setSmsMessage('');
        setShowSMSModal(false);
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      const message = error.response?.data?.message || 'Error al enviar SMS';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('es-CL');

  return (
    <>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gestión de Socios
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Administrar socios del sistema APR
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 shadow-sm">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 shadow-sm">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Activos</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 shadow-sm">
                  <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 shadow-sm">
                  <Phone className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Con teléfono</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{statistics.withPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 shadow-sm">
                  <MessageSquare className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SMS activo</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.smsEnabled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Visibles solo en desktop */}
        <Card className="mb-6 !border-0 !shadow-md !bg-white dark:!bg-gray-800 hidden lg:block">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, RUT, email o código..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="min-w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg px-3 text-sm shadow-sm hover:shadow-md transition-all text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Todos los socios</option>
                  <option value="active">Solo activos</option>
                  <option value="inactive">Solo inactivos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Socios List */}
        <Card className="!border-0 !shadow-md !bg-white dark:!bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Users className="w-5 h-5" />
                Socios ({pagination.total})
              </CardTitle>

              {/* Botón Actualizar - Solo en desktop */}
              <Button
                onClick={loadSocios}
                variant="outline"
                size="sm"
                className="hidden lg:flex !border-0 !bg-blue-500 hover:!bg-blue-600 !text-white !shadow-sm hover:!shadow-md transition-all"
              >
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : socios.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No se encontraron socios</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ajusta los filtros de búsqueda o agrega nuevos socios.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {socios.map((socio) => (
                  <div
                    key={socio.id}
                    className="flex flex-col lg:flex-row p-4 rounded-lg border-0 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm hover:shadow-md transition-all w-full"
                  >
                    {/* Información del Socio */}
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          {socio.nombres} {socio.apellidos}
                        </h3>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(() => {
                            const { isOnline, lastSeen } = getSocioOnlineStatus(socio.id);
                            return (
                              <OnlineStatus
                                isOnline={isOnline}
                                lastSeen={lastSeen}
                                showText={false}
                                size="sm"
                              />
                            );
                          })()}
                          <Badge variant={socio.activo ? 'default' : 'destructive'} className="text-xs !border-0 !shadow-sm">
                            {socio.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {socio.smsEnabled && (
                            <Badge className="bg-green-600 text-xs !border-0 !shadow-sm">SMS</Badge>
                          )}
                          {socio.deudaTotal > 0 && (
                            <Badge variant="destructive" className="text-xs !border-0 !shadow-sm">
                              Deuda: {formatCurrency(socio.deudaTotal)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>RUT: {socio.rut}</span>
                        <span>Código: {socio.codigoSocio}</span>
                        {socio.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {socio.telefono}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Mail className="w-3 h-3 inline mr-1" />
                        {socio.email}
                      </div>
                    </div>

                    {/* Actions - Móvil: abajo con border-top, Desktop: a la derecha horizontal */}
                    <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-200 dark:border-gray-600 flex-wrap lg:flex-nowrap">
                      {/* SMS Button */}
                      {socio.hasPhone && socio.activo && (
                        <button
                          onClick={() => {
                            setSelectedSocio(socio);
                            setShowSMSModal(true);
                          }}
                          disabled={actionLoading === socio.id}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}

                      {/* Block/Unblock Button */}
                      <ConfirmDialog
                        title={socio.activo ? "Bloquear Socio" : "Desbloquear Socio"}
                        description={`¿Estás seguro que deseas ${socio.activo ? 'bloquear' : 'desbloquear'} este socio?`}
                        confirmText={socio.activo ? "Bloquear" : "Desbloquear"}
                        variant={socio.activo ? "warning" : "success"}
                        onConfirm={() => handleToggleStatus(socio.id, socio.activo)}
                        isLoading={actionLoading === socio.id}
                      >
                        <button
                          disabled={actionLoading === socio.id}
                          className={`p-2 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 ${
                            socio.activo
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {actionLoading === socio.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : socio.activo ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </ConfirmDialog>

                      {/* Delete Button */}
                      <button
                        onClick={() => setShowDeleteConfirm(socio.id)}
                        disabled={actionLoading === socio.id || socio.deudaTotal > 0}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* View Details Button */}
                      <button
                        onClick={() => {
                          setSelectedSocio(socio);
                          setShowDetails(true);
                        }}
                        className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Página {pagination.page} de {pagination.pages} ({pagination.total} total)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="!border-0 !bg-gray-100 hover:!bg-gray-200 dark:!bg-gray-700 dark:hover:!bg-gray-600 !shadow-sm hover:!shadow-md transition-all"
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                        className="!border-0 !bg-gray-100 hover:!bg-gray-200 dark:!bg-gray-700 dark:hover:!bg-gray-600 !shadow-sm hover:!shadow-md transition-all"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      {/* SMS Modal */}
      {showSMSModal && selectedSocio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Enviar SMS a {selectedSocio.nombres}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {selectedSocio.telefono}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Mensaje</Label>
                <Textarea
                  placeholder="Escribe tu mensaje aquí..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  maxLength={160}
                  className="!border-0 !bg-gray-50 dark:!bg-gray-800 !shadow-sm hover:!shadow-md transition-all"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {smsMessage.length}/160 caracteres
                </div>
              </div>
            </CardContent>
            <div className="flex gap-2 p-6 pt-0">
              <button
                onClick={() => setShowSMSModal(false)}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendSMS}
                disabled={!smsMessage.trim() || actionLoading === 'sms'}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {actionLoading === 'sms' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar SMS
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal with Preview */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg !border-0 !shadow-2xl !bg-white dark:!bg-gray-900">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Eliminación - Vista Previa
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Revisa la información del socio antes de eliminar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const socioToDelete = socios.find(s => s.id === showDeleteConfirm);
                return socioToDelete ? (
                  <div className="space-y-4">
                    {/* Preview of data to be deleted */}
                    <div className="bg-red-50 dark:bg-red-900/20 border-0 rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-red-800 dark:text-red-400 mb-3">
                        Información que será eliminada permanentemente:
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Nombre completo:</span>
                          <span className="text-red-900 dark:text-red-100">{socioToDelete.nombres} {socioToDelete.apellidos}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">RUT:</span>
                          <span className="text-red-900 dark:text-red-100">{socioToDelete.rut}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Código Socio:</span>
                          <span className="text-red-900 dark:text-red-100">{socioToDelete.codigoSocio}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Email:</span>
                          <span className="text-red-900 dark:text-red-100">{socioToDelete.email}</span>
                        </div>
                        {socioToDelete.telefono && (
                          <div className="flex items-center justify-between">
                            <span className="text-red-700 dark:text-red-300 font-medium">Teléfono:</span>
                            <span className="text-red-900 dark:text-red-100">{socioToDelete.telefono}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Estado:</span>
                          <Badge variant={socioToDelete.activo ? 'default' : 'destructive'} className="text-xs !border-0 !shadow-sm">
                            {socioToDelete.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Saldo actual:</span>
                          <span className="text-red-900 dark:text-red-100">{formatCurrency(socioToDelete.saldoActual)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Deuda total:</span>
                          <span className="text-red-900 dark:text-red-100">{formatCurrency(socioToDelete.deudaTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-red-700 dark:text-red-300 font-medium">Fecha de ingreso:</span>
                          <span className="text-red-900 dark:text-red-100">{formatDate(socioToDelete.fechaIngreso)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Warning message */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-0 rounded-lg p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-amber-800 dark:text-amber-200 text-sm">
                          <p className="font-medium mb-1">¡Advertencia importante!</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Esta acción eliminará permanentemente todos los datos del socio</li>
                            <li>• Se eliminarán todos los registros asociados (pagos, boletas, historial)</li>
                            <li>• Solo se pueden eliminar socios sin deudas pendientes</li>
                            <li>• Esta acción no se puede deshacer</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Impact preview */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-0 rounded-lg p-3 shadow-sm">
                      <h5 className="text-blue-800 dark:text-blue-300 font-medium text-sm mb-2">
                        Impacto de la eliminación:
                      </h5>
                      <ul className="text-blue-700 dark:text-blue-200 text-xs space-y-1">
                        <li>• El código de socio {socioToDelete.codigoSocio} quedará disponible para reasignación</li>
                        <li>• Se eliminarán todas las conversaciones de chat asociadas</li>
                        <li>• Se eliminará el historial de SMS enviados</li>
                        <li>• Los reportes históricos ya generados no serán afectados</li>
                      </ul>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
            <div className="flex gap-2 p-6 pt-0">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={actionLoading === showDeleteConfirm}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteSocio(showDeleteConfirm)}
                disabled={actionLoading === showDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {actionLoading === showDeleteConfirm ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Confirmar Eliminación
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Profile Details Modal */}
      {showDetails && selectedSocio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl !border-0 !shadow-2xl !bg-white dark:!bg-gray-900 max-h-[90vh] overflow-y-auto">
            <CardHeader className="!border-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-gray-100">Perfil del Socio</CardTitle>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Header with Avatar */}
              <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-sm">
                <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-700">
                  {selectedSocio.profileImage ? (
                    <img
                      src={selectedSocio.profileImage}
                      alt={`${selectedSocio.nombres} ${selectedSocio.apellidos}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedSocio.nombres} {selectedSocio.apellidos}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Código: {selectedSocio.codigoSocio}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={selectedSocio.activo ? 'default' : 'destructive'} className="!border-0 !shadow-sm">
                      {selectedSocio.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {selectedSocio.smsEnabled && (
                      <Badge className="bg-green-600 !border-0 !shadow-sm">SMS Habilitado</Badge>
                    )}
                    {selectedSocio.deudaTotal > 0 ? (
                      <Badge variant="destructive" className="!border-0 !shadow-sm">
                        Con Deuda
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 !border-0 !shadow-sm">
                        Al Día
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">RUT</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSocio.rut}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSocio.email}</p>
                  </div>
                  {selectedSocio.telefono && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Teléfono
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSocio.telefono}</p>
                      {selectedSocio.phoneVerified && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓ Verificado</span>
                      )}
                    </div>
                  )}
                  {selectedSocio.direccion && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Dirección
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSocio.direccion}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Actual</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedSocio.saldoActual)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deuda Total</p>
                    <p className={`text-lg font-bold ${selectedSocio.deudaTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(selectedSocio.deudaTotal)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado de Pago</p>
                    <p className={`text-lg font-bold ${selectedSocio.deudaTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {selectedSocio.deudaTotal > 0 ? 'Con Deuda' : 'Al Día'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Información de Cuenta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Código de Socio</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedSocio.codigoSocio}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha de Ingreso</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(selectedSocio.fechaIngreso)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado de Cuenta</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedSocio.activo ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notificaciones SMS</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedSocio.smsEnabled ? 'Habilitado' : 'Deshabilitado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  Cerrar
                </button>
                {selectedSocio.hasPhone && selectedSocio.activo && (
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setShowSMSModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Enviar SMS
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}