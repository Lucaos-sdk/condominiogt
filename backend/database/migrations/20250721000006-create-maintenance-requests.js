'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('maintenance_requests', {
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
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM(
          'plumbing', 
          'electrical', 
          'hvac', 
          'elevator', 
          'security', 
          'cleaning', 
          'landscaping', 
          'structural', 
          'appliances',
          'other'
        ),
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      estimated_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      actual_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      assigned_to: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      assigned_contact: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resident_rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      resident_feedback: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('maintenance_requests', ['condominium_id']);
    await queryInterface.addIndex('maintenance_requests', ['unit_id']);
    await queryInterface.addIndex('maintenance_requests', ['user_id']);
    await queryInterface.addIndex('maintenance_requests', ['category']);
    await queryInterface.addIndex('maintenance_requests', ['priority']);
    await queryInterface.addIndex('maintenance_requests', ['status']);
    await queryInterface.addIndex('maintenance_requests', ['scheduled_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('maintenance_requests');
  }
};