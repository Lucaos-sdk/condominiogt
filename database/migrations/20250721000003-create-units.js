'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('units', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      condominium_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'condominiums',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      block: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      floor: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM('apartment', 'house', 'commercial', 'parking'),
        allowNull: false,
        defaultValue: 'apartment',
      },
      bedrooms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bathrooms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      area: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('occupied', 'vacant', 'rented', 'maintenance'),
        allowNull: false,
        defaultValue: 'vacant',
      },
      owner_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      owner_email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      owner_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      owner_cpf: {
        type: Sequelize.STRING(11),
        allowNull: true,
      },
      tenant_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tenant_email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tenant_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tenant_cpf: {
        type: Sequelize.STRING(11),
        allowNull: true,
      },
      rent_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      condominium_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('units', ['condominium_id', 'number', 'block'], { unique: true });
    await queryInterface.addIndex('units', ['condominium_id']);
    await queryInterface.addIndex('units', ['status']);
    await queryInterface.addIndex('units', ['type']);
    await queryInterface.addIndex('units', ['owner_cpf'], {
      where: {
        owner_cpf: {
          [Sequelize.Op.not]: null
        }
      }
    });
    await queryInterface.addIndex('units', ['tenant_cpf'], {
      where: {
        tenant_cpf: {
          [Sequelize.Op.not]: null
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('units');
  }
};