module.exports = (sequelize, DataTypes) => {
  const Communication = sequelize.define('Communication', {
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
    author_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('announcement', 'notice', 'warning', 'event', 'assembly', 'maintenance'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 200],
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'scheduled', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    target_audience: {
      type: DataTypes.ENUM('all', 'owners', 'tenants', 'managers', 'specific_units'),
      allowNull: false,
      defaultValue: 'all',
    },
    target_units: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    publish_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expire_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    send_email: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    send_whatsapp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    views_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    likes_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'communications',
    indexes: [
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['author_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['publish_date'],
      },
      {
        fields: ['expire_date'],
      },
    ],
  });

  Communication.associate = (models) => {
    Communication.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    Communication.belongsTo(models.User, {
      foreignKey: 'author_id',
      as: 'author',
    });
  };

  return Communication;
};