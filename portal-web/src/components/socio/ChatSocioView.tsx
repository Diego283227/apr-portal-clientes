import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  MessageSquare,
  Check,
  AlertTriangle,
  ArrowLeft,
  X,
  Forward,
  Menu
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { toast } from 'sonner';
import { useSocketContext } from '../../contexts/SocketContext';
import { useAuth } from '@/hooks/useAuth';
import MessageActions from '@/components/ui/MessageActions';
import MessageSelectionToolbar from '@/components/ui/MessageSelectionToolbar';

interface ChatSocioViewProps {
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'socio' | 'super_admin';
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  messageType: 'text' | 'system';
  edited?: boolean;
  editedAt?: string;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
    senderType: 'socio' | 'super_admin';
  };
  forwarded?: boolean;
  originalSender?: string;
}

interface Conversation {
  _id: string;
  socioId: string;
  socioName: string;
  adminId?: string;
  adminName?: string;
  status: 'active' | 'closed';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: {
    socio: number;
    admin: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ChatSocioView({ onBack, onToggleSidebar }: ChatSocioViewProps) {
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected, onlineUsers, joinConversation, leaveConversation, sendTyping } = useSocketContext();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const typingDebounceRef = useRef<number | null>(null);

  // Selection states
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Context menu states
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    x: number;
    y: number;
  } | null>(null);

  // Reply states
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Forward states
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);

  const restoreScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (!container || !conversation) return false;
    
    try {
      const savedData = localStorage.getItem('chatScrollPosition');
      if (!savedData) return false;
      
      const scrollData = JSON.parse(savedData);
      
      // Only restore if it's for the same conversation and not too old (1 hour)
      const isValidData = scrollData.conversationId === conversation._id && 
                         (Date.now() - scrollData.timestamp) < 3600000;
      
      if (isValidData) {
        // Calculate relative position to maintain it even if content changed
        const relativePosition = scrollData.scrollTop / scrollData.scrollHeight;
        const newScrollTop = relativePosition * container.scrollHeight;
        
        container.scrollTo({
          top: newScrollTop,
          behavior: 'instant' // No smooth scroll on restore
        });
        
        return true;
      }
    } catch (error) {
      // Handle error silently
    }
    
    return false;
  };

  const scrollToBottom = (force = false) => {
    if (!shouldAutoScroll && !force) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Use smooth scrolling to bottom
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
    
    setShouldAutoScroll(isNearBottom);
    setLastScrollTop(scrollTop);
    
    // Save scroll position to localStorage (only if not at bottom to avoid unnecessary storage)
    if (conversation && !isNearBottom) {
      const scrollData = {
        conversationId: conversation._id,
        scrollTop,
        scrollHeight,
        timestamp: Date.now()
      };
      localStorage.setItem('chatScrollPosition', JSON.stringify(scrollData));
    } else if (conversation && isNearBottom) {
      // Remove saved position when user is at bottom (no need to restore to bottom)
      localStorage.removeItem('chatScrollPosition');
    }
    
    // Clear new messages indicator when user scrolls to bottom
    if (isNearBottom && hasNewMessages) {
      setHasNewMessages(false);
    }
  };

  const prevMessagesLengthRef = useRef(0);
  
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
    prevMessagesLengthRef.current = messages.length;
    
    if (isInitialLoad) {
      // On initial load, try to restore scroll position first
      setTimeout(() => {
        const wasRestored = restoreScrollPosition();
        if (!wasRestored) {
          // If no saved position, scroll to bottom
          scrollToBottom(true);
        } else {
          // Update shouldAutoScroll based on restored position
          const container = messagesContainerRef.current;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
            setShouldAutoScroll(isNearBottom);
          }
        }
      }, 100); // Small delay to ensure DOM is updated
    } else if (isNewMessage && messages.length > 0) {
      if (shouldAutoScroll) {
        // Only auto-scroll for new messages, and only if user is near bottom
        scrollToBottom();
      } else {
        // If user is not at bottom, show new messages indicator
        setHasNewMessages(true);
      }
    }
  }, [messages]);

  useEffect(() => {
    // Only scroll for typing indicators if user is already at bottom
    if (typingUsers.length > 0) {
      scrollToBottom();
    }
  }, [typingUsers]);

  // Clean old scroll positions on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('chatScrollPosition');
      if (savedData) {
        const scrollData = JSON.parse(savedData);
        // Remove data older than 1 hour
        if (Date.now() - scrollData.timestamp > 3600000) {
          localStorage.removeItem('chatScrollPosition');
        }
      }
    } catch (error) {
      localStorage.removeItem('chatScrollPosition');
    }
    
    initializeChat();
    
    // Cleanup function to clear timeouts
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (conversation) {
      loadMessages();
      
      // Join conversation room for real-time updates
      if (socket && isConnected) {
        joinConversation(conversation._id);
      }
    }

    return () => {
      if (conversation && socket) {
        leaveConversation(conversation._id);
      }
    };
  }, [conversation, socket, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleNewMessage = (message: Message) => {
      // Only process messages for current conversation
      if (!conversation || message.conversationId !== conversation._id) {
        return;
      }

      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const existingMessage = prev.find(m => m._id === message._id);
        if (existingMessage) {
          return prev;
        }

        // If this is our own message coming from server, replace any temp message with same content and sender
        const tempMessageIndex = prev.findIndex(m =>
          m._id.startsWith('temp-') &&
          m.content === message.content &&
          m.senderType === 'socio' &&
          m.senderId === message.senderId
        );

        if (tempMessageIndex !== -1) {
          // Replace temp message with real message, preserving all server data
          const updatedMessages = [...prev];
          updatedMessages[tempMessageIndex] = {
            ...message,
            // Ensure replyTo data is preserved from server response
            replyTo: message.replyTo || prev[tempMessageIndex].replyTo
          };
          return updatedMessages;
        }

        // Add new message normally
        return [...prev, message];
      });
    };

    const handleUserTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.userName) ? prev : [...prev, data.userName];
        } else {
          return prev.filter(user => user !== data.userName);
        }
      });
    };

    const handleConversationClosed = (conversation: Conversation) => {
      setConversation(conversation);
      toast.info('La conversación ha sido cerrada por soporte');
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('conversation_closed', handleConversationClosed);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('conversation_closed', handleConversationClosed);
    };
  }, [socket, isConnected, conversation]);

  const initializeChat = async () => {
    try {
      setInitializing(true);
      const response = await apiClient.get('/chat/conversation');
      
      if (response.data.success) {
        setConversation(response.data.data.conversation);
      }
    } catch (error: any) {
      toast.error('Error al inicializar el chat');
    } finally {
      setInitializing(false);
    }
  };

  const loadMessages = async (showLoading = true) => {
    if (!conversation) return;
    
    try {
      if (showLoading) setLoading(true);
      
      const response = await apiClient.get(`/chat/conversations/${conversation._id}/messages`);

      if (response.data.success) {
        setMessages(response.data.data.messages);
      }
    } catch (error: any) {
      if (showLoading) {
        toast.error('Error al cargar los mensajes');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || sendingMessage || !isAuthenticated || !user) return;

    // Allow sending even without real-time connection (will still work via HTTP)

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update

    try {
      setSendingMessage(true);

      // Create temporary message object for immediate display
      const tempMessage: Message = {
        _id: tempId,
        conversationId: conversation._id,
        senderId: user?.id || 'current-user',
        senderType: 'socio',
        senderName: user ? `${user.nombres} ${user.apellidos}` : 'Tú',
        content: messageContent,
        timestamp: new Date().toISOString(),
        read: true, // Mark as read since it's our own message
        messageType: 'text',
        replyTo: replyingTo ? {
          messageId: replyingTo._id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
          senderType: replyingTo.senderType
        } : undefined
      };

      // Add message immediately to local state (optimistic update)
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      // Prepare request data
      const requestData: any = { content: messageContent };
      if (replyingTo) {
        requestData.replyTo = {
          messageId: replyingTo._id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
          senderType: replyingTo.senderType
        };
      }

      setReplyingTo(null); // Clear reply state
      stopTyping(); // Use optimized stop typing function

      // Always scroll to bottom when user sends a message
      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom(true), 50);

      const response = await apiClient.post(
        `/chat/conversations/${conversation._id}/messages`,
        requestData
      );

      if (response.data.success) {
        // Message sent successfully
        // Socket.IO will handle adding the real message from server
        // Remove temp message when real one arrives (handled in socket listener)
      }
    } catch (error: any) {
      toast.error('Error al enviar el mensaje');

      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      // Restore the message content
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string): Promise<boolean> => {
    if (!conversation) return false;

    try {
      const response = await apiClient.put(`/chat/messages/${messageId}`, {
        content: newContent
      });

      if (response.data.success) {
        // Update local message
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content: newContent, edited: true, editedAt: new Date().toISOString() }
            : msg
        ));
        
        toast.success('Mensaje editado correctamente');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error('Error al editar el mensaje');
      return false;
    }
  };

  const handleDeleteMessage = async (messageId: string): Promise<boolean> => {
    if (!conversation) return false;

    try {
      const response = await apiClient.delete(`/chat/messages/${messageId}`);

      if (response.data.success) {
        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        
        toast.success('Mensaje eliminado correctamente');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error('Error al eliminar el mensaje');
      return false;
    }
  };

  // Optimized typing indicator functions
  const startTyping = useCallback(() => {
    if (!conversation || sendingMessage || isTypingRef.current) return;
    
    isTypingRef.current = true;
    sendTyping(conversation._id, true);
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set fallback timeout to stop typing after 3 seconds (backup in case debounce fails)
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTyping(conversation._id, false);
      }
    }, 3000);
  }, [conversation, sendingMessage, sendTyping]);
  
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (conversation) {
        sendTyping(conversation._id, false);
      }
    }
  }, [conversation, sendTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Simplified typing logic - only handle if we have a conversation
    if (!conversation) return;

    // Clear previous debounce timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Handle typing indicators with minimal overhead
    if (value.trim()) {
      // Only start typing if not already typing
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTyping(conversation._id, true);
      }

      // Debounce stop typing
      typingDebounceRef.current = window.setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          sendTyping(conversation._id, false);
        }
      }, 1000);

    } else {
      // Stop typing immediately if input is empty
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTyping(conversation._id, false);
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
    }
  }, [conversation, sendTyping]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  // Check if admin is online
  const isAdminOnline = () => {
    if (!conversation?.adminId) return false;
    return onlineUsers.some(user => user.id === conversation.adminId && user.role === 'super_admin');
  };

  // Get admin info
  const getAdminStatus = () => {
    const adminOnline = isAdminOnline();
    return {
      isOnline: adminOnline,
      text: adminOnline ? 'Soporte en línea' : 'Soporte desconectado',
      color: adminOnline ? 'text-green-600' : 'text-red-600',
      bgColor: adminOnline ? 'bg-green-100' : 'bg-red-100',
      dotColor: adminOnline ? 'bg-green-500' : 'bg-red-500'
    };
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      stopTyping(); // Stop typing indicator immediately when sending
      sendMessage();
    }
  }, [sendMessage, stopTyping]);

  // Selection functions
  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const isSelected = prev.includes(messageId);
      if (isSelected) {
        const newSelection = prev.filter(id => id !== messageId);
        if (newSelection.length === 0) {
          setIsSelectionMode(false);
        }
        return newSelection;
      } else {
        if (!isSelectionMode) {
          setIsSelectionMode(true);
        }
        return [...prev, messageId];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedMessages([]);
    setIsSelectionMode(false);
  };

  const handleDeleteSelectedMessages = async (messageIds: string[]) => {
    try {
      // Delete messages one by one
      for (const messageId of messageIds) {
        await handleDeleteMessage(messageId);
      }
      handleClearSelection();
    } catch (error) {
      toast.error('Error al eliminar algunos mensajes');
    }
  };

  // Context menu functions
  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();

    // Calculate position ensuring menu appears to the right of the message
    const menuWidth = 160; // min-w-[160px]
    const menuHeight = 300; // estimated max height

    // Get the message element's bounding box
    const messageElement = e.currentTarget as HTMLElement;
    const rect = messageElement.getBoundingClientRect();

    // Position menu to the right of the message bubble
    let x = rect.right + 10; // 10px gap from message
    let y = rect.top;

    // Check if menu would overflow right edge, if so place it on the left
    if (x + menuWidth > window.innerWidth) {
      x = rect.left - menuWidth - 10; // place to the left instead
    }

    // Check if menu would overflow bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    // Ensure menu doesn't go off top edge
    if (y < 10) {
      y = 10;
    }

    setContextMenu({
      messageId,
      x,
      y
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Reply functions
  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
    setContextMenu(null);
    // Focus on input
    const input = document.querySelector('textarea') as HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Forward functions
  const handleForwardMessage = async (message: Message) => {
    if (!conversation || !user) return;

    try {
      // Create the forwarded message content with better formatting
      const forwardContent = message.content;

      // Create temporary message for immediate display
      const tempId = `temp-forward-${Date.now()}`;
      const tempMessage: Message = {
        _id: tempId,
        conversationId: conversation._id,
        senderId: user.id,
        senderType: 'socio',
        senderName: `${user.nombres} ${user.apellidos}`,
        content: forwardContent,
        timestamp: new Date().toISOString(),
        read: true,
        messageType: 'text',
        forwarded: true,
        originalSender: message.senderName
      };

      // Add to messages immediately for instant feedback
      setMessages(prev => [...prev, tempMessage]);

      // Scroll to bottom
      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom(true), 50);

      // Send to server
      const response = await apiClient.post(
        `/chat/conversations/${conversation._id}/messages`,
        {
          content: forwardContent,
          forwarded: true,
          originalSender: message.senderName
        }
      );

      if (response.data.success) {
        toast.success('Mensaje reenviado correctamente');
      } else {
        // Remove temp message if failed
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
        toast.error('Error al reenviar el mensaje');
      }
    } catch (error: any) {
      // Remove temp message if failed
      setMessages(prev => prev.filter(msg => msg._id.startsWith('temp-forward-')));
      toast.error('Error al reenviar el mensaje');
    }

    setContextMenu(null);
  };

  const handleForwardSelected = async () => {
    if (selectedMessages.length === 0 || !conversation || !user) return;

    try {
      const messagesToForward = messages.filter(msg => selectedMessages.includes(msg._id));
      let tempMessages: Message[] = [];

      for (let i = 0; i < messagesToForward.length; i++) {
        const message = messagesToForward[i];
        const forwardContent = message.content;

        // Create temporary message for immediate display
        const tempId = `temp-forward-multi-${Date.now()}-${i}`;
        const tempMessage: Message = {
          _id: tempId,
          conversationId: conversation._id,
          senderId: user.id,
          senderType: 'socio',
          senderName: `${user.nombres} ${user.apellidos}`,
          content: forwardContent,
          timestamp: new Date().toISOString(),
          read: true,
          messageType: 'text',
          forwarded: true,
          originalSender: message.senderName
        };

        tempMessages.push(tempMessage);

        // Add each message with a small delay for better UX
        setTimeout(() => {
          setMessages(prev => [...prev, tempMessage]);
        }, i * 100);
      }

      // Scroll to bottom
      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom(true), messagesToForward.length * 100 + 100);

      // Send all messages to server
      for (const message of messagesToForward) {
        const forwardContent = message.content;

        await apiClient.post(
          `/chat/conversations/${conversation._id}/messages`,
          {
            content: forwardContent,
            forwarded: true,
            originalSender: message.senderName
          }
        );
      }

      toast.success(`${messagesToForward.length} mensaje${messagesToForward.length > 1 ? 's' : ''} reenviado${messagesToForward.length > 1 ? 's' : ''}`);
      handleClearSelection();
    } catch (error: any) {
      // Remove temp messages if failed
      setMessages(prev => prev.filter(msg => !msg._id.startsWith('temp-forward-multi-')));
      toast.error('Error al reenviar los mensajes');
    }
  };

  // Check authentication first
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Acceso Denegado</h3>
          <p className="text-muted-foreground mb-4">Debes estar autenticado para acceder al chat</p>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicializando chat...</p>
          {!isConnected && (
            <p className="text-sm text-red-500 mt-2">
              ⚠️ Conectando al servidor en tiempo real...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error al cargar el chat</h3>
          <p className="text-muted-foreground mb-4">No se pudo inicializar la conversación</p>
          {!isConnected && (
            <p className="text-sm text-red-500 mb-4">
              ⚠️ Sin conexión al servidor en tiempo real
            </p>
          )}
          <button
            onClick={initializeChat}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Selection Toolbar */}
      {isSelectionMode && selectedMessages.length > 0 && (
        <MessageSelectionToolbar
          selectedMessages={messages.filter(msg => selectedMessages.includes(msg._id))}
          onClearSelection={handleClearSelection}
          onDeleteSelected={handleDeleteSelectedMessages}
          onForwardSelected={handleForwardSelected}
          canDeleteOthers={false}
          currentUserType="socio"
        />
      )}

      <div className={`w-full h-screen flex flex-col bg-white dark:bg-gray-900 ${
        isSelectionMode ? 'pt-16' : ''
      }`}>
        {/* Professional Header */}
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-lg border-0">
          <div className="px-4 py-3">
            <div className="flex items-center space-x-4">
              {/* Botón hamburguesa - Solo móvil */}
              {onToggleSidebar && (
                <button
                  onClick={onToggleSidebar}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors -ml-2"
                >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              )}

              <div className="flex items-center space-x-3 flex-1">
                {/* Admin Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-0 shadow-md overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                    {conversation?.adminId && conversation?.adminName ? (
                      // Try to load admin photo, fallback to default avatar
                      <img
                        src={`/api/uploads/avatars/${conversation.adminId}.jpg`}
                        alt={conversation.adminName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, show default avatar
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                                <svg class="h-5 w-5 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      // Default avatar when no admin
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {isConnected && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-0 rounded-full shadow-md"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Soporte
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    {isConnected ? (
                      getAdminStatus().isOnline ? '🟢 en línea' : '🔴 fuera de línea'
                    ) : (
                      '🔄 conectando...'
                    )}
                  </p>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-3">
                {!isConnected && (
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                    Sin conexión
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp/Instagram Style Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/30 via-slate-50/50 to-cyan-50/30 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 p-4"
          onScroll={handleScroll}
          style={{
            scrollBehavior: 'smooth'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-200 border-t-cyan-600 shadow-lg"></div>
                  <MessageSquare className="absolute inset-0 m-auto h-5 w-5 text-cyan-600" />
                </div>
                <p className="text-slate-600 font-medium">Cargando conversación...</p>
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-sm mx-auto p-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-cyan-200 dark:border-cyan-700">
                      <MessageSquare className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100 mb-2">¡Hola! 👋</h3>
                    <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                      Envía un mensaje para conectar con nuestro equipo de soporte de APR
                    </p>
                    <div className="inline-flex items-center space-x-2 text-xs text-slate-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-full shadow-sm border border-cyan-200 dark:border-gray-700">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span>Soporte en línea</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {messages.map((message, index) => {
                      const isOwn = message.senderType === 'socio';
                      const isSystem = message.messageType === 'system';
                      const prevMessage = messages[index - 1];
                      const nextMessage = messages[index + 1];
                      const isFirstInGroup = !prevMessage || prevMessage.senderType !== message.senderType;
                      const isLastInGroup = !nextMessage || nextMessage.senderType !== message.senderType;
                      
                      if (isSystem) {
                        return (
                          <div key={message._id} className="flex justify-center my-4">
                            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                              {message.content}
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={message._id}
                          data-message-id={message._id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
                        >
                          <div className={`max-w-sm sm:max-w-xl lg:max-w-2xl relative ${isOwn ? 'mr-2' : 'ml-2'}`}>
                            {/* Selection indicator */}
                            {selectedMessages.includes(message._id) && (
                              <div className="absolute -left-6 top-1/2 transform -translate-y-1/2">
                                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}

                            {/* WhatsApp/Instagram Style Message Bubble */}
                            <div
                              className={`px-3 py-2 shadow-sm relative cursor-pointer transition-all duration-200 ${
                                selectedMessages.includes(message._id)
                                  ? 'ring-2 ring-blue-500 ring-opacity-50'
                                  : ''
                              } ${
                                isOwn
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-pink-500 dark:to-red-600 text-white hover:from-blue-600 hover:to-blue-700 dark:hover:from-pink-600 dark:hover:to-red-700 shadow-md border-0'
                                  : 'bg-white dark:bg-gradient-to-br dark:from-purple-500 dark:to-red-600 text-slate-800 dark:text-white border-0 hover:bg-gray-50 dark:hover:from-purple-600 dark:hover:to-red-700 shadow-md'
                              } ${
                                // Rounded corners logic like WhatsApp
                                isFirstInGroup && isLastInGroup
                                  ? (isOwn ? 'rounded-2xl' : 'rounded-2xl')
                                  : isFirstInGroup
                                  ? (isOwn ? 'rounded-2xl rounded-br-lg' : 'rounded-2xl rounded-bl-lg')
                                  : isLastInGroup
                                  ? (isOwn ? 'rounded-2xl rounded-tr-lg' : 'rounded-2xl rounded-tl-lg')
                                  : (isOwn ? 'rounded-lg rounded-r-lg' : 'rounded-lg rounded-l-lg')
                              }`}
                              onContextMenu={(e) => handleContextMenu(e, message._id)}
                              onClick={() => {
                                if (isSelectionMode) {
                                  handleSelectMessage(message._id);
                                }
                              }}
                              onDoubleClick={() => {
                                if (!isSelectionMode) {
                                  handleSelectMessage(message._id);
                                }
                              }}
                            >
                              
                              {/* Reply Reference */}
                              {message.replyTo && (
                                <div
                                  className={`mb-2 p-2 rounded-md border-l-2 cursor-pointer ${
                                    isOwn
                                      ? 'bg-white/20 border-blue-200 dark:border-pink-200 hover:bg-white/30'
                                      : 'bg-slate-50 dark:bg-white/20 border-slate-300 dark:border-purple-200 hover:bg-slate-100 dark:hover:bg-white/30'
                                  } transition-all duration-200`}
                                  onClick={() => {
                                    // Find the original message and scroll to it
                                    const originalMessage = messages.find(m => m._id === message.replyTo?.messageId);
                                    if (originalMessage) {
                                      const messageElement = document.querySelector(`[data-message-id="${originalMessage._id}"]`);
                                      if (messageElement) {
                                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Highlight briefly
                                        messageElement.classList.add('animate-pulse');
                                        setTimeout(() => messageElement.classList.remove('animate-pulse'), 2000);
                                      }
                                    }
                                  }}
                                  title="Ver mensaje original"
                                >
                                  <div className={`text-xs ${isOwn ? 'text-white' : 'text-slate-700 dark:text-white'}`}>
                                    {message.replyTo.content.length > 60
                                      ? `${message.replyTo.content.substring(0, 60)}...`
                                      : message.replyTo.content
                                    }
                                  </div>
                                </div>
                              )}

                              {/* Forwarded indicator */}
                              {message.forwarded && (
                                <div className="text-xs font-medium mb-2 flex items-center gap-1 text-white/80">
                                  <Forward className="h-3 w-3" />
                                  Mensaje reenviado
                                </div>
                              )}

                              {/* Message Content */}
                              <div className="break-words">
                                <p className="text-sm leading-relaxed">
                                  {message.content}
                                </p>
                              </div>
                              
                              {/* Time and Status */}
                              <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
                                isOwn ? 'text-white/70' : 'text-slate-400 dark:text-white/70'
                              }`}>
                                <span className="text-xs">
                                  {formatDate(message.timestamp)}
                                </span>
                                
                                {isOwn && (
                                  <div className="flex items-center">
                                    {message.read ? (
                                      <div className="flex">
                                        <Check className="h-3 w-3" />
                                        <Check className="h-3 w-3 -ml-1" />
                                      </div>
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                )}
                                
                                {message.edited && (
                                  <span className="text-xs opacity-70">editado</span>
                                )}
                              </div>

                              {/* WhatsApp-style tail */}
                              {isLastInGroup && (
                                <div
                                  className={`absolute bottom-0 ${
                                    isOwn ? '-right-2 border-l-blue-600 dark:border-l-red-600' : '-left-2 border-r-white dark:border-r-red-600'
                                  }`}
                                  style={{
                                    width: 0,
                                    height: 0,
                                    borderTopWidth: '6px',
                                    borderBottomWidth: '6px',
                                    borderTopColor: 'transparent',
                                    borderBottomColor: 'transparent',
                                    ...(isOwn ? {
                                      borderLeftWidth: '8px'
                                    } : {
                                      borderRightWidth: '8px'
                                    })
                                  }}
                                />
                              )}
                            </div>

                            {/* Message Actions */}
                            {!isSystem && !isSelectionMode && (
                              <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 transform -translate-y-1/2 ${
                                isOwn ? '-left-8' : '-right-8'
                              }`}>
                                <MessageActions
                                  message={message}
                                  onEdit={isOwn ? handleEditMessage : undefined}
                                  onDelete={isOwn ? handleDeleteMessage : undefined}
                                  onSelect={handleSelectMessage}
                                  onReply={handleReplyToMessage}
                                  onForward={handleForwardMessage}
                                  canEdit={isOwn}
                                  canDelete={isOwn}
                                  canSelect={true}
                                  isSelected={selectedMessages.includes(message._id)}
                                />
                              </div>
                            )}

                            {/* Context Menu */}
                            {contextMenu && contextMenu.messageId === message._id && (
                              <MessageActions
                                message={message}
                                onEdit={isOwn ? handleEditMessage : undefined}
                                onDelete={isOwn ? handleDeleteMessage : undefined}
                                onSelect={handleSelectMessage}
                                onReply={handleReplyToMessage}
                                onForward={handleForwardMessage}
                                canEdit={isOwn}
                                canDelete={isOwn}
                                canSelect={true}
                                isSelected={selectedMessages.includes(message._id)}
                                showAsContextMenu={true}
                                position={{ x: contextMenu.x, y: contextMenu.y }}
                                onClose={handleCloseContextMenu}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                
                  {/* WhatsApp Style Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start ml-2 mb-2">
                      <div className="bg-white dark:bg-gradient-to-br dark:from-purple-500 dark:to-red-600 border border-slate-200 dark:border-0 rounded-2xl rounded-bl-lg px-4 py-2 shadow-lg">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-500 dark:bg-white rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-500 dark:bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-slate-500 dark:bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Auto-scroll helper */}
              <div ref={messagesEndRef} />
            </>
          )}
          
          {/* New Messages Indicator / Scroll to Bottom Button */}
          {hasNewMessages && !shouldAutoScroll && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={() => {
                  setHasNewMessages(false);
                  setShouldAutoScroll(true);
                  scrollToBottom(true);
                }}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all animate-bounce"
              >
                <span className="text-sm">Nuevos mensajes</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="bg-white dark:bg-gray-800 border-t-0 px-4 py-4 shadow-md">
            <div className="w-full px-4">
              <div className="flex items-start gap-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-0 shadow-sm">
                <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-blue-500 dark:from-red-600 dark:to-red-700 rounded-full self-stretch min-h-full"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-cyan-700 dark:text-red-400">
                        Respondiendo
                      </span>
                    </div>
                    <button
                      onClick={cancelReply}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Cancelar respuesta"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="bg-cyan-50 dark:bg-gray-600 p-3 rounded-lg border-l-4 border-cyan-400 dark:border-red-500">
                    <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed">
                      "{replyingTo.content}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Message Input */}
        {conversation.status === 'active' ? (
          <div className="px-6 py-4 bg-white dark:bg-gray-900">
            <div className="flex items-end space-x-4">
              <div className="flex-1 relative flex items-center">
                <textarea
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje aquí..."
                  className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-red-500 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm max-h-24 min-h-[24px] leading-relaxed transition-all duration-200 shadow-sm"
                  rows={1}
                  maxLength={1000}
                  disabled={sendingMessage}
                  spellCheck={false}
                  autoComplete="off"
                />

                {/* Character count indicator */}
                {newMessage.length > 800 && (
                  <div className="absolute right-3 bottom-2 text-xs text-slate-400 dark:text-gray-500">
                    {1000 - newMessage.length}
                  </div>
                )}

                {!isConnected && (
                  <div className="absolute -top-10 left-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium border-0 shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
                      Sin conexión al servidor
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage || !isAuthenticated || !user}
                className={`p-3 rounded-full transition-all duration-200 shadow-sm hover:shadow-md ${
                  newMessage.trim() && !sendingMessage
                    ? 'bg-blue-500 dark:bg-red-600 hover:bg-blue-600 dark:hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title={newMessage.trim() ? "Enviar mensaje" : "Escribe un mensaje"}
              >
                {sendingMessage ? (
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 px-4 py-6 border-t-0 shadow-md">
            <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">Chat cerrado</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Esta conversación fue cerrada por el soporte. Puedes iniciar un nuevo chat cuando lo necesites.
                </p>
              </div>
              <button
                onClick={() => {
                  initializeChat();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Nuevo chat
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}