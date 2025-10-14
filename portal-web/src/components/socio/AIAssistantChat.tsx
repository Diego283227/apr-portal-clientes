import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  User,
  Plus,
  MessageCircle,
  Trash2,
  Edit3,
  Clock,
  AlertCircle,
  AlertTriangle,
  Shield,
  Ban,
  X,
  Check,
  Loader2,
  Search,
  MoreVertical,
  Copy,
  Calendar,
  Hash,
  Menu,
  History,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useExcludedTermsSimple } from '@/hooks/useExcludedTermsSimple';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  tokens?: number;
  processingTime?: number;
  isLoading?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: string | null;
}

interface UsageLimits {
  canSend: boolean;
  daily: {
    used: number;
    limit: number;
    remaining: number;
  };
  monthly: {
    used: number;
    limit: number;
    remaining: number;
  };
}

interface ExcludedTerm {
  id: string;
  term: string;
  reason?: string;
  isActive: boolean;
}

interface AIAssistantChatProps {
  onClose: () => void;
}

// Componente memoizado para items de conversación
const ConversationItem = React.memo(({ 
  conv, 
  isSelected, 
  isEditing, 
  editingTitleValue,
  onSelect, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit, 
  onTitleChange,
  onCopyId,
  onDelete 
}: {
  conv: Conversation;
  isSelected: boolean;
  isEditing: boolean;
  editingTitleValue: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onTitleChange: (value: string) => void;
  onCopyId: () => void;
  onDelete: () => void;
}) => {
  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${
        isSelected
          ? 'bg-blue-50 border-blue-200 border'
          : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-1">
              <Input
                value={editingTitleValue}
                onChange={(e) => onTitleChange(e.target.value)}
                className="h-7 text-sm"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSaveEdit();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit();
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7" 
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm truncate pr-2">
                  {conv.title}
                </h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar título
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onCopyId();
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <MessageCircle className="h-3 w-3" />
                <span>{conv.messageCount} mensajes</span>
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: es })}</span>
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {conv.lastMessage}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <Hash className="h-3 w-3" />
                <span className="font-mono">{conv.id.slice(0, 8)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default function AIAssistantChat({ onClose }: AIAssistantChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messageOffset, setMessageOffset] = useState(0);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingConversations, setDeletingConversations] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hook para términos excluidos - versión simple sin tiempo real
  const {
    excludedTerms,
    activeTerms,
    validateMessage: validateMessageRealTime,
    lastUpdate,
    activeTermsCount,
    loading: excludedTermsLoading
  } = useExcludedTermsSimple();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, []);

  useEffect(() => {
    loadConversations();
    loadUsageLimits();

    // Los términos excluidos se cargan con el hook simple sin Socket.IO

    // Intentar reinicializar el servicio silenciosamente para aplicar nuevo prompt
    reinitializeService();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      // Resetear estados al cambiar de conversación
      setMessages([]);
      setMessageOffset(0);
      setHasMoreMessages(true);
      loadMessages(currentConversation, 0, true);
    }
  }, [currentConversation]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (sending) {
      scrollToBottom();
    }
  }, [sending, scrollToBottom]);

  // Filtrar conversaciones por búsqueda - memoizado para evitar re-renderizados
  const filteredConversations = useMemo(() => {
    if (searchTerm.trim() === '') {
      return conversations;
    } else {
      return conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [conversations, searchTerm]);

  const loadOlderMessages = async () => {
    if (!currentConversation || loadingOlderMessages || !hasMoreMessages) return;
    
    setLoadingOlderMessages(true);
    try {
      await loadMessages(currentConversation, messageOffset, false);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const manualLoadOlderMessages = async () => {
    if (!currentConversation || loadingOlderMessages || !hasMoreMessages) return;
    
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;
    
    const previousScrollHeight = scrollArea.scrollHeight;
    const previousScrollTop = scrollArea.scrollTop;
    
    setLoadingOlderMessages(true);
    try {
      await loadMessages(currentConversation, messageOffset, false);
      
      // Mantener posición visual después de cargar mensajes
      setTimeout(() => {
        const newScrollHeight = scrollArea.scrollHeight;
        const scrollDifference = newScrollHeight - previousScrollHeight;
        scrollArea.scrollTop = previousScrollTop + scrollDifference;
      }, 50);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    
    // Si está cerca del top (primeros 100px), cargar mensajes anteriores
    if (scrollTop < 100 && hasMoreMessages && !loadingOlderMessages && currentConversation) {
      // Guardar posición actual antes de cargar más mensajes
      const previousScrollHeight = scrollHeight;
      loadOlderMessages().then(() => {
        // Mantener posición de scroll después de cargar mensajes
        const newScrollHeight = event.currentTarget.scrollHeight;
        const scrollDifference = newScrollHeight - previousScrollHeight;
        event.currentTarget.scrollTop = scrollTop + scrollDifference;
      });
    }
  }, [hasMoreMessages, loadingOlderMessages, currentConversation]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-assistant/conversations', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(prev => {
          // Solo actualizar si hay cambios reales
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(data.conversations || []);
          return hasChanges ? data.conversations || [] : prev;
        });
        
        // Auto-seleccionar la primera conversación si no hay ninguna seleccionada
        if (data.conversations?.length > 0 && !currentConversation) {
          setCurrentConversation(data.conversations[0].id);
        }
      } else {
        toast.error('Error al cargar conversaciones');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [currentConversation]);

  const loadMessages = useCallback(async (conversationId: string, offset: number = 0, scrollToEnd: boolean = false) => {
    try {
      const limit = 50; // Cargar 50 mensajes por página
      const response = await fetch(`/api/ai-assistant/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        
        if (offset === 0) {
          // Primera carga - reemplazar todos los mensajes
          setMessages(newMessages);
          setMessageOffset(newMessages.length);
          setHasMoreMessages(data.pagination?.hasMore || false);
        } else {
          // Carga de mensajes anteriores - prepender
          setMessages(prev => [...newMessages, ...prev]);
          setMessageOffset(prev => prev + newMessages.length);
          setHasMoreMessages(data.pagination?.hasMore || false);
        }
        
        // Solo hacer scroll al final en la primera carga o cuando se envía un nuevo mensaje
        if (scrollToEnd) {
          setTimeout(scrollToBottom, 100);
        }
      } else {
        toast.error('Error al cargar mensajes');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  }, []);

  const loadUsageLimits = async () => {
    try {
      const response = await fetch('/api/ai-assistant/usage-limits', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsageLimits(data.limits);
      }
    } catch (error) {
    }
  };

  // Eliminada: la función loadExcludedTerms ahora se maneja con el hook simple sin Socket.IO

  // Función de validación local (sincronizada con el hook)
  const validateMessage = useCallback((message: string) => {
    // Si no hay términos activos, permitir siempre
    if (activeTerms.length === 0) {
      return { isValid: true };
    }

    // Usar validación local síncrona del hook
    const messageText = message.toLowerCase().trim();

    for (const term of activeTerms) {
      const termText = term.term.toLowerCase();
      if (messageText.includes(termText)) {
        return {
          isValid: false,
          error: `El término "${term.term}" no está permitido${term.reason ? `: ${term.reason}` : ''}.`,
          foundTerm: term.term,
          detectionType: 'full'
        };
      }
    }

    return { isValid: true };
  }, [activeTerms]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    if (!usageLimits?.canSend) {
      toast.error('Has alcanzado tu límite de mensajes diario o mensual');
      return;
    }

    const messageText = newMessage.trim();

    // Validar términos excluidos usando validación local síncrona
    const validation = validateMessage(messageText);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Mensaje contiene términos no permitidos');
      toast.error('Mensaje bloqueado', {
        description: validation.error,
        action: {
          label: 'Ver términos',
          onClick: () => {
            toast.info(`Términos activos: ${activeTermsCount}`, {
              description: lastUpdate ? `Última actualización: ${format(lastUpdate, 'HH:mm:ss')}` : undefined
            });
          }
        }
      });
      return;
    }

    // Limpiar error de validación si había uno previo
    setValidationError(null);
    const tempUserId = `temp-user-${Date.now()}`;
    const tempBotId = `temp-bot-${Date.now()}`;
    
    // Crear mensaje temporal del usuario
    const tempUserMessage = {
      id: tempUserId,
      role: 'user' as const,
      content: messageText,
      createdAt: new Date().toISOString(),
      tokens: 0,
      processingTime: 0
    };

    // Crear mensaje temporal del bot (estado de "escribiendo")
    const tempBotMessage = {
      id: tempBotId,
      role: 'assistant' as const,
      content: '',
      createdAt: new Date().toISOString(),
      tokens: 0,
      processingTime: 0,
      isLoading: true
    };

    // Mostrar mensaje del usuario inmediatamente
    setMessages(prev => [...prev, tempUserMessage]);
    setNewMessage('');
    setSending(true);

    // Mostrar indicador de que el bot está escribiendo
    setTimeout(() => {
      setMessages(prev => [...prev, tempBotMessage]);
    }, 200);

    try {
      const response = await fetch('/api/ai-assistant/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: currentConversation,
          message: messageText
        })
      });

      const data = await response.json();

      if (data.success) {
        // Si es una nueva conversación, actualizar el ID
        if (!currentConversation) {
          setCurrentConversation(data.conversationId);
        }
        
        // Recargar todos los mensajes para obtener la respuesta real del bot
        await loadMessages(data.conversationId, 0, true);
        await loadUsageLimits();
        
      } else {
        // Si hay error, remover los mensajes temporales
        setMessages(prev => prev.filter(msg => 
          msg.id !== tempUserId && msg.id !== tempBotId
        ));
        
        // Restaurar el mensaje en el input
        setNewMessage(messageText);
        
        toast.error(data.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      
      // Si hay error de conexión, remover mensajes temporales
      setMessages(prev => prev.filter(msg => 
        msg.id !== tempUserId && msg.id !== tempBotId
      ));
      
      // Restaurar el mensaje en el input
      setNewMessage(messageText);
      
      toast.error('Error de conexión');
    } finally {
      setSending(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/ai-assistant/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Nueva conversación'
        })
      });

      if (response.ok) {
        const data = await response.json();
        await loadConversations();
        setCurrentConversation(data.conversation.id);
        setMessages([]);
        toast.success('Nueva conversación creada');
      } else {
        toast.error('Error al crear conversación');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const reinitializeService = async () => {
    try {
      const response = await fetch('/api/ai-assistant/admin/reinitialize', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Service reinitialized
    } catch (error) {
      // Handle error silently
    }
  };

  const updateConversationTitle = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/ai-assistant/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle
        })
      });

      if (response.ok) {
        // Actualizar solo localmente para evitar re-renderizado completo
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, title: newTitle }
              : conv
          )
        );
        setEditingTitle(null);
        setEditingTitleValue('');
        toast.success('Título actualizado');
      } else {
        toast.error('Error al actualizar título');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const conversationTitle = conversations.find(c => c.id === conversationId)?.title || 'Conversación';
    
    try {
      const response = await fetch(`/api/ai-assistant/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Eliminar localmente para evitar re-renderizado completo
        const remaining = conversations.filter(c => c.id !== conversationId);
        setConversations(remaining);
        
        // Si eliminamos la conversación actual, seleccionar otra
        if (currentConversation === conversationId) {
          if (remaining.length > 0) {
            setCurrentConversation(remaining[0].id);
          } else {
            setCurrentConversation(null);
            setMessages([]);
          }
        }
        
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
        toast.success(`Conversación "${conversationTitle}" eliminada correctamente`, {
          description: 'Todos los mensajes han sido eliminados permanentemente'
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Error al eliminar conversación', {
          description: errorData.message || 'Inténtalo de nuevo más tarde'
        });
      }
    } catch (error) {
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor'
      });
    }
  };

  const deleteAllConversations = async () => {
    if (conversations.length === 0) {
      toast.info('No hay conversaciones para eliminar');
      return;
    }

    setDeletingConversations(true);
    const totalConversations = conversations.length;
    let deletedCount = 0;
    let failedCount = 0;

    try {
      // Eliminar todas las conversaciones de forma concurrente
      const deletePromises = conversations.map(async (conv) => {
        try {
          const response = await fetch(`/api/ai-assistant/conversations/${conv.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (response.ok) {
            deletedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
        }
      });

      await Promise.all(deletePromises);

      // Limpiar estado local
      setConversations([]);
      setCurrentConversation(null);
      setMessages([]);
      setDeleteAllDialogOpen(false);

      // Mostrar resultado
      if (deletedCount === totalConversations) {
        toast.success(`Se eliminaron todas las conversaciones (${deletedCount})`, {
          description: 'Todos los mensajes han sido eliminados permanentemente'
        });
      } else if (deletedCount > 0) {
        toast.success(`Se eliminaron ${deletedCount} de ${totalConversations} conversaciones`, {
          description: `${failedCount} conversaciones no pudieron ser eliminadas`
        });
        // Recargar conversaciones para mostrar las que no se pudieron eliminar
        await loadConversations();
      } else {
        toast.error('No se pudo eliminar ninguna conversación', {
          description: 'Inténtalo de nuevo más tarde'
        });
      }
    } catch (error) {
      toast.error('Error al eliminar conversaciones', {
        description: 'Ocurrió un error inesperado'
      });
    } finally {
      setDeletingConversations(false);
    }
  };

  const startTitleEdit = (conversation: Conversation) => {
    setEditingTitle(conversation.id);
    setEditingTitleValue(conversation.title);
  };

  const cancelTitleEdit = () => {
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  const saveTitleEdit = () => {
    if (editingTitle && editingTitleValue.trim()) {
      const trimmedValue = editingTitleValue.trim();
      const originalTitle = conversations.find(c => c.id === editingTitle)?.title;
      
      // Solo actualizar si realmente cambió
      if (trimmedValue !== originalTitle) {
        updateConversationTitle(editingTitle, trimmedValue);
      } else {
        // Si no cambió, solo cancelar la edición
        setEditingTitle(null);
        setEditingTitleValue('');
      }
    } else {
      // Si está vacío, cancelar la edición
      cancelTitleEdit();
    }
  };

  const copyConversationId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado al portapapeles');
  };

  const handleDeleteClick = (conversationId: string) => {
    // Si es la conversación actual, mostrar información adicional
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setConversationToDelete(conversationId);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteCurrentConversation = () => {
    if (currentConversation) {
      handleDeleteClick(currentConversation);
    }
  };

  const handleDeleteAllClick = () => {
    if (conversations.length === 0) {
      toast.info('No hay conversaciones para eliminar');
      return;
    }
    setDeleteAllDialogOpen(true);
  };

  const handleCancelDeleteAll = () => {
    setDeleteAllDialogOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl h-[80vh] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Iniciando sistema de consultas...</span>
          </div>
        </Card>
      </div>
    );
  }

  const currentConv = conversations.find(c => c.id === currentConversation);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-6xl h-[85vh] flex flex-col">

          <div className="flex flex-1 overflow-hidden">
            {/* Elegant Retractable Sidebar - Lista de Conversaciones */}
            <div className={`border-r border-border flex flex-col bg-background transition-all duration-300 relative ${
              sidebarCollapsed ? 'w-16' : 'w-80'
            }`}
                 style={{
                   flexShrink: 0,
                   minWidth: sidebarCollapsed ? '64px' : '320px',
                   boxShadow: `
                     2px 0 12px rgba(0, 0, 0, 0.08),
                     1px 0 6px rgba(0, 0, 0, 0.04),
                     inset -1px 0 2px rgba(255, 255, 255, 0.1)
                   `
                 }}>

              {/* Header interno del chatbot con logo y menú hamburguesa */}
              <div className="p-3 border-b border-border/60">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2.5 hover:bg-accent/50 rounded-xl transition-all duration-300 group hover:shadow-lg hover:shadow-muted/40 hover:scale-110 hover:-translate-y-0.5 relative"
                    style={{
                      boxShadow: `
                        0 2px 8px rgba(0, 0, 0, 0.06),
                        inset 0 1px 1px rgba(255, 255, 255, 0.1)
                      `
                    }}
                    title={sidebarCollapsed ? "Expandir conversaciones" : "Colapsar conversaciones"}
                  >
                    <Menu className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                  </button>

                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-xl flex items-center justify-center relative overflow-hidden"
                           style={{
                             boxShadow: `
                               0 6px 20px -4px rgba(59, 130, 246, 0.4),
                               0 3px 10px -2px rgba(59, 130, 246, 0.25),
                               inset 0 1px 2px 0 rgba(255, 255, 255, 0.3),
                               inset 0 -1px 2px 0 rgba(0, 0, 0, 0.1)
                             `
                           }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-xl"></div>
                        <Bot className="w-4 h-4 text-white relative z-10 drop-shadow-sm" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">APRBOT</h3>
                        <p className="text-xs text-muted-foreground">Asistente Virtual</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${sidebarCollapsed ? 'px-2' : 'px-4'} py-3 border-b space-y-3 transition-all duration-300`} style={{ flexShrink: 0 }}>
                <div className="flex gap-2">
                  <Button
                    onClick={createNewConversation}
                    size="sm"
                    className={`flex-1 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] hover:-translate-y-0.5 relative overflow-hidden ${
                      sidebarCollapsed ? 'px-2' : 'px-3'
                    }`}
                    style={{
                      boxShadow: `
                        0 4px 12px rgba(59, 130, 246, 0.15),
                        0 2px 6px rgba(59, 130, 246, 0.1),
                        inset 0 1px 1px rgba(255, 255, 255, 0.2)
                      `
                    }}
                    title={sidebarCollapsed ? "Nueva conversación" : undefined}
                  >
                    <Plus className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-1'}`} />
                    {!sidebarCollapsed && "Nueva Conversación"}
                  </Button>
                </div>

                {conversations.length > 0 && !sidebarCollapsed && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3 w-3" />
                      <span>
                        {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs hover:text-red-600 transition-all duration-200 hover:shadow-md hover:shadow-red-500/20"
                          title="Opciones de eliminación"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-b">
                          Opciones de Eliminación
                        </div>
                        {currentConversation && (
                          <DropdownMenuItem 
                            className="text-orange-600 hover:text-orange-700"
                            onClick={handleDeleteCurrentConversation}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar conversación actual
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 hover:text-red-700 font-medium"
                          onClick={handleDeleteAllClick}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar todas ({conversations.length})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Collapsed Stats Indicator */}
                {conversations.length > 0 && sidebarCollapsed && (
                  <div className="flex flex-col items-center gap-1 py-2">
                    <div
                      className="w-8 h-8 bg-gradient-to-br from-green-500 via-blue-600 to-purple-700 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/40"
                      style={{
                        boxShadow: `
                          0 6px 20px -4px rgba(34, 197, 94, 0.4),
                          0 3px 10px -2px rgba(59, 130, 246, 0.3),
                          0 1px 4px -1px rgba(147, 51, 234, 0.2),
                          inset 0 1px 2px 0 rgba(255, 255, 255, 0.3),
                          inset 0 -1px 2px 0 rgba(0, 0, 0, 0.1)
                        `
                      }}
                      title={`${conversations.length} conversación${conversations.length !== 1 ? 'es' : ''}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-xl"></div>
                      <MessageCircle className="w-4 h-4 text-white relative z-10 drop-shadow-sm" />
                    </div>
                    <span className="text-xs font-bold text-foreground bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {conversations.length}
                    </span>
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar conversaciones..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 transition-all duration-200 hover:shadow-md hover:shadow-primary/10"
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                <ScrollArea className="h-full">
                  <div className={`${sidebarCollapsed ? 'p-1' : 'p-2'} space-y-1 transition-all duration-300`}>
                    {filteredConversations.length === 0 ? (
                      <div className={`${sidebarCollapsed ? 'p-2' : 'p-4'} text-center text-muted-foreground`}>
                        {sidebarCollapsed ? (
                          <div className="flex flex-col items-center gap-2">
                            <MessageCircle className="h-6 w-6 opacity-40" />
                            <span className="text-xs">Sin chats</span>
                          </div>
                        ) : (
                          searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones'
                        )}
                      </div>
                    ) : (
                      filteredConversations.map((conv, index) => (
                        sidebarCollapsed ? (
                          <div
                            key={conv.id}
                            onClick={() => setCurrentConversation(conv.id)}
                            className={`w-12 h-12 mx-auto mb-2 rounded-xl cursor-pointer transition-all duration-300 group relative overflow-hidden flex items-center justify-center ${
                              currentConversation === conv.id
                                ? 'bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 shadow-lg'
                                : 'bg-gradient-to-br from-slate-100 via-white to-slate-50 hover:from-blue-50 hover:via-purple-50 hover:to-blue-100 hover:shadow-md'
                            }`}
                            style={{
                              boxShadow: currentConversation === conv.id ? `
                                0 8px 25px -6px rgba(59, 130, 246, 0.4),
                                0 4px 12px -3px rgba(147, 51, 234, 0.3),
                                0 2px 6px -1px rgba(59, 130, 246, 0.2),
                                inset 0 1px 2px 0 rgba(255, 255, 255, 0.3),
                                inset 0 -1px 2px 0 rgba(0, 0, 0, 0.1)
                              ` : `
                                0 2px 8px rgba(0, 0, 0, 0.08),
                                0 1px 4px rgba(0, 0, 0, 0.04),
                                inset 0 1px 1px rgba(255, 255, 255, 0.1)
                              `
                            }}
                            title={conv.title}
                            onMouseEnter={(e) => {
                              if (currentConversation !== conv.id) {
                                const element = e.currentTarget;
                                element.style.transform = 'scale(1.05) translateY(-2px)';
                                element.style.boxShadow = `
                                  0 6px 20px -4px rgba(59, 130, 246, 0.25),
                                  0 3px 10px -2px rgba(147, 51, 234, 0.2),
                                  0 1px 4px -1px rgba(59, 130, 246, 0.15),
                                  inset 0 1px 2px 0 rgba(255, 255, 255, 0.2)
                                `;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentConversation !== conv.id) {
                                const element = e.currentTarget;
                                element.style.transform = 'scale(1) translateY(0)';
                                element.style.boxShadow = `
                                  0 2px 8px rgba(0, 0, 0, 0.08),
                                  0 1px 4px rgba(0, 0, 0, 0.04),
                                  inset 0 1px 1px rgba(255, 255, 255, 0.1)
                                `;
                              }
                            }}
                          >
                            {currentConversation === conv.id ? (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-xl"></div>
                                <MessageCircle className="w-5 h-5 text-white relative z-10 drop-shadow-sm" />
                              </>
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/30 rounded-xl group-hover:to-white/40"></div>
                                <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 relative z-10 transition-colors duration-200">
                                  {index + 1}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <ConversationItem
                            key={conv.id}
                            conv={conv}
                            isSelected={currentConversation === conv.id}
                            isEditing={editingTitle === conv.id}
                            editingTitleValue={editingTitleValue}
                            onSelect={() => setCurrentConversation(conv.id)}
                            onStartEdit={() => startTitleEdit(conv)}
                            onSaveEdit={saveTitleEdit}
                            onCancelEdit={cancelTitleEdit}
                            onTitleChange={setEditingTitleValue}
                            onCopyId={() => copyConversationId(conv.id)}
                            onDelete={() => handleDeleteClick(conv.id)}
                          />
                        )
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {currentConversation ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Botón fijo para cargar mensajes anteriores */}
                    {hasMoreMessages && currentConversation && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={manualLoadOlderMessages}
                          disabled={loadingOlderMessages}
                          className="shadow-lg bg-white/90 backdrop-blur-sm border border-gray-200 hover:bg-white/95 text-gray-700 hover:text-gray-900"
                        >
                          {loadingOlderMessages ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Cargando...
                            </>
                          ) : (
                            <>
                              <Calendar className="h-3 w-3 mr-1" />
                              Ver mensajes anteriores
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    <ScrollArea className="h-full p-4 pb-6" ref={scrollAreaRef} onScrollCapture={handleScroll}>
                      <div className="space-y-4">
                        {/* Indicador de carga de mensajes anteriores */}
                        {loadingOlderMessages && (
                          <div className="flex justify-center py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-full">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span>Cargando mensajes anteriores...</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Referencia para el inicio de mensajes */}
                        <div ref={messagesStartRef} />
                        
                        {/* Indicador de inicio de conversación */}
                        {!hasMoreMessages && messages.length > 0 && (
                          <div className="flex justify-center py-2">
                            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              Inicio de la conversación
                            </div>
                          </div>
                        )}
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                          <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">Bienvenido al sistema de consultas APR</p>
                          <p className="text-sm">Pregúntame sobre boletas, pagos, servicios o cualquier consulta del sistema APR</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {message.role === 'assistant' && (
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div
                              className={`max-w-[75%] rounded-lg px-4 py-3 overflow-hidden ${
                                message.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 border'
                              }`}
                            >
                              <div className="prose prose-sm max-w-none overflow-hidden">
                                {(message as any).isLoading ? (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Procesando consulta...</span>
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-wrap break-words break-all m-0 w-full overflow-hidden">{message.content}</p>
                                )}
                              </div>
                              {!(message as any).isLoading && (
                                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                  {message.tokens && message.tokens > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{message.tokens} tokens</span>
                                    </>
                                  )}
                                  {message.processingTime && message.processingTime > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{message.processingTime}ms</span>
                                    </>
                                  )}
                                  {message.id.startsWith('temp-user-') && (
                                    <>
                                      <span>•</span>
                                      <span className="text-blue-600">Enviando...</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            {message.role === 'user' && (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Input Area - Posición completamente fija en la parte inferior */}
                  <div className="border-t p-4 bg-background flex-shrink-0 sticky bottom-0 z-10 shadow-lg">
                    {!usageLimits?.canSend && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-amber-800">
                            Has alcanzado tu límite de mensajes diario o mensual
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewMessage(value);

                            // Validación en tiempo real
                            if (value.trim()) {
                              const validation = validateMessage(value);
                              if (!validation.isValid) {
                                setValidationError(validation.error || 'Términos no permitidos detectados');
                              } else {
                                setValidationError(null);
                              }
                            } else {
                              setValidationError(null);
                            }
                          }}
                          onKeyPress={handleKeyPress}
                          placeholder="Escribe tu consulta sobre el sistema APR..."
                          disabled={sending || !usageLimits?.canSend}
                          className={`w-full transition-all duration-300 ${
                            validationError
                              ? 'border-2 border-red-500 focus:ring-red-500 focus:border-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg shadow-red-200 animate-pulse'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white hover:bg-gray-50'
                          }`}
                        />
                        {validationError && (
                          <div className="mt-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 animate-pulse"></div>
                            <div className="relative p-4 bg-white border-2 border-red-300 rounded-xl shadow-lg">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <div className="relative">
                                    <div className="p-2 bg-red-100 rounded-full">
                                      <Shield className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full">
                                      <Ban className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <h4 className="font-bold text-gray-900 text-sm">
                                      Contenido Restringido Detectado
                                    </h4>
                                  </div>
                                  <p className="text-red-700 text-sm font-medium mb-1">
                                    {validationError}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span>Tu mensaje ha sido bloqueado por el filtro de contenido</span>
                                  </div>
                                </div>
                              </div>

                              {/* Barra de progreso animada */}
                              <div className="mt-3 h-1 bg-red-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim() || !usageLimits?.canSend || !!validationError}
                        size="icon"
                        className={`transition-all duration-200 ${
                          validationError
                            ? 'opacity-30 cursor-not-allowed bg-gray-300 hover:bg-gray-300'
                            : 'hover:bg-blue-600 bg-blue-500'
                        }`}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Selecciona una conversación o crea una nueva para empezar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Eliminar chat
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              ¿Está seguro de que desea eliminar este chat?
            </p>
          </DialogHeader>
          
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConversationToDelete(null);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <div
              onClick={() => conversationToDelete && deleteConversation(conversationToDelete)}
              style={{
                flex: 1,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#b91c1c';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dc2626';
                e.target.style.color = '#ffffff';
              }}
            >
              Eliminar
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Conversations Dialog */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-red-900">
                  ¿Eliminar todas las conversaciones?
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Esta acción eliminará permanentemente todo tu historial
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Confirmación de eliminación masiva
              </h4>
              
              <div className="space-y-3">
                <div className="bg-white border border-red-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Conversaciones a eliminar:</span>
                    <Badge variant="destructive" className="text-xs">
                      {conversations.length} conversaciones
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>• Todas las conversaciones y mensajes</div>
                    <div>• Todo el historial de consultas</div>
                    <div>• No se podrán recuperar los datos eliminados</div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-800">
                      <strong>Advertencia:</strong> Esta acción es irreversible. 
                      Todo el historial de consultas se perderá permanentemente.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {conversations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Vista previa de conversaciones:</p>
                <div className="max-h-32 overflow-y-auto border rounded bg-gray-50 p-2">
                  {conversations.slice(0, 5).map((conv, index) => (
                    <div key={conv.id} className="text-xs text-gray-700 py-1 border-b border-gray-200 last:border-b-0">
                      {index + 1}. {conv.title} ({conv.messageCount} mensajes)
                    </div>
                  ))}
                  {conversations.length > 5 && (
                    <div className="text-xs text-gray-500 py-1 italic">
                      ... y {conversations.length - 5} conversaciones más
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelDeleteAll}
              disabled={deletingConversations}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteAllConversations}
              disabled={deletingConversations}
              className="flex-1"
            >
              {deletingConversations ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sí, eliminar todas ({conversations.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}