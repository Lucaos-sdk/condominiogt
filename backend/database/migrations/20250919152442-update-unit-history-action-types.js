'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Atualizar o ENUM para incluir os novos tipos de ação de manutenção
    await queryInterface.sequelize.query(`
      ALTER TABLE unit_history
      MODIFY COLUMN action_type ENUM(
        'resident_added',
        'resident_removed',
        'resident_updated',
        'status_changed',
        'owner_changed',
        'tenant_changed',
        'fee_changed',
        'general_update',
        'maintenance_request_created',
        'maintenance_request_approved',
        'maintenance_request_completed',
        'maintenance_request_rejected'
      ) NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remover os tipos de ação de manutenção do ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE unit_history
      MODIFY COLUMN action_type ENUM(
        'resident_added',
        'resident_removed',
        'resident_updated',
        'status_changed',
        'owner_changed',
        'tenant_changed',
        'fee_changed',
        'general_update'
      ) NOT NULL
    `);
  }
};