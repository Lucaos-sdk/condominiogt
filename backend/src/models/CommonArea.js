module.exports = (sequelize, DataTypes) => {
  const CommonArea = sequelize.define('CommonArea', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(
        'pool', 
        'gym', 
        'party_room', 
        'playground', 
        'barbecue', 
        'garden', 
        'parking', 
        'laundry', 
        'meeting_room',
        'other'
      ),
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    booking_fee: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    operating_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    requires_booking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    advance_booking_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      validate: {
        min: 1,
        max: 90,
      },
    },
    max_booking_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      validate: {
        min: 1,
        max: 24,
      },
    },
    status: {
      type: DataTypes.ENUM('available', 'maintenance', 'unavailable'),
      allowNull: false,
      defaultValue: 'available',
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'common_areas',
    indexes: [
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['requires_booking'],
      },
    ],
  });

  CommonArea.associate = (models) => {
    CommonArea.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    CommonArea.hasMany(models.CommonAreaBooking, {
      foreignKey: 'common_area_id',
      as: 'bookings',
    });
  };

  return CommonArea;
};