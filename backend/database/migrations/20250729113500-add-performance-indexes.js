'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Índices para Financial Transactions (queries mais frequentes)
    await queryInterface.addIndex('financial_transactions', ['condominium_id', 'status'], {
      name: 'idx_financial_transactions_condominium_status'
    });

    await queryInterface.addIndex('financial_transactions', ['condominium_id', 'type', 'status'], {
      name: 'idx_financial_transactions_condominium_type_status'
    });

    await queryInterface.addIndex('financial_transactions', ['due_date', 'status'], {
      name: 'idx_financial_transactions_due_date_status'
    });

    await queryInterface.addIndex('financial_transactions', ['created_at'], {
      name: 'idx_financial_transactions_created_at'
    });

    await queryInterface.addIndex('financial_transactions', ['category', 'condominium_id'], {
      name: 'idx_financial_transactions_category_condominium'
    });

    // Índices para Maintenance Requests
    await queryInterface.addIndex('maintenance_requests', ['condominium_id', 'status'], {
      name: 'idx_maintenance_requests_condominium_status'
    });

    await queryInterface.addIndex('maintenance_requests', ['category', 'priority'], {
      name: 'idx_maintenance_requests_category_priority'
    });

    await queryInterface.addIndex('maintenance_requests', ['user_id', 'status'], {
      name: 'idx_maintenance_requests_user_status'
    });

    await queryInterface.addIndex('maintenance_requests', ['created_at'], {
      name: 'idx_maintenance_requests_created_at'
    });

    // Índices para Communications
    await queryInterface.addIndex('communications', ['condominium_id', 'status'], {
      name: 'idx_communications_condominium_status'
    });

    await queryInterface.addIndex('communications', ['publish_date', 'status'], {
      name: 'idx_communications_publish_date_status'
    });

    await queryInterface.addIndex('communications', ['type', 'condominium_id'], {
      name: 'idx_communications_type_condominium'
    });

    await queryInterface.addIndex('communications', ['created_at'], {
      name: 'idx_communications_created_at'
    });

    // Índices para Common Area Bookings
    await queryInterface.addIndex('common_area_bookings', ['common_area_id', 'status'], {
      name: 'idx_bookings_common_area_status'
    });

    await queryInterface.addIndex('common_area_bookings', ['user_id', 'status'], {
      name: 'idx_bookings_user_status'
    });

    await queryInterface.addIndex('common_area_bookings', ['booking_date', 'start_time'], {
      name: 'idx_bookings_date_time'
    });

    await queryInterface.addIndex('common_area_bookings', ['created_at'], {
      name: 'idx_bookings_created_at'
    });

    // Índices para Common Areas
    await queryInterface.addIndex('common_areas', ['condominium_id', 'status'], {
      name: 'idx_common_areas_condominium_status'
    });

    await queryInterface.addIndex('common_areas', ['type', 'condominium_id'], {
      name: 'idx_common_areas_type_condominium'
    });

    // Índices para Units
    await queryInterface.addIndex('units', ['condominium_id', 'status'], {
      name: 'idx_units_condominium_status'
    });

    await queryInterface.addIndex('units', ['number', 'condominium_id'], {
      name: 'idx_units_number_condominium'
    });

    // Índices para User Condominiums (relacionamentos)
    await queryInterface.addIndex('user_condominiums', ['user_id', 'status'], {
      name: 'idx_user_condominiums_user_status'
    });

    await queryInterface.addIndex('user_condominiums', ['condominium_id', 'role'], {
      name: 'idx_user_condominiums_condominium_role'
    });

    await queryInterface.addIndex('user_condominiums', ['role', 'status'], {
      name: 'idx_user_condominiums_role_status'
    });

    // Índices para Users
    await queryInterface.addIndex('users', ['role', 'status'], {
      name: 'idx_users_role_status'
    });

    await queryInterface.addIndex('users', ['created_at'], {
      name: 'idx_users_created_at'
    });

    // Índices para Condominiums
    await queryInterface.addIndex('condominiums', ['status'], {
      name: 'idx_condominiums_status'
    });

    await queryInterface.addIndex('condominiums', ['created_at'], {
      name: 'idx_condominiums_created_at'
    });

    // Índices compostos para relatórios
    await queryInterface.addIndex('financial_transactions', ['condominium_id', 'created_at', 'status'], {
      name: 'idx_financial_reports_composite'
    });

    await queryInterface.addIndex('maintenance_requests', ['condominium_id', 'created_at', 'status'], {
      name: 'idx_maintenance_reports_composite'
    });

    // Índices para busca textual
    await queryInterface.addIndex('financial_transactions', ['description'], {
      name: 'idx_financial_transactions_description'
    });

    await queryInterface.addIndex('maintenance_requests', ['title'], {
      name: 'idx_maintenance_requests_title'
    });

    await queryInterface.addIndex('communications', ['title'], {
      name: 'idx_communications_title'
    });

    console.log('✅ Índices de performance criados com sucesso');
  },

  async down(queryInterface, Sequelize) {
    // Remove todos os índices criados
    const indexes = [
      'idx_financial_transactions_condominium_status',
      'idx_financial_transactions_condominium_type_status',
      'idx_financial_transactions_due_date_status',
      'idx_financial_transactions_created_at',
      'idx_financial_transactions_category_condominium',
      'idx_maintenance_requests_condominium_status',
      'idx_maintenance_requests_category_priority',
      'idx_maintenance_requests_user_status',
      'idx_maintenance_requests_created_at',
      'idx_communications_condominium_status',
      'idx_communications_publish_date_status',
      'idx_communications_type_condominium',
      'idx_communications_created_at',
      'idx_bookings_common_area_status',
      'idx_bookings_user_status',
      'idx_bookings_date_time',
      'idx_bookings_created_at',
      'idx_common_areas_condominium_status',
      'idx_common_areas_type_condominium',
      'idx_units_condominium_status',
      'idx_units_number_condominium',
      'idx_user_condominiums_user_status',
      'idx_user_condominiums_condominium_role',
      'idx_user_condominiums_role_status',
      'idx_users_role_status',
      'idx_users_created_at',
      'idx_condominiums_status',
      'idx_condominiums_created_at',
      'idx_financial_reports_composite',
      'idx_maintenance_reports_composite',
      'idx_financial_transactions_description',
      'idx_maintenance_requests_title',
      'idx_communications_title'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('financial_transactions', indexName);
      } catch (error) {
        // Ignorar erros se o índice não existir
      }
    }

    console.log('✅ Índices de performance removidos');
  }
};