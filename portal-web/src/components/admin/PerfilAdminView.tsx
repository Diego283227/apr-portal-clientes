import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  ArrowLeft,
  Crown,
  Settings,
  Key,
  Clock,
  Users,
  MessageCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  Volume2,
  Eye
} from 'lucide-react';
import { formatRUT, rutToWords, speakRUT } from '@/lib/utils';
import OnlineStatus from '@/components/ui/OnlineStatus';
import { useSocketContext } from '@/contexts/SocketContext';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono?: string;
  direccion?: string;
  rol: 'admin' | 'super_admin';
  fechaCreacion: string;
  ultimoAcceso?: string;
  activo: boolean;
  permisos: string[];
}

interface PerfilAdminViewProps {
  admin: AdminUser;
  onBack: () => void;
}

export default function PerfilAdminView({ admin, onBack }: PerfilAdminViewProps) {
  const { onlineUsers } = useSocketContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [editData, setEditData] = useState({
    telefono: admin.telefono || '',
    direccion: admin.direccion || '',
  });
  const [originalData, setOriginalData] = useState({
    telefono: admin.telefono || '',
    direccion: admin.direccion || '',
  });
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardHeaderRef = useRef<HTMLDivElement>(null);

  // Scroll listener para botón flotante (tanto editar como guardar/cancelar)
  useEffect(() => {
    const handleScroll = () => {
      if (cardHeaderRef.current) {
        const rect = cardHeaderRef.current.getBoundingClientRect();
        const isHeaderVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        setShowFloatingButton(!isHeaderVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-save con debounce
  const debouncedSave = useCallback(async (data: typeof editData) => {
    if (JSON.stringify(data) === JSON.stringify(originalData)) {
      return; // No changes to save
    }

    try {
      setIsSaving(true);
      
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          telefono: data.telefono,
          direccion: data.direccion
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || `Error del servidor: ${response.status}`);
        return;
      }
      
      const result = await response.json();

      if (result.success) {
        // Update local admin data with the response data
        Object.assign(admin, {
          telefono: result.data.telefono,
          direccion: result.data.direccion
        });
        
        // Update user context with new data
        if (user) {
          const updatedUser = { ...user, telefono: result.data.telefono, direccion: result.data.direccion };
          queryClient.setQueryData(['user'], updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        // Update original data to prevent unnecessary saves
        setOriginalData({
          telefono: data.telefono,
          direccion: data.direccion
        });
        
        // Exit edit mode after successful save
        setIsEditing(false);
        
        toast.success('💾 Guardado automático completado');
      } else {
        toast.error(`Error: ${result.message || 'No se pudo actualizar el perfil'}`);
      }
    } catch (error) {
      console.error('Error al guardar automáticamente:', error);
      toast.error('Error de conexión al guardar');
    } finally {
      setIsSaving(false);
    }
  }, [admin, user, queryClient, originalData]);

  // Trigger auto-save cuando cambian los datos
  useEffect(() => {
    if (!isEditing) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave(editData);
    }, 500); // Auto-save después de 500ms de inactividad

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editData, isEditing, debouncedSave]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      console.log('Guardando cambios admin:', editData);
      
      // Validation
      if (editData.telefono && !/^[\+]?[\d\s\-\(\)]+$/.test(editData.telefono)) {
        toast.error('El formato del teléfono no es válido');
        setIsSaving(false);
        return;
      }
      
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          telefono: editData.telefono,
          direccion: editData.direccion
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('HTTP Error:', response.status, response.statusText);
        toast.error(errorData.message || `Error del servidor: ${response.status}`);
        setIsSaving(false);
        return;
      }
      
      const result = await response.json();

      if (result.success) {
        // Update local admin data with the response data
        Object.assign(admin, {
          telefono: result.data.telefono,
          direccion: result.data.direccion
        });
        
        // Update user context with new data
        if (user) {
          const updatedUser = { ...user, telefono: result.data.telefono, direccion: result.data.direccion };
          queryClient.setQueryData(['user'], updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        setIsEditing(false);
        toast.success('✅ Perfil actualizado correctamente');
        console.log('✅ Perfil admin actualizado correctamente');
      } else {
        console.error('❌ Error al actualizar perfil admin:', result.message);
        toast.error(`Error: ${result.message || 'No se pudo actualizar el perfil'}`);
      }
    } catch (error) {
      console.error('❌ Error de red al actualizar perfil admin:', error);
      toast.error('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setEditData({
      telefono: admin.telefono || '',
      direccion: admin.direccion || '',
    });
    setIsEditing(false);
    setShowFloatingButton(false);
  };

  const handleInputChange = (field: keyof typeof editData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpeakRUT = () => {
    if (admin.rut) {
      speakRUT(admin.rut);
      toast.success('🔊 Reproduciendo RUT');
    } else {
      toast.error('No hay RUT para reproducir');
    }
  };

  const handleShowProfile = () => {
    toast.info('👤 Mostrando perfil completo');
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check if this admin is currently online
  const getMyOnlineStatus = () => {
    const myStatus = onlineUsers.find(user => user.id === admin.id && (user.role === 'admin' || user.role === 'super_admin'));
    return {
      isOnline: !!myStatus,
      lastSeen: myStatus?.lastSeen
    };
  };

  const myStatus = getMyOnlineStatus();

  // Get online socios count
  const getSociosOnlineCount = () => {
    return onlineUsers.filter(user => user.role === 'socio').length;
  };

  const getAdminsOnlineCount = () => {
    return onlineUsers.filter(user => user.role === 'admin' || user.role === 'super_admin').length;
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6">

      {/* Header */}
      <div ref={cardHeaderRef} className="flex items-start md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
        >
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1 md:mb-2">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">Mi Perfil de Administrador</h1>
            <OnlineStatus
              isOnline={myStatus.isOnline}
              lastSeen={myStatus.lastSeen}
              showText={true}
            />
          </div>
          <p className="text-xs md:text-base text-gray-600">Gestiona tu información personal y configuración</p>
        </div>
        <Badge
          variant={admin.rol === 'super_admin' ? 'default' : 'secondary'}
          className="px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs flex-shrink-0"
        >
          {admin.rol === 'super_admin' ? (
            <>
              <Crown className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
              <span className="hidden sm:inline">Super Administrador</span>
              <span className="sm:hidden">Super Admin</span>
            </>
          ) : (
            <>
              <Shield className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
              <span className="hidden sm:inline">Administrador</span>
              <span className="sm:hidden">Admin</span>
            </>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Información Personal */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {/* Datos Básicos */}
          <Card>
            <CardHeader className="pb-3 md:pb-4 px-3 md:px-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                  Información Personal
                </CardTitle>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-xs md:text-sm px-2 md:px-3"
                  >
                    <Edit className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Editar (Auto-guardado)</span>
                    <span className="md:hidden">Editar</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 md:gap-3">
                    {isSaving && (
                      <div className="flex items-center gap-1 md:gap-2 text-blue-600">
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                        <span className="text-xs md:text-sm hidden sm:inline">Guardando...</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="text-xs md:text-sm px-2 md:px-3"
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                      <span className="hidden md:inline">Cancelar</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">
              
              {/* RUT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700">RUT</Label>
                  <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border flex items-center justify-between">
                    <span className="text-xs md:text-sm font-mono truncate">{admin.rut ? formatRUT(admin.rut) : 'No especificado'}</span>
                    {admin.rut && (
                      <div className="flex gap-0.5 md:gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={handleSpeakRUT}
                          className="p-0.5 md:p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Escuchar RUT"
                        >
                          <Volume2 className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={handleShowProfile}
                          className="p-0.5 md:p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Ver perfil completo"
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">No se puede modificar</p>
                  {admin.rut && (
                    <p className="text-[10px] md:text-xs text-blue-600 mt-1 italic truncate">
                      Oral: {rutToWords(admin.rut)}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700">ID de Usuario</Label>
                  <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border">
                    <span className="text-[10px] md:text-xs font-mono text-gray-600 truncate block">{admin.id || 'N/A'}</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">Identificador único</p>
                </div>
              </div>

              {/* Nombres */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700">Nombres</Label>
                  <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border">
                    <span className="text-xs md:text-sm truncate block">{admin.nombres || 'No especificado'}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700">Apellidos</Label>
                  <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border">
                    <span className="text-xs md:text-sm truncate block">{admin.apellidos || 'No especificado'}</span>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-xs md:text-sm font-medium text-gray-700">
                  <Mail className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
                  Correo Electrónico
                </Label>
                <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border">
                  <span className="text-xs md:text-sm truncate block">{admin.email || 'No especificado'}</span>
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1">Contacta al super administrador para cambiar</p>
              </div>

              {/* Teléfono - Editable */}
              <div>
                <Label className="text-xs md:text-sm font-medium text-gray-700">
                  <Phone className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
                  Teléfono
                </Label>
                {isEditing ? (
                  <Input
                    value={editData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="Ej: +56 9 1234 5678"
                    className="mt-1 text-xs md:text-sm h-9 md:h-10"
                  />
                ) : (
                  <div className="mt-1 p-2 md:p-3 bg-white rounded-md border">
                    <span className="text-xs md:text-sm">{admin.telefono || 'No especificado'}</span>
                  </div>
                )}
              </div>

              {/* Dirección - Editable */}
              <div>
                <Label className="text-xs md:text-sm font-medium text-gray-700">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
                  Dirección
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    placeholder="Ej: Calle Principal 123, Comuna, Región"
                    rows={2}
                    className="mt-1 resize-none text-xs md:text-sm"
                  />
                ) : (
                  <div className="mt-1 p-2 md:p-3 bg-white rounded-md border">
                    <span className="text-xs md:text-sm">{admin.direccion || 'No especificada'}</span>
                  </div>
                )}
              </div>

              {/* Fechas y Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
                    Administrador desde
                  </Label>
                  <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border">
                    <span className="text-xs md:text-sm">
                      {new Date(admin.fechaCreacion).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700">
                    <Clock className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
                    Último acceso
                  </Label>
                  <div className="mt-1 p-2 md:p-3 bg-gray-50 rounded-md border">
                    <span className="text-xs md:text-sm">
                      {admin.ultimoAcceso ?
                        new Date(admin.ultimoAcceso).toLocaleString('es-CL') :
                        'Primera vez'
                      }
                    </span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Permisos y Funciones */}
          <Card>
            <CardHeader className="pb-3 md:pb-4 px-3 md:px-6">
              <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <Key className="h-4 w-4 md:h-5 md:w-5" />
                Permisos y Funciones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <div className="space-y-2 md:space-y-3">
                {admin.permisos && admin.permisos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {admin.permisos.map((permiso, index) => (
                      <Badge key={index} variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                        {permiso}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {admin.rol === 'super_admin' ? [
                      'Gestión completa del sistema',
                      'Administrar usuarios y permisos',
                      'Configuración del sistema',
                      'Respaldos y mantenimiento',
                      'Reportes y estadísticas',
                      'Gestión financiera'
                    ] : [
                      'Gestión de socios',
                      'Atención al cliente',
                      'Gestión de boletas',
                      'Reportes básicos'
                    ].map((permiso, index) => (
                      <div key={index} className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                        <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-600 flex-shrink-0" />
                        <span className="truncate">{permiso}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar de Información del Sistema */}
        <div className="space-y-4 md:space-y-6">
          
          {/* Estado de Conexión */}
          <Card>
            <CardHeader className="pb-3 md:pb-4 px-3 md:px-6">
              <CardTitle className="flex items-center gap-1.5 md:gap-2 text-sm md:text-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">

              <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-xs md:text-sm text-blue-700 font-medium">Mi Estado</p>
                <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-1">
                  <OnlineStatus
                    isOnline={myStatus.isOnline}
                    showText={false}
                    size="md"
                  />
                  <span className="text-xs md:text-base text-blue-800 font-semibold">
                    {myStatus.isOnline ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-[10px] md:text-xs text-green-700">Socios En Línea</p>
                  <p className="text-base md:text-lg font-bold text-green-800">
                    {getSociosOnlineCount()}
                  </p>
                </div>
                
                <div className="text-center p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-[10px] md:text-xs text-purple-700">Admins En Línea</p>
                  <p className="text-base md:text-lg font-bold text-purple-800">
                    {getAdminsOnlineCount()}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Actividad Reciente */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5" />
                Mi Actividad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Rol actual</span>
                <Badge variant={admin.rol === 'super_admin' ? "default" : "secondary"}>
                  {admin.rol === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Estado de cuenta</span>
                <Badge variant={admin.activo ? "default" : "destructive"}>
                  {admin.activo ? 'Activa' : 'Suspendida'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Sesión actual</span>
                <span className="text-sm font-medium text-green-600">Activa</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Última actualización</span>
                <span className="text-sm font-medium">Ahora</span>
              </div>

            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Key className="h-4 w-4 mr-2" />
                Cambiar Contraseña
              </Button>
              
              {admin.rol === 'super_admin' && (
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración del Sistema
                </Button>
              )}
              
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageCircle className="h-4 w-4 mr-2" />
                Centro de Mensajes
              </Button>

            </CardContent>
          </Card>

        </div>
      </div>

      {/* Floating Action Button */}
      {showFloatingButton && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex flex-col gap-2">
            {/* Save Status Indicator */}
            {isSaving && isEditing && (
              <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </div>
            )}
            
            {/* Action Buttons */}
            {!isEditing ? (
              // Edit Button when not in edit mode
              <Button
                variant="default"
                size="lg"
                onClick={() => setIsEditing(true)}
                className="shadow-lg hover:shadow-xl h-14 w-14 rounded-full"
              >
                <Edit className="h-6 w-6" />
              </Button>
            ) : (
              // Cancel button when in edit mode
              <div className="flex flex-col gap-2 items-end">
                {isSaving && (
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-lg shadow-lg flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Guardando...
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="bg-white shadow-lg hover:shadow-xl"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-save Status Indicator */}
      {isEditing && !showFloatingButton && (
        <div className="fixed bottom-6 right-6 z-40">
          {isSaving ? (
            <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </div>
          ) : (
            <div className="bg-green-500 text-white px-3 py-1 rounded-lg shadow-lg text-xs opacity-75">
              🔄 Auto-guardado
            </div>
          )}
        </div>
      )}

    </div>
  );
}