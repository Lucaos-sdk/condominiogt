module.exports = (sequelize, DataTypes) => {
  const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
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
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        'plumbing', 
        'electrical', 
        'hvac', 
        'elevator', 
        'security', 
        'cleaning', 
        'landscaping', 
        'structural', 
        'appliances',
        'other'
      ),
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estimated_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    assigned_to: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assigned_contact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scheduled_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resident_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    resident_feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'maintenance_requests',
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
        fields: ['category'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['scheduled_date'],
      },
    ],
  });

  MaintenanceRequest.associate = (models) => {
    MaintenanceRequest.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    MaintenanceRequest.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });

    MaintenanceRequest.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

  };

  return MaintenanceRequest;
};