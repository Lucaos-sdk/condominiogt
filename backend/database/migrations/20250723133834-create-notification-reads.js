'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('notification_reads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      communication_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'communications',
          key: 'id'
        },
        onDelete: 'CASCADE',  
        onUpdate: 'CASCADE'
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      notification_type: {
        type: Sequelize.ENUM('new_communication', 'updated_communication', 'communication_liked', 'system_notification'),
        allowNull: false,
        defaultValue: 'new_communication'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('notification_reads', {
      unique: true,
      fields: ['user_id', 'communication_id', 'notification_type'],
      name: 'unique_notification_read'
    });

    await queryInterface.addIndex('notification_reads', {
      fields: ['user_id'],
      name: 'idx_notification_reads_user_id'
    });

    await queryInterface.addIndex('notification_reads', {
      fields: ['communication_id'],
      name: 'idx_notification_reads_communication_id'
    });

    await queryInterface.addIndex('notification_reads', {
      fields: ['read_at'],
      name: 'idx_notification_reads_read_at'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('notification_reads');
  }
};
