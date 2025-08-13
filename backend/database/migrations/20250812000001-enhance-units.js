'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('units', 'resident_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'SET NULL',
      onDelete: 'SET NULL',
      comment: 'Morador selecionado para a unidade (opcional)'
    });

    await queryInterface.addColumn('units', 'monthly_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor mensal da unidade para cobrança automática'
    });

    await queryInterface.addColumn('units', 'payment_due_day', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Dia do mês para vencimento (1-31)'
    });

    await queryInterface.addColumn('units', 'auto_billing_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Habilitar lançamento automático de cobrança'
    });

    // Adicionar índices para melhor performance
    await queryInterface.addIndex('units', ['resident_user_id']);
    await queryInterface.addIndex('units', ['auto_billing_enabled']);
    await queryInterface.addIndex('units', ['payment_due_day']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('units', ['resident_user_id']);
    await queryInterface.removeIndex('units', ['auto_billing_enabled']);
    await queryInterface.removeIndex('units', ['payment_due_day']);
    
    await queryInterface.removeColumn('units', 'resident_user_id');
    await queryInterface.removeColumn('units', 'monthly_amount');
    await queryInterface.removeColumn('units', 'payment_due_day');
    await queryInterface.removeColumn('units', 'auto_billing_enabled');
  }
};