'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Campos visuais para Units
    await queryInterface.addColumn('units', 'photos', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.addColumn('units', 'virtual_tour_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('units', 'documents', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });

    // Campos de geolocalização para Condominiums
    await queryInterface.addColumn('condominiums', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'neighborhood', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'nearby_metro', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'photos', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.addColumn('condominiums', 'virtual_tour_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('condominiums', 'documents', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });

    // Campos de analytics
    await queryInterface.addColumn('units', 'view_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('units', 'inquiry_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('condominiums', 'view_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Campos de auditoria
    await queryInterface.addColumn('units', 'created_by_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });

    await queryInterface.addColumn('units', 'last_updated_by_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });

    await queryInterface.addColumn('condominiums', 'created_by_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });

    await queryInterface.addColumn('condominiums', 'last_updated_by_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    });
  },

  async down (queryInterface, Sequelize) {
    // Remover campos das units
    await queryInterface.removeColumn('units', 'photos');
    await queryInterface.removeColumn('units', 'virtual_tour_url');
    await queryInterface.removeColumn('units', 'description');
    await queryInterface.removeColumn('units', 'documents');
    await queryInterface.removeColumn('units', 'view_count');
    await queryInterface.removeColumn('units', 'inquiry_count');
    await queryInterface.removeColumn('units', 'created_by_user_id');
    await queryInterface.removeColumn('units', 'last_updated_by_user_id');

    // Remover campos dos condominiums
    await queryInterface.removeColumn('condominiums', 'latitude');
    await queryInterface.removeColumn('condominiums', 'longitude');
    await queryInterface.removeColumn('condominiums', 'neighborhood');
    await queryInterface.removeColumn('condominiums', 'nearby_metro');
    await queryInterface.removeColumn('condominiums', 'photos');
    await queryInterface.removeColumn('condominiums', 'virtual_tour_url');
    await queryInterface.removeColumn('condominiums', 'documents');
    await queryInterface.removeColumn('condominiums', 'view_count');
    await queryInterface.removeColumn('condominiums', 'created_by_user_id');
    await queryInterface.removeColumn('condominiums', 'last_updated_by_user_id');
  }
};
