import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaTimes, FaEye, FaFilter, FaTrash } from 'react-icons/fa';
import { useWebSocket } from '../../contexts/WebSocketContext';
import NotificationToast from './NotificationToast';

const NotificationBadge = () => {
  const { 
    notifications, 
    unreadCount, 
    isConnected, 
    markNotificationRead, 
    filterNotifications,
    clearNotifications 
  } = useWebSocket();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filter, setFilter] = useState({
    onlyUnread: false,
    priority: '',
    type: ''
  });
  
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (newFilter) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    
    // Apply filters to WebSocket
    const filterPayload = {};
    if (updatedFilter.onlyUnread) filterPayload.onlyUnread = true;
    if (updatedFilter.priority) filterPayload.priority = updatedFilter.priority;
    if (updatedFilter.type) filterPayload.type = updatedFilter.type;
    
    filterNotifications(filterPayload);
  };

  const handleMarkAsRead = (communicationId, notificationType) => {
    markNotificationRead(communicationId, notificationType);
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`
          relative p-2 rounded-full transition-all duration-200
          ${isConnected 
            ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50' 
            : 'text-gray-400 cursor-not-allowed'
          }
        `}
        disabled={!isConnected}
      >
        <FaBell size={20} />
        
        {/* Unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection status indicator */}
        <div className={`
          absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
          ${isConnected ? 'bg-green-400' : 'bg-red-400'}
        `} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notificações
                </h3>
                <div className="flex items-center space-x-2">
                  {/* Connection status */}
                  <div className={`
                    flex items-center text-xs px-2 py-1 rounded-full
                    ${isConnected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                    }
                  `}>
                    <div className={`
                      w-2 h-2 rounded-full mr-1
                      ${isConnected ? 'bg-green-400' : 'bg-red-400'}
                    `} />
                    {isConnected ? 'Online' : 'Offline'}
                  </div>
                  
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <FaTimes size={14} />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 text-sm">
                <button
                  onClick={() => handleFilterChange({ onlyUnread: !filter.onlyUnread })}
                  className={`
                    flex items-center px-2 py-1 rounded-md transition-colors
                    ${filter.onlyUnread 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  <FaEye className="mr-1" size={12} />
                  Não lidas
                </button>

                <select
                  value={filter.priority}
                  onChange={(e) => handleFilterChange({ priority: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                >
                  <option value="">Todas prioridades</option>
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>

                <button
                  onClick={clearNotifications}
                  className="flex items-center px-2 py-1 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Limpar todas"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <FaBell className="mx-auto mb-2 text-gray-300" size={24} />
                  <p>Nenhuma notificação</p>
                  {!isConnected && (
                    <p className="text-xs mt-1">Sistema offline</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.slice(0, 10).map((notification, index) => (
                    <motion.div
                      key={`${notification.timestamp}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        p-3 hover:bg-gray-50 transition-colors cursor-pointer
                        ${notification.is_read ? 'opacity-75' : 'bg-blue-25'}
                      `}
                      onClick={() => {
                        if (notification.communication?.id && !notification.is_read) {
                          handleMarkAsRead(notification.communication.id, notification.type);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`
                          w-2 h-2 rounded-full mt-2 flex-shrink-0
                          ${notification.is_read ? 'bg-gray-300' : 'bg-blue-500'}
                        `} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.communication?.title || 'Notificação do Sistema'}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center space-x-2">
                            {notification.communication?.priority && (
                              <span className={`
                                text-xs px-2 py-1 rounded-full font-medium
                                ${getPriorityColor(notification.communication.priority)}
                              `}>
                                {notification.communication.priority}
                              </span>
                            )}
                            
                            {notification.communication?.communication_type && (
                              <span className="text-xs text-gray-500 capitalize">
                                {notification.communication.communication_type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {notifications.length > 10 && (
                    <div className="p-3 text-center">
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        Ver todas as notificações
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBadge;