'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Administrador Sistema',
        email: 'admin@condominiogt.com',
        password: hashedPassword,
        phone: '11999999999',
        cpf: '12345678901',
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'João Silva - Síndico',
        email: 'sindico@condominiogt.com',
        password: hashedPassword,
        phone: '11988888888',
        cpf: '98765432101',
        role: 'syndic',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Maria Santos - Gestora',
        email: 'gestora@condominiogt.com',
        password: hashedPassword,
        phone: '11977777777',
        cpf: '11122233301',
        role: 'manager',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Carlos Oliveira',
        email: 'carlos@email.com',
        password: hashedPassword,
        phone: '11966666666',
        cpf: '44455566601',
        role: 'resident',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Ana Paula Costa',
        email: 'ana@email.com',
        password: hashedPassword,
        phone: '11955555555',
        cpf: '77788899901',
        role: 'resident',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Pedro Ferreira',
        email: 'pedro@email.com',
        password: hashedPassword,
        phone: '11944444444',
        cpf: '33344455501',
        role: 'resident',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};