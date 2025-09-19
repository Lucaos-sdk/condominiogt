'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unit_payments', {
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
      reference_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 12
        }
      },
      reference_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 2020,
          max: 2050
        }
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      late_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'overdue', 'partial', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'bank_transfer', 'pix', 'credit_card', 'debit_card', 'bank_slip', 'mixed'),
        allowNull: true
      },
      financial_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'financial_transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Índices para otimização
    await queryInterface.addIndex('unit_payments', ['unit_id']);
    await queryInterface.addIndex('unit_payments', ['condominium_id']);
    await queryInterface.addIndex('unit_payments', ['reference_month', 'reference_year']);
    await queryInterface.addIndex('unit_payments', ['status']);
    await queryInterface.addIndex('unit_payments', ['due_date']);
    await queryInterface.addIndex('unit_payments', ['unit_id', 'reference_month', 'reference_year'], {
      unique: true,
      name: 'unique_unit_month_year'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('unit_payments');
  }
};