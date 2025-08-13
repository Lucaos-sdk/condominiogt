'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Units for Residencial Parque das Flores (48 units, 3 blocks)
    const parqueFloresUnits = [];
    for (let block = 1; block <= 3; block++) {
      for (let unit = 1; unit <= 16; unit++) {
        const unitNumber = `${unit.toString().padStart(2, '0')}`;
        const floor = Math.ceil(unit / 2);
        
        parqueFloresUnits.push({
          condominium_id: 1,
          number: unitNumber,
          block: `Bloco ${block}`,
          floor: floor,
          type: 'apartment',
          bedrooms: unit <= 8 ? 2 : 3,
          bathrooms: unit <= 8 ? 1 : 2,
          area: unit <= 8 ? 65.50 : 85.75,
          status: unit <= 12 ? 'occupied' : (unit <= 14 ? 'rented' : 'vacant'),
          condominium_fee: unit <= 8 ? 350.00 : 450.00,
          owner_name: unit <= 10 ? `Proprietário ${block}-${unit}` : null,
          owner_email: unit <= 10 ? `prop${block}${unit}@email.com` : null,
          owner_phone: unit <= 10 ? `119${block}${unit.toString().padStart(7, '0')}` : null,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Units for Edifício Solar do Atlântico (24 units, 1 block)
    const solarUnits = [];
    for (let unit = 101; unit <= 124; unit++) {
      const floor = Math.floor(unit / 100) + Math.floor((unit % 100 - 1) / 4);
      
      solarUnits.push({
        condominium_id: 2,
        number: unit.toString(),
        block: null,
        floor: floor,
        type: 'apartment',
        bedrooms: 3,
        bathrooms: 2,
        area: 120.00,
        status: unit <= 118 ? 'occupied' : 'vacant',
        condominium_fee: 850.00,
        owner_name: unit <= 115 ? `Proprietário ${unit}` : null,
        owner_email: unit <= 115 ? `prop${unit}@email.com` : null,
        owner_phone: unit <= 115 ? `21${unit}000000`.substring(0, 11) : null,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Units for Condomínio Vila Verde (16 units, 2 blocks)
    const vilaVerdeUnits = [];
    for (let block = 1; block <= 2; block++) {
      for (let unit = 1; unit <= 8; unit++) {
        const unitNumber = `${unit.toString().padStart(2, '0')}`;
        
        vilaVerdeUnits.push({
          condominium_id: 3,
          number: unitNumber,
          block: `Casa ${block}`,
          floor: unit <= 4 ? 1 : 2,
          type: 'house',
          bedrooms: 4,
          bathrooms: 3,
          area: 150.00,
          status: unit <= 6 ? 'occupied' : 'vacant',
          condominium_fee: 280.00,
          owner_name: unit <= 5 ? `Proprietário ${block}-${unit}` : null,
          owner_email: unit <= 5 ? `prop${block}${unit}@vilaverde.com` : null,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Insert all units
    await queryInterface.bulkInsert('units', [
      ...parqueFloresUnits,
      ...solarUnits,
      ...vilaVerdeUnits
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('units', null, {});
  }
};