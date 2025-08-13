'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Primeiro vamos verificar se existem condomínios e usuários
    const condos = await queryInterface.sequelize.query(
      'SELECT id FROM condominiums LIMIT 1;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const users = await queryInterface.sequelize.query(
      'SELECT id FROM users LIMIT 1;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (condos.length === 0 || users.length === 0) {
      console.log('⚠️  Pulando seed de maintenance_requests - condomínios ou usuários não encontrados');
      return;
    }

    const condominiumId = condos[0].id;
    const userId = users[0].id;

    await queryInterface.bulkInsert('maintenance_requests', [
      {
        condominium_id: condominiumId,
        user_id: userId,
        title: 'Vazamento na torneira da cozinha',
        description: 'A torneira da cozinha está gotejando constantemente, desperdiçando água e causando transtorno.',
        category: 'plumbing',
        priority: 'high',
        status: 'pending',
        location: 'Cozinha',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        condominium_id: condominiumId,
        user_id: userId,
        title: 'Lâmpada queimada no corredor',
        description: 'A lâmpada do corredor principal queimou e precisa ser substituída.',
        category: 'electrical',
        priority: 'medium',
        status: 'pending',
        location: 'Corredor Principal',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        condominium_id: condominiumId,
        user_id: userId,
        title: 'Ar condicionado não está gelando',
        description: 'O ar condicionado da sala está ligando mas não está resfriando adequadamente.',
        category: 'hvac',
        priority: 'medium',
        status: 'in_progress',
        location: 'Sala de Estar',
        assigned_to: 'João Silva - Técnico em Refrigeração',
        assigned_contact: '(11) 99999-9999',
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // amanhã
        estimated_cost: 250.00,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 dia atrás
      },
      {
        condominium_id: condominiumId,
        user_id: userId,
        title: 'Problema no elevador - porta não fecha',
        description: 'A porta do elevador não está fechando corretamente, causando demora no funcionamento.',
        category: 'elevator',
        priority: 'urgent',
        status: 'pending',
        location: 'Elevador Social',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        condominium_id: condominiumId,
        user_id: userId,
        title: 'Limpeza da caixa d\'água',
        description: 'Solicitação para limpeza e manutenção da caixa d\'água do edifício.',
        category: 'cleaning',
        priority: 'low',
        status: 'completed',
        location: 'Caixa d\'água',
        assigned_to: 'Empresa ABC Limpeza',
        assigned_contact: '(11) 88888-8888',
        estimated_cost: 800.00,
        actual_cost: 850.00,
        completed_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
        admin_notes: 'Serviço realizado com qualidade. Caixa d\'água higienizada e certificado entregue.',
        resident_rating: 5,
        resident_feedback: 'Excelente serviço, muito profissionais.',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ]);

    console.log('✅ Seed de maintenance_requests executado com sucesso!');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('maintenance_requests', null, {});
  }
};