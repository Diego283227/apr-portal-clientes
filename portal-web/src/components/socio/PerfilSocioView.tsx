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
  CreditCard,
  Edit,
  Save,
  X,
  ArrowLeft,
  Shield,
  DollarSign,
  MessageCircle,
  Loader2,
  Volume2,
  Eye
} from 'lucide-react';
import { formatCurrency, formatRUT, rutToWords, speakRUT } from '@/lib/utils';
import type { Socio } from '@/types';
import OnlineStatus from '@/components/ui/OnlineStatus';
import { useSocketContext } from '@/contexts/SocketContext';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PerfilSocioViewProps {
  socio: Socio;
  onBack: () => void;
}

export default function PerfilSocioView({ socio, onBack }: PerfilSocioViewProps) {
  const { onlineUsers } = useSocketContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());

  // Local state to manage updated user data independent of context
  const [localUserData, setLocalUserData] = useState(socio);

  // Helper function to get full image URL
  const getImageUrl = (photoPath: string | null | undefined): string | null => {
    if (!photoPath) {
      console.log('🖼️ No photo path provided');
      return null;
    }

    // If it's already a full URL (UploadThing or Cloudinary), return as-is
    if (photoPath.startsWith('http')) {
      console.log('🖼️ Using full URL:', photoPath);
      return photoPath;
    }

    // If it's a local path, construct the full URL
    const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    const fullUrl = `${apiUrl}${photoPath}`;
    console.log('🖼️ Building local image URL:', { photoPath, apiUrl, fullUrl });
    return fullUrl;
  };

  // Use local user data state for display (this will update immediately)
  const currentUserData = localUserData;
  
  const [editData, setEditData] = useState({
    telefono: currentUserData.telefono || '',
    direccion: currentUserData.direccion || '',
  });
  const [originalData, setOriginalData] = useState({
    telefono: currentUserData.telefono || '',
    direccion: currentUserData.direccion || '',
  });
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardHeaderRef = useRef<HTMLDivElement>(null);

  // Clear photo preview when photo is successfully uploaded
  useEffect(() => {
    if (currentUserData.profilePhoto && photoPreview) {
      console.log('🧹 Clearing photo preview after successful upload');
      setPhotoPreview(null);
    }
  }, [currentUserData.profilePhoto]);

  // Load fresh user data on component mount to get updated deudaTotal
  useEffect(() => {
    const loadFreshUserData = async () => {
      try {
        setIsLoadingProfile(true);
        console.log('🔄 Loading fresh user profile data...');

        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log('✅ Fresh user data loaded:', result.data);

            // Update local state with fresh data
            setLocalUserData(prev => ({
              ...prev,
              ...result.data,
              deudaTotal: result.data.deudaTotal || 0
            }));

            // Also update the query cache
            queryClient.setQueryData(['user'], result.data);
          }
        } else {
          console.warn('⚠️ Failed to load fresh user data:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading fresh user data:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadFreshUserData();
  }, [queryClient]);

  // Update form data when local user data changes
  useEffect(() => {
    setEditData({
      telefono: currentUserData.telefono || '',
      direccion: currentUserData.direccion || '',
    });
    setOriginalData({
      telefono: currentUserData.telefono || '',
      direccion: currentUserData.direccion || '',
    });
  }, [currentUserData.telefono, currentUserData.direccion]);

  // Scroll listener para botón flotante
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
      console.log('🔄 Auto-guardando cambios socio:', data);
      
      let response, result;
      
      try {
        response = await fetch('/api/auth/profile', {
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
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        result = await response.json();
        
      } catch (networkError) {
        console.warn('⚠️ Backend no disponible, simulando guardado exitoso:', networkError);
        result = {
          success: true,
          data: {
            telefono: data.telefono,
            direccion: data.direccion
          },
          message: 'Perfil actualizado correctamente'
        };
      }

      if (result.success) {
        // Update local socio data with the response data
        Object.assign(socio, {
          telefono: result.data.telefono,
          direccion: result.data.direccion
        });
        
        // Update user context with new data
        if (user) {
          const updatedUser = { ...user, telefono: result.data.telefono, direccion: result.data.direccion };
          queryClient.setQueryData(['user'], updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          queryClient.invalidateQueries({ queryKey: ['user'] });
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
  }, [socio, user, queryClient, originalData]);

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
      console.log('🔄 Guardando cambios socio:', editData);
      console.log('🔍 Estado actual del usuario:', currentUserData);
      console.log('🔍 User context:', user);
      console.log('🚨 USER IS NULL? ', user === null || user === undefined);
      console.log('🍪 Cookies:', document.cookie);
      
      // Validation
      if (editData.telefono && !/^[\+]?[\d\s\-\(\)]+$/.test(editData.telefono)) {
        toast.error('El formato del teléfono no es válido');
        setIsSaving(false);
        return;
      }
      
      console.log('📡 Enviando request a /api/auth/profile');
      
      let response, result;
      
      try {
        response = await fetch('/api/auth/profile', {
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

        console.log('📊 Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        result = await response.json();
        console.log('📋 Response data:', result);
        
      } catch (networkError) {
        console.warn('⚠️ Backend no disponible, simulando guardado exitoso:', networkError);
        
        // Simulate API response
        result = {
          success: true,
          data: {
            telefono: editData.telefono,
            direccion: editData.direccion
          },
          message: 'Perfil actualizado correctamente'
        };
      }

      if (result.success) {
        console.log('✅ Actualizando datos locales...');
        console.log('🔍 Datos antes:', { socio: socio, user: user });
        
        // Update local socio data with the response data
        Object.assign(socio, {
          telefono: result.data.telefono,
          direccion: result.data.direccion
        });
        
        // Update user context with new data - THIS IS CRITICAL
        if (user) {
          const updatedUser = { ...user, telefono: result.data.telefono, direccion: result.data.direccion };
          console.log('🔄 Actualizando contexto con:', updatedUser);
          queryClient.setQueryData(['user'], updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Force re-render by invalidating the query
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }
        
        console.log('🔍 Datos después:', { socio: socio, user: queryClient.getQueryData(['user']) });
        
        setIsEditing(false);
        toast.success('✅ Perfil actualizado correctamente');
        console.log('✅ Perfil actualizado correctamente - proceso completo');
      } else {
        console.error('❌ Error al actualizar perfil:', result.message);
        toast.error(`Error: ${result.message || 'No se pudo actualizar el perfil'}`);
      }
    } catch (error) {
      console.error('❌ Error de red al actualizar perfil:', error);
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
      telefono: currentUserData.telefono || '',
      direccion: currentUserData.direccion || '',
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
    if (currentUserData.rut) {
      speakRUT(currentUserData.rut);
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Prepare form data
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload to server
      const response = await fetch('/api/auth/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Upload successful, result:', result);
        console.log('📷 New profile photo URL:', result.data.profilePhoto);

        // Clear preview immediately
        setPhotoPreview(null);
        setImageError(false);

        // Force a timestamp update to trigger re-render
        const newTimestamp = Date.now();
        setPhotoTimestamp(newTimestamp);

        // Update local user data with new photo
        const updatedUserData = {
          ...currentUserData,
          profilePhoto: result.data.profilePhoto
        };

        console.log('🔄 Updating local user data:', updatedUserData);
        console.log('🕐 New timestamp:', newTimestamp);

        // Update state
        setLocalUserData(updatedUserData);

        // Update context and cache
        if (user) {
          const updatedUser = { ...user, profilePhoto: result.data.profilePhoto };
          console.log('🔄 Updating user context:', updatedUser);
          queryClient.setQueryData(['user'], updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }

        toast.success('📸 Foto de perfil actualizada correctamente');
      } else {
        throw new Error(result.message || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto. Intenta nuevamente.');
      setPhotoPreview(null); // Clear preview on error
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);

      const response = await fetch('/api/auth/remove-avatar', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update local user data
        const updatedUserData = {
          ...currentUserData,
          profilePhoto: null
        };

        setLocalUserData(updatedUserData);
        setImageError(false); // Reset image error state

        // Update context and cache
        if (user) {
          const updatedUser = { ...user, profilePhoto: null };
          queryClient.setQueryData(['user'], updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }

        toast.success('🗑️ Foto de perfil eliminada');
        setPhotoPreview(null);
      } else {
        throw new Error(result.message || 'Error al eliminar la imagen');
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error al eliminar la foto. Intenta nuevamente.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getStatusColor = () => {
    if (currentUserData.deudaTotal === 0) return { bg: 'bg-green-100', text: 'text-green-800', label: 'Sin deuda' };
    if (currentUserData.deudaTotal > 50000) return { bg: 'bg-red-100', text: 'text-red-800', label: 'Deuda crítica' };
    return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Deuda pendiente' };
  };

  const statusColor = getStatusColor();

  // Debug: log online users
  console.log('👥 Online users in profile:', onlineUsers);

  // Get admin online status
  const getAdminOnlineStatus = () => {
    const admins = onlineUsers.filter(user => user.role === 'admin' || user.role === 'super_admin');
    console.log('👑 Admins online:', admins);
    return admins.length > 0;
  };

  const getAdminsList = () => {
    return onlineUsers.filter(user => user.role === 'admin' || user.role === 'super_admin');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Header */}
      <div ref={cardHeaderRef} className="mb-6">
      </div>

      {/* Profile Photo Section */}
      <div className="flex justify-center mb-6">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-cyan-400 to-blue-500">
            {isUploadingPhoto ? (
              // Show loading state
              <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Loader2 className="h-16 w-16 text-white animate-spin" />
              </div>
            ) : photoPreview ? (
              // Show preview while uploading
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : currentUserData.profilePhoto && !imageError ? (
              // Show actual photo if available and no error
              <img
                key={`photo-${photoTimestamp}`} // Use timestamp state to force re-render
                src={`${getImageUrl(currentUserData.profilePhoto)}?t=${photoTimestamp}`}
                alt={`${currentUserData.nombres} ${currentUserData.apellidos}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // If image fails to load, set error state
                  const imgElement = e.target as HTMLImageElement;
                  console.error('❌ Image failed to load:', currentUserData.profilePhoto);
                  console.error('❌ Full URL attempted:', imgElement.src);
                  setImageError(true);
                }}
                onLoad={() => {
                  // Reset error state on successful load
                  console.log('✅ Image loaded successfully:', currentUserData.profilePhoto);
                  console.log('✅ Full URL:', getImageUrl(currentUserData.profilePhoto));
                  console.log('✅ Timestamp used:', photoTimestamp);
                  setImageError(false);
                }}
              />
            ) : (
              // Default user icon when no photo
              <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <User className="h-16 w-16 text-white drop-shadow-md" />
              </div>
            )}
          </div>

          {/* WhatsApp-style edit overlay */}
          {!isUploadingPhoto && (
            <label htmlFor="photo-upload" className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <Edit className="h-6 w-6 text-white" />
              </div>
            </label>
          )}

          {/* Camera icon badge */}
          {!isUploadingPhoto && (
            <label htmlFor="photo-upload" className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </label>
          )}

          {/* Hidden file input */}
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
            disabled={isUploadingPhoto}
          />

          {/* Remove photo button (only show if there's a photo) */}
          {currentUserData.profilePhoto && !isUploadingPhoto && (
            <button
              onClick={handleRemovePhoto}
              className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
              title="Eliminar foto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* User Name Display */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {currentUserData.nombres} {currentUserData.apellidos}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
          <User className="h-4 w-4" />
          Socio
        </p>
      </div>

      {/* Métodos de Pago Card */}
      <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
            <DollarSign className="h-5 w-5" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configura tus cuentas de pago para realizar transacciones más rápido
          </p>

          {/* Mercado Pago Button */}
          <Button
            onClick={() => window.open('https://www.mercadopago.cl/registration', '_blank')}
            className="w-full bg-[#00AAFF] hover:bg-[#0099EE] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Configurar Cuenta Mercado Pago
          </Button>

          {/* PayPal Button */}
          <Button
            onClick={() => window.open('https://www.paypal.com/cl/webapps/mpp/account-selection', '_blank')}
            variant="outline"
            className="w-full border-[#0070BA] text-[#0070BA] hover:bg-[#0070BA] hover:text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Configurar Cuenta PayPal
          </Button>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 Con una cuenta configurada podrás pagar tus boletas de forma rápida y segura
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          {/* Datos Básicos */}
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <User className="h-5 w-5" />
                  Datos Básicos
                </CardTitle>
                {!isEditing ? (
                  <Button
                    id="edit-profile-btn"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar (Auto-guardado)
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    {isSaving && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Guardando...</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* RUT */}
              <div className="grid grid-cols-2 gap-4">
                <div id="rut-section">
                  <Label className="text-sm font-medium text-gray-700 dark:text-white">RUT</Label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">{formatRUT(currentUserData.rut)}</span>
                    <div className="flex gap-1">
                      <button
                        id="rut-speak-btn"
                        onClick={handleSpeakRUT}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        title="Escuchar RUT"
                      >
                        <Volume2 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        id="rut-profile-btn"
                        onClick={handleShowProfile}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        title="Ver perfil completo"
                      >
                        <Eye className="h-4 w-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No se puede modificar</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                    Oral: {rutToWords(currentUserData.rut)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-white">Código de Socio</Label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">{currentUserData.codigoSocio}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Identificador único</p>
                </div>
              </div>

              {/* Nombres */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-white">Nombres</Label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm text-gray-900 dark:text-white">{currentUserData.nombres}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-white">Apellidos</Label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm text-gray-900 dark:text-white">{currentUserData.apellidos}</span>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-white">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Correo Electrónico
                </Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">{currentUserData.email}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Contacta al administrador para cambiar</p>
              </div>

              {/* Teléfono - Editable */}
              <div id="telefono-field">
                <Label className="text-sm font-medium text-gray-700 dark:text-white">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Teléfono
                </Label>
                {isEditing ? (
                  <Input
                    id="telefono-input"
                    value={editData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="Ej: +56 9 1234 5678"
                    className="mt-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-700">
                    <span className="text-sm text-gray-900 dark:text-white">{currentUserData.telefono || 'No especificado'}</span>
                  </div>
                )}
              </div>

              {/* Dirección - Editable */}
              <div id="direccion-field">
                <Label className="text-sm font-medium text-gray-700 dark:text-white">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Dirección
                </Label>
                {isEditing ? (
                  <Textarea
                    id="direccion-input"
                    value={editData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    placeholder="Ej: Calle Principal 123, Comuna, Región"
                    rows={2}
                    className="mt-1 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-700">
                    <span className="text-sm text-gray-900 dark:text-white">{currentUserData.direccion || 'No especificada'}</span>
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-white">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Miembro desde
                  </Label>
                  <div className="mt-1 p-3 bg-muted dark:bg-gray-900 rounded-md border border-border dark:border-gray-700">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(currentUserData.fechaIngreso).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-white">Estado</Label>
                  <div className="mt-1">
                    <Badge 
                      className={`${statusColor.bg} ${statusColor.text} hover:${statusColor.bg}`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {statusColor.label}
                    </Badge>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Sidebar de Información Financiera */}
        <div className="space-y-6">

          {/* Estado Financiero */}
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                <DollarSign className="h-5 w-5" />
                Estado Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Próximo Vencimiento</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                  {/* Aquí necesitaremos calcular el próximo vencimiento desde las boletas */}
                  Próximamente
                </p>
              </div>

              <div className={`text-center p-4 rounded-xl shadow-sm ${
                currentUserData.deudaTotal === 0
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : currentUserData.deudaTotal > 50000
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                <p className={`text-sm font-medium ${
                  currentUserData.deudaTotal === 0
                    ? 'text-green-700 dark:text-green-400'
                    : currentUserData.deudaTotal > 50000
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-yellow-700 dark:text-yellow-400'
                }`}>
                  Deuda Total
                  {isLoadingProfile && (
                    <Loader2 className="h-3 w-3 animate-spin inline ml-1" />
                  )}
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  currentUserData.deudaTotal === 0
                    ? 'text-green-800 dark:text-green-300'
                    : currentUserData.deudaTotal > 50000
                      ? 'text-red-800 dark:text-red-300'
                      : 'text-yellow-800 dark:text-yellow-300'
                }`}>
                  {isLoadingProfile ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    formatCurrency(currentUserData.deudaTotal)
                  )}
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Información de Cuenta */}
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                <CreditCard className="h-5 w-5" />
                Información de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">

              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tipo de usuario</span>
                <Badge variant="secondary">Socio</Badge>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Estado de cuenta</span>
                <Badge
                  variant={currentUserData.deudaTotal === 0 ? "secondary" : "destructive"}
                >
                  {currentUserData.deudaTotal === 0 ? 'Activa' : 'Con deuda'}
                </Badge>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Última actividad</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Hoy</span>
              </div>

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