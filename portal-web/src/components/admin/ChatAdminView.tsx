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
  Trash2,
  Menu,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Gauge,
  Calendar,
  Activity,
  Info
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

interface ChatAdminViewProps {
  onBack?: () => void;
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

interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  totalMessages: number;
  unreadMessages: number;
  recentConversations: Conversation[];
}

export default function ChatAdminView({ onBack }: ChatAdminViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const { socket, isConnected, onlineUsers, joinConversation, leaveConversation, sendTyping } = useSocketContext();
  
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

  // Sidebar states
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [socioProfile, setSocioProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

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

  // Clear chat states
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [conversationToClear, setConversationToClear] = useState<Conversation | null>(null);
  const [clearingChat, setClearingChat] = useState(false);

  // Load socio profile
  const loadSocioProfile = async (socioId: string) => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.get(`/admin/socios/${socioId}`);
      
      if (response.data.success) {
        setSocioProfile(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading socio profile:', error);
      toast.error('Error al cargar perfil del socio');
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
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
    const tempId = `temp-${Date.now()}`;

    try {
      setSendingMessage(true);

      const tempMessage: Message = {
        _id: tempId,
        conversationId: selectedConversation._id,
        senderId: 'current-admin',
        senderType: 'super_admin',
        senderName: 'Tú',
        content: messageContent,
        timestamp: new Date().toISOString(),
        read: true,
        messageType: 'text',
        replyTo: replyingTo ? {
          messageId: replyingTo._id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
          senderType: replyingTo.senderType
        } : undefined
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      const requestData: any = { content: messageContent };
      if (replyingTo) {
        requestData.replyTo = {
          messageId: replyingTo._id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
          senderType: replyingTo.senderType
        };
      }

      setReplyingTo(null);
      sendTyping(selectedConversation._id, false);

      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom(true), 50);

      const response = await apiClient.post(
        `/chat/conversations/${selectedConversation._id}/messages`,
        requestData
      );

      if (response.data.success) {
        loadConversations();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = (force = false) => {
    if (!shouldAutoScroll && !force) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
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

  const isSocioOnline = (conversation: Conversation) => {
    return onlineUsers.some(user => user.id === conversation.socioId && user.role === 'socio');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
    setContextMenu(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  useEffect(() => {
    loadConversations();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      loadSocioProfile(selectedConversation.socioId);
      
      if (socket && isConnected) {
        joinConversation(selectedConversation._id);
      }
    }

    return () => {
      if (selectedConversation && socket) {
        leaveConversation(selectedConversation._id);
      }
    };
  }, [selectedConversation, socket, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (message: Message) => {
      setMessages(prev => {
        const existingMessage = prev.find(m => m._id === message._id);
        if (existingMessage) return prev;

        const tempMessageIndex = prev.findIndex(m => 
          m._id.startsWith('temp-') && 
          m.content === message.content && 
          m.senderType === 'super_admin'
        );

        if (tempMessageIndex !== -1) {
          const updatedMessages = [...prev];
          updatedMessages[tempMessageIndex] = message;
          return updatedMessages;
        }

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
      setConversations(prev => 
        prev.map(c => c._id === conversation._id ? conversation : c)
      );
      if (selectedConversation && selectedConversation._id === conversation._id) {
        setSelectedConversation(conversation);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('conversation_updated', handleConversationUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('conversation_updated', handleConversationUpdate);
    };
  }, [socket, isConnected, selectedConversation]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* LEFT SIDEBAR - Conversations List */}
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isLeftSidebarOpen ? 'w-80' : 'w-0'
      } overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          {/* Botón de regreso al dashboard */}
          {onBack && (
            <button
              onClick={onBack}
              className="mb-3 flex items-center gap-2 text-white hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver al Dashboard</span>
            </button>
          )}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversaciones
            </h2>
            <button
              onClick={() => setIsLeftSidebarOpen(false)}
              className="p-1 hover:bg-blue-700 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar socio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Filters */}
          <div className="mt-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 bg-white border-gray-300 rounded-lg px-3 text-sm text-gray-900"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="closed">Cerradas</option>
            </select>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const isOnline = isSocioOnline(conversation);
              const isSelected = selectedConversation?._id === conversation._id;
              
              return (
                <div
                  key={conversation._id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.socioName}
                        </h3>
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDate(conversation.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER - Messages Area */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              {/* Toggle Left Sidebar Button when no conversation selected */}
              {!isLeftSidebarOpen && (
                <button
                  onClick={() => setIsLeftSidebarOpen(true)}
                  className="mb-4 p-3 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                  title="Mostrar conversaciones"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <div className="text-center">
                <MessageSquare className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Selecciona una conversación
                </h3>
                <p className="text-gray-500">
                  Elige un socio de la lista para ver el chat
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header with Socio Info */}
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Toggle Left Sidebar Button */}
                {!isLeftSidebarOpen && (
                  <button
                    onClick={() => setIsLeftSidebarOpen(true)}
                    className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                    title="Mostrar conversaciones"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  {isSocioOnline(selectedConversation) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold">{selectedConversation.socioName}</h2>
                  <p className="text-xs text-blue-200">
                    {isSocioOnline(selectedConversation) ? 'En línea' : 'Desconectado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                  title={isRightSidebarOpen ? "Ocultar perfil" : "Ver perfil"}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-gray-50"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f3f4f6" fill-opacity="0.3"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              }}
            >
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No hay mensajes aún</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => {
                    const isOwn = message.senderType === 'super_admin';
                    const isSystem = message.messageType === 'system';

                    if (isSystem) return null;

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isOwn ? 'mr-2' : 'ml-2'}`}>
                          <div
                            className={`px-4 py-2 rounded-2xl shadow-sm ${
                              isOwn
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                            }`}
                          >
                            {message.replyTo && (
                              <div
                                className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${
                                  isOwn
                                    ? 'bg-blue-700 border-blue-300'
                                    : 'bg-gray-100 border-gray-400'
                                }`}
                              >
                                <div className="font-semibold mb-1">
                                  ↩️ {message.replyTo.senderName}
                                </div>
                                <div className="opacity-75 italic">
                                  "{message.replyTo.content.substring(0, 50)}..."
                                </div>
                              </div>
                            )}

                            <p className="text-sm leading-relaxed">{message.content}</p>

                            <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                              isOwn ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              <span>{formatDate(message.timestamp)}</span>
                              {isOwn && (
                                message._id.startsWith('temp-') ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : message.read ? (
                                  <div className="flex">
                                    <Check className="w-3 h-3" />
                                    <Check className="w-3 h-3 -ml-1" />
                                  </div>
                                ) : (
                                  <Check className="w-3 h-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typingUsers.length > 0 && (
                    <div className="flex justify-start ml-2">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Reply Preview */}
            {replyingTo && (
              <div className="bg-blue-50 border-t border-blue-200 px-4 py-3">
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-200">
                  <div className="w-1 bg-blue-500 rounded-full self-stretch"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-blue-700">
                        ↩️ Respondiendo a {replyingTo.senderName}
                      </span>
                      <button
                        onClick={cancelReply}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 truncate">
                      "{replyingTo.content}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            {selectedConversation.status === 'active' ? (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <div className="bg-white rounded-full border border-gray-200 flex items-center px-4 py-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          if (e.target.value.trim()) {
                            sendTyping(selectedConversation._id, true);
                          } else {
                            sendTyping(selectedConversation._id, false);
                          }
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-transparent border-none resize-none focus:outline-none text-gray-900 placeholder-gray-500 text-sm max-h-20 min-h-[20px]"
                        rows={1}
                        maxLength={1000}
                        disabled={sendingMessage}
                      />
                    </div>
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      newMessage.trim() && !sendingMessage
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 p-6 text-center border-t">
                <X className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <p className="text-gray-600">Esta conversación está cerrada</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* RIGHT SIDEBAR - Socio Profile */}
      {selectedConversation && (
        <div className={`bg-white border-l border-gray-200 transition-all duration-300 ${
          isRightSidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden flex flex-col`}>
          {/* Profile Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Perfil del Socio</h3>
              <button
                onClick={() => setIsRightSidebarOpen(false)}
                className="p-1 hover:bg-blue-700 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <User className="w-10 h-10 text-white" />
              </div>
              <h4 className="font-semibold text-lg">{selectedConversation.socioName}</h4>
              <div className="flex items-center gap-1 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  isSocioOnline(selectedConversation) ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-xs text-blue-100">
                  {isSocioOnline(selectedConversation) ? 'En línea' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingProfile ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : socioProfile ? (
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Información de Contacto
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{socioProfile.email}</span>
                    </div>
                    {socioProfile.telefono && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{socioProfile.telefono}</span>
                      </div>
                    )}
                    {socioProfile.direccion && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{socioProfile.direccion}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medidor Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    Medidor
                  </h4>
                  {socioProfile.medidor && socioProfile.medidor.numero ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Número:</span>
                        <span className="font-semibold">{socioProfile.medidor.numero}</span>
                      </div>
                      {socioProfile.medidor.ubicacion && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ubicación:</span>
                          <span className="font-semibold text-xs">{socioProfile.medidor.ubicacion}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <Badge variant={socioProfile.medidor.estado === 'active' ? 'default' : 'secondary'}>
                          {socioProfile.medidor.estado === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin medidor asignado</p>
                  )}
                </div>

                {/* Conversation Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Estadísticas
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total mensajes:</span>
                      <span className="font-semibold">{messages.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Conversación creada:</span>
                      <span className="font-semibold text-xs">
                        {new Date(selectedConversation.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Última actividad:</span>
                      <span className="font-semibold text-xs">
                        {selectedConversation.lastMessageTime 
                          ? formatDate(selectedConversation.lastMessageTime)
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setConversationToClear(selectedConversation);
                      setShowClearChatDialog(true);
                    }}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Vaciar conversación
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm">
                No se pudo cargar el perfil
              </p>
            )}
          </div>
        </div>
      )}

      {/* Clear Chat Dialog */}
      <Dialog open={showClearChatDialog} onOpenChange={setShowClearChatDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>¿Vaciar chat?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará todos los mensajes de la conversación con{' '}
              <span className="font-semibold">{conversationToClear?.socioName}</span>.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowClearChatDialog(false);
                setConversationToClear(null);
              }}
              disabled={clearingChat}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!conversationToClear) return;
                try {
                  setClearingChat(true);
                  await apiClient.delete(`/chat/conversations/${conversationToClear._id}/messages`);
                  toast.success('Chat vaciado correctamente');
                  setShowClearChatDialog(false);
                  setConversationToClear(null);
                  if (selectedConversation?._id === conversationToClear._id) {
                    setMessages([]);
                  }
                  loadConversations();
                } catch (error: any) {
                  toast.error('Error al vaciar el chat');
                } finally {
                  setClearingChat(false);
                }
              }}
              disabled={clearingChat}
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
