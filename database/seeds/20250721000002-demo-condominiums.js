'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('condominiums', [
      {
        name: 'Residencial Parque das Flores',
        cnpj: '12345678000195',
        address: 'Rua das Flores, 123 - Jardim Primavera',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '04567890',
        phone: '1133334444',
        email: 'administracao@parquedasflores.com.br',
        total_units: 48,
        total_blocks: 3,
        construction_date: new Date('2018-06-15'),
        common_area_size: 2500.50,
        parking_spots: 96,
        elevators: 6,
        status: 'active',
        settings: JSON.stringify({
          allow_pets: true,
          visiting_hours: '08:00-22:00',
          pool_hours: '06:00-22:00',
          gym_hours: '05:00-23:00'
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Edifício Solar do Atlântico',
        cnpj: '98765432000187',
        address: 'Avenida Atlântica, 456 - Copacabana',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '22070001',
        phone: '2122223333',
        email: 'condominio@solaratlantico.com.br',
        total_units: 24,
        total_blocks: 1,
        construction_date: new Date('2015-03-20'),
        common_area_size: 800.00,
        parking_spots: 30,
        elevators: 2,
        status: 'active',
        settings: JSON.stringify({
          allow_pets: false,
          visiting_hours: '09:00-21:00',
          pool_hours: '07:00-20:00'
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Condomínio Vila Verde',
        address: 'Rua Verde, 789 - Vila Madalena',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '05432100',
        phone: '1144445555',
        email: 'administracao@vilaverde.com.br',
        total_units: 16,
        total_blocks: 2,
        construction_date: new Date('2020-12-10'),
        common_area_size: 1200.75,
        parking_spots: 24,
        elevators: 0,
        status: 'active',
        settings: JSON.stringify({
          allow_pets: true,
          visiting_hours: '08:00-22:00',
          playground_hours: '08:00-18:00'
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('condominiums', null, {});
  }
};