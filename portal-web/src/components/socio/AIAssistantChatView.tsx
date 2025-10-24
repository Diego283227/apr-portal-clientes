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
  MoreHorizontal,
  Copy,
  Calendar,
  Hash,
  Menu,
  History,
  Settings,
  Star,
  PanelLeft,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  Brain
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
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

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
  isHighlighted?: boolean;
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

interface AIAssistantChatViewProps {
  onClose: () => void;
  initialConversationId?: string;
  onSearchViewChange?: (isSearchView: boolean) => void;
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
          ? 'bg-blue-100 dark:bg-gray-900/40'
          : 'hover:bg-gray-100 dark:hover:bg-gray-900/50'
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
                <h4 className="font-medium text-sm truncate pr-2 dark:text-white">
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
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black border border-gray-200 dark:border-0 shadow-lg">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit();
                    }} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      toggleHighlight(conv.id);
                    }} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50">
                      <Star className={`h-4 w-4 mr-2 ${conv.isHighlighted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      Destacar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-900/50" />
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/80 dark:hover:text-white"
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

export default function AIAssistantChatView({ onClose, initialConversationId, onSearchViewChange }: AIAssistantChatViewProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Starts collapsed on mobile
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [initialConversationSet, setInitialConversationSet] = useState(false);
  const [showSearchView, setShowSearchView] = useState(false);
  const [searchViewLoading, setSearchViewLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // Estado para controlar la inicialización
  const [loadingMessages, setLoadingMessages] = useState(false); // Estado para trackear carga de mensajes
  const [generatingResponse, setGeneratingResponse] = useState(false); // Estado para trackear generación de respuesta

  // Notificar al componente padre cuando cambie la vista de búsqueda
  useEffect(() => {
    if (onSearchViewChange) {
      onSearchViewChange(showSearchView);
    }
  }, [showSearchView, onSearchViewChange]);

  // Observer para detectar cambios de tema y aplicar estilos al textarea
  useEffect(() => {
    const applyThemeToTextarea = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);

      if (inputRef.current) {
        if (validationError) {
          inputRef.current.style.setProperty('background-color', isDark ? 'rgba(127, 29, 29, 0.2)' : '#FEF2F2', 'important');
        } else {
          inputRef.current.style.setProperty('background-color', isDark ? '#0d1520' : '#FFFFFF', 'important');
        }
        inputRef.current.style.setProperty('color', isDark ? '#FFFFFF' : '#111827', 'important');
      }
    };

    applyThemeToTextarea();

    const observer = new MutationObserver(() => {
      applyThemeToTextarea();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [validationError]);

  // Filtrar conversaciones basado en la búsqueda
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Hook para términos excluidos
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Wrapper para trackear cambios de conversación
  const handleConversationChange = useCallback((conversationId: string) => {
    setCurrentConversation(conversationId);
    setShowSearchView(false); // Desactivar vista de búsqueda al seleccionar una conversación

    // Actualizar el título de la conversación actual
    const conversation = conversations.find(c => c.id === conversationId);
    // Solo actualizar el título si encontramos la conversación, para evitar sobrescribir
    // el título de conversaciones nuevas que aún no están en la lista
    if (conversation) {
      setCurrentConversationTitle(conversation.title);
    }

    // Actualizar la URL solo si no es la conversación inicial
    if (conversationId !== initialConversationId) {
      const newHash = `#chatbot/${conversationId}`;
      window.location.hash = newHash;
    }
  }, [currentConversation, initialConversationId, conversations]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    }, 100);
  }, []);

  useEffect(() => {
    loadConversations();
    loadUsageLimits();
    // reinitializeService(); // Comentado temporalmente debido a error 403

    // Si no hay initialConversationId, ir a la pantalla de bienvenida
    if (!initialConversationId) {
      const newHash = `#chatbot/new`;
      window.location.hash = newHash;
    }
  }, []);

  // useEffect para manejar initialConversationId - solo una vez
  useEffect(() => {
    // Si ya se procesó el initialConversationId, no ejecutar de nuevo
    if (initialConversationSet) {
      console.log('🚨 Saltando useEffect porque initialConversationSet ya es true');
      setInitializing(false); // Marcar inicialización como completa
      return;
    }

    console.log('🚨 useEffect initialConversationId ejecutándose:', {
      initialConversationId,
      initialConversationSet,
      currentConversation,
      currentConversationTitle
    });

    if (initialConversationId === 'new') {
      // Si es 'new', mostrar pantalla de bienvenida sin seleccionar conversación
      console.log('🚨 Reseteando título para new conversation');
      setCurrentConversation(null);
      setCurrentConversationTitle(null);
      setShowSearchView(false);
      setInitialConversationSet(true);
      setInitializing(false); // Marcar inicialización como completa
    } else if (initialConversationId === 'recents') {
      // Si es 'recents', mostrar vista de búsqueda/historial
      console.log('🚨 Activando vista recents desde useEffect:', {
        conversationsLength: conversations.length,
        showSearchView,
        initialConversationSet
      });
      setCurrentConversation(null);
      setCurrentConversationTitle(null);
      setShowSearchView(true);
      setSearchQuery('');
      setInitialConversationSet(true);
      setInitializing(false); // Marcar inicialización como completa
      // Asegurar que las conversaciones estén cargadas
      if (conversations.length === 0) {
        console.log('🔄 Cargando conversaciones desde useEffect recents');
        loadConversations();
      }
    } else if (initialConversationId && conversations.length > 0) {
      // Verificar que la conversación existe
      const conversationExists = conversations.find(c => c.id === initialConversationId);
      if (conversationExists) {
        setCurrentConversation(initialConversationId);
        setCurrentConversationTitle(conversationExists.title);
        setShowSearchView(false);
        setInitialConversationSet(true);
        // NO marcar initializing como false aquí - esperar a que se carguen los mensajes
      } else {
        setInitialConversationSet(true); // Marcar como procesado aunque no se encontró
        setInitializing(false); // Marcar inicialización como completa solo si no se encontró
      }
    }
    // Si hay initialConversationId pero conversations aún no se cargaron, mantener initializing en true
  }, [initialConversationId, conversations, initialConversationSet, currentConversation]);

  // Mover este useEffect después de la declaración de loadMessages

  // Remover el scroll automático - solo scroll manual
  // useEffect(() => {
  //   if (messages.length > 0 && currentConversation) {
  //     const lastMessage = messages[messages.length - 1];
  //     if (lastMessage && (lastMessage.role === 'user' || lastMessage.isLoading)) {
  //       scrollToBottom();
  //     }
  //   }
  // }, [messages, scrollToBottom, currentConversation]);

  // Remover scroll automático durante el envío
  // useEffect(() => {
  //   if (sending) {
  //     scrollToBottom();
  //   }
  // }, [sending, scrollToBottom]);

  // Filtrar conversaciones por búsqueda

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-assistant/conversations', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();

        setConversations(prev => {
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(data.conversations || []);
          return hasChanges ? data.conversations || [] : prev;
        });

        // No seleccionar automáticamente ninguna conversación
      } else {
        toast.error('Error al cargar conversaciones');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [currentConversation, handleConversationChange]);

  const loadMessages = useCallback(async (conversationId: string, offset: number = 0, scrollToEnd: boolean = false) => {
    try {
      // Marcar que estamos cargando mensajes
      if (offset === 0) {
        setLoadingMessages(true);
      }

      const limit = 50;
      const response = await fetch(`/api/ai-assistant/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];

        if (offset === 0) {
          setMessages(newMessages);
          setMessageOffset(newMessages.length);
          setHasMoreMessages(data.pagination?.hasMore || false);

          // Marcar inicialización como completa después de cargar los mensajes
          setInitializing(false);
          setLoadingMessages(false);

          // Asegurar que el área de scroll esté visible
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTop = 0; // Ir al inicio para ver los mensajes
              }
            }
          }, 200);
        } else {
          setMessages(prev => [...newMessages, ...prev]);
          setMessageOffset(prev => prev + newMessages.length);
          setHasMoreMessages(data.pagination?.hasMore || false);
        }

        if (scrollToEnd) {
          setTimeout(scrollToBottom, 100);
        }
      } else {
        toast.error('Error al cargar mensajes');
        setInitializing(false); // También marcar como completo en caso de error
        setLoadingMessages(false);
      }
    } catch (error) {
      toast.error('Error de conexión');
      setInitializing(false); // También marcar como completo en caso de error
      setLoadingMessages(false);
    }
  }, [scrollToBottom]);

  // useEffect para cargar mensajes cuando cambia la conversación
  useEffect(() => {
    if (currentConversation && !loadingMessages) {
      // NO limpiar mensajes aquí para evitar el flashazo
      // Los mensajes se reemplazan directamente en loadMessages
      setMessageOffset(0);
      setHasMoreMessages(true);

      // Cargar mensajes del chat seleccionado
      loadMessages(currentConversation, 0, false); // No hacer scroll automático
    }
  }, [currentConversation]); // NO incluir loadMessages ni loadingMessages para evitar loops

  // Auto-resize del textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

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
      // Handle error silently
    }
  };

  const validateMessage = useCallback((message: string) => {
    if (activeTerms.length === 0) {
      return { isValid: true };
    }

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

  // Función para generar título inteligente basado en la primera pregunta
  const generateConversationTitle = (message: string) => {
    const messageText = message.trim().toLowerCase();

    // Patrones comunes y sus títulos sugeridos
    const patterns = [
      { keywords: ['boleta', 'factura', 'cuenta', 'cobro'], title: 'Consulta sobre boletas' },
      { keywords: ['pago', 'pagar', 'deuda', 'dinero', 'precio'], title: 'Consulta sobre pagos' },
      { keywords: ['agua', 'presión', 'corte', 'turbia', 'gotea'], title: 'Problema con agua' },
      { keywords: ['medidor', 'lectura', 'consumo', 'metros'], title: 'Consulta sobre medidor' },
      { keywords: ['conexión', 'nueva', 'solicitud', 'servicio'], title: 'Nueva conexión' },
      { keywords: ['reclamo', 'queja', 'problema', 'error'], title: 'Reclamo de servicio' },
      { keywords: ['horario', 'oficina', 'atención', 'contacto'], title: 'Información de contacto' },
      { keywords: ['reglamento', 'norma', 'procedimiento'], title: 'Consulta sobre reglamento' },
      { keywords: ['cambio', 'titular', 'nombre', 'transferir'], title: 'Cambio de titular' },
      { keywords: ['certificado', 'documento', 'constancia'], title: 'Solicitud de certificado' }
    ];

    // Buscar patrón que coincida
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => messageText.includes(keyword))) {
        return pattern.title;
      }
    }

    // Si no hay patrón específico, crear título basado en las primeras palabras
    const words = message.trim().split(' ').slice(0, 4);
    let title = words.join(' ');

    // Limpiar y capitalizar
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Asegurar que no sea muy largo
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }

    return title || 'Nueva consulta APR';
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    if (!usageLimits?.canSend) {
      toast.error('Has alcanzado tu límite de mensajes diario o mensual');
      return;
    }

    const messageText = newMessage.trim();

    const validation = validateMessage(messageText);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Mensaje contiene términos no permitidos');
      toast.error('Mensaje bloqueado', {
        description: validation.error,
      });
      return;
    }

    setValidationError(null);

    // Limpiar input y marcar como enviando y generando respuesta
    setNewMessage('');
    setSending(true);
    setGeneratingResponse(true);

    try {
      // Generar título inteligente si es una nueva conversación
      const conversationTitle = !currentConversation ? generateConversationTitle(messageText) : undefined;

      const response = await fetch('/api/ai-assistant/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: currentConversation,
          message: messageText,
          conversationTitle: conversationTitle
        })
      });

      const data = await response.json();

      if (data.success) {
        // Crear mensajes reales con la respuesta del servidor
        const userMessage = {
          id: `user-${Date.now()}`,
          role: 'user' as const,
          content: messageText,
          createdAt: new Date().toISOString(),
          tokens: 0,
          processingTime: 0
        };

        const botMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant' as const,
          content: data.response,
          createdAt: new Date().toISOString(),
          tokens: data.tokens || 0,
          processingTime: data.processingTime || 0,
          isLoading: false
        };

        // Para nueva conversación, hacer todos los updates en un solo batch usando React.startTransition
        if (!currentConversation) {
          const finalTitle = data.title || conversationTitle || 'Nueva conversación';
          console.log('🎯 Título para nueva conversación:', {
            serverTitle: data.title,
            generatedTitle: conversationTitle,
            finalTitle
          });

          // Usar startTransition para agrupar las actualizaciones y evitar flashazos
          React.startTransition(() => {
            // Agregar ambos mensajes reales
            setMessages(prev => [...prev, userMessage, botMessage]);

            // Actualizar conversación actual y título juntos
            setCurrentConversation(data.conversationId);
            setCurrentConversationTitle(finalTitle);

            // Agregar la nueva conversación al estado
            const newConversation = {
              id: data.conversationId,
              title: finalTitle,
              lastMessageAt: new Date().toISOString(),
              messageCount: 2,
              lastMessage: data.response.substring(0, 100),
              isHighlighted: false
            };

            setConversations(prev => [newConversation, ...prev]);
          });

          // Actualizar URL silenciosamente fuera de la transición
          window.history.replaceState(null, '', `#chatbot/${data.conversationId}`);
        } else {
          // Para conversación existente, agregar los mensajes
          React.startTransition(() => {
            setMessages(prev => [...prev, userMessage, botMessage]);
          });
        }

        // Marcar que terminó de generar respuesta
        setGeneratingResponse(false);

        // Scroll suave después de que aparezcan los mensajes
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Actualizar límites en segundo plano
        loadUsageLimits();

      } else {
        // En caso de error, restaurar el input
        setNewMessage(messageText);
        setGeneratingResponse(false);
        toast.error(data.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      // En caso de error de conexión, restaurar el input
      setNewMessage(messageText);
      setGeneratingResponse(false);
      toast.error('Error de conexión');
    } finally {
      setSending(false);
    }
  };

  const createNewConversation = async () => {
    // Ir a la pantalla de bienvenida en lugar de crear conversación inmediatamente
    setCurrentConversation(null);
    setCurrentConversationTitle(null);
    setMessages([]);
    setShowSearchView(false);

    // Actualizar la URL a #chatbot/new
    const newHash = `#chatbot/new`;
    window.location.hash = newHash;

    toast.success('Lista para nueva conversación');
  };

  const reinitializeService = async () => {
    try {
      await fetch('/api/ai-assistant/admin/reinitialize', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      // El servicio se actualizará con el nuevo prompt en español
    }
  };

  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return '¡Buenos días! 🌅';
    } else if (hour >= 12 && hour < 18) {
      return '¡Buenas tardes! ☀️';
    } else {
      return '¡Buenas noches! 🌙';
    }
  };

  const handleRenameConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setConversationToRename(conversationId);
      setNewTitle(conversation.title);
      setShowRenameModal(true);
    }
  };

  const saveRename = async () => {
    if (!conversationToRename || !newTitle.trim()) return;

    const trimmedTitle = newTitle.trim();
    const originalTitle = conversations.find(c => c.id === conversationToRename)?.title;

    // Actualización optimista - cambiar inmediatamente en la UI
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationToRename
          ? { ...conv, title: trimmedTitle }
          : conv
      )
    );

    // Si es la conversación actual, actualizar también el título del header
    if (conversationToRename === currentConversation) {
      console.log('🎯 Actualizando título del header después de renombrar:', trimmedTitle);
      setCurrentConversationTitle(trimmedTitle);
    }

    // Cerrar modal inmediatamente para mejor UX
    setShowRenameModal(false);
    setConversationToRename(null);
    setNewTitle('');

    try {
      const response = await fetch(`/api/ai-assistant/conversations/${conversationToRename}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: trimmedTitle
        })
      });

      if (response.ok) {
        toast.success('Conversación renombrada exitosamente');
      } else {
        // Revertir cambio si falla
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationToRename
              ? { ...conv, title: originalTitle || 'Sin título' }
              : conv
          )
        );

        // También revertir título del header si es la conversación actual
        if (conversationToRename === currentConversation) {
          setCurrentConversationTitle(originalTitle || 'Sin título');
        }

        toast.error('Error al renombrar la conversación');
      }
    } catch (error) {
      // Revertir cambio si falla la conexión
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationToRename
            ? { ...conv, title: originalTitle || 'Sin título' }
            : conv
        )
      );

      // También revertir título del header si es la conversación actual
      if (conversationToRename === currentConversation) {
        setCurrentConversationTitle(originalTitle || 'Sin título');
      }

      toast.error('Error de conexión al renombrar');
    }
  };

  const cancelRename = () => {
    setShowRenameModal(false);
    setConversationToRename(null);
    setNewTitle('');
  };

  const toggleHighlight = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const newHighlightState = !conversation.isHighlighted;

    // Actualización optimista - cambiar inmediatamente en la UI
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, isHighlighted: newHighlightState }
          : conv
      )
    );

    try {
      const response = await fetch(`/api/ai-assistant/conversations/${conversationId}/highlight`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          isHighlighted: newHighlightState
        })
      });

      if (response.ok) {
        toast.success(newHighlightState ? 'Conversación destacada' : 'Destaque removido');
      } else {
        // Revertir cambio si falla
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, isHighlighted: !newHighlightState }
              : conv
          )
        );
        toast.error('Error al actualizar destaque');
      }
    } catch (error) {
      // Revertir cambio si falla la conexión
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, isHighlighted: !newHighlightState }
            : conv
        )
      );
      toast.error('Error de conexión');
    }
  };

  const handleDeleteClick = (conversationId: string) => {
    console.log('handleDeleteClick called with:', conversationId);
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
    console.log('Modal should be open now');
  };

  const deleteConversation = async (conversationId: string) => {
    const conversationTitle = conversations.find(c => c.id === conversationId)?.title || 'Conversación';

    try {
      const response = await fetch(`/api/ai-assistant/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Eliminar localmente
        const remaining = conversations.filter(c => c.id !== conversationId);
        setConversations(remaining);

        // Si eliminamos la conversación actual, seleccionar otra
        if (currentConversation === conversationId) {
          if (remaining.length > 0) {
            handleConversationChange(remaining[0].id);
          } else {
            setCurrentConversation(null);
            setCurrentConversationTitle(null);
            setMessages([]);
          }
        }

        toast.success(`Conversación "${conversationTitle}" eliminada correctamente`);
      } else {
        toast.error('Error al eliminar conversación');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Iniciando sistema de consultas...</span>
        </div>
      </div>
    );
  }

  const currentConv = conversations.find(c => c.id === currentConversation);


  return (
    <div className="h-full flex flex-col bg-white dark:bg-black overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex flex-1 min-h-0 overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Claude-style Sidebar */}
        <div className={`fixed left-0 top-0 bottom-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-[#1a1a1a] transition-all duration-300 z-40 ${
          sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'
        }`}>

          {/* Botón flotante para cerrar sidebar en móvil - solo visible cuando está abierto */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg shadow-lg flex items-center justify-center transition-all z-50"
              title="Cerrar sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Header interno del chatbot con botón y logo */}
          <div className={`border-b border-gray-200 dark:border-gray-700 flex items-center ${
            sidebarCollapsed ? 'p-2 justify-center' : 'p-2.5 gap-2'
          }`}>
            {/* Botón para colapsar/expandir - siempre visible */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`${sidebarCollapsed ? 'w-10 h-10 p-0' : 'p-2'} hover:bg-white/50 dark:hover:bg-gray-900/40 rounded-md transition-all flex-shrink-0 flex items-center justify-center`}
              title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <PanelLeft className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-gray-700 dark:text-gray-200 transition-transform duration-200 ${
                sidebarCollapsed ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Logo y nombre - solo cuando expandido */}
            {!sidebarCollapsed && (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-md flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">APRBOT</span>
                </div>
                {/* Botón X para volver al dashboard */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all group"
                  title="Volver al dashboard"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                </button>
              </>
            )}
          </div>

          {/* Controles principales */}
          <div className="p-4 space-y-3">
            {/* Botón Nueva Conversación */}
            <Button
              onClick={createNewConversation}
              variant="default"
              className={`${sidebarCollapsed ? 'w-10 h-10 rounded-full p-0 flex items-center justify-center mx-auto' : 'w-full justify-start px-3'} bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all hover:scale-105`}
            >
              <Plus className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} style={{ color: 'white !important' }} />
              {!sidebarCollapsed && "Nueva conversación"}
            </Button>

            {/* Botón Chats que navega a vista de búsqueda */}
            <Button
              onClick={async () => {
                console.log('🔍 Activando vista de búsqueda desde botón Chats');
                setSearchViewLoading(true);
                setCurrentConversation(null);
                setCurrentConversationTitle(null);
                setShowSearchView(true);
                setSearchQuery('');
                try {
                  // Recargar conversaciones para asegurar datos frescos
                  await loadConversations();
                } catch (error) {
                  console.error('Error cargando conversaciones:', error);
                } finally {
                  setSearchViewLoading(false);
                }
                window.location.hash = '#chatbot/recents';
              }}
              variant="ghost"
              className={`${sidebarCollapsed ? 'w-10 h-10 rounded-full p-0 flex items-center justify-center mx-auto' : 'w-full justify-start px-3'} ${showSearchView ? 'bg-blue-100 dark:bg-gray-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-900/20 hover:text-blue-600 dark:hover:text-blue-400'} transition-all duration-200`}
            >
              {!sidebarCollapsed && <span>Chats</span>}
            </Button>
          </div>


          {/* Sección Destacadas */}
          {!sidebarCollapsed && conversations.some(c => c.isHighlighted) && (
            <div className="px-4 pb-2">
              <div className="text-xs font-medium text-muted-foreground dark:text-white mb-3 flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                Destacadas
              </div>
              <div className="max-h-64 overflow-y-auto pr-2 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {conversations.filter(c => c.isHighlighted).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      if (currentConversation !== conv.id) {
                        handleConversationChange(conv.id);
                      }
                    }}
                    className={`p-2 rounded-lg cursor-pointer transition-all duration-200 group relative ${
                      currentConversation === conv.id
                        ? 'bg-blue-100 dark:bg-gray-900/40'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        <h4 className="text-sm font-medium truncate pr-8 dark:text-white">
                          {conv.title}
                        </h4>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-yellow-200 dark:hover:bg-yellow-700/30 transition-all absolute right-1 top-1/2 -translate-y-1/2 z-10 text-gray-700 dark:text-gray-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[9999] bg-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black border border-gray-200 dark:border-0 shadow-lg">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameConversation(conv.id);
                            }}
                            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Renombrar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHighlight(conv.id);
                            }}
                            className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                          >
                            <Star className={`h-4 w-4 mr-2 ${conv.isHighlighted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            {conv.isHighlighted ? 'Quitar destaque' : 'Destacar'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-900/50" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(conv.id);
                            }}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/80 dark:hover:text-white cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección Recientes */}
          {!sidebarCollapsed && conversations.length > 0 && (
            <div className="px-4 flex-1 overflow-hidden">
              <div className="text-xs font-medium text-muted-foreground dark:text-white mb-3">Recientes</div>
              <div className="h-full overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="space-y-1 pb-4">
                  {conversations.filter(c => !c.isHighlighted).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        if (currentConversation !== conv.id) {
                          handleConversationChange(conv.id);
                        }
                      }}
                      className={`p-2 rounded-lg cursor-pointer transition-all duration-200 group relative ${
                        currentConversation === conv.id
                          ? 'bg-blue-100 dark:bg-gray-900/40'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium truncate pr-8 dark:text-white">
                          {conv.title}
                        </h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all absolute right-1 top-1/2 -translate-y-1/2 z-10 text-gray-700 dark:text-gray-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[9999] bg-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black border border-gray-200 dark:border-0 shadow-lg">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameConversation(conv.id);
                              }}
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Renombrar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHighlight(conv.id);
                              }}
                              className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                            >
                              <Star className={`h-4 w-4 mr-2 ${conv.isHighlighted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              {conv.isHighlighted ? 'Quitar destaque' : 'Destacar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-900/50" />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/80 dark:hover:text-white cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(conv.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {conversations.filter(c => !c.isHighlighted).length > 10 && (
                <div className="px-4 pt-2 border-t border-gray-200 dark:border-gray-900">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => {
                      setShowSearchView(true);
                      setSearchQuery('');
                    }}
                  >
                    Ver todas las conversaciones ({conversations.length})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Botón de configuración de tema en la parte inferior */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`${sidebarCollapsed ? 'w-10 h-10 p-0 rounded-full mx-auto' : 'w-full justify-start px-3'} hover:bg-gray-100 dark:hover:bg-gray-900/50 text-gray-700 dark:text-gray-300 transition-all`}
                  title={sidebarCollapsed ? 'Configuración de tema' : ''}
                >
                  <Settings className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                  {!sidebarCollapsed && <span className="text-sm">Tema</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-lg min-w-[160px]"
              >
                <DropdownMenuItem
                  onClick={() => setTheme('light')}
                  className="cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Claro</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('dark')}
                  className="cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Oscuro</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className="cursor-pointer text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>

        {/* Área de chat - MENSAJES O BÚSQUEDA */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-[#212121] h-full transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}
        >
          {/* Botón para abrir sidebar en móvil - Solo visible cuando sidebar está colapsado */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-900 rounded-md transition-colors"
              aria-label="Abrir sidebar"
            >
              <PanelLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}

          {initializing && initialConversationId && initialConversationId !== 'new' && initialConversationId !== 'recents' ? (
            /* Loading skeleton mientras se carga la conversación inicial */
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#212121]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando conversación...</p>
              </div>
            </div>
          ) : showSearchView ? (
            /* Vista de búsqueda de conversaciones */
            <>
              {console.log('🔍 Renderizando vista de búsqueda:', {
                showSearchView,
                conversationsCount: conversations.length,
                filteredCount: filteredConversations.length,
                searchQuery
              })}
              {/* Header de búsqueda */}
              <div className="px-4 py-4 flex-shrink-0" style={{ marginTop: '70px' }}>
                <div className="flex items-center justify-between max-w-4xl mx-auto mb-4">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                    Historial de sus chats
                  </h2>
                  <Button
                    onClick={() => {
                      createNewConversation();
                      setShowSearchView(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-50 hover:bg-gray-50 dark:hover:bg-gray-100 text-gray-900 dark:text-gray-900 border border-gray-300 dark:border-gray-400 transition-all rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva conversación
                  </Button>
                </div>

                {/* Buscador */}
                <div className="relative mt-4 max-w-4xl mx-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Buscar en tus chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-12 py-3 border border-gray-300 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-600 focus:ring-0 bg-white dark:bg-[#212121] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista de conversaciones */}
              <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="max-w-3xl mx-auto">
                  {searchViewLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 dark:border-blue-500 border-t-transparent mx-auto mb-4"></div>
                      <p className="text-gray-500 dark:text-gray-400">Cargando conversaciones...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
                    </div>
                  ) : (
                    <div className="grid gap-3 pb-4">
                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={`group p-4 rounded-lg cursor-pointer transition-all duration-200 relative border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 ${
                            currentConversation === conv.id
                              ? 'bg-white dark:bg-[#212121] border-gray-300 dark:border-gray-700'
                              : 'bg-white dark:bg-[#212121]'
                          }`}
                          onClick={() => {
                            if (currentConversation !== conv.id) {
                              setCurrentConversation(conv.id);
                            }
                            setShowSearchView(false);
                            setSearchQuery('');
                          }}
                        >
                          {/* Header con título y botón de opciones */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-base text-gray-900 dark:text-gray-100 mb-1">
                                {conv.title}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Último mensaje hace {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false, locale: es })}
                              </p>
                            </div>

                            {/* Botón de 3 puntos horizontales */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  ref={(el) => {
                                    if (el) {
                                      // Configurar visibilidad inicial
                                      el.style.setProperty('opacity', '0', 'important');

                                      // Configurar el hover del padre
                                      const parent = el.closest('.group');
                                      if (parent) {
                                        parent.addEventListener('mouseenter', () => {
                                          el.style.setProperty('opacity', '1', 'important');
                                        });
                                        parent.addEventListener('mouseleave', () => {
                                          el.style.setProperty('opacity', '0', 'important');
                                        });
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <div style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    backgroundColor: '#374151'
                                  }}></div>
                                  <div style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    backgroundColor: '#374151'
                                  }}></div>
                                  <div style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    backgroundColor: '#374151'
                                  }}></div>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[10001] bg-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black border border-gray-200 dark:border-0 shadow-lg">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentConversation !== conv.id) {
                                      setCurrentConversation(conv.id);
                                    }
                                    setShowSearchView(false);
                                    setSearchQuery('');
                                  }}
                                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Seleccionar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRenameConversation(conv.id);
                                  }}
                                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Renombrar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHighlight(conv.id);
                                  }}
                                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900/50 cursor-pointer"
                                >
                                  <Star className={`h-4 w-4 mr-2 ${conv.isHighlighted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                  {conv.isHighlighted ? 'Quitar destaque' : 'Destacar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-900/50" />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/80 dark:hover:text-white cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(conv.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            (currentConversation || messages.length > 0) ? (
              <>
                {/* Header con nombre del chat */}
              <div className="border-b border-gray-100 dark:border-gray-900 px-4 py-2 bg-gray-50 dark:bg-black flex-shrink-0">
                <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                  {(() => {
                    const title = currentConversation
                      ? (currentConversationTitle || 'Chat')
                      : 'Nueva conversación';
                    console.log('🎯 Header título [RENDER]:', {
                      timestamp: new Date().toISOString(),
                      currentConversation,
                      currentConversationTitle,
                      finalTitle: title,
                      messagesLength: messages.length
                    });
                    return title;
                  })()}
                </h2>
              </div>

              {/* Mensajes - Solo esta área hace scroll con padding bottom para el input FIJO */}
              <div className="flex-1 overflow-y-auto pb-32 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
                {loadingMessages || (!messages || messages.length === 0) ? (
                  (initializing || loadingMessages) && currentConversation ? (
                    // Si estamos inicializando o cargando mensajes de una conversación existente, mostrar loading
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500 mx-auto mb-4" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando mensajes...</p>
                      </div>
                    </div>
                  ) : (
                    // Solo mostrar bienvenida si realmente es una nueva conversación y NO estamos cargando
                    !loadingMessages && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p className="text-lg font-medium text-center dark:text-gray-200">Bienvenido al sistema de consultas APR</p>
                          <p className="text-sm text-center dark:text-gray-400">Pregúntame sobre boletas, pagos, servicios o cualquier consulta del sistema APR</p>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="w-full max-w-3xl mx-auto px-8 py-8">
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`mb-10 flex ${message.role === 'user' ? 'justify-start' : 'justify-start'} animate-in fade-in duration-300`}
                      >
                        {message.role === 'user' ? (
                          /* Mensaje del usuario - con burbuja y avatar */
                          <div className="flex gap-4 max-w-[70%]">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gray-600 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                              <div className="transition-all duration-300 ease-in-out">
                                <div className="opacity-100 transform transition-all duration-300 ease-in-out">
                                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                                </div>
                              </div>
                              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                {format(new Date(message.createdAt), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* Respuesta del bot - sin avatar, solo texto integrado */
                          <div className="w-full">
                            <div className="transition-all duration-300 ease-in-out">
                              {message.isLoading ? (
                                <div className="flex items-center space-x-3 opacity-100">
                                  <div className="relative">
                                    <Brain className="w-6 h-6 text-blue-600 dark:text-blue-500 animate-pulse" />
                                    <div className="absolute inset-0 bg-blue-500 dark:bg-blue-400 opacity-20 blur-md rounded-full animate-ping"></div>
                                  </div>
                                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Generando respuesta...</span>
                                </div>
                              ) : (
                                <div className="opacity-100 transform transition-all duration-300 ease-in-out">
                                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere text-gray-900 dark:text-gray-100">{message.content}</p>
                                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                    {format(new Date(message.createdAt), 'HH:mm')}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Indicador de "Generando respuesta..." cuando se está procesando */}
                    {generatingResponse && (
                      <div className="w-full mb-10">
                        <div className="flex items-center space-x-3 opacity-100">
                          <div className="relative">
                            <Brain className="w-6 h-6 text-blue-600 dark:text-blue-500 animate-pulse" />
                            <div className="absolute inset-0 bg-blue-500 dark:bg-blue-400 opacity-20 blur-md rounded-full animate-ping"></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Generando respuesta...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Vista de bienvenida cuando no hay conversación seleccionada */
            <>
              {/* Pantalla de bienvenida */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50 dark:bg-[#212121]">
                <div className="text-center max-w-2xl w-full">
                  {/* Saludo personalizado con horario y nombre del usuario */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    {(() => {
                      const hour = new Date().getHours();
                      const greeting = hour < 12 ? '¡Buenos días' : hour < 18 ? '¡Buenas tardes' : '¡Buenas noches';
                      const userName = user?.nombres || 'Usuario';
                      return `${greeting}, ${userName}!`;
                    })()}
                  </h1>

                  <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-12">
                    Tu asistente virtual especializado en el sistema APR<br />
                    (Agua Potable Rural)
                  </p>

                  {/* Input integrado con el contenido */}
                  <div className="w-full max-w-xl mx-auto">
                    <div className="relative flex items-end gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          // Auto-resize dinámico sin scrollbar - Empieza pequeño y crece hacia abajo
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto'; // Reset primero
                          const newHeight = Math.min(Math.max(target.scrollHeight, 52), 200);
                          target.style.height = newHeight + 'px';
                        }}
                        onKeyDown={handleKeyPress}
                        placeholder="Escribe tu consulta sobre el sistema APR..."
                        className="flex-1 px-4 py-3 border-2 border-blue-500 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-0 focus:border-blue-600 dark:focus:border-gray-500 transition-all text-gray-900 dark:text-gray-100 shadow-lg text-base placeholder-gray-400 dark:placeholder-gray-500 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:hover:bg-gray-500 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500"
                        rows={1}
                        style={{
                          minHeight: '52px',
                          maxHeight: '200px',
                          height: '52px',
                          width: '100%',
                          backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff'
                        }}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim() || !usageLimits?.canSend || !!validationError}
                        className="flex-shrink-0 p-2.5 rounded-lg transition-all border-0 text-white hover:scale-105"
                        style={{
                          height: '44px',
                          width: '44px',
                          flexShrink: 0,
                          backgroundColor: '#2563eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          opacity: 1
                        }}
                      >
                        {sending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>

                    {/* Información del estado */}
                    <div className="mt-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {validationError
                          ? `⚠️ ${validationError}`
                          : 'Presiona Enter para enviar, Shift+Enter para nueva línea'
                        }
                      </p>
                    </div>

                    {/* Limitaciones de uso si aplican */}
                    {!usageLimits?.canSend && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 justify-center">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-amber-800">
                            Has alcanzado tu límite de mensajes diario o mensual
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )
        )}
        </div>

        {/* INPUT COMPLETAMENTE FIJO CON POSITION FIXED - CENTRADO */}
        {(currentConversation || messages.length > 0) && !showSearchView && (
          <div
            className="fixed bottom-0 px-4 md:px-6 py-4 z-50"
            style={{
              left: sidebarCollapsed ? '0' : '256px',
              right: '0',
              transition: 'left 0.3s ease',
              background: 'transparent',
              pointerEvents: 'none'
            }}
          >
            {!usageLimits?.canSend && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-2xl mx-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    Has alcanzado tu límite de mensajes diario o mensual
                  </span>
                </div>
              </div>
            )}
            <div className="max-w-2xl mx-auto" style={{ pointerEvents: 'auto' }}>
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewMessage(value);

                    // Auto-resize dinámico sin scrollbar - Empieza pequeño y crece hacia abajo
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto'; // Reset primero
                    const newHeight = Math.min(Math.max(target.scrollHeight, 44), 200);
                    target.style.height = newHeight + 'px';

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
                  onKeyDown={handleKeyPress}
                  placeholder="Escribe tu consulta sobre el sistema APR..."
                  className={`flex-1 px-4 py-3 border-2 rounded-xl resize-none focus:outline-none focus:ring-0 transition-all overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:hover:bg-gray-500 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500 ${
                    validationError
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-gray-300 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-600'
                  }`}
                  rows={1}
                  style={{
                    minHeight: '44px',
                    maxHeight: '200px',
                    height: '44px',
                    width: '100%',
                    backgroundColor: validationError
                      ? (isDarkMode ? 'rgba(127, 29, 29, 0.3)' : '#FEF2F2')
                      : (isDarkMode ? '#2a2a2a' : '#ffffff'),
                    color: isDarkMode ? '#d1d5db' : '#111827'
                  }}
                  disabled={sending || !usageLimits?.canSend}
                />
                <Button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim() || !usageLimits?.canSend || !!validationError}
                  className="flex-shrink-0 p-2 rounded-lg transition-all border-0 text-white"
                  style={{
                    height: '40px',
                    width: '40px',
                    flexShrink: 0,
                    backgroundColor: '#2563eb',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    opacity: 1
                  }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {validationError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  {validationError}
                </div>
              )}

              {/* Información del estado */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {validationError
                    ? `⚠️ ${validationError}`
                    : 'Presiona Enter para enviar, Shift+Enter para nueva línea'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Renombrar */}
      {showRenameModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={() => {
            setShowRenameModal(false);
            setNewTitle('');
          }}
        >
          <div
            className="bg-white dark:bg-black rounded-lg p-6 max-w-md w-full mx-4 shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowRenameModal(false);
                setNewTitle('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Renombrar conversación
              </h3>
            </div>

            {/* Content */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">
                  Nuevo nombre de la conversación
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Escribe el nuevo nombre..."
                  className="w-full transition-colors duration-150 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={cancelRename}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveRename}
                disabled={!newTitle.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminación de conversación */}
      {console.log('deleteDialogOpen state:', deleteDialogOpen)}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={() => {
            setDeleteDialogOpen(false);
            setConversationToDelete(null);
          }}
        >
          <div
            className="bg-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-900 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setDeleteDialogOpen(false);
                setConversationToDelete(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                Eliminar chat
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                ¿Estás seguro que quieres eliminar este chat? Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setConversationToDelete(null);
                }}
                className="flex-1 border-gray-300 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (conversationToDelete) {
                    await deleteConversation(conversationToDelete);
                    setDeleteDialogOpen(false);
                    setConversationToDelete(null);
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white border-0"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}