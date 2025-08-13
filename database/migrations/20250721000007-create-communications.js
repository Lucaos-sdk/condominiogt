'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('communications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      condominium_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'condominiums',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('announcement', 'notice', 'warning', 'event', 'assembly', 'maintenance'),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'scheduled', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      target_audience: {
        type: Sequelize.ENUM('all', 'owners', 'tenants', 'managers', 'specific_units'),
        allowNull: false,
        defaultValue: 'all',
      },
      target_units: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      publish_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expire_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      send_email: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      send_whatsapp: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      views_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      likes_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('communications', ['condominium_id']);
    await queryInterface.addIndex('communications', ['author_id']);
    await queryInterface.addIndex('communications', ['type']);
    await queryInterface.addIndex('communications', ['priority']);
    await queryInterface.addIndex('communications', ['status']);
    await queryInterface.addIndex('communications', ['publish_date']);
    await queryInterface.addIndex('communications', ['expire_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('communications');
  }
};