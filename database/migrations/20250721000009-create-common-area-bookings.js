'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('common_area_bookings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      common_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'common_areas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      booking_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      guests_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      booking_fee: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      paid_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      admin_notes: {
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
    await queryInterface.addIndex('common_area_bookings', ['common_area_id']);
    await queryInterface.addIndex('common_area_bookings', ['user_id']);
    await queryInterface.addIndex('common_area_bookings', ['unit_id']);
    await queryInterface.addIndex('common_area_bookings', ['booking_date']);
    await queryInterface.addIndex('common_area_bookings', ['status']);
    await queryInterface.addIndex('common_area_bookings', ['payment_status']);
    
    // Add unique constraint for booking slots (excluding cancelled/rejected)
    await queryInterface.addIndex('common_area_bookings', 
      ['common_area_id', 'booking_date', 'start_time'], 
      { 
        unique: true,
        name: 'unique_booking_slot'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('common_area_bookings');
  }
};