import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export interface MeterNotification {
  id: string;
  type: 'meter_alert' | 'new_reading' | 'maintenance' | 'consumption_report';
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  alertType?: string;
  meterId: string;
  meterLocation?: string;
  timestamp: string;
  metadata?: any;
}

export interface MeterReading {
  meterId: string;
  socioId: string;
  reading: {
    id: string;
    currentReading: number;
    flowRate?: number;
    batteryLevel?: number;
    timestamp: string;
  };
}

export const useSmartMeterNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<MeterNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [latestReading, setLatestReading] = useState<MeterReading | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const serverURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('🔌 Connecting to socket server:', serverURL);

    const socketInstance = io(serverURL, {
      transports: ['websocket', 'polling'],
      auth: {
        userId: user.id,
        role: user.role
      }
    });

    setSocket(socketInstance);

    // Connection events
    socketInstance.on('connect', () => {
      console.log('🔌 Smart meter socket connected');
      setIsConnected(true);

      // Join user-specific room
      socketInstance.emit('join', `user_${user.id}`);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Smart meter socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, [isAuthenticated, user]);

  // Handle meter alert notifications
  useEffect(() => {
    if (!socket) return;

    const handleMeterAlert = (notification: MeterNotification) => {
      console.log('🚨 Received meter alert notification:', notification);

      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      const severityEmoji = {
        low: 'ℹ️',
        medium: '⚠️',
        high: '🚨',
        critical: '🆘'
      }[notification.severity || 'medium'];

      toast.error(`${severityEmoji} ${notification.title}`, {
        description: notification.message,
        duration: notification.severity === 'critical' ? 10000 : 5000,
        action: {
          label: 'Ver detalles',
          onClick: () => {
            // Navigate to alerts page or show details modal
            console.log('Navigate to alert details:', notification.id);
          }
        }
      });
    };

    const handleNewReading = (data: MeterReading) => {
      console.log('📊 Received new meter reading:', data);
      setLatestReading(data);

      // Check for anomalies in the reading
      const { reading } = data;
      if (reading.flowRate && reading.flowRate > 10) {
        toast.warning('⚠️ Flujo alto detectado', {
          description: `Medidor ${data.meterId}: ${reading.flowRate.toFixed(1)} L/min`,
          duration: 3000
        });
      }

      if (reading.batteryLevel && reading.batteryLevel < 20) {
        toast.warning('🔋 Batería baja', {
          description: `Medidor ${data.meterId}: ${reading.batteryLevel}%`,
          duration: 5000
        });
      }
    };

    const handleMaintenanceNotification = (notification: MeterNotification) => {
      console.log('🔧 Received maintenance notification:', notification);

      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);

      toast.info('🔧 ' + notification.title, {
        description: notification.message,
        duration: 5000
      });
    };

    const handleConsumptionReport = (notification: MeterNotification) => {
      console.log('📊 Received consumption report:', notification);

      setNotifications(prev => [notification, ...prev.slice(0, 49)]);

      toast.success('📊 ' + notification.title, {
        description: notification.message,
        duration: 3000
      });
    };

    const handleBulkReadingsAdded = (data: { count: number; timestamp: string }) => {
      console.log('📊 Bulk readings added:', data);

      toast.info('📊 Lecturas actualizadas', {
        description: `${data.count} nuevas lecturas procesadas`,
        duration: 2000
      });
    };

    // Register event listeners
    socket.on('notification', handleMeterAlert);
    socket.on('newReading', handleNewReading);
    socket.on('maintenanceNotification', handleMaintenanceNotification);
    socket.on('consumptionReport', handleConsumptionReport);
    socket.on('bulkReadingsAdded', handleBulkReadingsAdded);

    return () => {
      socket.off('notification', handleMeterAlert);
      socket.off('newReading', handleNewReading);
      socket.off('maintenanceNotification', handleMaintenanceNotification);
      socket.off('consumptionReport', handleConsumptionReport);
      socket.off('bulkReadingsAdded', handleBulkReadingsAdded);
    };
  }, [socket]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Clear specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Send test alert (for development)
  const sendTestAlert = useCallback(() => {
    if (!socket || !user) return;

    const testAlert: MeterNotification = {
      id: Date.now().toString(),
      type: 'meter_alert',
      title: 'Alerta de Prueba',
      message: 'Esta es una alerta de prueba del sistema de medidores inteligentes',
      severity: 'medium',
      alertType: 'test',
      meterId: 'TEST_METER_001',
      meterLocation: 'Ubicación de prueba',
      timestamp: new Date().toISOString(),
      metadata: {
        test: true,
        userId: user.id
      }
    };

    socket.emit('test_alert', testAlert);
  }, [socket, user]);

  // Check connection status
  const checkConnection = useCallback(() => {
    return socket?.connected || false;
  }, [socket]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    if (socket && !socket.connected) {
      socket.connect();
    }
  }, [socket]);

  return {
    // State
    notifications,
    unreadCount,
    isConnected,
    latestReading,

    // Actions
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    sendTestAlert,
    checkConnection,
    reconnect,

    // Socket instance (for advanced usage)
    socket
  };
};