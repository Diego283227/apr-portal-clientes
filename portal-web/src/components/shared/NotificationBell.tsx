import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Trash2, CheckCheck } from 'lucide-react';
import { useSocketContext } from '@/contexts/SocketContext';

interface Notification {
  id: string;
  tipo: 'boleta' | 'mensaje' | 'sms' | 'sistema';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  referencia?: {
    tipo: 'boleta' | 'mensaje' | 'sms';
    id: string;
  };
  metadatos?: any;
}

interface NotificationCounts {
  total: number;
  unread: number;
  boletas: number;
  mensajes: number;
  sms: number;
}

const NotificationBell: React.FC = memo(() => {
  const { socket, isConnected } = useSocketContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    unread: 0,
    boletas: 0,
    mensajes: 0,
    sms: 0
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false); // Prevent concurrent loading
  const instanceIdRef = useRef(Math.random().toString(36)); // Unique instance ID

  // Load notifications and counts
  const loadNotifications = async () => {
    // Prevent concurrent loading across multiple instances
    const globalLoadingKey = 'notificationBellLoading';
    const isGloballyLoading = sessionStorage.getItem(globalLoadingKey) === 'true';
    
    if (loadingRef.current || isGloballyLoading) {
      // Already loading, skip
      return;
    }

    try {
      loadingRef.current = true;
      sessionStorage.setItem(globalLoadingKey, 'true');
      setLoading(true);
      const [notificationsRes, countsRes] = await Promise.all([
        fetch('/api/notifications?limit=10', { credentials: 'include' }),
        fetch('/api/notifications/counts', { credentials: 'include' })
      ]);

      if (notificationsRes.ok && countsRes.ok) {
        const notificationsData = await notificationsRes.json();
        const countsData = await countsRes.json();
        
        setNotifications(notificationsData.data.notifications);
        setCounts(countsData.data);
        
        // Broadcast data to other NotificationBell instances
        const sharedData = {
          notifications: notificationsData.data.notifications,
          counts: countsData.data
        };
        localStorage.setItem('notificationBellData', JSON.stringify(sharedData));
        window.dispatchEvent(new CustomEvent('notificationBellUpdate', { detail: sharedData }));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      sessionStorage.removeItem('notificationBellLoading');
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, leida: true } : notif
          )
        );
        setCounts(prev => ({ ...prev, unread: prev.unread - 1 }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, leida: true }))
        );
        setCounts(prev => ({ ...prev, unread: 0 }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        setCounts(prev => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'boleta':
        return '🧾';
      case 'sms':
        return '📱';
      // WhatsApp case removed
      case 'mensaje':
        return '✉️';
      case 'sistema':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  // Calculate dropdown position
  const calculateDropdownPosition = () => {
    if (!bellRef.current) return;

    const rect = bellRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    setDropdownPosition({
      top: rect.bottom + scrollTop + 8, // 8px spacing
      right: window.innerWidth - rect.right - scrollLeft
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  // Socket.IO integration for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) {
      // Socket not ready yet, will retry when available
      return;
    }

    // Listen for new notifications
    const handleNewNotification = (notification: any) => {
      // New notification received
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      
      // Update counts
      setCounts(prev => ({
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + 1,
        [notification.tipo]: prev[notification.tipo as keyof NotificationCounts] + 1
      }));
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.titulo, {
          body: notification.mensaje,
          icon: '/favicon.ico'
        });
      }
    };

    // Listen for unread count updates
    const handleUnreadCountUpdate = (data: any) => {
      // Unread count updated
      const count = typeof data === 'number' ? data : data.unreadCount || 0;
      setCounts(prev => ({ ...prev, unread: count }));
    };

    // Register socket listeners
    socket.on('new_notification', handleNewNotification);
    socket.on('unread_count_update', handleUnreadCountUpdate);

    // Cleanup listeners
    return () => {
      // Cleaning up socket listeners
      socket.off('new_notification', handleNewNotification);
      socket.off('unread_count_update', handleUnreadCountUpdate);
    };
  }, [socket, isConnected]);

  // Sync with other NotificationBell instances
  useEffect(() => {
    const handleNotificationUpdate = (event: CustomEvent) => {
      const { notifications, counts } = event.detail;
      setNotifications(notifications);
      setCounts(counts);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'notificationBellData' && event.newValue) {
        try {
          const { notifications, counts } = JSON.parse(event.newValue);
          setNotifications(notifications);
          setCounts(counts);
        } catch (error) {
          console.error('Error parsing shared notification data:', error);
        }
      }
    };

    window.addEventListener('notificationBellUpdate', handleNotificationUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    // Load shared data on mount if available
    const existingData = localStorage.getItem('notificationBellData');
    if (existingData) {
      try {
        const { notifications, counts } = JSON.parse(existingData);
        setNotifications(notifications);
        setCounts(counts);
      } catch (error) {
        console.error('Error loading shared notification data:', error);
      }
    }

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('notificationBellUpdate', handleNotificationUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  return (
    <>
      <div className="relative">
        {/* Bell Icon */}
        <button
          ref={bellRef}
          onClick={() => {
            if (!isOpen) {
              calculateDropdownPosition();
              loadNotifications();
            }
            setIsOpen(!isOpen);
          }}
          className={`relative p-2 rounded-lg transition-colors ${
            counts.unread > 0
              ? 'text-green-600 bg-green-50 hover:bg-green-100'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          title={`Notificaciones${isConnected ? ' (Real-time)' : ' (Polling)'}`}
        >
        <Bell className="h-6 w-6" />
        {counts.unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {counts.unread > 9 ? '9+' : counts.unread}
          </span>
        )}
        
        {/* Socket connection indicator */}
        <div className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-400' : 'bg-gray-400'
        }`} title={isConnected ? 'Socket conectado' : 'Socket desconectado'} />
        </button>
      </div>

      {/* Dropdown Portal */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100vh - 100px)'
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Notificaciones ({counts.unread})
            </h3>
            <div className="flex items-center space-x-2">
              {counts.unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 transition-colors ${
                      !notification.leida ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 text-lg">
                        {getNotificationIcon(notification.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${
                            !notification.leida ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.titulo}
                          </p>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.fechaCreacion)}
                            </span>
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {notification.mensaje}
                        </p>
                        {!notification.leida && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            Marcar como leída
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Navigate to notifications page
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;