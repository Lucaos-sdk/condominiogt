/**
 * Utilitários para gestão de comodidades
 */

// Definição das comodidades disponíveis
const UNIT_AMENITIES = {
  furnished: {
    label: 'Mobiliado',
    icon: 'furniture',
    category: 'interior',
    description: 'Unidade vem mobiliada'
  },
  pet_allowed: {
    label: 'Pets Permitidos',
    icon: 'pets',
    category: 'policies',
    description: 'Animais domésticos são permitidos'
  },
  balcony: {
    label: 'Varanda',
    icon: 'balcony',
    category: 'structure',
    description: 'Possui varanda ou terraço'
  },
  parking_spots: {
    label: 'Vagas de Garagem',
    icon: 'car',
    category: 'parking',
    description: 'Número de vagas de garagem',
    isNumeric: true
  }
};

const CONDOMINIUM_AMENITIES = {
  security_24h: {
    label: 'Segurança 24h',
    icon: 'security',
    category: 'security',
    description: 'Portaria com segurança 24 horas'
  },
  security_cameras: {
    label: 'Câmeras de Segurança',
    icon: 'camera',
    category: 'security',
    description: 'Sistema de monitoramento por câmeras'
  },
  gym: {
    label: 'Academia',
    icon: 'fitness',
    category: 'recreation',
    description: 'Academia completa'
  },
  pool: {
    label: 'Piscina',
    icon: 'pool',
    category: 'recreation',
    description: 'Piscina para uso dos moradores'
  },
  party_hall: {
    label: 'Salão de Festas',
    icon: 'party',
    category: 'recreation',
    description: 'Salão para eventos e festividades'
  },
  playground: {
    label: 'Playground',
    icon: 'playground',
    category: 'recreation',
    description: 'Área de recreação infantil'
  },
  barbecue_area: {
    label: 'Área de Churrasco',
    icon: 'bbq',
    category: 'recreation',
    description: 'Área equipada para churrascos'
  },
  garden: {
    label: 'Jardim',
    icon: 'garden',
    category: 'leisure',
    description: 'Área verde e jardins'
  },
  elevators: {
    label: 'Elevadores',
    icon: 'elevator',
    category: 'structure',
    description: 'Número de elevadores',
    isNumeric: true
  }
};

/**
 * Formata comodidades da unidade para exibição
 * @param {Object} unit - Dados da unidade
 * @returns {Array}
 */
function formatUnitAmenities(unit) {
  const amenities = [];
  
  Object.keys(UNIT_AMENITIES).forEach(key => {
    const amenityConfig = UNIT_AMENITIES[key];
    const value = unit[key];
    
    if (amenityConfig.isNumeric && value > 0) {
      amenities.push({
        key,
        label: amenityConfig.label,
        icon: amenityConfig.icon,
        category: amenityConfig.category,
        value: value,
        display: `${amenityConfig.label}: ${value}`,
        description: amenityConfig.description
      });
    } else if (!amenityConfig.isNumeric && value === true) {
      amenities.push({
        key,
        label: amenityConfig.label,
        icon: amenityConfig.icon,
        category: amenityConfig.category,
        value: true,
        display: amenityConfig.label,
        description: amenityConfig.description
      });
    }
  });
  
  return amenities;
}

/**
 * Formata comodidades do condomínio para exibição
 * @param {Object} condominium - Dados do condomínio
 * @returns {Array}
 */
function formatCondominiumAmenities(condominium) {
  const amenities = [];
  
  Object.keys(CONDOMINIUM_AMENITIES).forEach(key => {
    const amenityConfig = CONDOMINIUM_AMENITIES[key];
    const value = condominium[key];
    
    if (amenityConfig.isNumeric && value > 0) {
      amenities.push({
        key,
        label: amenityConfig.label,
        icon: amenityConfig.icon,
        category: amenityConfig.category,
        value: value,
        display: `${amenityConfig.label}: ${value}`,
        description: amenityConfig.description
      });
    } else if (!amenityConfig.isNumeric && value === true) {
      amenities.push({
        key,
        label: amenityConfig.label,
        icon: amenityConfig.icon,
        category: amenityConfig.category,
        value: true,
        display: amenityConfig.label,
        description: amenityConfig.description
      });
    }
  });
  
  return amenities;
}

/**
 * Agrupa comodidades por categoria
 * @param {Array} amenities - Lista de comodidades
 * @returns {Object}
 */
function groupAmenitiesByCategory(amenities) {
  const grouped = {};
  
  amenities.forEach(amenity => {
    const category = amenity.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(amenity);
  });
  
  return grouped;
}

/**
 * Calcula score de comodidades (0-100)
 * @param {Object} entity - Unidade ou condomínio
 * @param {string} type - 'unit' ou 'condominium'
 * @returns {number}
 */
function calculateAmenityScore(entity, type = 'condominium') {
  const amenitiesConfig = type === 'unit' ? UNIT_AMENITIES : CONDOMINIUM_AMENITIES;
  const totalAmenities = Object.keys(amenitiesConfig).length;
  let activeAmenities = 0;
  
  Object.keys(amenitiesConfig).forEach(key => {
    const config = amenitiesConfig[key];
    const value = entity[key];
    
    if (config.isNumeric && value > 0) {
      activeAmenities++;
    } else if (!config.isNumeric && value === true) {
      activeAmenities++;
    }
  });
  
  return Math.round((activeAmenities / totalAmenities) * 100);
}

/**
 * Gera texto descritivo das comodidades
 * @param {Array} amenities - Lista de comodidades
 * @returns {string}
 */
function generateAmenityDescription(amenities) {
  if (!amenities || amenities.length === 0) {
    return 'Sem comodidades especificadas';
  }
  
  const grouped = groupAmenitiesByCategory(amenities);
  const descriptions = [];
  
  Object.keys(grouped).forEach(category => {
    const categoryAmenities = grouped[category].map(a => a.label).join(', ');
    descriptions.push(categoryAmenities);
  });
  
  return descriptions.join(' • ');
}

/**
 * Compara comodidades entre duas entidades
 * @param {Object} entity1 - Primeira entidade
 * @param {Object} entity2 - Segunda entidade
 * @param {string} type - 'unit' ou 'condominium'
 * @returns {Object}
 */
function compareAmenities(entity1, entity2, type = 'condominium') {
  const amenities1 = type === 'unit' 
    ? formatUnitAmenities(entity1) 
    : formatCondominiumAmenities(entity1);
    
  const amenities2 = type === 'unit' 
    ? formatUnitAmenities(entity2) 
    : formatCondominiumAmenities(entity2);
  
  const keys1 = amenities1.map(a => a.key);
  const keys2 = amenities2.map(a => a.key);
  
  return {
    common: keys1.filter(key => keys2.includes(key)),
    unique1: keys1.filter(key => !keys2.includes(key)),
    unique2: keys2.filter(key => !keys1.includes(key)),
    score1: calculateAmenityScore(entity1, type),
    score2: calculateAmenityScore(entity2, type)
  };
}

/**
 * Filtra entidades por comodidades
 * @param {Array} entities - Lista de entidades
 * @param {Array} requiredAmenities - Comodidades obrigatórias
 * @param {string} type - 'unit' ou 'condominium'
 * @returns {Array}
 */
function filterByAmenities(entities, requiredAmenities, type = 'condominium') {
  if (!requiredAmenities || requiredAmenities.length === 0) {
    return entities;
  }
  
  return entities.filter(entity => {
    return requiredAmenities.every(amenityKey => {
      const amenitiesConfig = type === 'unit' ? UNIT_AMENITIES : CONDOMINIUM_AMENITIES;
      const config = amenitiesConfig[amenityKey];
      const value = entity[amenityKey];
      
      if (config && config.isNumeric) {
        return value > 0;
      } else {
        return value === true;
      }
    });
  });
}

/**
 * Gera resumo das comodidades para dashboard
 * @param {Array} entities - Lista de entidades
 * @param {string} type - 'unit' ou 'condominium'
 * @returns {Object}
 */
function generateAmenitySummary(entities, type = 'condominium') {
  const amenitiesConfig = type === 'unit' ? UNIT_AMENITIES : CONDOMINIUM_AMENITIES;
  const summary = {};
  const totalEntities = entities.length;
  
  Object.keys(amenitiesConfig).forEach(key => {
    const config = amenitiesConfig[key];
    let count = 0;
    
    entities.forEach(entity => {
      const value = entity[key];
      if (config.isNumeric && value > 0) {
        count++;
      } else if (!config.isNumeric && value === true) {
        count++;
      }
    });
    
    summary[key] = {
      label: config.label,
      count,
      percentage: totalEntities > 0 ? Math.round((count / totalEntities) * 100) : 0,
      category: config.category
    };
  });
  
  return summary;
}

module.exports = {
  UNIT_AMENITIES,
  CONDOMINIUM_AMENITIES,
  formatUnitAmenities,
  formatCondominiumAmenities,
  groupAmenitiesByCategory,
  calculateAmenityScore,
  generateAmenityDescription,
  compareAmenities,
  filterByAmenities,
  generateAmenitySummary
};