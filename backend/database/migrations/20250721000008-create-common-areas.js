'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('common_areas', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM(
          'pool', 
          'gym', 
          'party_room', 
          'playground', 
          'barbecue', 
          'garden', 
          'parking', 
          'laundry', 
          'meeting_room',
          'other'
        ),
        allowNull: false,
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      booking_fee: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
      },
      rules: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      operating_hours: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      requires_booking: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      advance_booking_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 7,
      },
      max_booking_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 4,
      },
      status: {
        type: Sequelize.ENUM('available', 'maintenance', 'unavailable'),
        allowNull: false,
        defaultValue: 'available',
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex('common_areas', ['condominium_id']);
    await queryInterface.addIndex('common_areas', ['type']);
    await queryInterface.addIndex('common_areas', ['status']);
    await queryInterface.addIndex('common_areas', ['requires_booking']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('common_areas');
  }
};