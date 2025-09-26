module.exports = (sequelize, DataTypes) => {
  const FinancialTransaction = sequelize.define('FinancialTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    condominium_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'condominiums',
        key: 'id',
      },
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'units',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        'condominium_fee',
        'water',
        'electricity',
        'gas',
        'maintenance',
        'security',
        'cleaning',
        'insurance',
        'reserve_fund',
        'utilities',
        'other'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Título opcional para facilitar a identificação da transação',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paid_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'pix', 'pix_a', 'pix_b', 'pix_c', 'credit_card', 'debit_card', 'bank_slip', 'mixed'),
      allowNull: true,
    },
    reference_month: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 12,
      },
    },
    reference_year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 2020,
        max: 2050,
      },
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receipt_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    late_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    // Campos para sistema PIX avançado
    pix_type: {
      type: DataTypes.ENUM('A', 'B', 'C'),
      allowNull: true,
      comment: 'Tipo de PIX: A, B ou C para múltiplos destinatários'
    },
    pix_key: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Chave PIX utilizada no pagamento'
    },
    pix_recipient_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nome do destinatário do PIX'
    },
    // Sistema de confirmação de dinheiro
    cash_confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Confirmação de recebimento em dinheiro'
    },
    cash_confirmed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuário que confirmou o pagamento em dinheiro'
    },
    cash_confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data da confirmação do pagamento em dinheiro'
    },
    // Sistema de pagamentos mistos
    mixed_payment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica se é um pagamento misto (PIX + dinheiro)'
    },
    pix_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Valor pago via PIX em pagamentos mistos'
    },
    cash_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Valor pago em dinheiro em pagamentos mistos'
    },
    // Privacy para síndicos
    private_expense: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Gasto privado do proprietário, oculto para síndicos'
    },
    // Campos de auditoria financeira
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuário que criou a transação'
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Usuário que aprovou a transação'
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data da aprovação da transação'
    },
    // Campos para controle financeiro detalhado
    balance_before: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Saldo antes da transação para auditoria'
    },
    balance_after: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Saldo após a transação para auditoria'
    },
  }, {
    tableName: 'financial_transactions',
    indexes: [
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['unit_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['due_date'],
      },
      {
        fields: ['paid_date'],
      },
      {
        fields: ['reference_month', 'reference_year'],
      },
    ],
    hooks: {
      beforeSave: (transaction, options) => {
        transaction.total_amount = parseFloat(transaction.amount) + parseFloat(transaction.late_fee) - parseFloat(transaction.discount);
      },
    },
  });

  FinancialTransaction.associate = (models) => {
    FinancialTransaction.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    FinancialTransaction.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });

    FinancialTransaction.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    // Relacionamentos para auditoria
    FinancialTransaction.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });

    FinancialTransaction.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver',
    });

    FinancialTransaction.belongsTo(models.User, {
      foreignKey: 'cash_confirmed_by',
      as: 'cash_confirmer',
    });

  };

  return FinancialTransaction;
};