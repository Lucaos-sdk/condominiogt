'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('units', 'contract_start_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'contract_end_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'contract_type', {
      type: Sequelize.ENUM('residential', 'commercial', 'temporary', 'indefinite'),
      allowNull: true,
      defaultValue: 'residential',
    });

    await queryInterface.addColumn('units', 'deposit_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'guarantor_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'guarantor_cpf', {
      type: Sequelize.STRING(11),
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'guarantor_phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'auto_renewal', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('units', 'parking_spots', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('units', 'furnished', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('units', 'pet_allowed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('units', 'balcony', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('units', 'last_renovation_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('units', 'contract_start_date');
    await queryInterface.removeColumn('units', 'contract_end_date');
    await queryInterface.removeColumn('units', 'contract_type');
    await queryInterface.removeColumn('units', 'deposit_amount');
    await queryInterface.removeColumn('units', 'guarantor_name');
    await queryInterface.removeColumn('units', 'guarantor_cpf');
    await queryInterface.removeColumn('units', 'guarantor_phone');
    await queryInterface.removeColumn('units', 'auto_renewal');
    await queryInterface.removeColumn('units', 'parking_spots');
    await queryInterface.removeColumn('units', 'furnished');
    await queryInterface.removeColumn('units', 'pet_allowed');
    await queryInterface.removeColumn('units', 'balcony');
    await queryInterface.removeColumn('units', 'last_renovation_date');

    // Remove enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_units_contract_type";');
  }
};
