import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  User,
  Clock,
  Check,
  X,
  Search,
  Filter,
  Users,
  Phone,
  Mail,
  Eye,
  Loader2,
  Forward,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '../../services/api';
import { toast } from 'sonner';
import { useSocketContext } from '../../contexts/SocketContext';
import MessageActions from '@/components/ui/MessageActions';
import MessageSelectionToolbar from '@/components/ui/MessageSelectionToolbar';

interface ChatAdminViewProps {}

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

interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  totalMessages: number;
  unreadMessages: number;
  recentConversations: Conversation[];
}

export default function ChatAdminView() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const { socket, isConnected, onlineUsers, joinConversation, leaveConversation, sendTyping } = useSocketContext();
  
  // Debug socket connection
  useEffect(() => {
    console.log('🔌 Admin Chat - Socket status:', { socket: !!socket, isConnected });
  }, [socket, isConnected]);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchModalOpen, setSearchModalOpen] = useState(false);

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

  // Clear chat states
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [conversationToClear, setConversationToClear] = useState<Conversation | null>(null);
  const [clearingChat, setClearingChat] = useState(false);

  const restoreScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (!container || !selectedConversation) return false;
    
    try {
      const savedData = localStorage.getItem('adminChatScrollPosition');
      if (!savedData) return false;
      
      const scrollData = JSON.parse(savedData);
      
      // Only restore if it's for the same conversation and not too old (1 hour)
      const isValidData = scrollData.conversationId === selectedConversation._id && 
                         (Date.now() - scrollData.timestamp) < 3600000;
      
      if (isValidData) {
        // Calculate relative position to maintain it even if content changed
        const relativePosition = scrollData.scrollTop / scrollData.scrollHeight;
        const newScrollTop = relativePosition * container.scrollHeight;
        
        container.scrollTo({
          top: newScrollTop,
          behavior: 'instant' // No smooth scroll on restore
        });
        
        console.log(`🔄 Admin restored scroll position for conversation ${selectedConversation._id}: ${newScrollTop}px`);
        return true;
      }
    } catch (error) {
      console.error('Error restoring admin scroll position:', error);
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
    if (selectedConversation && !isNearBottom) {
      const scrollData = {
        conversationId: selectedConversation._id,
        scrollTop,
        scrollHeight,
        timestamp: Date.now()
      };
      localStorage.setItem('adminChatScrollPosition', JSON.stringify(scrollData));
    } else if (selectedConversation && isNearBottom) {
      // Remove saved position when user is at bottom (no need to restore to bottom)
      localStorage.removeItem('adminChatScrollPosition');
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
    // Clean old scroll positions on mount
    try {
      const savedData = localStorage.getItem('adminChatScrollPosition');
      if (savedData) {
        const scrollData = JSON.parse(savedData);
        // Remove data older than 1 hour
        if (Date.now() - scrollData.timestamp > 3600000) {
          localStorage.removeItem('adminChatScrollPosition');
        }
      }
    } catch (error) {
      localStorage.removeItem('adminChatScrollPosition');
    }
    
    loadConversations();
    loadStats();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      console.log('🔗 Admin selecting conversation:', selectedConversation._id);
      loadMessages(selectedConversation._id);
      
      // Join conversation room for real-time updates
      if (socket && isConnected) {
        console.log('🚪 Admin joining conversation room:', selectedConversation._id);
        joinConversation(selectedConversation._id);
      } else {
        console.log('⚠️ Admin cannot join conversation - socket/connection issue:', { socket: !!socket, isConnected });
      }
    }

    return () => {
      if (selectedConversation && socket) {
        console.log('🚪 Admin leaving conversation room:', selectedConversation._id);
        leaveConversation(selectedConversation._id);
      }
    };
  }, [selectedConversation, socket, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('⚠️ Admin - Socket not available or not connected for listeners');
      return;
    }

    console.log('🔧 Admin - Setting up socket listeners');

    const handleNewMessage = (message: Message) => {
      console.log('📨 Admin received new message via Socket.IO:', message);
      console.log('📨 Current selected conversation:', selectedConversation?._id);
      console.log('📨 Message conversation:', message.conversationId);
      
      setMessages(prev => {
        console.log('📨 Processing message for conversation, current messages count:', prev.length);
        
        // Check if message already exists to avoid duplicates
        const existingMessage = prev.find(m => m._id === message._id);
        if (existingMessage) {
          console.log('📨 Message already exists, ignoring');
          return prev;
        }

        // If this is our own message coming from server, replace any temp message with same content
        const tempMessageIndex = prev.findIndex(m => 
          m._id.startsWith('temp-') && 
          m.content === message.content && 
          m.senderType === 'super_admin'
        );

        if (tempMessageIndex !== -1) {
          console.log('📨 Replacing temp message with real message');
          const updatedMessages = [...prev];
          updatedMessages[tempMessageIndex] = message;
          return updatedMessages;
        }

        // Add new message normally
        console.log('📨 Adding new message to conversation');
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

    const handleConversationUpdate = (conversation: Conversation) => {
      console.log('🔄 Admin received conversation update via Socket.IO');
      // Update conversations list
      setConversations(prev => 
        prev.map(c => c._id === conversation._id ? conversation : c)
      );
      // Update selected conversation if it matches
      if (selectedConversation && selectedConversation._id === conversation._id) {
        setSelectedConversation(conversation);
      }
    };

    const handleConversationClosed = (conversation: Conversation) => {
      console.log('❌ Admin received conversation closed via Socket.IO');
      setConversations(prev => 
        prev.map(c => c._id === conversation._id ? conversation : c)
      );
      if (selectedConversation && selectedConversation._id === conversation._id) {
        setSelectedConversation(conversation);
      }
      toast.info(`Conversación con ${conversation.socioName} cerrada`);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('conversation_updated', handleConversationUpdate);
    socket.on('conversation_closed', handleConversationClosed);

    return () => {
      console.log('🧹 Admin - Cleaning up socket listeners');
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('conversation_updated', handleConversationUpdate);
      socket.off('conversation_closed', handleConversationClosed);
    };
  }, [socket, isConnected, selectedConversation]);

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

  const loadConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await apiClient.get(`/chat/conversations?${params}`);

      if (response.data.success) {
        setConversations(response.data.data.conversations);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast.error('Error al cargar las conversaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!conversationToClear) return;

    try {
      setClearingChat(true);
      const response = await apiClient.delete(`/chat/conversations/${conversationToClear._id}/messages`);

      if (response.data.success) {
        toast.success('Chat vaciado correctamente');
        setShowClearChatDialog(false);
        setConversationToClear(null);

        // Si es la conversación seleccionada, limpiar los mensajes
        if (selectedConversation?._id === conversationToClear._id) {
          setMessages([]);
        }

        // Recargar conversaciones
        loadConversations();
      }
    } catch (error: any) {
      console.error('Error clearing chat:', error);
      toast.error(error.response?.data?.message || 'Error al vaciar el chat');
    } finally {
      setClearingChat(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/chat/stats');
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading chat stats:', error);
    }
  };

  const loadMessages = async (conversationId: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
      
      if (response.data.success) {
        setMessages(response.data.data.messages);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      if (showLoading) {
        toast.error('Error al cargar los mensajes');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update

    try {
      setSendingMessage(true);

      // Create temporary message object for immediate display
      const tempMessage: Message = {
        _id: tempId,
        conversationId: selectedConversation._id,
        senderId: 'current-admin', // Will be replaced when real message arrives
        senderType: 'super_admin',
        senderName: 'Tú',
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
      sendTyping(selectedConversation._id, false);

      // Always scroll to bottom when admin sends a message
      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom(true), 50);

      const response = await apiClient.post(
        `/chat/conversations/${selectedConversation._id}/messages`,
        requestData
      );

      if (response.data.success) {
        // Message sent successfully
        // Socket.IO will handle adding the real message from server
        // Remove temp message when real one arrives (handled in socket listener)

        // Also refresh conversations list to update last message
        loadConversations();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');

      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      // Restore the message content
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const closeConversation = async (conversationId: string) => {
    try {
      const response = await apiClient.put(`/chat/conversations/${conversationId}/close`);
      
      if (response.data.success) {
        toast.success('Conversación cerrada');
        await loadConversations();
        if (selectedConversation?._id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
      }
    } catch (error: any) {
      console.error('Error closing conversation:', error);
      toast.error('Error al cerrar la conversación');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string): Promise<boolean> => {
    if (!selectedConversation) return false;

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
      console.error('Error editing message:', error);
      toast.error('Error al editar el mensaje');
      return false;
    }
  };

  const handleDeleteMessage = async (messageId: string): Promise<boolean> => {
    if (!selectedConversation) return false;

    try {
      const response = await apiClient.delete(`/chat/messages/${messageId}`);

      if (response.data.success) {
        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        
        toast.success('Mensaje eliminado correctamente');
        
        // Refresh conversations list to update last message if needed
        loadConversations();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Error al eliminar el mensaje');
      return false;
    }
  };

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

  // Check if socio is online
  const isSocioOnline = (conversation: Conversation) => {
    return onlineUsers.some(user => user.id === conversation.socioId && user.role === 'socio');
  };

  // Get socio status for a conversation
  const getSocioStatus = (conversation: Conversation) => {
    const socioOnline = isSocioOnline(conversation);
    return {
      isOnline: socioOnline,
      text: socioOnline ? 'Socio en línea' : 'Socio desconectado',
      color: socioOnline ? 'text-green-600' : 'text-red-600',
      bgColor: socioOnline ? 'bg-green-100' : 'bg-red-100',
      dotColor: socioOnline ? 'bg-green-500' : 'bg-red-500'
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
      console.error('Error deleting selected messages:', error);
      toast.error('Error al eliminar algunos mensajes');
    }
  };

  // Context menu functions
  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({
      messageId,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

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
    if (!selectedConversation) return;

    try {
      // Create the forwarded message content with better formatting
      const forwardContent = message.content;

      // Create temporary message for immediate display
      const tempId = `temp-forward-${Date.now()}`;
      const tempMessage: Message = {
        _id: tempId,
        conversationId: selectedConversation._id,
        senderId: 'current-admin',
        senderType: 'super_admin',
        senderName: 'Tú',
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
        `/chat/conversations/${selectedConversation._id}/messages`,
        {
          content: forwardContent,
          forwarded: true,
          originalSender: message.senderName
        }
      );

      if (response.data.success) {
        toast.success('Mensaje reenviado correctamente');
        console.log('✅ Message forwarded successfully');

        // Also refresh conversations list to update last message
        loadConversations();
      } else {
        // Remove temp message if failed
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
        toast.error('Error al reenviar el mensaje');
      }
    } catch (error: any) {
      console.error('Error forwarding message:', error);
      // Remove temp message if failed
      setMessages(prev => prev.filter(msg => msg._id.startsWith('temp-forward-')));
      toast.error('Error al reenviar el mensaje');
    }

    setContextMenu(null);
  };

  const handleForwardSelected = async () => {
    if (selectedMessages.length === 0 || !selectedConversation) return;

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
          conversationId: selectedConversation._id,
          senderId: 'current-admin',
          senderType: 'super_admin',
          senderName: 'Tú',
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
          `/chat/conversations/${selectedConversation._id}/messages`,
          {
            content: forwardContent,
            forwarded: true,
            originalSender: message.senderName
          }
        );
      }

      toast.success(`${messagesToForward.length} mensaje${messagesToForward.length > 1 ? 's' : ''} reenviado${messagesToForward.length > 1 ? 's' : ''}`);
      handleClearSelection();

      // Refresh conversations list
      loadConversations();
    } catch (error: any) {
      console.error('Error forwarding messages:', error);
      // Remove temp messages if failed
      setMessages(prev => prev.filter(msg => !msg._id.startsWith('temp-forward-multi-')));
      toast.error('Error al reenviar los mensajes');
    }
  };

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Selection Toolbar */}
        {isSelectionMode && selectedMessages.length > 0 && (
          <MessageSelectionToolbar
            selectedMessages={messages.filter(msg => selectedMessages.includes(msg._id))}
            onClearSelection={handleClearSelection}
            onDeleteSelected={handleDeleteSelectedMessages}
            onForwardSelected={handleForwardSelected}
            canDeleteOthers={true}
            currentUserType="super_admin"
          />
        )}

        <div className={`w-full max-w-4xl mx-auto h-screen flex flex-col bg-white ${
          isSelectionMode ? 'pt-16' : ''
        }`}>
          {/* WhatsApp/Instagram Style Header - Responsive */}
          <div className="bg-blue-600 text-white shadow-lg">
            <div className="px-3 md:px-4 py-3">
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setMessages([]);
                  }}
                  className="md:hidden p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                  {/* Socio Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center border-2 border-blue-400">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    {isConnected && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h1 className="text-base md:text-lg font-semibold text-white truncate">
                      {selectedConversation.socioName}
                    </h1>
                    <p className="text-blue-200 text-xs md:text-sm truncate">
                      {isConnected ? (
                        getSocioStatus(selectedConversation).isOnline ? 'en línea' : 'visto hace poco'
                      ) : (
                        'conectando...'
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
                  {selectedConversation.status === 'active' && (
                    <Button
                      onClick={() => closeConversation(selectedConversation._id)}
                      variant="ghost"
                      size="sm"
                      className="bg-red-500 text-white hover:bg-red-600 hover:text-white h-8 w-8 p-0 md:h-9 md:w-9"
                    >
                      <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  )}
                  {!isConnected && (
                    <div className="hidden md:block text-blue-200 text-xs">
                      Sin conexión
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp/Instagram Style Messages Area - Responsive */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-4"
            onScroll={handleScroll}
            style={{
              scrollBehavior: 'smooth',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f3f4f6" fill-opacity="0.3"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                    <MessageSquare className="absolute inset-0 m-auto h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-slate-600 font-medium">Cargando conversación...</p>
                </div>
              </div>
            ) : (
              <>
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-sm mx-auto p-6">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-10 w-10 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Chat con {selectedConversation.socioName}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-4">
                        Envía un mensaje para continuar la conversación
                      </p>
                      <div className="inline-flex items-center space-x-2 text-xs text-gray-400 bg-white px-3 py-2 rounded-full shadow-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Chat de soporte</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      {messages.map((message, index) => {
                        const isOwn = message.senderType === 'super_admin';
                        const isSystem = message.messageType === 'system';
                        const prevMessage = messages[index - 1];
                        const nextMessage = messages[index + 1];
                        const isFirstInGroup = !prevMessage || prevMessage.senderType !== message.senderType;
                        const isLastInGroup = !nextMessage || nextMessage.senderType !== message.senderType;

                        // Los mensajes de sistema no se muestran al administrador
                        if (isSystem) {
                          return null;
                        }

                        return (
                          <div
                            key={message._id}
                            data-message-id={message._id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
                          >
                            <div className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md relative ${isOwn ? 'mr-1 md:mr-2' : 'ml-1 md:ml-2'}`}>
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
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
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
                                    className={`mb-3 p-3 rounded-lg border-l-4 cursor-pointer ${
                                      isOwn
                                        ? 'bg-blue-800 bg-opacity-30 border-blue-200 hover:bg-blue-800 hover:bg-opacity-40'
                                        : 'bg-gray-100 border-gray-500 hover:bg-gray-200'
                                    } transition-all duration-200 hover:shadow-md`}
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
                                    title="Hacer clic para ver el mensaje original"
                                  >
                                    <div className={`text-xs font-bold mb-2 flex items-center gap-1 ${
                                      isOwn ? 'text-blue-100' : 'text-gray-700'
                                    }`}>
                                      <span className="text-sm">↩️</span>
                                      <span>Respondiendo a {message.replyTo.senderName}</span>
                                      <span className="text-xs opacity-70 ml-auto">👆 Click para ver</span>
                                    </div>
                                    <div className={`text-xs leading-relaxed ${
                                      isOwn ? 'text-blue-50' : 'text-gray-600'
                                    } bg-black bg-opacity-10 p-2 rounded italic`}>
                                      "{message.replyTo.content.length > 80
                                        ? `${message.replyTo.content.substring(0, 80)}...`
                                        : message.replyTo.content
                                      }"
                                    </div>
                                  </div>
                                )}

                                {/* Forwarded indicator */}
                                {message.forwarded && (
                                  <div className={`text-xs font-medium mb-2 flex items-center gap-1 ${
                                    isOwn ? 'text-blue-200' : 'text-gray-600'
                                  }`}>
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
                                  isOwn ? 'text-blue-200' : 'text-gray-500'
                                }`}>
                                  <span className="text-xs">
                                    {formatDate(message.timestamp)}
                                  </span>

                                  {isOwn && (
                                    <div className="flex items-center">
                                      {message._id.startsWith('temp-') ? (
                                        <div className="animate-spin h-3 w-3 border border-blue-200 border-t-transparent rounded-full"></div>
                                      ) : message.read ? (
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
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-lg px-4 py-2 shadow-sm">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all animate-bounce"
                >
                  <span className="text-sm">Nuevos mensajes</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Reply Preview - Responsive */}
          {replyingTo && (
            <div className="bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 border-t border-blue-200 px-2 md:px-4 py-3 md:py-4 shadow-sm">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-start gap-2 md:gap-4 bg-white rounded-xl p-3 md:p-4 border border-blue-200 shadow-sm">
                  <div className="w-1 md:w-1.5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full self-stretch min-h-full"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-base md:text-lg">↩️</span>
                        <span className="text-xs md:text-sm font-bold text-blue-700 truncate">
                          Respondiendo a {replyingTo.senderName}
                        </span>
                      </div>
                      <button
                        onClick={cancelReply}
                        className="text-gray-400 hover:text-red-500 p-1 md:p-1.5 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Cancelar respuesta"
                      >
                        <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </button>
                    </div>
                    <div className="bg-gray-50 p-2 md:p-3 rounded-lg border-l-2 md:border-l-4 border-blue-400">
                      <p className="text-xs md:text-sm text-gray-700 leading-relaxed truncate md:whitespace-normal">
                        "{replyingTo.content}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp/Instagram Style Message Input - Responsive */}
          {selectedConversation.status === 'active' ? (
            <div className="bg-gray-50 px-2 md:px-4 py-2 md:py-3 border-t border-gray-200">
              <div className="flex items-end space-x-2 md:space-x-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <div className="bg-white rounded-full border border-gray-200 flex items-center px-3 md:px-4 py-1.5 md:py-2 shadow-sm">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewMessage(value);

                        // Send typing indicators
                        if (selectedConversation) {
                          if (value.trim() && !sendingMessage) {
                            sendTyping(selectedConversation._id, true);
                          } else {
                            sendTyping(selectedConversation._id, false);
                          }
                        }
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-transparent border-none resize-none focus:outline-none text-gray-900 placeholder-gray-500 text-sm max-h-20 min-h-[20px]"
                      rows={1}
                      maxLength={1000}
                      disabled={sendingMessage}
                      spellCheck={false}
                      autoComplete="off"
                      style={{
                        willChange: 'contents',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)'
                      }}
                    />
                  </div>

                  {!isConnected && (
                    <div className="absolute -top-8 left-2 bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                      Sin conexión
                    </div>
                  )}
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    newMessage.trim() && !sendingMessage
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Enviar mensaje"
                >
                  {sendingMessage ? (
                    <div className="animate-spin h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 px-2 md:px-4 py-4 md:py-6 border-t border-gray-200">
              <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4 max-w-sm mx-auto text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-800 mb-1 md:mb-2">Chat cerrado</h3>
                  <p className="text-gray-600 text-xs md:text-sm mb-3 md:mb-4 px-4">
                    Esta conversación está cerrada. Puedes volver a la lista de conversaciones.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setMessages([]);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-colors duration-200"
                >
                  Volver a conversaciones
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp Style Help Text */}
          <div className="bg-gray-100 px-4 py-2 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500 max-w-4xl mx-auto">
              <div className="flex items-center justify-center space-x-2">
                <span>🔒 Chat administrativo</span>
                <span>•</span>
                <span>APR Portal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsive */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-0">
        <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 md:gap-4 py-3 md:py-4">
            <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Chat con Socios
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Gestiona las conversaciones con los socios
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Stats Cards - Responsive */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-4 md:mb-6">
            <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
              <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 !border-0">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="p-2 md:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 shadow-sm">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-0 md:ml-4 mt-2 md:mt-0 text-center md:text-left">
                    <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalConversations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
              <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 !border-0">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="p-2 md:p-3 rounded-full bg-green-100 dark:bg-green-900/30 shadow-sm">
                    <Check className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-0 md:ml-4 mt-2 md:mt-0 text-center md:text-left">
                    <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Activas</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeConversations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
              <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 !border-0">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="p-2 md:p-3 rounded-full bg-red-100 dark:bg-red-900/30 shadow-sm">
                    <X className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-0 md:ml-4 mt-2 md:mt-0 text-center md:text-left">
                    <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Cerradas</p>
                    <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.closedConversations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
              <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 !border-0">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="p-2 md:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 shadow-sm">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-0 md:ml-4 mt-2 md:mt-0 text-center md:text-left">
                    <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Mensajes</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalMessages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800 col-span-2 md:col-span-1">
              <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 !border-0">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="p-2 md:p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 shadow-sm">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-0 md:ml-4 mt-2 md:mt-0 text-center md:text-left">
                    <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Sin Leer</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unreadMessages}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters - Responsive */}
        {/* Botón de búsqueda - Solo móvil */}
        <div className="lg:hidden mb-4 flex justify-end">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="p-3 bg-white dark:bg-gray-800 border-0 shadow-md hover:shadow-lg rounded-lg transition-all"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Filtros - Solo desktop */}
        <Card className="hidden lg:block mb-4 md:mb-6 !border-0 !shadow-md hover:!shadow-lg transition-all !bg-white dark:!bg-gray-800">
          <CardContent className="pt-4 md:pt-6 !border-0">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 md:w-4 md:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre de socio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 md:pl-10 text-sm !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-full md:min-w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 md:h-10 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg px-3 text-xs md:text-sm shadow-sm hover:shadow-md transition-all text-gray-800 dark:text-gray-200"
                >
                  <option value="all">Todas las conversaciones</option>
                  <option value="active">Solo activas</option>
                  <option value="closed">Solo cerradas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de búsqueda - Solo móvil */}
        <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Search className="w-5 h-5 text-blue-500" />
                Buscar conversaciones
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Nombre del socio
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre de socio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 text-sm text-gray-800 dark:text-gray-200"
                >
                  <option value="all">Todas las conversaciones</option>
                  <option value="active">Solo activas</option>
                  <option value="closed">Solo cerradas</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setSearchModalOpen(false)}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Aplicar filtros
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conversations List - Responsive */}
        <Card className="!border-0 !shadow-lg hover:!shadow-xl transition-all !bg-white dark:!bg-gray-800">
          <CardHeader className="!border-0 px-4 md:px-6">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-100 text-base md:text-lg">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                <span className="hidden sm:inline">Conversaciones ({conversations.length})</span>
                <span className="sm:hidden">Chats ({conversations.length})</span>
              </CardTitle>
              <button
                onClick={loadConversations}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all text-xs md:text-sm font-medium"
              >
                Actualizar
              </button>
            </div>
          </CardHeader>
          <CardContent className="!border-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No hay conversaciones</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Las conversaciones aparecerán aquí cuando los socios inicien un chat.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    className="flex items-start md:items-center gap-2 md:gap-4 p-2.5 md:p-4 rounded-lg border-0 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                      <User className="h-4 w-4 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mb-0.5">
                        <h3 className="font-semibold truncate text-xs md:text-base text-gray-800 dark:text-gray-100">
                          {conversation.socioName}
                        </h3>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant={conversation.status === 'active' ? 'default' : 'destructive'} className="text-[10px] md:text-xs !border-0 !shadow-sm px-1.5 py-0">
                            {conversation.status === 'active' ? 'Activa' : 'Cerrada'}
                          </Badge>
                          {conversation.unreadCount.admin > 0 && (
                            <Badge variant="destructive" className="text-[10px] md:text-xs !border-0 !shadow-sm px-1.5 py-0">
                              {conversation.unreadCount.admin}
                            </Badge>
                          )}

                          {/* Socio Online Status in List */}
                          {(() => {
                            const socioStatus = getSocioStatus(conversation);
                            return (
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${socioStatus.dotColor} ${socioStatus.isOnline ? 'animate-pulse' : ''}`}></div>
                                <span className={`text-xs ${socioStatus.color} font-medium hidden sm:inline`}>
                                  {socioStatus.isOnline ? 'En línea' : 'Desconectado'}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {conversation.lastMessage && (
                        <p className="text-[11px] md:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conversation.lastMessage}
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-0.5 gap-0.5 sm:gap-2 text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                        {conversation.adminName && (
                          <span className="truncate">Atendido por: {conversation.adminName}</span>
                        )}
                        {conversation.lastMessageTime && (
                          <span className="flex-shrink-0">{formatDate(conversation.lastMessageTime)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-row flex-col items-center gap-1 md:gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConversation(conversation);
                        }}
                        className="p-1.5 md:p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                        title="Ver chat"
                      >
                        <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConversationToClear(conversation);
                          setShowClearChatDialog(true);
                        }}
                        className="p-1.5 md:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                        title="Vaciar chat"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="!border-0 !bg-gray-100 hover:!bg-gray-200 dark:!bg-gray-700 dark:hover:!bg-gray-600 !shadow-sm hover:!shadow-md transition-all"
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
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

      {/* Clear Chat Confirmation Dialog */}
      <Dialog open={showClearChatDialog} onOpenChange={setShowClearChatDialog}>
        <DialogContent className="!bg-white dark:!bg-gray-900 !border-0 !shadow-2xl">
          <DialogHeader className="!border-0">
            <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
              ¿Vaciar chat?
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Esta acción eliminará todos los mensajes de la conversación con{' '}
              <span className="font-semibold">{conversationToClear?.socioName}</span>.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="!border-0">
            <Button
              variant="ghost"
              onClick={() => {
                setShowClearChatDialog(false);
                setConversationToClear(null);
              }}
              disabled={clearingChat}
              className="!border-0 hover:!bg-gray-100 dark:hover:!bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearChat}
              disabled={clearingChat}
              className="!border-0 !shadow-md hover:!shadow-lg"
            >
              {clearingChat ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vaciando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Vaciar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}