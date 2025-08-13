'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('common_areas', [
      // Parque das Flores - Common Areas
      {
        condominium_id: 1,
        name: 'Piscina Principal',
        description: 'Piscina aquecida com área de recreação',
        type: 'pool',
        capacity: 50,
        booking_fee: 0,
        rules: 'Uso permitido das 8h às 22h. Crianças menores de 12 anos devem estar acompanhadas.',
        operating_hours: JSON.stringify({
          monday: '08:00-22:00',
          tuesday: '08:00-22:00',
          wednesday: '08:00-22:00',
          thursday: '08:00-22:00',
          friday: '08:00-22:00',
          saturday: '08:00-22:00',
          sunday: '08:00-22:00'
        }),
        requires_booking: false,
        advance_booking_days: 0,
        max_booking_hours: 0,
        status: 'available',
        location: 'Área de lazer - Térreo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        condominium_id: 1,
        name: 'Salão de Festas',
        description: 'Salão completo para eventos com capacidade para 80 pessoas',
        type: 'party_room',
        capacity: 80,
        booking_fee: 150.00,
        rules: 'Reserva com 7 dias de antecedência. Taxa de limpeza inclusa. Som até 23h.',
        operating_hours: JSON.stringify({
          friday: '18:00-02:00',
          saturday: '10:00-02:00',
          sunday: '10:00-23:00'
        }),
        requires_booking: true,
        advance_booking_days: 7,
        max_booking_hours: 8,
        status: 'available',
        location: 'Bloco de lazer - 1º andar',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        condominium_id: 1,
        name: 'Academia',
        description: 'Academia equipada com aparelhos de musculação e cardio',
        type: 'gym',
        capacity: 15,
        booking_fee: 0,
        rules: 'Uso individual. Trazer toalha obrigatório. Limpeza dos aparelhos após uso.',
        operating_hours: JSON.stringify({
          monday: '05:00-23:00',
          tuesday: '05:00-23:00',
          wednesday: '05:00-23:00',
          thursday: '05:00-23:00',
          friday: '05:00-23:00',
          saturday: '06:00-22:00',
          sunday: '06:00-22:00'
        }),
        requires_booking: false,
        advance_booking_days: 0,
        max_booking_hours: 2,
        status: 'available',
        location: 'Subsolo - Bloco A',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        condominium_id: 1,
        name: 'Playground',
        description: 'Área infantil com brinquedos e segurança',
        type: 'playground',
        capacity: 20,
        booking_fee: 0,
        rules: 'Crianças até 12 anos. Responsável deve acompanhar. Uso até 18h.',
        operating_hours: JSON.stringify({
          monday: '08:00-18:00',
          tuesday: '08:00-18:00',
          wednesday: '08:00-18:00',
          thursday: '08:00-18:00',
          friday: '08:00-18:00',
          saturday: '08:00-18:00',
          sunday: '08:00-18:00'
        }),
        requires_booking: false,
        advance_booking_days: 0,
        max_booking_hours: 0,
        status: 'available',
        location: 'Jardim central',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Solar do Atlântico - Common Areas
      {
        condominium_id: 2,
        name: 'Churrasqueira',
        description: 'Área gourmet com churrasqueira e pia',
        type: 'barbecue',
        capacity: 12,
        booking_fee: 80.00,
        rules: 'Reserva com 3 dias de antecedência. Limpeza obrigatória após uso.',
        operating_hours: JSON.stringify({
          friday: '17:00-23:00',
          saturday: '11:00-23:00',
          sunday: '11:00-22:00'
        }),
        requires_booking: true,
        advance_booking_days: 3,
        max_booking_hours: 6,
        status: 'available',
        location: 'Terraço - 15º andar',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        condominium_id: 2,
        name: 'Sala de Reuniões',
        description: 'Sala para reuniões e estudos',
        type: 'meeting_room',
        capacity: 8,
        booking_fee: 0,
        rules: 'Uso residencial apenas. Manter silêncio. Máximo 4 horas.',
        operating_hours: JSON.stringify({
          monday: '08:00-22:00',
          tuesday: '08:00-22:00',
          wednesday: '08:00-22:00',
          thursday: '08:00-22:00',
          friday: '08:00-22:00',
          saturday: '08:00-18:00',
          sunday: '14:00-18:00'
        }),
        requires_booking: true,
        advance_booking_days: 2,
        max_booking_hours: 4,
        status: 'available',
        location: 'Térreo - próximo à portaria',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Vila Verde - Common Areas  
      {
        condominium_id: 3,
        name: 'Quadra Poliesportiva',
        description: 'Quadra para futebol, basquete e vôlei',
        type: 'other',
        capacity: 20,
        booking_fee: 0,
        rules: 'Uso até 22h. Cada família pode usar 2x por semana.',
        operating_hours: JSON.stringify({
          monday: '06:00-22:00',
          tuesday: '06:00-22:00',
          wednesday: '06:00-22:00',
          thursday: '06:00-22:00',
          friday: '06:00-22:00',
          saturday: '06:00-22:00',
          sunday: '08:00-20:00'
        }),
        requires_booking: true,
        advance_booking_days: 1,
        max_booking_hours: 2,
        status: 'available',
        location: 'Área central do condomínio',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        condominium_id: 3,
        name: 'Jardim Comunitário',
        description: 'Espaço verde para relaxamento e meditação',
        type: 'garden',
        capacity: 30,
        booking_fee: 0,
        rules: 'Silêncio obrigatório. Não é permitido pisar na grama.',
        operating_hours: JSON.stringify({
          monday: '06:00-20:00',
          tuesday: '06:00-20:00',
          wednesday: '06:00-20:00',
          thursday: '06:00-20:00',
          friday: '06:00-20:00',
          saturday: '06:00-20:00',
          sunday: '06:00-20:00'
        }),
        requires_booking: false,
        advance_booking_days: 0,
        max_booking_hours: 0,
        status: 'available',
        location: 'Entrada principal',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('common_areas', null, {});
  }
};