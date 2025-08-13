
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    if (!token || !user) return;

    console.log('🔌 Connecting to WebSocket...');
    
    const newSocket = io(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    // Event Listeners
    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      setIsConnected(true);
      toast.success('Conectado ao sistema de notificações');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket:', reason);
      setIsConnected(false);
      setOnlineUsers([]);
      if (reason === 'io server disconnect') {
        // Reconnect manually if server disconnected
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      setIsConnected(false);
      toast.error('Erro na conexão com sistema de notificações');
    });

    // Connection status event
    newSocket.on('connection_status', (data) => {
      console.log('📡 Connection status:', data);
      if (data.success) {
        setIsConnected(true);
      }
    });

    // Communication notifications
    newSocket.on('communication_notification', (notification) => {
      console.log('📢 New communication notification:', notification);
      
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      const message = notification.message || `Nova comunicação: ${notification.communication?.title}`;
      toast.info(message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    });

    // System notifications
    newSocket.on('system_notification', (notification) => {
      console.log('🔔 System notification:', notification);
      
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast based on priority
      const toastType = notification.priority === 'high' ? 'warning' : 'info';
      toast[toastType](notification.message);
    });

    // Online users list
    newSocket.on('online_users', (data) => {
      console.log('👥 Online users updated:', data);
      setOnlineUsers(data.users || []);
    });

    // Notification read confirmation
    newSocket.on('notification_read_confirmed', (data) => {
      console.log('✅ Notification marked as read:', data);
      
      // Update local notifications state
      setNotifications(prev => 
        prev.map(notif => 
          notif.communication?.id === data.communicationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Filtered notifications
    newSocket.on('notifications_filtered', (data) => {
      console.log('🔍 Filtered notifications:', data);
      setNotifications(data.communications || []);
      
      // Count unread notifications
      const unread = data.communications?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      toast.error(error.message || 'Erro no sistema de notificações');
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      newSocket.disconnect();
    };
  }, [token, user]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Disconnecting from WebSocket...');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [socket]);

  // Get online users for a condominium
  const getOnlineUsers = useCallback((condominiumId) => {
    if (socket && isConnected) {
      console.log('👥 Requesting online users for condominium:', condominiumId);
      socket.emit('get_online_users', condominiumId);
    }
  }, [socket, isConnected]);

  // Mark notification as read
  const markNotificationRead = useCallback((communicationId, notificationType = null) => {
    if (socket && isConnected) {
      console.log('📖 Marking notification as read:', { communicationId, notificationType });
      socket.emit('mark_notification_read', {
        communicationId,
        notificationType
      });
    }
  }, [socket, isConnected]);

  // Filter notifications
  const filterNotifications = useCallback((filters) => {
    if (socket && isConnected) {
      console.log('🔍 Applying notification filters:', filters);
      socket.emit('filter_notifications', filters);
    }
  }, [socket, isConnected]);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (user && token) {
      const cleanup = connect();
      return cleanup;
    } else {
      disconnect();
    }
  }, [user, token, connect, disconnect]);

  // Effect to get online users when user condominiums change
  useEffect(() => {
    if (isConnected && user?.condominiums?.length > 0) {
      // Get online users for all user's condominiums
      user.condominiums.forEach(association => {
        getOnlineUsers(association.condominium.id);
      });
    }
  }, [isConnected, user?.condominiums, getOnlineUsers]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    notifications,
    unreadCount,
    
    // Methods
    connect,
    disconnect,
    getOnlineUsers,
    markNotificationRead,
    filterNotifications,
    clearNotifications,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;