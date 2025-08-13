'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar campos para sistema PIX avançado
    await queryInterface.addColumn('financial_transactions', 'pix_type', {
      type: Sequelize.ENUM('A', 'B', 'C'),
      allowNull: true,
      comment: 'Tipo de PIX: A, B ou C para múltiplos destinatários'
    });

    await queryInterface.addColumn('financial_transactions', 'pix_key', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Chave PIX utilizada no pagamento'
    });

    await queryInterface.addColumn('financial_transactions', 'pix_recipient_name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nome do destinatário do PIX'
    });

    // Sistema de confirmação de dinheiro
    await queryInterface.addColumn('financial_transactions', 'cash_confirmed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Confirmação de recebimento em dinheiro'
    });

    await queryInterface.addColumn('financial_transactions', 'cash_confirmed_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuário que confirmou o pagamento em dinheiro'
    });

    await queryInterface.addColumn('financial_transactions', 'cash_confirmed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Data da confirmação do pagamento em dinheiro'
    });

    // Sistema de pagamentos mistos
    await queryInterface.addColumn('financial_transactions', 'mixed_payment', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica se é um pagamento misto (PIX + dinheiro)'
    });

    await queryInterface.addColumn('financial_transactions', 'pix_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Valor pago via PIX em pagamentos mistos'
    });

    await queryInterface.addColumn('financial_transactions', 'cash_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Valor pago em dinheiro em pagamentos mistos'
    });

    // Privacy para síndicos
    await queryInterface.addColumn('financial_transactions', 'private_expense', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Gasto privado do proprietário, oculto para síndicos'
    });

    // Campos de auditoria financeira
    await queryInterface.addColumn('financial_transactions', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuário que criou a transação'
    });

    await queryInterface.addColumn('financial_transactions', 'approved_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuário que aprovou a transação'
    });

    await queryInterface.addColumn('financial_transactions', 'approved_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Data da aprovação da transação'
    });

    // Campos para controle financeiro detalhado
    await queryInterface.addColumn('financial_transactions', 'balance_before', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Saldo antes da transação para auditoria'
    });

    await queryInterface.addColumn('financial_transactions', 'balance_after', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Saldo após a transação para auditoria'
    });

    // Expandir payment_method enum
    await queryInterface.changeColumn('financial_transactions', 'payment_method', {
      type: Sequelize.ENUM('cash', 'bank_transfer', 'pix', 'pix_a', 'pix_b', 'pix_c', 'credit_card', 'debit_card', 'bank_slip', 'mixed'),
      allowNull: true
    });

    // Adicionar índices para performance
    await queryInterface.addIndex('financial_transactions', {
      fields: ['pix_type'],
      name: 'idx_financial_transactions_pix_type'
    });

    await queryInterface.addIndex('financial_transactions', {
      fields: ['cash_confirmed'],
      name: 'idx_financial_transactions_cash_confirmed'
    });

    await queryInterface.addIndex('financial_transactions', {
      fields: ['mixed_payment'],
      name: 'idx_financial_transactions_mixed_payment'
    });

    await queryInterface.addIndex('financial_transactions', {
      fields: ['private_expense'],
      name: 'idx_financial_transactions_private_expense'
    });

    await queryInterface.addIndex('financial_transactions', {
      fields: ['created_by'],
      name: 'idx_financial_transactions_created_by'
    });

    await queryInterface.addIndex('financial_transactions', {
      fields: ['approved_by'],
      name: 'idx_financial_transactions_approved_by'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remover índices
    await queryInterface.removeIndex('financial_transactions', 'idx_financial_transactions_pix_type');
    await queryInterface.removeIndex('financial_transactions', 'idx_financial_transactions_cash_confirmed');
    await queryInterface.removeIndex('financial_transactions', 'idx_financial_transactions_mixed_payment');
    await queryInterface.removeIndex('financial_transactions', 'idx_financial_transactions_private_expense');
    await queryInterface.removeIndex('financial_transactions', 'idx_financial_transactions_created_by');
    await queryInterface.removeIndex('financial_transactions', 'idx_financial_transactions_approved_by');

    // Remover colunas
    await queryInterface.removeColumn('financial_transactions', 'pix_type');
    await queryInterface.removeColumn('financial_transactions', 'pix_key');
    await queryInterface.removeColumn('financial_transactions', 'pix_recipient_name');
    await queryInterface.removeColumn('financial_transactions', 'cash_confirmed');
    await queryInterface.removeColumn('financial_transactions', 'cash_confirmed_by');
    await queryInterface.removeColumn('financial_transactions', 'cash_confirmed_at');
    await queryInterface.removeColumn('financial_transactions', 'mixed_payment');
    await queryInterface.removeColumn('financial_transactions', 'pix_amount');
    await queryInterface.removeColumn('financial_transactions', 'cash_amount');
    await queryInterface.removeColumn('financial_transactions', 'private_expense');
    await queryInterface.removeColumn('financial_transactions', 'created_by');
    await queryInterface.removeColumn('financial_transactions', 'approved_by');
    await queryInterface.removeColumn('financial_transactions', 'approved_at');
    await queryInterface.removeColumn('financial_transactions', 'balance_before');
    await queryInterface.removeColumn('financial_transactions', 'balance_after');

    // Reverter payment_method enum
    await queryInterface.changeColumn('financial_transactions', 'payment_method', {
      type: Sequelize.ENUM('cash', 'bank_transfer', 'pix', 'credit_card', 'debit_card', 'bank_slip'),
      allowNull: true
    });
  }
};
