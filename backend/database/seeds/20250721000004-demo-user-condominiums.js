'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('user_condominiums', [
      // Admin has access to all condominiums
      {
        user_id: 1, // Admin
        condominium_id: 1,
        unit_id: null,
        role: 'manager',
        status: 'active',
        start_date: new Date('2024-01-01'),
        access_permissions: JSON.stringify({
          can_manage_users: true,
          can_manage_finances: true,
          can_manage_maintenance: true,
          can_view_reports: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 1, // Admin
        condominium_id: 2,
        unit_id: null,
        role: 'manager',
        status: 'active',
        start_date: new Date('2024-01-01'),
        access_permissions: JSON.stringify({
          can_manage_users: true,
          can_manage_finances: true,
          can_manage_maintenance: true,
          can_view_reports: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 1, // Admin
        condominium_id: 3,
        unit_id: null,
        role: 'manager',
        status: 'active',
        start_date: new Date('2024-01-01'),
        access_permissions: JSON.stringify({
          can_manage_users: true,
          can_manage_finances: true,
          can_manage_maintenance: true,
          can_view_reports: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },

      // Síndico - Parque das Flores
      {
        user_id: 2, // João Silva - Síndico
        condominium_id: 1,
        unit_id: 5, // Bloco 1, Unit 05
        role: 'syndic',
        status: 'active',
        start_date: new Date('2024-01-15'),
        access_permissions: JSON.stringify({
          can_manage_users: false,
          can_manage_finances: true,
          can_manage_maintenance: true,
          can_view_reports: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },

      // Gestora - Solar do Atlântico
      {
        user_id: 3, // Maria Santos - Gestora
        condominium_id: 2,
        unit_id: null,
        role: 'manager',
        status: 'active',
        start_date: new Date('2024-02-01'),
        access_permissions: JSON.stringify({
          can_manage_users: true,
          can_manage_finances: true,
          can_manage_maintenance: true,
          can_view_reports: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },

      // Moradores - Parque das Flores
      {
        user_id: 4, // Carlos Oliveira
        condominium_id: 1,
        unit_id: 1, // Bloco 1, Unit 01
        role: 'owner',
        status: 'active',
        start_date: new Date('2024-01-10'),
        access_permissions: JSON.stringify({
          can_view_own_finances: true,
          can_create_maintenance_requests: true,
          can_book_common_areas: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 5, // Ana Paula Costa
        condominium_id: 1,
        unit_id: 18, // Bloco 2, Unit 02
        role: 'tenant',
        status: 'active',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2025-02-28'),
        access_permissions: JSON.stringify({
          can_view_own_finances: true,
          can_create_maintenance_requests: true,
          can_book_common_areas: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },

      // Morador - Solar do Atlântico
      {
        user_id: 6, // Pedro Ferreira
        condominium_id: 2,
        unit_id: 25, // Unit 101
        role: 'owner',
        status: 'pending',
        start_date: new Date('2024-06-01'),
        access_permissions: JSON.stringify({
          can_view_own_finances: true,
          can_create_maintenance_requests: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_condominiums', null, {});
  }
};