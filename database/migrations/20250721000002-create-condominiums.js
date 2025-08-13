'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('condominiums', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cnpj: {
        type: Sequelize.STRING(14),
        allowNull: true,
        unique: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(2),
        allowNull: false,
      },
      zip_code: {
        type: Sequelize.STRING(8),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      total_units: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_blocks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      construction_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      common_area_size: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      parking_spots: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      elevators: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'construction'),
        allowNull: false,
        defaultValue: 'active',
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      settings: {
        type: Sequelize.JSON,
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
    await queryInterface.addIndex('condominiums', ['cnpj'], {
      unique: true,
      where: {
        cnpj: {
          [Sequelize.Op.not]: null
        }
      }
    });
    await queryInterface.addIndex('condominiums', ['status']);
    await queryInterface.addIndex('condominiums', ['city', 'state']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('condominiums');
  }
};