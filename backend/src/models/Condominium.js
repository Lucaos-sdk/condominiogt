module.exports = (sequelize, DataTypes) => {
  const Condominium = sequelize.define('Condominium', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 150],
      },
    },
    cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
      unique: true,
      validate: {
        len: [14, 14],
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    zip_code: {
      type: DataTypes.STRING(8),
      allowNull: false,
      validate: {
        len: [8, 8],
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    total_units: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    total_blocks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    construction_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    common_area_size: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    parking_spots: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    elevators: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'construction'),
      allowNull: false,
      defaultValue: 'active',
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'condominiums',
    indexes: [
      {
        unique: true,
        fields: ['cnpj'],
        where: {
          cnpj: {
            [sequelize.Sequelize.Op.not]: null,
          },
        },
      },
      {
        fields: ['status'],
      },
      {
        fields: ['city', 'state'],
      },
    ],
  });

  Condominium.associate = (models) => {
    Condominium.hasMany(models.UserCondominium, {
      foreignKey: 'condominium_id',
      as: 'users',
    });

    Condominium.hasMany(models.Unit, {
      foreignKey: 'condominium_id',
      as: 'units',
    });

    Condominium.hasMany(models.CommonArea, {
      foreignKey: 'condominium_id',
      as: 'common_areas',
    });

    Condominium.hasMany(models.FinancialTransaction, {
      foreignKey: 'condominium_id',
      as: 'transactions',
    });

    Condominium.hasMany(models.MaintenanceRequest, {
      foreignKey: 'condominium_id',
      as: 'maintenance_requests',
    });

    Condominium.hasMany(models.Communication, {
      foreignKey: 'condominium_id',
      as: 'communications',
    });
  };

  return Condominium;
};