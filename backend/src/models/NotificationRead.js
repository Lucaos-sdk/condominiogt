module.exports = (sequelize, DataTypes) => {
  const NotificationRead = sequelize.define('NotificationRead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  communication_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Communications',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  notification_type: {
    type: DataTypes.ENUM,
    values: ['new_communication', 'updated_communication', 'communication_liked', 'system_notification'],
    allowNull: false,
    defaultValue: 'new_communication'
  }
}, {
  tableName: 'notification_reads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'communication_id', 'notification_type']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['communication_id']
    },
    {
      fields: ['read_at']
    }
  ]
});

  // Associations
  NotificationRead.associate = function(models) {
    NotificationRead.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    NotificationRead.belongsTo(models.Communication, {
      foreignKey: 'communication_id',
      as: 'communication'
    });
  };

  return NotificationRead;
};