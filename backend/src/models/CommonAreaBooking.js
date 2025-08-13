module.exports = (sequelize, DataTypes) => {
  const CommonAreaBooking = sequelize.define('CommonAreaBooking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    common_area_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'common_areas',
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
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'units',
        key: 'id',
      },
    },
    booking_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    guests_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    special_requests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    booking_fee: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paid_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'common_area_bookings',
    indexes: [
      {
        fields: ['common_area_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['unit_id'],
      },
      {
        fields: ['booking_date'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['payment_status'],
      },
      {
        unique: true,
        fields: ['common_area_id', 'booking_date', 'start_time'],
        where: {
          status: {
            [sequelize.Sequelize.Op.notIn]: ['cancelled', 'rejected'],
          },
        },
      },
    ],
    validate: {
      endTimeAfterStartTime() {
        if (this.start_time >= this.end_time) {
          throw new Error('End time must be after start time');
        }
      },
      bookingDateInFuture() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (this.booking_date < today) {
          throw new Error('Booking date cannot be in the past');
        }
      },
    },
  });

  CommonAreaBooking.associate = (models) => {
    CommonAreaBooking.belongsTo(models.CommonArea, {
      foreignKey: 'common_area_id',
      as: 'common_area',
    });

    CommonAreaBooking.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    CommonAreaBooking.belongsTo(models.Unit, {
      foreignKey: 'unit_id',
      as: 'unit',
    });
  };

  return CommonAreaBooking;
};