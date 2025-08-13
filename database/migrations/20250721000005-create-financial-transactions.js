'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('financial_transactions', {
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
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM(
          'condominium_fee', 
          'water', 
          'electricity', 
          'gas', 
          'maintenance', 
          'security', 
          'cleaning', 
          'insurance', 
          'reserve_fund', 
          'other'
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      paid_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'bank_transfer', 'pix', 'credit_card', 'debit_card', 'bank_slip'),
        allowNull: true,
      },
      reference_month: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reference_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      receipt_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      late_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
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
    await queryInterface.addIndex('financial_transactions', ['condominium_id']);
    await queryInterface.addIndex('financial_transactions', ['unit_id']);
    await queryInterface.addIndex('financial_transactions', ['user_id']);
    await queryInterface.addIndex('financial_transactions', ['type']);
    await queryInterface.addIndex('financial_transactions', ['category']);
    await queryInterface.addIndex('financial_transactions', ['status']);
    await queryInterface.addIndex('financial_transactions', ['due_date']);
    await queryInterface.addIndex('financial_transactions', ['paid_date']);
    await queryInterface.addIndex('financial_transactions', ['reference_month', 'reference_year']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('financial_transactions');
  }
};