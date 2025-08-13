module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
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
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [10, 15],
      },
    },
    cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
      unique: true,
      validate: {
        len: [11, 11],
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'syndic', 'resident'),
      allowNull: false,
      defaultValue: 'resident',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reset_password_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['cpf'],
        where: {
          cpf: {
            [sequelize.Sequelize.Op.not]: null,
          },
        },
      },
      {
        fields: ['role'],
      },
      {
        fields: ['status'],
      },
    ],
  });

  User.associate = (models) => {
    User.hasMany(models.UserCondominium, {
      foreignKey: 'user_id',
      as: 'condominiums',
    });
    
    User.hasMany(models.FinancialTransaction, {
      foreignKey: 'user_id',
      as: 'transactions',
    });

    User.hasMany(models.MaintenanceRequest, {
      foreignKey: 'user_id',
      as: 'maintenance_requests',
    });

    User.hasMany(models.Communication, {
      foreignKey: 'author_id',
      as: 'communications',
    });
  };

  return User;
};