'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('unit_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'units',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      resident_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'residents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action_type: {
        type: Sequelize.ENUM(
          'resident_added',
          'resident_removed', 
          'resident_updated',
          'status_changed',
          'owner_changed',
          'tenant_changed',
          'fee_changed',
          'general_update'
        ),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true
      },
      changed_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('unit_history', ['unit_id']);
    await queryInterface.addIndex('unit_history', ['resident_id']);
    await queryInterface.addIndex('unit_history', ['action_type']);
    await queryInterface.addIndex('unit_history', ['changed_by_user_id']);
    await queryInterface.addIndex('unit_history', ['createdAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('unit_history');
  }
};
