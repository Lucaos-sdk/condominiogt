const { User, UserCondominium, Condominium } = require('../models');

class NotificationService {
  constructor() {
    this.io = null;
  }

  // Configurar instância do Socket.io
  setSocketIO(io) {
    this.io = io;
  }

  // Emitir notificação de nova comunicação
  async emitNewCommunication(communication, excludeUserId = null) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for notifications');
      return;
    }

    const notificationData = {
      type: 'new_communication',
      communication: {
        id: communication.id,
        title: communication.title,
        content: communication.content,
        communication_type: communication.communication_type,
        priority: communication.priority,
        status: communication.status,
        target_audience: communication.target_audience,
        publish_date: communication.publish_date,
        expire_date: communication.expire_date,
        condominium_id: communication.condominium_id,
        author: {
          id: communication.author_id,
          name: communication.User ? communication.User.name : 'Sistema'
        }
      },
      timestamp: new Date().toISOString(),
      message: `Nova comunicação: ${communication.title}`
    };

    // Determinar quem deve receber a notificação baseado no target_audience
    await this.sendNotificationByAudience(
      communication.condominium_id,
      communication.target_audience,
      communication.target_units,
      'communication_notification',
      notificationData,
      excludeUserId
    );

    console.log(`📢 New communication notification sent: ${communication.title}`);
  }

  // Emitir notificação de comunicação editada
  async emitUpdatedCommunication(communication, excludeUserId = null) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for notifications');
      return;
    }

    const notificationData = {
      type: 'updated_communication',
      communication: {
        id: communication.id,
        title: communication.title,
        content: communication.content,
        communication_type: communication.communication_type,
        priority: communication.priority,
        status: communication.status,
        target_audience: communication.target_audience,
        publish_date: communication.publish_date,
        expire_date: communication.expire_date,
        condominium_id: communication.condominium_id,
        author: {
          id: communication.author_id,
          name: communication.User ? communication.User.name : 'Sistema'
        }
      },
      timestamp: new Date().toISOString(),
      message: `Comunicação atualizada: ${communication.title}`
    };

    // Enviar para o mesmo público da comunicação original
    await this.sendNotificationByAudience(
      communication.condominium_id,
      communication.target_audience,
      communication.target_units,
      'communication_notification',
      notificationData,
      excludeUserId
    );

    console.log(`📝 Updated communication notification sent: ${communication.title}`);
  }

  // Emitir notificação de comunicação deletada
  async emitDeletedCommunication(communicationData, condominiumId, excludeUserId = null) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for notifications');
      return;
    }

    const notificationData = {
      type: 'deleted_communication',
      communication: {
        id: communicationData.id,
        title: communicationData.title,
        condominium_id: condominiumId
      },
      timestamp: new Date().toISOString(),
      message: `Comunicação removida: ${communicationData.title}`
    };

    // Notificar todo o condomínio
    this.io.notificationService.emitToCondominium(
      condominiumId,
      'communication_notification',
      notificationData,
      excludeUserId
    );

    console.log(`🗑️ Deleted communication notification sent: ${communicationData.title}`);
  }

  // Emitir notificação de curtida
  async emitCommunicationLiked(communication, user, excludeUserId = null) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for notifications');
      return;
    }

    const notificationData = {
      type: 'communication_liked',
      communication: {
        id: communication.id,
        title: communication.title,
        likes_count: communication.likes_count,
        condominium_id: communication.condominium_id
      },
      user: {
        id: user.id,
        name: user.name
      },
      timestamp: new Date().toISOString(),
      message: `${user.name} curtiu: ${communication.title}`
    };

    // Notificar o autor da comunicação
    if (communication.author_id !== user.id) {
      this.io.notificationService.emitToUsers(
        [communication.author_id],
        'communication_notification',
        notificationData
      );
    }

    // Notificar administradores e gestores
    this.io.notificationService.emitToRole(
      communication.condominium_id,
      ['admin', 'manager'],
      'communication_notification',
      notificationData
    );

    console.log(`👍 Communication liked notification sent: ${communication.title} by ${user.name}`);
  }

  // Enviar notificação baseada no público-alvo
  async sendNotificationByAudience(condominiumId, targetAudience, targetUnits, event, data, excludeUserId = null) {
    if (!this.io || !this.io.notificationService) return;

    switch (targetAudience) {
      case 'all':
        // Enviar para todos os usuários do condomínio
        this.io.notificationService.emitToCondominium(
          condominiumId,
          event,
          data,
          excludeUserId
        );
        break;

      case 'owners':
        // Enviar apenas para proprietários
        await this.sendToUsersByType(condominiumId, ['owner'], event, data, excludeUserId);
        break;

      case 'tenants':
        // Enviar apenas para inquilinos
        await this.sendToUsersByType(condominiumId, ['tenant'], event, data, excludeUserId);
        break;

      case 'managers':
        // Enviar apenas para gestores e administradores
        this.io.notificationService.emitToRole(
          condominiumId,
          ['admin', 'manager'],
          event,
          data
        );
        break;

      case 'specific_units':
        // Enviar para unidades específicas
        if (targetUnits && targetUnits.length > 0) {
          await this.sendToSpecificUnits(condominiumId, targetUnits, event, data, excludeUserId);
        }
        break;

      default:
        // Por padrão, enviar para todo o condomínio
        this.io.notificationService.emitToCondominium(
          condominiumId,
          event,
          data,
          excludeUserId
        );
    }
  }

  // Enviar para usuários por tipo (proprietário/inquilino)
  async sendToUsersByType(condominiumId, userTypes, event, data, excludeUserId = null) {
    try {
      const users = await User.findAll({
        include: [{
          model: UserCondominium,
          as: 'condominiums',
          where: { condominium_id: condominiumId },
          include: [{
            model: Condominium,
            as: 'condominium'
          }]
        }],
        where: {
          user_type: userTypes
        }
      });

      const userIds = users
        .map(user => user.id)
        .filter(id => id !== excludeUserId);

      this.io.notificationService.emitToUsers(userIds, event, data);
    } catch (error) {
      console.error('Error sending notifications to user types:', error);
    }
  }

  // Enviar para unidades específicas
  async sendToSpecificUnits(condominiumId, unitNumbers, event, data, excludeUserId = null) {
    try {
      const users = await User.findAll({
        include: [{
          model: UserCondominium,
          as: 'condominiums',
          where: { 
            condominium_id: condominiumId,
            unit_number: unitNumbers
          },
          include: [{
            model: Condominium,
            as: 'condominium'
          }]
        }]
      });

      const userIds = users
        .map(user => user.id)
        .filter(id => id !== excludeUserId);

      this.io.notificationService.emitToUsers(userIds, event, data);
    } catch (error) {
      console.error('Error sending notifications to specific units:', error);
    }
  }

  // Enviar notificação personalizada
  async sendCustomNotification(condominiumId, users, event, data) {
    if (!this.io || !this.io.notificationService) return;

    const userIds = Array.isArray(users) ? users : [users];
    this.io.notificationService.emitToUsers(userIds, event, data);
  }

  // Emitir notificação de sistema
  async emitSystemNotification(condominiumId, message, priority = 'medium', targetRoles = null) {
    if (!this.io || !this.io.notificationService) return;

    const notificationData = {
      type: 'system_notification',
      message,
      priority,
      timestamp: new Date().toISOString(),
      condominium_id: condominiumId
    };

    if (targetRoles && targetRoles.length > 0) {
      this.io.notificationService.emitToRole(
        condominiumId,
        targetRoles,
        'system_notification',
        notificationData
      );
    } else {
      this.io.notificationService.emitToCondominium(
        condominiumId,
        'system_notification',
        notificationData
      );
    }

    console.log(`🔔 System notification sent to condominium ${condominiumId}: ${message}`);
  }

  // Notificar criação de nova reserva
  async notifyBookingCreated(booking) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for booking notifications');
      return;
    }

    const notificationData = {
      type: 'booking_created',
      booking: {
        id: booking.id,
        common_area: booking.common_area.name,
        condominium: booking.common_area.condominium.name,
        user: booking.user.name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status
      },
      message: `Nova reserva criada para ${booking.common_area.name}`,
      timestamp: new Date().toISOString()
    };

    // Emitir para admins, managers e syndics do condomínio
    this.io.notificationService.emitToCondominiumRoles(
      booking.common_area.condominium_id,
      ['admin', 'manager', 'syndic'],
      'booking_notification',
      notificationData
    );
  }

  // Notificar aprovação de reserva
  async notifyBookingApproved(booking) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for booking notifications');
      return;
    }

    const notificationData = {
      type: 'booking_approved',
      booking: {
        id: booking.id,
        common_area: booking.common_area.name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time
      },
      message: `Sua reserva para ${booking.common_area.name} foi aprovada!`,
      timestamp: new Date().toISOString()
    };

    // Emitir apenas para o usuário que fez a reserva
    this.io.notificationService.emitToUser(
      booking.user_id,
      'booking_notification',
      notificationData
    );
  }

  // Notificar rejeição de reserva
  async notifyBookingRejected(booking) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for booking notifications');
      return;
    }

    const notificationData = {
      type: 'booking_rejected',
      booking: {
        id: booking.id,
        common_area: booking.common_area.name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        cancellation_reason: booking.cancellation_reason
      },
      message: `Sua reserva para ${booking.common_area.name} foi rejeitada`,
      timestamp: new Date().toISOString()
    };

    // Emitir apenas para o usuário que fez a reserva
    this.io.notificationService.emitToUser(
      booking.user_id,
      'booking_notification',
      notificationData
    );
  }

  // Notificar cancelamento de reserva
  async notifyBookingCancelled(booking) {
    if (!this.io || !this.io.notificationService) {
      console.warn('Socket.io not available for booking notifications');
      return;
    }

    const notificationData = {
      type: 'booking_cancelled',
      booking: {
        id: booking.id,
        common_area: booking.common_area.name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        cancellation_reason: booking.cancellation_reason
      },
      message: `Reserva para ${booking.common_area.name} foi cancelada`,
      timestamp: new Date().toISOString()
    };

    // Emitir para admins, managers e syndics do condomínio
    this.io.notificationService.emitToCondominiumRoles(
      booking.common_area.condominium_id,
      ['admin', 'manager', 'syndic'],
      'booking_notification',
      notificationData
    );
  }
}

// Singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;