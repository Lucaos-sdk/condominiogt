module.exports = (sequelize, DataTypes) => {
  const UnitPayment = sequelize.define('UnitPayment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'units',
        key: 'id',
      },
    },
    condominium_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'condominiums',
        key: 'id',
      },
    },
    reference_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12,
      },
    },
    reference_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2020,
        max: 2050,
      },
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    late_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue', 'partial', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'pix', 'credit_card', 'debit_card', 'bank_slip', 'mixed'),
      allowNull: true,
    },
    financial_transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'financial_transactions',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'unit_payments',
    indexes: [
      {
        fields: ['unit_id'],
      },
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['reference_month', 'reference_year'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['due_date'],
      },
      {
        unique: true,
        fields: ['unit_id', 'reference_month', 'reference_year'],
        name: 'unique_unit_month_year',
      },
    ],
    hooks: {
      beforeSave: (payment, options) => {
        // Calcular total_amount
        payment.total_amount = parseFloat(payment.amount) + parseFloat(payment.late_fee) - parseFloat(payment.discount);

        // Atualizar status baseado na data de vencimento
        const now = new Date();
        const dueDate = new Date(payment.due_date);

        if (payment.status === 'pending') {
          if (now > dueDate) {
            payment.status = 'overdue';
          }
        }
      },
    },
  });

  // Método virtual para calcular dias de atraso
  UnitPayment.prototype.getDaysOverdue = function() {
    if (this.status !== 'overdue') return 0;

    const now = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = now - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  // Método virtual para calcular status detalhado
  UnitPayment.prototype.getDetailedStatus = function() {
    const now = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (this.status) {
      case 'paid':
        return {
          status: 'paid',
          label: 'Pago',
          color: 'success',
          description: `Pago em ${this.payment_date ? new Date(this.payment_date).toLocaleDateString('pt-BR') : 'data não informada'}`
        };

      case 'overdue':
        const daysOverdue = this.getDaysOverdue();
        return {
          status: 'overdue',
          label: 'Em Atraso',
          color: 'danger',
          description: `${daysOverdue} dia(s) em atraso`,
          daysOverdue
        };

      case 'partial':
        return {
          status: 'partial',
          label: 'Pago Parcialmente',
          color: 'warning',
          description: 'Pagamento parcial realizado'
        };

      case 'cancelled':
        return {
          status: 'cancelled',
          label: 'Cancelado',
          color: 'secondary',
          description: 'Pagamento cancelado'
        };

      case 'pending':
      default:
        if (diffDays <= 0) {
          // Vencido mas ainda não marcado como overdue
          return {
            status: 'overdue',
            label: 'Vencido',
            color: 'danger',
            description: 'Vencimento hoje ou passou'
          };
        } else if (diffDays <= 3) {
          return {
            status: 'due_soon',
            label: 'Vence em Breve',
            color: 'warning',
            description: `Vence em ${diffDays} dia(s)`
          };
        } else if (diffDays <= 7) {
          return {
            status: 'upcoming',
            label: 'Próximo do Vencimento',
            color: 'info',
            description: `Vence em ${diffDays} dia(s)`
          };
        } else {
          return {
            status: 'current',
            label: 'Em Dia',
            color: 'success',
            description: `Vence em ${diffDays} dia(s)`
          };
        }
    }
  };

  UnitPayment.associate = (models) => {
    UnitPayment.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });

    UnitPayment.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    UnitPayment.belongsTo(models.FinancialTransaction, {
      foreignKey: 'financial_transaction_id',
      as: 'financial_transaction',
    });
  };

  return UnitPayment;
};