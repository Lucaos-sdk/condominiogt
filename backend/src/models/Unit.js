const { isValidCPF, isValidBrazilianPhone } = require('../utils/validators');

module.exports = (sequelize, DataTypes) => {
  const Unit = sequelize.define('Unit', {
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
    number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    block: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('apartment', 'house', 'commercial', 'parking'),
      allowNull: false,
      defaultValue: 'apartment',
    },
    bedrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bathrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    area: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('occupied', 'vacant', 'rented', 'maintenance'),
      allowNull: false,
      defaultValue: 'vacant',
    },
    owner_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    owner_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    owner_phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhoneFormat(value) {
          if (value && !isValidBrazilianPhone(value)) {
            throw new Error('Telefone do proprietário inválido');
          }
        }
      }
    },
    owner_cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
      validate: {
        isValidCPFFormat(value) {
          if (value && !isValidCPF(value)) {
            throw new Error('CPF do proprietário inválido');
          }
        }
      }
    },
    tenant_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tenant_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    tenant_phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhoneFormat(value) {
          if (value && !isValidBrazilianPhone(value)) {
            throw new Error('Telefone do inquilino inválido');
          }
        }
      }
    },
    tenant_cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
      validate: {
        isValidCPFFormat(value) {
          if (value && !isValidCPF(value)) {
            throw new Error('CPF do inquilino inválido');
          }
        }
      }
    },
    rent_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    condominium_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resident_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    monthly_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    payment_due_day: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31,
      },
    },
    auto_billing_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Novos campos de contrato
    contract_start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contract_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isAfterStartDate(value) {
          if (value && this.contract_start_date && value <= this.contract_start_date) {
            throw new Error('Data final do contrato deve ser posterior à data inicial');
          }
        }
      }
    },
    contract_type: {
      type: DataTypes.ENUM('residential', 'commercial', 'temporary', 'indefinite'),
      allowNull: true,
      defaultValue: 'residential',
    },
    deposit_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      }
    },
    guarantor_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    guarantor_cpf: {
      type: DataTypes.STRING(11),
      allowNull: true,
      validate: {
        isValidCPFFormat(value) {
          if (value && !isValidCPF(value)) {
            throw new Error('CPF do fiador inválido');
          }
        }
      }
    },
    guarantor_phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isValidPhoneFormat(value) {
          if (value && !isValidBrazilianPhone(value)) {
            throw new Error('Telefone do fiador inválido');
          }
        }
      }
    },
    auto_renewal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Campos de comodidades
    parking_spots: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      }
    },
    furnished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    pet_allowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    balcony: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_renovation_date: {
      type: DataTypes.DATE,
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    inquiry_count: {
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
    tableName: 'units',
    indexes: [
      {
        unique: true,
        fields: ['condominium_id', 'number', 'block'],
      },
      {
        fields: ['condominium_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['owner_cpf'],
        where: {
          owner_cpf: {
            [sequelize.Sequelize.Op.not]: null,
          },
        },
      },
      {
        fields: ['tenant_cpf'],
        where: {
          tenant_cpf: {
            [sequelize.Sequelize.Op.not]: null,
          },
        },
      },
    ],
  });

  Unit.associate = (models) => {
    Unit.belongsTo(models.Condominium, {
      foreignKey: 'condominium_id',
      as: 'condominium',
    });

    Unit.belongsTo(models.User, {
      foreignKey: 'resident_user_id',
      as: 'resident_user',
    });

    Unit.hasMany(models.UserCondominium, {
      foreignKey: 'unit_id',
      as: 'residents',
    });

    Unit.hasMany(models.FinancialTransaction, {
      foreignKey: 'unit_id',
      as: 'transactions',
    });

    Unit.hasMany(models.MaintenanceRequest, {
      foreignKey: 'unit_id',
      as: 'maintenance_requests',
    });

    Unit.hasMany(models.Resident, {
      foreignKey: 'unit_id',
      as: 'unit_residents',
    });

    Unit.hasMany(models.UnitHistory, {
      foreignKey: 'unit_id',
      as: 'history',
    });

    // Relacionamentos de auditoria
    Unit.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'created_by',
    });

    Unit.belongsTo(models.User, {
      foreignKey: 'last_updated_by_user_id',
      as: 'last_updated_by',
    });
  };

  return Unit;
};