const { isValidCNPJ, isValidCEP, isValidBrazilianPhone } = require('../utils/validators');

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
        isValidCNPJFormat(value) {
          if (value && !isValidCNPJ(value)) {
            throw new Error('CNPJ inválido');
          }
        }
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
        isValidCEPFormat(value) {
          if (value && !isValidCEP(value)) {
            throw new Error('CEP inválido');
          }
        }
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhoneFormat(value) {
          if (value && !isValidBrazilianPhone(value)) {
            throw new Error('Telefone inválido');
          }
        }
      }
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
    // Campos de administradora
    administrator_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    administrator_cnpj: {
      type: DataTypes.STRING(14),
      allowNull: true,
      validate: {
        isValidCNPJFormat(value) {
          if (value && !isValidCNPJ(value)) {
            throw new Error('CNPJ da administradora inválido');
          }
        }
      }
    },
    administrator_contact: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhoneFormat(value) {
          if (value && !isValidBrazilianPhone(value)) {
            throw new Error('Telefone da administradora inválido');
          }
        }
      }
    },
    administrator_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    syndic_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    // Campos financeiros
    reserve_fund: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      }
    },
    monthly_admin_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      }
    },
    // Campos de compliance
    insurance_policy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    insurance_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fire_certificate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fire_certificate_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    environmental_license: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    environmental_license_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Comodidades
    security_24h: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    security_cameras: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    gym: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    pool: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    party_hall: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    playground: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    barbecue_area: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    garden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Campos de geolocalização
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90,
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180,
      }
    },
    neighborhood: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nearby_metro: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Campos visuais e documentos
    photos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Fotos deve ser um array');
          }
        }
      }
    },
    virtual_tour_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'URL do tour virtual deve ser uma URL válida'
        }
      }
    },
    documents: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      validate: {
        isArray(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Documentos deve ser um array');
          }
        }
      }
    },
    // Campos de analytics
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      }
    },
    // Campos de auditoria
    created_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    last_updated_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
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

    // Relacionamento com síndico
    Condominium.belongsTo(models.User, {
      foreignKey: 'syndic_user_id',
      as: 'syndic',
    });

    // Relacionamentos de auditoria
    Condominium.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'created_by',
    });

    Condominium.belongsTo(models.User, {
      foreignKey: 'last_updated_by_user_id',
      as: 'last_updated_by',
    });
  };

  return Condominium;
};