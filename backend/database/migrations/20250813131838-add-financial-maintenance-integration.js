'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Helper function to check if column exists
      const columnExists = async (tableName, columnName) => {
        const [results] = await queryInterface.sequelize.query(
          `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`,
          { transaction }
        );
        return results.length > 0;
      };

      // Campos para FinancialTransaction
      if (!(await columnExists('financial_transactions', 'maintenance_request_id'))) {
        await queryInterface.addColumn('financial_transactions', 'maintenance_request_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'maintenance_requests',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      }

      if (!(await columnExists('financial_transactions', 'is_recurring'))) {
        await queryInterface.addColumn('financial_transactions', 'is_recurring', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction });
      }

      if (!(await columnExists('financial_transactions', 'auto_generated'))) {
        await queryInterface.addColumn('financial_transactions', 'auto_generated', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction });
      }

      if (!(await columnExists('financial_transactions', 'original_due_date'))) {
        await queryInterface.addColumn('financial_transactions', 'original_due_date', {
          type: Sequelize.DATEONLY,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('financial_transactions', 'recurrence_type'))) {
        await queryInterface.addColumn('financial_transactions', 'recurrence_type', {
          type: Sequelize.ENUM('monthly', 'quarterly', 'semiannual', 'annual', 'one_time'),
          allowNull: false,
          defaultValue: 'one_time'
        }, { transaction });
      }

      // Campos para MaintenanceRequest (estimated_cost já existe)
      if (!(await columnExists('maintenance_requests', 'actual_cost'))) {
        await queryInterface.addColumn('maintenance_requests', 'actual_cost', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00
        }, { transaction });
      }

      if (!(await columnExists('maintenance_requests', 'financial_transaction_id'))) {
        await queryInterface.addColumn('maintenance_requests', 'financial_transaction_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'financial_transactions',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }, { transaction });
      }

      if (!(await columnExists('maintenance_requests', 'payment_status'))) {
        await queryInterface.addColumn('maintenance_requests', 'payment_status', {
          type: Sequelize.ENUM('not_required', 'pending', 'partial', 'paid', 'overdue'),
          allowNull: false,
          defaultValue: 'not_required'
        }, { transaction });
      }

      // Adicionar índices para performance
      try {
        await queryInterface.addIndex('financial_transactions', ['maintenance_request_id'], { transaction });
      } catch (e) {
        // Índice pode já existir
        console.log('Index maintenance_request_id already exists or failed to create:', e.message);
      }

      try {
        await queryInterface.addIndex('financial_transactions', ['auto_generated'], { transaction });
      } catch (e) {
        console.log('Index auto_generated already exists or failed to create:', e.message);
      }

      try {
        await queryInterface.addIndex('financial_transactions', ['is_recurring'], { transaction });
      } catch (e) {
        console.log('Index is_recurring already exists or failed to create:', e.message);
      }

      try {
        await queryInterface.addIndex('maintenance_requests', ['financial_transaction_id'], { transaction });
      } catch (e) {
        console.log('Index financial_transaction_id already exists or failed to create:', e.message);
      }

      try {
        await queryInterface.addIndex('maintenance_requests', ['payment_status'], { transaction });
      } catch (e) {
        console.log('Index payment_status already exists or failed to create:', e.message);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remover índices (ignorar erros se não existirem)
      const removeIndexSafely = async (table, columns) => {
        try {
          await queryInterface.removeIndex(table, columns, { transaction });
        } catch (e) {
          console.log(`Index ${columns} on ${table} doesn't exist or failed to remove:`, e.message);
        }
      };

      await removeIndexSafely('financial_transactions', ['maintenance_request_id']);
      await removeIndexSafely('financial_transactions', ['auto_generated']);
      await removeIndexSafely('financial_transactions', ['is_recurring']);
      await removeIndexSafely('maintenance_requests', ['financial_transaction_id']);
      await removeIndexSafely('maintenance_requests', ['payment_status']);

      // Remover colunas de FinancialTransaction
      await queryInterface.removeColumn('financial_transactions', 'maintenance_request_id', { transaction });
      await queryInterface.removeColumn('financial_transactions', 'is_recurring', { transaction });
      await queryInterface.removeColumn('financial_transactions', 'auto_generated', { transaction });
      await queryInterface.removeColumn('financial_transactions', 'original_due_date', { transaction });
      await queryInterface.removeColumn('financial_transactions', 'recurrence_type', { transaction });

      // Remover colunas de MaintenanceRequest (não remover estimated_cost - já existia)
      await queryInterface.removeColumn('maintenance_requests', 'actual_cost', { transaction });
      await queryInterface.removeColumn('maintenance_requests', 'financial_transaction_id', { transaction });
      await queryInterface.removeColumn('maintenance_requests', 'payment_status', { transaction });

      // Remover ENUMs
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_financial_transactions_recurrence_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_maintenance_requests_payment_status";', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};