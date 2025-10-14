import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Phone, 
  Search, 
  Send, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  MessageCircle,
  UserCheck,
  History,
  Eye,
  Clock,
  User,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';

interface User {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono: string;
  role: string;
  activo: boolean;
  smsEnabled: boolean;
  phoneVerified: boolean;
  hasPhone: boolean;
  createdAt: string;
}

interface SMSServiceStatus {
  enabled: boolean;
  configured: boolean;
  fromNumber: string | null;
  prefix: string;
}

interface SMSHistoryItem {
  id: string;
  timestamp: Date;
  recipients: {
    id: string;
    name: string;
    phone: string;
  }[];
  message: string;
  status: 'success' | 'failed' | 'partial';
  totalRecipients: number;
  successCount: number;
  failedCount: number;
}

interface SMSAdminViewProps {}

export default function SMSAdminView() {
  const [users, setUsers] = useState<User[]>([]);
  const [serviceStatus, setServiceStatus] = useState<SMSServiceStatus>({
    enabled: false,
    configured: false,
    fromNumber: null,
    prefix: 'Portal APR - Mensaje del administrador'
  });
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [smsHistory, setSmsHistory] = useState<SMSHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SMSHistoryItem | null>(null);
  const [newPrefix, setNewPrefix] = useState('');
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [savingPrefix, setSavingPrefix] = useState(false);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadUsers();
    loadServiceStatus();
  }, [pagination.page, search]);

  useEffect(() => {
    setNewPrefix(serviceStatus.prefix);
  }, [serviceStatus.prefix]);

  const loadServiceStatus = async () => {
    try {
      const response = await apiClient.get('/sms/service-status');
      if (response.data.success) {
        setServiceStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error loading SMS service status:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/sms/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: search.trim()
        }
      });

      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const sendSMSToUser = async (userId: string) => {
    if (!message.trim()) {
      toast.error('Debe escribir un mensaje');
      return;
    }

    setSending(true);
    try {
      const response = await apiClient.post(`/sms/send/${userId}`, { message });
      if (response.data.success) {
        toast.success(response.data.message);
        
        // Add to history
        const user = users.find(u => u.id === userId);
        if (user) {
          const historyItem: SMSHistoryItem = {
            id: `sms_${Date.now()}`,
            timestamp: new Date(),
            recipients: [{
              id: user.id,
              name: `${user.nombres} ${user.apellidos}`,
              phone: user.telefono
            }],
            message: message.trim(),
            status: 'success',
            totalRecipients: 1,
            successCount: 1,
            failedCount: 0
          };
          setSmsHistory(prev => [historyItem, ...prev.slice(0, 19)]); // Keep last 20 items
        }
        
        setMessage('');
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      const errorMessage = error.response?.data?.message || 'Error al enviar SMS';
      toast.error(errorMessage);
      
      // Add failed attempt to history
      const user = users.find(u => u.id === userId);
      if (user) {
        const historyItem: SMSHistoryItem = {
          id: `sms_${Date.now()}`,
          timestamp: new Date(),
          recipients: [{
            id: user.id,
            name: `${user.nombres} ${user.apellidos}`,
            phone: user.telefono
          }],
          message: message.trim(),
          status: 'failed',
          totalRecipients: 1,
          successCount: 0,
          failedCount: 1
        };
        setSmsHistory(prev => [historyItem, ...prev.slice(0, 19)]);
      }
    } finally {
      setSending(false);
    }
  };

  const sendBulkSMS = async () => {
    if (!message.trim()) {
      toast.error('Debe escribir un mensaje');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Debe seleccionar al menos un usuario');
      return;
    }

    setSendingBulk(true);
    try {
      const response = await apiClient.post('/sms/send-bulk', {
        userIds: selectedUsers,
        message
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        
        // Add to history
        const selectedUserDetails = users.filter(u => selectedUsers.includes(u.id));
        const recipients = selectedUserDetails.map(user => ({
          id: user.id,
          name: `${user.nombres} ${user.apellidos}`,
          phone: user.telefono
        }));
        
        // Determine status based on response
        const data = response.data.data;
        let status: 'success' | 'failed' | 'partial' = 'success';
        if (data?.failed > 0) {
          status = data.sent > 0 ? 'partial' : 'failed';
        }
        
        const historyItem: SMSHistoryItem = {
          id: `bulk_sms_${Date.now()}`,
          timestamp: new Date(),
          recipients,
          message: message.trim(),
          status,
          totalRecipients: selectedUsers.length,
          successCount: data?.sent || 0,
          failedCount: data?.failed || 0
        };
        setSmsHistory(prev => [historyItem, ...prev.slice(0, 19)]);
        
        setMessage('');
        setSelectedUsers([]);
      }
    } catch (error: any) {
      console.error('Error sending bulk SMS:', error);
      const errorMessage = error.response?.data?.message || 'Error al enviar SMS masivo';
      toast.error(errorMessage);
      
      // Add failed bulk attempt to history
      const selectedUserDetails = users.filter(u => selectedUsers.includes(u.id));
      const recipients = selectedUserDetails.map(user => ({
        id: user.id,
        name: `${user.nombres} ${user.apellidos}`,
        phone: user.telefono
      }));
      
      const historyItem: SMSHistoryItem = {
        id: `bulk_sms_${Date.now()}`,
        timestamp: new Date(),
        recipients,
        message: message.trim(),
        status: 'failed',
        totalRecipients: selectedUsers.length,
        successCount: 0,
        failedCount: selectedUsers.length
      };
      setSmsHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } finally {
      setSendingBulk(false);
    }
  };


  const selectAllUsers = () => {
    const usersWithPhone = users.filter(user => user.hasPhone);
    setSelectedUsers(usersWithPhone.map(user => user.id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const updateSMSPrefix = async () => {
    if (!newPrefix.trim()) {
      toast.error('El prefijo no puede estar vacío');
      return;
    }

    setSavingPrefix(true);
    try {
      const response = await apiClient.put('/sms/prefix', { prefix: newPrefix.trim() });
      if (response.data.success) {
        toast.success('Prefijo actualizado exitosamente');
        setServiceStatus(prev => ({ ...prev, prefix: newPrefix.trim() }));
        setIsEditingPrefix(false);
      }
    } catch (error: any) {
      console.error('Error updating SMS prefix:', error);
      const errorMessage = error.response?.data?.message || 'Error al actualizar prefijo';
      toast.error(errorMessage);
    } finally {
      setSavingPrefix(false);
    }
  };

  const cancelPrefixEdit = () => {
    setNewPrefix(serviceStatus.prefix);
    setIsEditingPrefix(false);
  };

  const filteredUsers = users.filter(user => 
    user.nombres.toLowerCase().includes(search.toLowerCase()) ||
    user.apellidos.toLowerCase().includes(search.toLowerCase()) ||
    user.rut.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Responsive */}
      <div className="bg-white shadow-lg border-0">
        <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 md:gap-4 py-3 md:py-4">
            <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Administración SMS
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Gestionar notificaciones SMS y enviar mensajes a usuarios
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8 py-4 md:py-8">

        {/* Service Status */}
        <Card className="mb-6 !border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
          <CardHeader className="!border-0">
            <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Phone className="w-5 h-5 text-blue-500" />
              Estado del Servicio SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Service Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {serviceStatus.enabled && serviceStatus.configured ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700">Servicio activo y configurado</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-700">Servicio no disponible o no configurado</span>
                    </>
                  )}
                </div>
                {serviceStatus.fromNumber && (
                  <span className="text-gray-600 text-sm">
                    Número: {serviceStatus.fromNumber}
                  </span>
                )}
              </div>

              {/* SMS Prefix Configuration */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Prefijo de mensajes SMS</Label>
                  {!isEditingPrefix && (
                    <button
                      onClick={() => setIsEditingPrefix(true)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1 text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                </div>
                
                {isEditingPrefix ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newPrefix}
                      onChange={(e) => setNewPrefix(e.target.value)}
                      placeholder="Ej: Portal APR - Mensaje del administrador"
                      className="flex-1 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all"
                      maxLength={100}
                    />
                    <button
                      onClick={updateSMSPrefix}
                      disabled={savingPrefix || !newPrefix.trim()}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {savingPrefix ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelPrefixEdit}
                      disabled={savingPrefix}
                      className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                    <p className="text-sm font-mono text-gray-800 dark:text-gray-200">"{serviceStatus.prefix}: [mensaje]"</p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  Este prefijo se agregará automáticamente a todos los mensajes SMS enviados desde el panel de administrador.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Users List - Responsive */}
          <div className="lg:col-span-2">
            <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
              <CardHeader className="!border-0 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100 text-base md:text-lg">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                    Usuarios ({users.length})
                  </CardTitle>
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {selectedUsers.length} seleccionados
                  </div>
                </div>
                <CardDescription className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Lista de usuarios registrados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre, RUT o email..."
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all"
                    />
                  </div>
                </div>

                {/* Bulk Actions - Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <button
                      onClick={selectAllUsers}
                      className="px-2.5 md:px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1 text-xs md:text-sm font-medium"
                    >
                      <UserCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Seleccionar todos</span>
                      <span className="sm:hidden">Todos</span>
                    </button>
                    <button
                      onClick={clearSelection}
                      disabled={selectedUsers.length === 0}
                      className="px-2.5 md:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-medium"
                    >
                      Limpiar
                    </button>
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2.5 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {selectedUsers.length} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Users Table */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No se encontraron usuarios
                    </div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-start md:items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border-0 transition-all duration-200 cursor-pointer ${
                          selectedUsers.includes(user.id)
                            ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 shadow-md transform scale-[1.02]'
                            : 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (user.hasPhone) {
                            if (selectedUsers.includes(user.id)) {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            } else {
                              setSelectedUsers(prev => [...prev, user.id]);
                            }
                          }
                        }}
                      >
                        <div className={`flex-shrink-0 ${selectedUsers.includes(user.id) ? 'transform scale-110' : ''}`}>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                            disabled={!user.hasPhone}
                            className={selectedUsers.includes(user.id) ? 'data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600' : ''}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <h3 className={`text-sm md:text-base font-semibold truncate transition-colors ${
                              selectedUsers.includes(user.id) ? 'text-green-800' : 'text-gray-900'
                            }`}>
                              {user.nombres} {user.apellidos}
                            </h3>
                            <div className="flex items-center gap-1 flex-wrap">
                              {user.smsEnabled && (
                                <Badge variant="default" className={`text-xs transition-colors ${
                                  selectedUsers.includes(user.id) ? 'bg-green-700' : 'bg-green-600'
                                }`}>
                                  SMS
                                </Badge>
                              )}
                              {user.phoneVerified && (
                                <UserCheck className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-colors ${
                                  selectedUsers.includes(user.id) ? 'text-green-700' : 'text-green-600'
                                }`} />
                              )}
                              {!user.hasPhone && (
                                <Badge variant="destructive" className="text-xs">
                                  Sin teléfono
                                </Badge>
                              )}
                              {selectedUsers.includes(user.id) && (
                                <div className="flex items-center gap-1 bg-green-200 text-green-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Seleccionado</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className={`text-xs md:text-sm truncate transition-colors ${
                            selectedUsers.includes(user.id) ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {user.rut} • {user.email}
                          </p>
                          {user.telefono && (
                            <p className={`text-xs md:text-sm transition-colors ${
                              selectedUsers.includes(user.id) ? 'text-green-700 font-medium' : 'text-gray-700'
                            }`}>
                              📱 {user.telefono}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendSMSToUser(user.id);
                          }}
                          disabled={!user.hasPhone || sending || !serviceStatus.enabled || !message.trim()}
                          className="p-1.5 md:p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Panel */}
          <div>
            <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
              <CardHeader className="!border-0">
                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <Send className="w-5 h-5 text-blue-500" />
                  Enviar Mensaje
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Envía un mensaje SMS a usuarios seleccionados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Mensaje</Label>
                  <Textarea
                    placeholder="Escribe tu mensaje aquí..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-32 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all mt-1.5"
                    maxLength={160}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    {message.length}/160 caracteres
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Los mensajes se enviarán con el prefijo:</p>
                  <p className="text-gray-700 dark:text-gray-300 font-mono text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded-lg mt-1 shadow-sm">
                    "{serviceStatus.prefix}: [tu mensaje]"
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 !border-0">
                <button
                  onClick={sendBulkSMS}
                  disabled={sendingBulk || selectedUsers.length === 0 || !message.trim() || !serviceStatus.enabled}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {sendingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar a {selectedUsers.length} usuarios
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Solo se enviará a usuarios con teléfono registrado
                </p>
              </CardFooter>
            </Card>

            {/* Statistics */}
            <Card className="mt-6 !border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
              <CardHeader className="!border-0">
                <CardTitle className="text-sm text-gray-800 dark:text-gray-100">Estadísticas SMS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total usuarios</p>
                    <p className="text-gray-900 font-semibold">{users.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Con teléfono</p>
                    <p className="text-gray-900 font-semibold">
                      {users.filter(u => u.hasPhone).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">SMS activo</p>
                    <p className="text-gray-900 font-semibold">
                      {users.filter(u => u.smsEnabled).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Verificados</p>
                    <p className="text-gray-900 font-semibold">
                      {users.filter(u => u.phoneVerified).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SMS History */}
        <Card className="mt-8 !border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
          <CardHeader className="!border-0">
            <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <History className="w-5 h-5 text-blue-500" />
              Historial de SMS Enviados
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Últimos SMS enviados desde esta sesión
            </CardDescription>
          </CardHeader>
          <CardContent>
            {smsHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay SMS enviados en esta sesión</p>
                <p className="text-sm text-gray-400 mt-1">Los SMS enviados aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {smsHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-0 shadow-sm hover:shadow-md transition-all ${
                      item.status === 'success'
                        ? 'bg-green-50/50 dark:bg-green-900/20'
                        : item.status === 'partial'
                        ? 'bg-yellow-50/50 dark:bg-yellow-900/20'
                        : 'bg-red-50/50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={item.status === 'success' ? 'default' : 'destructive'}
                          className={`text-xs ${
                            item.status === 'success' 
                              ? 'bg-green-600' 
                              : item.status === 'partial'
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                        >
                          {item.status === 'success' ? 'Enviado' : 
                           item.status === 'partial' ? 'Parcial' : 'Fallido'}
                        </Badge>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timestamp.toLocaleString('es-CL')}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.recipients.length} destinatario{item.recipients.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 truncate max-w-md">
                        {item.message}
                      </p>
                      {item.totalRecipients > 1 && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          {item.successCount > 0 && (
                            <span className="text-green-600">
                              ✓ {item.successCount} exitosos
                            </span>
                          )}
                          {item.failedCount > 0 && (
                            <span className="text-red-600">
                              ✗ {item.failedCount} fallidos
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          onClick={() => setSelectedHistoryItem(item)}
                          className="ml-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl !bg-white dark:!bg-gray-900 !border-0 !shadow-2xl">
                        <DialogHeader className="!border-0">
                          <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            Detalles del SMS
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Status and timestamp */}
                          <div className="flex items-center gap-4">
                            <Badge 
                              variant={item.status === 'success' ? 'default' : 'destructive'}
                              className={`${
                                item.status === 'success' 
                                  ? 'bg-green-600' 
                                  : item.status === 'partial'
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }`}
                            >
                              {item.status === 'success' ? 'Enviado exitosamente' : 
                               item.status === 'partial' ? 'Enviado parcialmente' : 'Falló el envío'}
                            </Badge>
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {item.timestamp.toLocaleString('es-CL')}
                            </span>
                          </div>

                          {/* Message content */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Mensaje enviado:</h4>
                            <div className="bg-gray-100 p-3 rounded-lg text-sm">
                              {item.message}
                            </div>
                          </div>

                          {/* Recipients */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Destinatarios ({item.recipients.length}):
                            </h4>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {item.recipients.map((recipient, index) => (
                                <div 
                                  key={`${recipient.id}-${index}`}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                                >
                                  <div>
                                    <span className="font-medium">{recipient.name}</span>
                                    <span className="text-gray-600 ml-2">{recipient.phone}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Statistics for bulk SMS */}
                          {item.totalRecipients > 1 && (
                            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">
                                  {item.totalRecipients}
                                </div>
                                <div className="text-xs text-gray-600">Total</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">
                                  {item.successCount}
                                </div>
                                <div className="text-xs text-gray-600">Exitosos</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-red-600">
                                  {item.failedCount}
                                </div>
                                <div className="text-xs text-gray-600">Fallidos</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}