module.exports = (sequelize, DataTypes) => {
  const Resident = sequelize.define('Resident', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING(11),
      allowNull: false,
      unique: true,
    },
    rg: {
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
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    relationship: {
      type: DataTypes.ENUM('owner', 'tenant', 'family', 'dependent', 'guest'),
      allowNull: false,
      defaultValue: 'family',
    },
    is_main_resident: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emergency_contact_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emergency_contact_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    move_in_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    move_out_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'residents',
    indexes: [
      {
        fields: ['unit_id'],
      },
      {
        fields: ['cpf'],
        unique: true,
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['relationship'],
      },
    ],
  });

  Resident.associate = (models) => {
    Resident.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });

    Resident.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    Resident.hasMany(models.UnitHistory, {
      foreignKey: 'resident_id',
      as: 'history_entries',
    });
  };

  return Resident;
};