module.exports = (sequelize, DataTypes) => {
  const UserCondominium = sequelize.define('UserCondominium', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
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
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'units',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('owner', 'tenant', 'resident', 'manager', 'syndic'),
      allowNull: false,
      defaultValue: 'resident',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    access_permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
  }, {
    tableName: 'user_condominiums',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'condominium_id', 'unit_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['unit_id'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['status'],
      },
    ],
  });

  UserCondominium.associate = (models) => {
    UserCondominium.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    UserCondominium.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    UserCondominium.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });
  };

  return UserCondominium;
};