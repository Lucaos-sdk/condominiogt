const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      // Relacionamento com User
      AuditLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Relacionamento com Condominium
      AuditLog.belongsTo(models.Condominium, {
        foreignKey: 'condominium_id',
        as: 'condominium',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    // Método estático para criar log de auditoria
    static async createAuditLog({
      action,
      resource,
      resourceId = null,
      userId = null,
      condominiumId = null,
      ipAddress = null,
      userAgent = null,
      requestData = null,
      oldValues = null,
      newValues = null,
      statusCode = 200,
      success = true,
      errorMessage = null,
      sessionId = null,
      correlationId = null,
      durationMs = null
    }) {
      try {
        return await this.create({
          action,
          resource,
          resource_id: resourceId,
          user_id: userId,
          condominium_id: condominiumId,
          ip_address: ipAddress,
          user_agent: userAgent,
          request_data: requestData,
          old_values: oldValues,
          new_values: newValues,
          status_code: statusCode,
          success,
          error_message: errorMessage,
          session_id: sessionId,
          correlation_id: correlationId,
          duration_ms: durationMs
        });
      } catch (error) {
        console.error('Erro ao criar log de auditoria:', error);
        // Não falha a operação principal se o log der erro
        return null;
      }
    }

    // Método para buscar logs por usuário
    static async getLogsByUser(userId, options = {}) {
      const {
        limit = 50,
        offset = 0,
        action = null,
        resource = null,
        startDate = null,
        endDate = null
      } = options;

      const where = { user_id: userId };

      if (action) where.action = action;
      if (resource) where.resource = resource;
      if (startDate && endDate) {
        where.created_at = {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      return await this.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: sequelize.models.User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: sequelize.models.Condominium,
            as: 'condominium',
            attributes: ['id', 'name']
          }
        ]
      });
    }

    // Método para buscar logs por condomínio
    static async getLogsByCondominium(condominiumId, options = {}) {
      const {
        limit = 50,
        offset = 0,
        action = null,
        resource = null,
        startDate = null,
        endDate = null
      } = options;

      const where = { condominium_id: condominiumId };

      if (action) where.action = action;
      if (resource) where.resource = resource;
      if (startDate && endDate) {
        where.created_at = {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      return await this.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: sequelize.models.User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: sequelize.models.Condominium,
            as: 'condominium',
            attributes: ['id', 'name']
          }
        ]
      });
    }

    // Método para buscar logs de recursos específicos
    static async getLogsByResource(resource, resourceId, options = {}) {
      const {
        limit = 50,
        offset = 0,
        action = null,
        startDate = null,
        endDate = null
      } = options;

      const where = { 
        resource,
        resource_id: resourceId
      };

      if (action) where.action = action;
      if (startDate && endDate) {
        where.created_at = {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      return await this.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: sequelize.models.User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: sequelize.models.Condominium,
            as: 'condominium',
            attributes: ['id', 'name']
          }
        ]
      });
    }

    // Método para estatísticas de auditoria
    static async getAuditStats(condominiumId = null, days = 7) {
      const whereClause = {};
      if (condominiumId) {
        whereClause.condominium_id = condominiumId;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      whereClause.created_at = {
        [sequelize.Sequelize.Op.gte]: startDate
      };

      const stats = await this.findAll({
        where: whereClause,
        attributes: [
          'action',
          'resource',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date']
        ],
        group: ['action', 'resource', sequelize.fn('DATE', sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']]
      });

      return stats;
    }
  }

  AuditLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    resource_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    condominium_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'condominiums',
        key: 'id'
      }
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: true
      }
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 100,
        max: 599
      }
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    correlation_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Audit logs are immutable
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['condominium_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['resource']
      },
      {
        fields: ['resource_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['action', 'resource']
      },
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['condominium_id', 'created_at']
      }
    ]
  });

  return AuditLog;
};