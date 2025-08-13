'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_condominiums', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'units',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      role: {
        type: Sequelize.ENUM('owner', 'tenant', 'resident', 'manager', 'syndic'),
        allowNull: false,
        defaultValue: 'resident',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      access_permissions: {
        type: Sequelize.JSON,
        allowNull: true,
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
    await queryInterface.addIndex('user_condominiums', ['user_id', 'condominium_id', 'unit_id'], { unique: true });
    await queryInterface.addIndex('user_condominiums', ['user_id']);
    await queryInterface.addIndex('user_condominiums', ['condominium_id']);
    await queryInterface.addIndex('user_condominiums', ['unit_id']);
    await queryInterface.addIndex('user_condominiums', ['role']);
    await queryInterface.addIndex('user_condominiums', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_condominiums');
  }
};