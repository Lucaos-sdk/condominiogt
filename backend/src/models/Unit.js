module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
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
    number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    block: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('apartment', 'house', 'commercial', 'parking'),
      allowNull: false,
      defaultValue: 'apartment',
    },
    bedrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bathrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    area: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('occupied', 'vacant', 'rented', 'maintenance'),
      allowNull: false,
      defaultValue: 'vacant',
    },
    owner_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    owner_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    owner_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    owner_cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },
    tenant_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tenant_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    tenant_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tenant_cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },
    rent_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    condominium_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resident_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    monthly_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    payment_due_day: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31,
      },
    },
    auto_billing_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'units',
    indexes: [
      {
        unique: true,
        fields: ['condominium_id', 'number', 'block'],
      },
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['owner_cpf'],
        where: {
          owner_cpf: {
            [sequelize.Sequelize.Op.not]: null,
          },
        },
      },
      {
        fields: ['tenant_cpf'],
        where: {
          tenant_cpf: {
            [sequelize.Sequelize.Op.not]: null,
          },
        },
      },
    ],
  });

  Unit.associate = (models) => {
    Unit.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    Unit.belongsTo(models.User, {
      foreignKey: 'resident_user_id',
      as: 'resident_user',
    });

    Unit.hasMany(models.UserCondominium, {
      foreignKey: 'unit_id',
      as: 'residents',
    });

    Unit.hasMany(models.FinancialTransaction, {
      foreignKey: 'unit_id',
      as: 'transactions',
    });

    Unit.hasMany(models.MaintenanceRequest, {
      foreignKey: 'unit_id',
      as: 'maintenance_requests',
    });

    Unit.hasMany(models.Resident, {
      foreignKey: 'unit_id',
      as: 'unit_residents',
    });

    Unit.hasMany(models.UnitHistory, {
      foreignKey: 'unit_id',
      as: 'history',
    });
  };

  return Unit;
};