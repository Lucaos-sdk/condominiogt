const jwt = require('jsonwebtoken');
const { User, UserCondominium, Condominium, Communication, NotificationRead } = require('../models');
const { Op } = require('sequelize');

// Armazenar conexões por usuário
const userConnections = new Map();
// Armazenar usuários por room (condomínio)
const condominiumRooms = new Map();

// Função para construir filtros avançados de notificações
async function buildNotificationFilters(userId, filters) {
  const {
    type,
    status,
    priority,
    condominiumId,
    dateFrom,
    dateTo,
    onlyUnread = false,
    targetAudience,
    authorId
  } = filters;

  const whereClause = {};
  const includes = [{
    model: User,
    as: 'author',
    attributes: ['id', 'name', 'role']
  }];

  // Filtrar por condomínio (obrigatório se não for admin)
  if (condominiumId) {
    whereClause.condominium_id = condominiumId;
  }

  // Filtrar por tipo de comunicação
  if (type) {
    whereClause.type = type;
  }

  // Filtrar por status
  if (status) {
    whereClause.status = status;
  }

  // Filtrar por prioridade
  if (priority) {
    whereClause.priority = priority;
  }

  // Filtrar por data
  if (dateFrom || dateTo) {
    whereClause.created_at = {};
    if (dateFrom) {
      whereClause.created_at[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      whereClause.created_at[Op.lte] = new Date(dateTo);
    }
  }

  // Filtrar por público-alvo
  if (targetAudience) {
    whereClause.target_audience = targetAudience;
  }

  // Filtrar por autor
  if (authorId) {
    whereClause.author_id = authorId;
  }

  // Filtrar apenas não lidas
  if (onlyUnread) {
    includes.push({
      model: NotificationRead,
      as: 'notification_reads',
      where: {
        user_id: userId
      },
      required: false
    });
    
    // Adicionar condição para excluir comunicações já lidas
    whereClause[Op.and] = [
      {
        '$notification_reads.id$': null
      }
    ];
  }

  try {
    const communications = await Communication.findAll({
      where: whereClause,
      include: includes,
      order: [['created_at', 'DESC']],
      limit: 50 // Limitar para performance
    });

    return {
      communications: communications.map(comm => ({
        id: comm.id,
        title: comm.title,
        type: comm.type,
        priority: comm.priority,
        status: comm.status,
        target_audience: comm.target_audience,
        created_at: comm.created_at,
        author: comm.author,
        is_read: onlyUnread ? false : comm.notification_reads?.length > 0
      })),
      count: communications.length,
      filters: {
        type,
        status,
        priority,
        condominiumId,
        dateFrom,
        dateTo,
        onlyUnread,
        targetAudience,
        authorId
      }
    };
  } catch (error) {
    console.error('Error building notification filters:', error);
    return {
      communications: [],
      count: 0,
      filters,
      error: error.message
    };
  }
}

module.exports = (io) => {
  // Middleware de autenticação para Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Token de autenticação obrigatório'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar usuário com relacionamentos
      const user = await User.findByPk(decoded.id, {
        include: [{
          model: UserCondominium,
          as: 'condominiums',
          include: [{
            model: Condominium,
            as: 'condominium'
          }]
        }]
      });

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userCondominiums = user.condominiums || [];
      socket.userData = {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email
      };

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.userData.name} (ID: ${socket.userId}) connected to WebSocket`);
    
    // Armazenar conexão do usuário
    userConnections.set(socket.userId, socket);

    // Entrar nas rooms dos condomínios do usuário
    socket.userCondominiums.forEach(userCond => {
      const condominiumId = userCond.condominium.id;
      const roomName = `condominium_${condominiumId}`;
      
      socket.join(roomName);
      
      // Adicionar usuário à lista da room
      if (!condominiumRooms.has(roomName)) {
        condominiumRooms.set(roomName, new Set());
      }
      condominiumRooms.get(roomName).add(socket.userId);
      
      console.log(`👥 User ${socket.userData.name} joined room: ${roomName}`);
    });

    // Entrar na room geral do usuário (para notificações diretas)
    socket.join(`user_${socket.userId}`);

    // Enviar estado inicial
    socket.emit('connection_status', {
      success: true,
      message: 'Conectado ao sistema de notificações',
      user: socket.userData,
      timestamp: new Date().toISOString()
    });

    // Listar usuários online por condomínio
    socket.on('get_online_users', (condominiumId) => {
      const roomName = `condominium_${condominiumId}`;
      const onlineUsers = [];
      
      if (condominiumRooms.has(roomName)) {
        condominiumRooms.get(roomName).forEach(userId => {
          const userSocket = userConnections.get(userId);
          if (userSocket) {
            onlineUsers.push({
              id: userSocket.userId,
              name: userSocket.userData.name,
              role: userSocket.userData.role
            });
          }
        });
      }
      
      socket.emit('online_users', { condominiumId, users: onlineUsers });
    });

    // Marcar notificação como lida
    socket.on('mark_notification_read', async (data) => {
      try {
        const { communicationId, notificationType = 'new_communication' } = data;
        
        if (!communicationId) {
          socket.emit('error', { message: 'ID da comunicação é obrigatório' });
          return;
        }

        // Verificar se a comunicação existe
        const communication = await Communication.findByPk(communicationId);
        if (!communication) {
          socket.emit('error', { message: 'Comunicação não encontrada' });
          return;
        }

        // Criar ou atualizar registro de leitura
        const [notificationRead, created] = await NotificationRead.findOrCreate({
          where: {
            user_id: socket.userId,
            communication_id: communicationId,
            notification_type: notificationType
          },
          defaults: {
            read_at: new Date()
          }
        });

        // Se já existia, atualizar data de leitura
        if (!created) {
          await notificationRead.update({ read_at: new Date() });
        }
        
        socket.emit('notification_read_confirmed', {
          communicationId,
          notificationType,
          userId: socket.userId,
          readAt: notificationRead.read_at,
          timestamp: new Date().toISOString(),
          message: created ? 'Notificação marcada como lida' : 'Notificação já estava lida - data atualizada'
        });
        
        console.log(`📖 User ${socket.userData.name} marked notification as read:`, {
          communicationId,
          notificationType,
          created
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('error', { message: 'Erro ao marcar notificação como lida' });
      }
    });

    // Filtrar notificações
    socket.on('filter_notifications', async (filters) => {
      try {
        const { 
          type, 
          status, 
          priority, 
          condominiumId, 
          dateFrom, 
          dateTo, 
          onlyUnread = false,
          targetAudience,
          authorId 
        } = filters;
        
        // Construir filtros avançados
        const appliedFilters = await buildNotificationFilters(socket.userId, {
          type,
          status,
          priority,
          condominiumId,
          dateFrom,
          dateTo,
          onlyUnread,
          targetAudience,
          authorId
        });
        
        // Emitir evento com filtros aplicados
        socket.emit('notifications_filtered', {
          filters: appliedFilters,
          count: appliedFilters.count || 0,
          message: 'Filtros aplicados com sucesso',
          timestamp: new Date().toISOString()
        });
        
        console.log(`🔍 User ${socket.userData.name} applied advanced filters:`, appliedFilters);
      } catch (error) {
        console.error('Error filtering notifications:', error);
        socket.emit('error', { message: 'Erro ao aplicar filtros' });
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userData.name} (ID: ${socket.userId}) disconnected`);
      
      // Remover conexão do usuário
      userConnections.delete(socket.userId);
      
      // Remover usuário das rooms
      socket.userCondominiums.forEach(userCond => {
        const condominiumId = userCond.condominium.id;
        const roomName = `condominium_${condominiumId}`;
        
        if (condominiumRooms.has(roomName)) {
          condominiumRooms.get(roomName).delete(socket.userId);
          
          // Remover room se vazia
          if (condominiumRooms.get(roomName).size === 0) {
            condominiumRooms.delete(roomName);
          }
        }
      });
    });

    // Evento de erro
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userData.name}:`, error);
    });
  });

  // Função para emitir notificação para usuários específicos
  const emitToUsers = (userIds, event, data) => {
    userIds.forEach(userId => {
      const socket = userConnections.get(userId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  };

  // Função para emitir notificação para um condomínio
  const emitToCondominium = (condominiumId, event, data, excludeUserId = null) => {
    const roomName = `condominium_${condominiumId}`;
    
    if (excludeUserId) {
      // Emitir para todos exceto o usuário especificado
      if (condominiumRooms.has(roomName)) {
        condominiumRooms.get(roomName).forEach(userId => {
          if (userId !== excludeUserId) {
            const socket = userConnections.get(userId);
            if (socket) {
              socket.emit(event, data);
            }
          }
        });
      }
    } else {
      // Emitir para toda a room
      io.to(roomName).emit(event, data);
    }
  };

  // Função para emitir notificação por role
  const emitToRole = (condominiumId, roles, event, data) => {
    const roomName = `condominium_${condominiumId}`;
    
    if (condominiumRooms.has(roomName)) {
      condominiumRooms.get(roomName).forEach(userId => {
        const socket = userConnections.get(userId);
        if (socket && roles.includes(socket.userRole)) {
          socket.emit(event, data);
        }
      });
    }
  };

  // Exportar funções para uso em outros módulos
  io.notificationService = {
    emitToUsers,
    emitToCondominium,
    emitToRole,
    getUserConnection: (userId) => userConnections.get(userId),
    getOnlineUsers: (condominiumId) => {
      const roomName = `condominium_${condominiumId}`;
      return condominiumRooms.get(roomName) || new Set();
    }
  };

  return io;
};