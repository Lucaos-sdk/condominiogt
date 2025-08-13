'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Ação realizada (CREATE, UPDATE, DELETE, LOGIN, etc.)'
      },
      resource: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Recurso afetado (financial_transaction, user, etc.)'
      },
      resource_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID do recurso afetado'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      condominium_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'condominiums',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'Endereço IP da requisição'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User-Agent do navegador'
      },
      request_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Dados da requisição (sanitizados)'
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Valores anteriores (para UPDATEs)'
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Novos valores (para UPDATEs e CREATEs)'
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Status HTTP da resposta'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Se a operação foi bem-sucedida'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro (se houver)'
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'ID da sessão'
      },
      correlation_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'ID de correlação para rastreamento'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duração da operação em milissegundos'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para otimizar consultas
    await queryInterface.addIndex('audit_logs', ['user_id'], {
      name: 'idx_audit_logs_user_id'
    });

    await queryInterface.addIndex('audit_logs', ['condominium_id'], {
      name: 'idx_audit_logs_condominium_id'
    });

    await queryInterface.addIndex('audit_logs', ['action'], {
      name: 'idx_audit_logs_action'
    });

    await queryInterface.addIndex('audit_logs', ['resource'], {
      name: 'idx_audit_logs_resource'
    });

    await queryInterface.addIndex('audit_logs', ['resource_id'], {
      name: 'idx_audit_logs_resource_id'
    });

    await queryInterface.addIndex('audit_logs', ['created_at'], {
      name: 'idx_audit_logs_created_at'
    });

    await queryInterface.addIndex('audit_logs', ['action', 'resource'], {
      name: 'idx_audit_logs_action_resource'
    });

    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], {
      name: 'idx_audit_logs_user_created'
    });

    await queryInterface.addIndex('audit_logs', ['condominium_id', 'created_at'], {
      name: 'idx_audit_logs_condominium_created'
    });

    console.log('✅ Tabela audit_logs criada com índices otimizados');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
    console.log('✅ Tabela audit_logs removida');
  }
};