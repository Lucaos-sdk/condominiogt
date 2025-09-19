module.exports = (sequelize, DataTypes) => {
  const UnitHistory = sequelize.define('UnitHistory', {
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
    resident_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'residents',
        key: 'id',
      },
    },
    action_type: {
      type: DataTypes.ENUM(
        'resident_added',
        'resident_removed',
        'resident_updated',
        'status_changed',
        'owner_changed',
        'tenant_changed',
        'fee_changed',
        'general_update',
        'maintenance_request_created',
        'maintenance_request_approved',
        'maintenance_request_completed',
        'maintenance_request_rejected'
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    changed_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  }, {
    tableName: 'unit_history',
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['unit_id'],
      },
      {
        fields: ['resident_id'],
      },
      {
        fields: ['action_type'],
      },
      {
        fields: ['changed_by_user_id'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  });

  UnitHistory.associate = (models) => {
    UnitHistory.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });

    UnitHistory.belongsTo(models.Resident, {
      foreignKey: 'resident_id',
      as: 'resident',
    });

    UnitHistory.belongsTo(models.User, {
      foreignKey: 'changed_by_user_id',
      as: 'changed_by_user',
    });
  };

  return UnitHistory;
};