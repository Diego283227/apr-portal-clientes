import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot,
  Settings,
  BarChart3,
  Users,
  MessageCircle,
  Clock,
  TrendingUp,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Shield,
  Plus,
  Trash2,
  Edit,
  X,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  SortAsc,
  SortDesc,
  User,
  Info,
  Ban,
  CheckCircle2,
  Menu
} from 'lucide-react';
import { toast } from '@/components/ui/enhanced-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useExcludedTermsSimple, type ExcludedTerm } from '@/hooks/useExcludedTermsSimple';
import { format } from 'date-fns';

interface AIConfig {
  id: number;
  systemPrompt: string;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  maxTokensPerMessage: number;
  temperature: number;
  aiProvider: 'openai' | 'anthropic' | 'local';
  model: string;
  hasApiKey: boolean;
}

interface UsageStats {
  daily: Array<{
    date: string;
    totalMessages: number;
    totalTokens: number;
    activeUsers: number;
  }>;
  summary: {
    totalConversations: number;
    totalMessages: number;
    activeUsersToday: number;
  };
}

// ExcludedTerm interface ahora se importa desde el hook

export default function AIAssistantManager() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Estado para el menú hamburguesa
  const [activeView, setActiveView] = useState<'config' | 'excluded-terms' | 'stats'>('config');
  const [menuOpen, setMenuOpen] = useState(false);

  // Estado para colores de tabs
  const [tabColors, setTabColors] = useState({
    config: '#3b82f6', // blue-500
    'excluded-terms': '#10b981', // green-500
    stats: '#8b5cf6', // purple-500
  });

  // Estados para términos excluidos (administrador necesita ver todos los términos)
  const [excludedTerms, setExcludedTerms] = useState<ExcludedTerm[]>([]);
  const [excludedTermsLoading, setExcludedTermsLoading] = useState(true);
  const [excludedTermsError, setExcludedTermsError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Calculamos las métricas localmente
  const activeTerms = excludedTerms.filter(term => term.isActive);
  const activeTermsCount = activeTerms.length;
  const totalTerms = excludedTerms.length;

  const [newTerm, setNewTerm] = useState('');
  const [newTermReason, setNewTermReason] = useState('');
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editTermValue, setEditTermValue] = useState('');
  const [editTermReason, setEditTermReason] = useState('');
  const [savingTerm, setSavingTerm] = useState(false);

  // Estados para búsqueda y filtros integrados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'term' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filteredTerms, setFilteredTerms] = useState<ExcludedTerm[]>([]);

  // Funciones memoizadas para búsqueda y filtrado
  const applyFilters = useCallback(() => {
    let filtered = [...excludedTerms];

    // Filtrar por texto de búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(term =>
        term.term.toLowerCase().includes(search) ||
        (term.reason && term.reason.toLowerCase().includes(search))
      );
    }

    // Filtrar por estado
    if (statusFilter === 'active') {
      filtered = filtered.filter(term => term.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(term => !term.isActive);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case 'term':
          aValue = a.term.toLowerCase();
          bValue = b.term.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default:
          aValue = a.term.toLowerCase();
          bValue = b.term.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTerms(filtered);
  }, [excludedTerms, searchTerm, statusFilter, sortBy, sortOrder]);


  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setFilteredTerms([]);
  }, []);

  useEffect(() => {
    loadConfig();
    loadStats();
    loadExcludedTerms();
  }, []);

  // Efecto para aplicar filtros en tiempo real
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/ai-assistant/admin/config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        toast.error('Error al cargar configuración del asistente');
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
      toast.error('Error de conexión');
    }
  };

  const loadExcludedTerms = async () => {
    try {
      setExcludedTermsLoading(true);
      setExcludedTermsError(null);

      const response = await fetch('/api/ai-assistant/admin/excluded-terms', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Términos excluidos cargados:', data.terms);
        setExcludedTerms(data.terms || []);
        setLastUpdate(new Date());
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar términos excluidos');
      }
    } catch (err) {
      console.error('Error loading excluded terms:', err);
      setExcludedTermsError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar términos excluidos');
    } finally {
      setExcludedTermsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/ai-assistant/admin/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('Error loading stats');
      }
    } catch (error) {
      console.error('Error loading AI stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const updateData = {
        ...config,
        ...(apiKey && { apiKey })
      };

      const response = await fetch('/api/ai-assistant/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success('Configuración actualizada exitosamente');
        setApiKey(''); // Limpiar API key del estado
        await loadConfig(); // Recargar config
      } else {
        toast.error('Error al actualizar configuración');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof AIConfig, value: any) => {
    if (config) {
      setConfig({ ...config, [field]: value });
    }
  };

  // Función para refresh manual de términos excluidos
  const loadExcludedTermsManual = async () => {
    try {
      setSavingTerm(true);
      await loadExcludedTerms();
      toast.success('Términos excluidos actualizados');
    } catch (error) {
      console.error('Error refreshing excluded terms:', error);
      toast.error('Error al actualizar términos excluidos');
    } finally {
      setSavingTerm(false);
    }
  };

  const addExcludedTerm = async () => {
    if (!newTerm.trim()) {
      toast.error('Ingresa un término válido');
      return;
    }

    try {
      setSavingTerm(true);
      const response = await fetch('/api/ai-assistant/admin/excluded-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          term: newTerm.trim(),
          reason: newTermReason.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Actualizar la lista de términos
        await loadExcludedTerms();
        setNewTerm('');
        setNewTermReason('');
        toast.success('Término excluido agregado exitosamente');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Error al agregar término');
      }
    } catch (error) {
      console.error('Error adding excluded term:', error);
      toast.error('Error de conexión');
    } finally {
      setSavingTerm(false);
    }
  };

  const updateExcludedTerm = async (id: string) => {
    if (!editTermValue.trim()) {
      toast.error('Ingresa un término válido');
      return;
    }

    try {
      setSavingTerm(true);
      const response = await fetch(`/api/ai-assistant/admin/excluded-terms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          term: editTermValue.trim(),
          reason: editTermReason.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Actualizar la lista de términos
        await loadExcludedTerms();
        setEditingTerm(null);
        setEditTermValue('');
        setEditTermReason('');
        toast.success('Término actualizado exitosamente');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Error al actualizar término');
      }
    } catch (error) {
      console.error('Error updating excluded term:', error);
      toast.error('Error de conexión');
    } finally {
      setSavingTerm(false);
    }
  };

  const toggleTermStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/ai-assistant/admin/excluded-terms/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        const data = await response.json();
        // Actualizar la lista de términos
        await loadExcludedTerms();
        toast.success(`Término ${isActive ? 'activado' : 'desactivado'} exitosamente`);
      } else {
        toast.error('Error al cambiar estado del término');
      }
    } catch (error) {
      console.error('Error toggling term status:', error);
      toast.error('Error de conexión');
    }
  };

  const handleDeleteExcludedTerm = async (id: string) => {
    try {
      const response = await fetch(`/api/ai-assistant/admin/excluded-terms/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Actualizar la lista de términos
        await loadExcludedTerms();
        toast.success('Término eliminado exitosamente');
      } else {
        toast.error('Error al eliminar término', {
          description: 'No se pudo eliminar el término. Inténtalo de nuevo.'
        });
      }
    } catch (error) {
      console.error('Error deleting excluded term:', error);
      toast.error('Error de conexión', {
        description: 'Verifica tu conexión a internet e inténtalo de nuevo'
      });
    }
  };

  const startEditingTerm = (term: ExcludedTerm) => {
    setEditingTerm(term.id);
    setEditTermValue(term.term);
    setEditTermReason(term.reason || '');
  };

  const cancelEditing = () => {
    setEditingTerm(null);
    setEditTermValue('');
    setEditTermReason('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  // Obtener el título de la vista activa
  const getViewTitle = () => {
    switch (activeView) {
      case 'config':
        return 'Configuración';
      case 'excluded-terms':
        return 'Términos Excluidos';
      case 'stats':
        return 'Estadísticas';
      default:
        return 'Configuración';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con badge y menú móvil */}
      <div className="flex items-center justify-between lg:justify-end">
        <Badge variant={config?.isActive ? "default" : "secondary"} className="flex items-center gap-1.5 px-3 py-1.5">
          {config?.isActive ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          <span className="font-medium">{config?.isActive ? 'Activo' : 'Inactivo'}</span>
        </Badge>
        {/* Botón hamburguesa - Solo en móvil */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Navegación horizontal - Solo en desktop */}
      <div className="hidden lg:flex items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-1.5">
        <button
          onClick={() => setActiveView('config')}
          className={`flex items-center gap-2.5 px-6 py-3 font-semibold rounded-lg transition-all relative group ${
            activeView === 'config'
              ? 'text-white shadow-lg scale-105'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
          style={{
            backgroundColor: activeView === 'config' ? tabColors.config : 'transparent'
          }}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm">Configuración</span>
          <input
            type="color"
            value={tabColors.config}
            onChange={(e) => setTabColors({ ...tabColors, config: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="absolute -right-1 -top-1 w-5 h-5 rounded-full cursor-pointer border-2 border-white dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            title="Cambiar color"
          />
        </button>

        <button
          onClick={() => setActiveView('excluded-terms')}
          className={`flex items-center gap-2.5 px-6 py-3 font-semibold rounded-lg transition-all relative group ${
            activeView === 'excluded-terms'
              ? 'text-white shadow-lg scale-105'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
          style={{
            backgroundColor: activeView === 'excluded-terms' ? tabColors['excluded-terms'] : 'transparent'
          }}
        >
          <Shield className="w-5 h-5" />
          <span className="text-sm">Términos Excluidos</span>
          <input
            type="color"
            value={tabColors['excluded-terms']}
            onChange={(e) => setTabColors({ ...tabColors, 'excluded-terms': e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="absolute -right-1 -top-1 w-5 h-5 rounded-full cursor-pointer border-2 border-white dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            title="Cambiar color"
          />
        </button>

        <button
          onClick={() => setActiveView('stats')}
          className={`flex items-center gap-2.5 px-6 py-3 font-semibold rounded-lg transition-all relative group ${
            activeView === 'stats'
              ? 'text-white shadow-lg scale-105'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
          }`}
          style={{
            backgroundColor: activeView === 'stats' ? tabColors.stats : 'transparent'
          }}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-sm">Estadísticas</span>
          <input
            type="color"
            value={tabColors.stats}
            onChange={(e) => setTabColors({ ...tabColors, stats: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="absolute -right-1 -top-1 w-5 h-5 rounded-full cursor-pointer border-2 border-white dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            title="Cambiar color"
          />
        </button>
      </div>

      {/* Overlay del menú */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menú lateral desplegable - Solo móvil */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 lg:hidden ${
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
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <button
              onClick={() => {
                setActiveView('config');
                setMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'config'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: activeView === 'config' ? tabColors.config : 'transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Configuración</span>
              </div>
              <input
                type="color"
                value={tabColors.config}
                onChange={(e) => setTabColors({ ...tabColors, config: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded cursor-pointer border border-gray-300"
                title="Cambiar color"
              />
            </button>

            <button
              onClick={() => {
                setActiveView('excluded-terms');
                setMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'excluded-terms'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: activeView === 'excluded-terms' ? tabColors['excluded-terms'] : 'transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Términos Excluidos</span>
              </div>
              <input
                type="color"
                value={tabColors['excluded-terms']}
                onChange={(e) => setTabColors({ ...tabColors, 'excluded-terms': e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded cursor-pointer border border-gray-300"
                title="Cambiar color"
              />
            </button>

            <button
              onClick={() => {
                setActiveView('stats');
                setMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'stats'
                  ? 'text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: activeView === 'stats' ? tabColors.stats : 'transparent'
              }}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Estadísticas</span>
              </div>
              <input
                type="color"
                value={tabColors.stats}
                onChange={(e) => setTabColors({ ...tabColors, stats: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded cursor-pointer border border-gray-300"
                title="Cambiar color"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido según la vista activa */}
      <div className="space-y-6">
        {activeView === 'config' && config && (
          <>
            {/* Estado General - Destacado */}
            <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                        config.isActive
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <Bot className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          Asistente Virtual APR
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {config.isActive
                            ? '✓ Activo y disponible para todos los usuarios'
                            : '✗ Desactivado - No disponible para usuarios'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) => updateConfig('isActive', checked)}
                        className="scale-125"
                      />
                      <Badge
                        variant={config.isActive ? "default" : "secondary"}
                        className="font-semibold"
                      >
                        {config.isActive ? 'ACTIVO' : 'INACTIVO'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuración del Modelo */}
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    Configuración del Modelo AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 !border-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="aiProvider">Proveedor AI</Label>
                      <select
                        id="aiProvider"
                        className="w-full mt-1 px-3 py-2 border-0 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all focus:outline-none focus:shadow-md text-gray-800 dark:text-gray-200"
                        value={config.aiProvider}
                        onChange={(e) => updateConfig('aiProvider', e.target.value)}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="local">Modelo Local</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="model">Modelo</Label>
                      {config.aiProvider === 'openai' ? (
                        <select
                          id="model"
                          className="w-full mt-1 px-3 py-2 border-0 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all focus:outline-none focus:shadow-md text-gray-800 dark:text-gray-200"
                          value={config.model}
                          onChange={(e) => updateConfig('model', e.target.value)}
                        >
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Económico)</option>
                          <option value="gpt-4">GPT-4 (Avanzado)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo (Rápido)</option>
                        </select>
                      ) : config.aiProvider === 'anthropic' ? (
                        <select
                          id="model"
                          className="w-full mt-1 px-3 py-2 border-0 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all focus:outline-none focus:shadow-md text-gray-800 dark:text-gray-200"
                          value={config.model}
                          onChange={(e) => updateConfig('model', e.target.value)}
                        >
                          <option value="claude-3-haiku-20240307">Claude 3 Haiku (Económico)</option>
                          <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Equilibrado)</option>
                          <option value="claude-3-opus-20240229">Claude 3 Opus (Avanzado)</option>
                        </select>
                      ) : (
                        <Input
                          id="model"
                          value={config.model}
                          onChange={(e) => updateConfig('model', e.target.value)}
                          placeholder="nombre-del-modelo-local"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <Input
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={config.hasApiKey ? "••••••••••••••••" : 
                            config.aiProvider === 'openai' ? "sk-proj-..." : 
                            config.aiProvider === 'anthropic' ? "sk-ant-..." : 
                            "Ingresa tu API Key"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {config.hasApiKey ? 'API Key configurada. Deja en blanco para mantener la actual.' : 'API Key requerida para el funcionamiento.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="temperature">Creatividad (Temperature)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.temperature}
                        onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                      />
                      <p className="text-xs text-gray-500 mt-1">0 = Muy conservador, 1 = Muy creativo</p>
                    </div>
                    <div>
                      <Label htmlFor="maxTokens">Máximo Tokens por Respuesta</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        min="50"
                        max="2000"
                        value={config.maxTokensPerMessage}
                        onChange={(e) => updateConfig('maxTokensPerMessage', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Límites de Uso */}
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-800">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    Límites de Uso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <Label htmlFor="dailyLimit" className="font-semibold">Límite Diario</Label>
                      </div>
                      <Input
                        id="dailyLimit"
                        type="number"
                        min="1"
                        max="1000"
                        value={config.dailyLimit}
                        onChange={(e) => updateConfig('dailyLimit', parseInt(e.target.value))}
                        className="text-lg font-medium"
                      />
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Mensajes permitidos por usuario al día
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-red-500" />
                        <Label htmlFor="monthlyLimit" className="font-semibold">Límite Mensual</Label>
                      </div>
                      <Input
                        id="monthlyLimit"
                        type="number"
                        min="1"
                        max="10000"
                        value={config.monthlyLimit}
                        onChange={(e) => updateConfig('monthlyLimit', parseInt(e.target.value))}
                        className="text-lg font-medium"
                      />
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Mensajes permitidos por usuario al mes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt del Sistema */}
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    Instrucciones del Sistema (Prompt)
                  </CardTitle>

                  {/* Consejos Collapsible */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                          Mejores Prácticas para el Prompt
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-amber-800 dark:text-amber-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                            <span><strong>Sea específico:</strong> Define temas permitidos</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                            <span><strong>Use ejemplos:</strong> Muestre casos de uso</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Ban className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                            <span><strong>Defina límites:</strong> Qué NO puede hacer</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span><strong>Tono consistente:</strong> Define el estilo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="systemPrompt" className="text-base font-medium">
                        Instrucciones del Sistema
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateConfig('systemPrompt', '')}
                        >
                          Limpiar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Restaurar prompt por defecto
                            const defaultPrompt = `ERES UN ASISTENTE VIRTUAL EXCLUSIVO DEL SISTEMA APR (AGUA POTABLE RURAL).

## INSTRUCCIONES ESTRICTAS - CUMPLE ESTAS REGLAS SIN EXCEPCIÓN:

### 1. ALCANCE LIMITADO - SOLO APR:
- ÚNICAMENTE puedes responder sobre el sistema APR (Agua Potable Rural)
- Si la pregunta NO es sobre APR, responde exactamente: "Lo siento, solo puedo ayudarte con consultas relacionadas al sistema APR. ¿Tienes alguna pregunta sobre tus boletas, pagos, servicios de agua o procedimientos administrativos del APR?"

### 2. TEMAS AUTORIZADOS:
✅ **BOLETAS Y PAGOS**: Consulta de deudas, métodos de pago, fechas de vencimiento
✅ **SERVICIOS DE AGUA**: Cortes, mantención, problemas de suministro
✅ **PROCEDIMIENTOS**: Actualizar datos, solicitudes, trámites
✅ **INFORMACIÓN GENERAL**: Horarios, contactos, reglamentos

### 3. TEMAS PROHIBIDOS:
❌ Política, religión, deportes, entretenimiento
❌ Consejos médicos, legales o financieros generales  
❌ Cualquier tema fuera del sistema APR

### 4. FORMATO DE RESPUESTA:
- Máximo 3 párrafos cortos
- Si no sabes algo: "Te recomiendo contactar directamente a la administración del APR"
- Terminar preguntando si necesita ayuda con algo más del APR`;
                            updateConfig('systemPrompt', defaultPrompt);
                          }}
                        >
                          Restaurar Defecto
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      id="systemPrompt"
                      value={config.systemPrompt}
                      onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                      rows={16}
                      className="font-mono text-sm leading-relaxed"
                      placeholder="Define las instrucciones específicas para el asistente..."
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">💡 Consejos para un buen prompt:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Estructura clara</strong>: Usa títulos y listas para organizar las instrucciones</li>
                      <li>• <strong>Ejemplos específicos</strong>: "Si preguntan X, responde Y"</li>
                      <li>• <strong>Tono consistente</strong>: Define si debe ser formal, amigable, técnico</li>
                      <li>• <strong>Límites claros</strong>: Especifica qué NO debe hacer</li>
                      <li>• <strong>Respuesta estándar</strong>: Para temas fuera del alcance</li>
                    </ul>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500" />
                    <p>
                      <strong>Importante:</strong> Cambios en el prompt afectan todas las conversaciones nuevas. 
                      Las conversaciones existentes mantendrán el prompt anterior hasta que se inicialicen nuevamente.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Botón Guardar */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
          </>
        )}

        {activeView === 'excluded-terms' && (
          <>
          {/* Header de Términos Excluidos */}
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Shield className="h-5 w-5 text-blue-500" />
                Gestión de Términos Excluidos
              </CardTitle>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
                <h4 className="font-medium text-red-800 mb-2">🚫 Control de Contenido</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Los usuarios <strong>NO PODRÁN ENVIAR</strong> mensajes que contengan estos términos</li>
                  <li>• Se mostrará una <strong>advertencia clara</strong> al usuario sobre el término excluido</li>
                  <li>• Los términos pueden ser <strong>palabras</strong> o <strong>frases completas</strong></li>
                  <li>• La validación es <strong>case-insensitive</strong> (no distingue mayúsculas/minúsculas)</li>
                </ul>
              </div>
            </CardHeader>
          </Card>

          {/* Agregar Nuevo Término */}
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Plus className="h-5 w-5 text-blue-500" />
                Agregar Nuevo Término Excluido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 !border-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newTerm">Término o Frase</Label>
                  <Input
                    id="newTerm"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="Ej: palabra prohibida, frase completa..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puede ser una palabra o frase completa
                  </p>
                </div>
                <div>
                  <Label htmlFor="newTermReason">Razón (Opcional)</Label>
                  <Input
                    id="newTermReason"
                    value={newTermReason}
                    onChange={(e) => setNewTermReason(e.target.value)}
                    placeholder="Ej: Contenido inapropiado, fuera de contexto..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ayuda a recordar por qué se excluye este término
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={addExcludedTerm}
                  disabled={savingTerm || !newTerm.trim()}
                  className="flex items-center gap-2"
                >
                  {savingTerm ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {savingTerm ? 'Agregando...' : 'Agregar Término'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Términos Excluidos */}
          <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center justify-between text-gray-800 dark:text-gray-100">
                <div className="flex items-center gap-2">
                  <span>Términos Excluidos Actuales</span>
                  <Badge variant="secondary">{totalTerms}</Badge>
                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                    {activeTermsCount} activos
                  </Badge>
                  {lastUpdate && (
                    <Badge variant="outline" className="text-xs">
                      Actualizado {format(lastUpdate, 'HH:mm:ss')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {excludedTermsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadExcludedTermsManual}
                      disabled={savingTerm}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className={`h-4 w-4 ${savingTerm ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>

            {/* Controles de búsqueda y filtrado integrados */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Búsqueda por texto */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar términos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filtro por estado */}
                <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Solo activos</SelectItem>
                    <SelectItem value="inactive">Solo inactivos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Ordenar por */}
                <Select value={sortBy} onValueChange={(value: 'term' | 'createdAt' | 'updatedAt') => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term">Alfabético</SelectItem>
                    <SelectItem value="createdAt">Fecha de creación</SelectItem>
                    <SelectItem value="updatedAt">Última actualización</SelectItem>
                  </SelectContent>
                </Select>

                {/* Controles adicionales */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="flex items-center gap-1"
                    title="Limpiar filtros"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Estadísticas de filtrado */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Mostrando {filteredTerms.length} de {excludedTerms.length} términos
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Ver todos
                  </Button>
                </div>
              )}

              {/* Nota informativa */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">Gestión de términos</p>
                    <p className="text-blue-700 mt-1">
                      • <span className="font-medium text-red-700">Términos activos</span>: Bloquean mensajes que los contengan
                    </p>
                    <p className="text-blue-700">
                      • <span className="font-medium text-green-700">Términos permitidos</span>: Están desactivados pero conservados para reactivar cuando sea necesario
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent>
              {excludedTermsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando términos...</span>
                </div>
              ) : excludedTerms.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No hay términos excluidos
                  </h3>
                  <p className="text-gray-500">
                    Agrega términos que quieras prohibir en las conversaciones del asistente virtual
                  </p>
                </div>
              ) : (
                <>
                  {/* Mensaje cuando hay filtros activos pero no hay resultados */}
                  {(searchTerm || statusFilter !== 'all') && filteredTerms.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No se encontraron términos
                      </h3>
                      <p className="text-gray-500 mb-4">
                        No hay términos que coincidan con los filtros aplicados
                      </p>
                      <Button variant="outline" onClick={resetFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Limpiar filtros
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(searchTerm || statusFilter !== 'all' ? filteredTerms : excludedTerms).map((term) => (
                        <Card
                          key={term.id}
                          className={`transition-all duration-200 hover:shadow-sm border ${
                            term.isActive
                              ? 'border-red-200 bg-white hover:bg-red-50/30'
                              : 'border-green-200 bg-white hover:bg-green-50/30'
                          }`}
                        >
                          {editingTerm === term.id ? (
                            /* Modo Edición - Minimalista */
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Edit className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-gray-900">Editando término</span>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <Input
                                      value={editTermValue}
                                      onChange={(e) => setEditTermValue(e.target.value)}
                                      placeholder="Término a excluir..."
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      value={editTermReason}
                                      onChange={(e) => setEditTermReason(e.target.value)}
                                      placeholder="Razón (opcional)..."
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cancelEditing}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => updateExcludedTerm(term.id)}
                                    disabled={savingTerm}
                                  >
                                    {savingTerm ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <Save className="h-3 w-3 mr-1" />
                                    )}
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          ) : (
                            /* Modo Vista - Minimalista */
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                {/* Término y estado */}
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-2 h-8 rounded-full ${
                                    term.isActive ? 'bg-red-500' : 'bg-green-500'
                                  }`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="bg-gray-100 text-gray-900 px-2 py-0.5 rounded text-sm font-mono">
                                        {term.term}
                                      </code>
                                      <Badge
                                        variant={term.isActive ? "destructive" : "secondary"}
                                        className={`h-5 text-xs ${
                                          !term.isActive ? 'bg-green-100 text-green-700 border-green-200' : ''
                                        }`}
                                      >
                                        {term.isActive ? 'Activo' : 'Inactivo'}
                                      </Badge>
                                    </div>
                                    {term.reason && (
                                      <p className="text-xs text-gray-600 mt-1">{term.reason}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                      <span>
                                        {(() => {
                                          try {
                                            const date = new Date(term.createdAt);
                                            return isNaN(date.getTime()) ? 'N/A' : format(date, 'dd/MM/yy');
                                          } catch {
                                            return 'N/A';
                                          }
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-1 ml-4">
                                  <Switch
                                    checked={term.isActive}
                                    onCheckedChange={(checked) => toggleTermStatus(term.id, checked)}
                                    disabled={savingTerm}
                                    size="sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingTerm(term)}
                                    disabled={savingTerm}
                                    className="h-7 w-7 p-0 hover:bg-blue-100"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <ConfirmDialog
                                    title="Eliminar Término"
                                    description={`¿Eliminar "${term.term}"?`}
                                    confirmText="Eliminar"
                                    variant="destructive"
                                    onConfirm={() => handleDeleteExcludedTerm(term.id)}
                                    isLoading={savingTerm}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={savingTerm}
                                      className="h-7 w-7 p-0 hover:bg-red-100 text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </ConfirmDialog>
                                </div>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Información de Uso */}
          <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
            <CardHeader className="!border-0">
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Información Importante
              </CardTitle>
            </CardHeader>
            <CardContent className="!border-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-3">💡 Cómo Funciona:</h4>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li>
                    <strong>1. Validación en Tiempo Real:</strong> Antes de enviar un mensaje al asistente,
                    se verifica si contiene términos excluidos.
                  </li>
                  <li>
                    <strong>2. Mensaje de Advertencia:</strong> Si se detecta un término prohibido,
                    se muestra una advertencia específica al usuario.
                  </li>
                  <li>
                    <strong>3. Bloqueo de Envío:</strong> El mensaje no se procesa ni se envía al asistente virtual.
                  </li>
                  <li>
                    <strong>4. Actualización Instantánea:</strong> Los cambios se sincronizan automáticamente
                    con todos los usuarios conectados usando WebSockets.
                  </li>
                </ul>
              </div>

              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">🔄 Sistema en Tiempo Real:</h4>
                <div className="text-sm text-green-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <strong>Estado actual:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• Total: {totalTerms} términos</li>
                      <li>• Activos: {activeTermsCount} términos</li>
                      <li>• Inactivos: {totalTerms - activeTermsCount} términos</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Sincronización:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• ✅ Actualizaciones automáticas</li>
                      <li>• ✅ Sin necesidad de recargar</li>
                      <li>• ✅ Todos los usuarios sincronizados</li>
                    </ul>
                  </div>
                </div>
                {lastUpdate && (
                  <p className="text-xs text-green-600 mt-2">
                    Última actualización: {format(lastUpdate, 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                )}
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">📋 Ejemplos de Uso:</h4>
                <div className="text-sm text-blue-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <strong>Palabras individuales:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• "política"</li>
                      <li>• "religión"</li>
                      <li>• "dinero"</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Frases completas:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• "información personal"</li>
                      <li>• "datos bancarios"</li>
                      <li>• "fuera del tema"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {activeView === 'stats' && stats && (
          <>
              {/* Resumen de Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !border-0">
                    <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-100">Conversaciones Activas</CardTitle>
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent className="!border-0">
                    <div className="text-2xl font-bold">{stats.summary.totalConversations}</div>
                    <p className="text-xs text-muted-foreground">
                      Total de conversaciones creadas
                    </p>
                  </CardContent>
                </Card>

                <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !border-0">
                    <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-100">Mensajes Totales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent className="!border-0">
                    <div className="text-2xl font-bold">{stats.summary.totalMessages}</div>
                    <p className="text-xs text-muted-foreground">
                      Mensajes procesados históricamente
                    </p>
                  </CardContent>
                </Card>

                <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !border-0">
                    <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-100">Usuarios Activos Hoy</CardTitle>
                    <Users className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent className="!border-0">
                    <div className="text-2xl font-bold">{stats.summary.activeUsersToday}</div>
                    <p className="text-xs text-muted-foreground">
                      Usuarios que han enviado mensajes hoy
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Estadísticas Diarias */}
              <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
                <CardHeader className="!border-0">
                  <CardTitle className="text-gray-800 dark:text-gray-100">Actividad Reciente (Últimos 7 días)</CardTitle>
                </CardHeader>
                <CardContent className="!border-0">
                  <div className="space-y-4">
                    {stats.daily.slice(0, 7).map((day, index) => (
                      <div key={day.date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(day.date).toLocaleDateString('es-CL')}</p>
                          <p className="text-sm text-gray-600">{day.activeUsers} usuarios activos</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{day.totalMessages}</p>
                          <p className="text-sm text-gray-600">mensajes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          </>
        )}
      </div>

    </div>
  );
}