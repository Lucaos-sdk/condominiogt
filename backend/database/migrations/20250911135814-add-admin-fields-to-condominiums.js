'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('condominiums', 'administrator_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'administrator_cnpj', {
      type: Sequelize.STRING(14),
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'administrator_contact', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'administrator_email', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'syndic_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });

    await queryInterface.addColumn('condominiums', 'reserve_fund', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn('condominiums', 'monthly_admin_fee', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'insurance_policy', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'insurance_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'fire_certificate', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'fire_certificate_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'environmental_license', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'environmental_license_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Amenities
    await queryInterface.addColumn('condominiums', 'security_24h', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'security_cameras', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'gym', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'pool', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'party_hall', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'playground', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'barbecue_area', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('condominiums', 'garden', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('condominiums', 'administrator_name');
    await queryInterface.removeColumn('condominiums', 'administrator_cnpj');
    await queryInterface.removeColumn('condominiums', 'administrator_contact');
    await queryInterface.removeColumn('condominiums', 'administrator_email');
    await queryInterface.removeColumn('condominiums', 'syndic_user_id');
    await queryInterface.removeColumn('condominiums', 'reserve_fund');
    await queryInterface.removeColumn('condominiums', 'monthly_admin_fee');
    await queryInterface.removeColumn('condominiums', 'insurance_policy');
    await queryInterface.removeColumn('condominiums', 'insurance_expiry');
    await queryInterface.removeColumn('condominiums', 'fire_certificate');
    await queryInterface.removeColumn('condominiums', 'fire_certificate_expiry');
    await queryInterface.removeColumn('condominiums', 'environmental_license');
    await queryInterface.removeColumn('condominiums', 'environmental_license_expiry');
    await queryInterface.removeColumn('condominiums', 'security_24h');
    await queryInterface.removeColumn('condominiums', 'security_cameras');
    await queryInterface.removeColumn('condominiums', 'gym');
    await queryInterface.removeColumn('condominiums', 'pool');
    await queryInterface.removeColumn('condominiums', 'party_hall');
    await queryInterface.removeColumn('condominiums', 'playground');
    await queryInterface.removeColumn('condominiums', 'barbecue_area');
    await queryInterface.removeColumn('condominiums', 'garden');
  }
};
