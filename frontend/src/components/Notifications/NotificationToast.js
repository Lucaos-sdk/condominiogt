import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaBell, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaCheckCircle,
  FaTimes,
  FaClock
} from 'react-icons/fa';

const NotificationToast = ({ 
  notification, 
  onClose, 
  onMarkRead,
  className = '' 
}) => {
  const getNotificationIcon = (type, priority) => {
    switch (type) {
      case 'communication_notification':
        switch (priority) {
          case 'urgent':
            return <FaExclamationTriangle className="text-red-500" />;
          case 'high':
            return <FaExclamationTriangle className="text-orange-500" />;
          case 'medium':
            return <FaInfoCircle className="text-blue-500" />;
          default:
            return <FaBell className="text-gray-500" />;
        }
      case 'system_notification':
        return <FaInfoCircle className="text-blue-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  const getNotificationColors = (type, priority) => {
    switch (type) {
      case 'communication_notification':
        switch (priority) {
          case 'urgent':
            return 'border-red-500 bg-red-50';
          case 'high':
            return 'border-orange-500 bg-orange-50';
          case 'medium':
            return 'border-blue-500 bg-blue-50';
          default:
            return 'border-gray-500 bg-gray-50';
        }
      case 'system_notification':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const handleMarkAsRead = () => {
    if (notification.communication?.id) {
      onMarkRead(notification.communication.id, notification.type);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`
        max-w-md w-full bg-white rounded-lg shadow-lg border-l-4 p-4 mb-4
        ${getNotificationColors(notification.type, notification.communication?.priority || notification.priority)}
        ${className}
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 pt-1">
          {getNotificationIcon(notification.type, notification.communication?.priority || notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {notification.communication?.title || 'Notificação do Sistema'}
            </h4>
            <div className="flex items-center space-x-2">
              {/* Timestamp */}
              <div className="flex items-center text-xs text-gray-500">
                <FaClock className="mr-1" />
                {formatTimestamp(notification.timestamp)}
              </div>
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          {/* Message */}
          <div className="text-sm text-gray-700 mb-2">
            {notification.message}
          </div>

          {/* Communication details */}
          {notification.communication && (
            <div className="text-xs text-gray-600 mb-2">
              <div className="flex items-center space-x-4">
                <span className="capitalize">
                  {notification.communication.communication_type?.replace('_', ' ')}
                </span>
                <span className="capitalize bg-gray-200 px-2 py-1 rounded">
                  {notification.communication.priority}
                </span>
                {notification.communication.target_audience !== 'all' && (
                  <span className="capitalize">
                    Para: {notification.communication.target_audience?.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Content preview */}
          {notification.communication?.content && (
            <div className="text-xs text-gray-600 mb-3 max-h-16 overflow-hidden">
              {notification.communication.content.substring(0, 120)}
              {notification.communication.content.length > 120 && '...'}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {notification.communication?.id && (
                <button
                  onClick={handleMarkAsRead}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                >
                  <FaCheckCircle className="inline mr-1" />
                  Marcar como lida
                </button>
              )}
            </div>

            {/* Priority indicator */}
            {(notification.communication?.priority === 'urgent' || notification.priority === 'high') && (
              <div className="flex items-center text-xs text-red-600">
                <FaExclamationTriangle className="mr-1" />
                Urgente
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationToast;