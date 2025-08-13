const { body, param, query } = require('express-validator');

// Validação para criar área comum
const validateCreateCommonArea = [
  body('condominium_id')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
    
  body('type')
    .isIn(['pool', 'gym', 'party_room', 'playground', 'barbecue', 'garden', 'parking', 'laundry', 'meeting_room', 'other'])
    .withMessage('Tipo inválido'),
    
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacidade deve ser um número entre 1 e 10000'),
    
  body('booking_fee')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      if (parseFloat(value) < 0 || parseFloat(value) > 10000) {
        throw new Error('Taxa de reserva deve estar entre R$ 0,00 e R$ 10.000,00');
      }
      return true;
    }),
    
  body('rules')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Regras devem ter no máximo 2000 caracteres'),
    
  body('operating_hours')
    .optional()
    .isObject()
    .withMessage('Horários de funcionamento devem ser um objeto JSON válido'),
    
  body('requires_booking')
    .optional()
    .isBoolean()
    .withMessage('Requer reserva deve ser verdadeiro ou falso'),
    
  body('advance_booking_days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Dias de antecedência deve ser entre 1 e 90'),
    
  body('max_booking_hours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Máximo de horas por reserva deve ser entre 1 e 24'),
    
  body('status')
    .optional()
    .isIn(['available', 'maintenance', 'unavailable'])
    .withMessage('Status deve ser: available, maintenance ou unavailable'),
    
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Máximo de 10 imagens permitidas')
    .custom((images) => {
      if (images && Array.isArray(images)) {
        for (const image of images) {
          if (typeof image !== 'string' || image.length > 500) {
            throw new Error('Cada imagem deve ser uma URL válida com no máximo 500 caracteres');
          }
        }
      }
      return true;
    }),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Localização deve ter no máximo 200 caracteres')
];

// Validação para atualizar área comum
const validateUpdateCommonArea = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido'),
    
  body('condominium_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
    
  body('type')
    .optional()
    .isIn(['pool', 'gym', 'party_room', 'playground', 'barbecue', 'garden', 'parking', 'laundry', 'meeting_room', 'other'])
    .withMessage('Tipo inválido'),
    
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacidade deve ser um número entre 1 e 10000'),
    
  body('booking_fee')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      if (value !== undefined && (parseFloat(value) < 0 || parseFloat(value) > 10000)) {
        throw new Error('Taxa de reserva deve estar entre R$ 0,00 e R$ 10.000,00');
      }
      return true;
    }),
    
  body('rules')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Regras devem ter no máximo 2000 caracteres'),
    
  body('operating_hours')
    .optional()
    .isObject()
    .withMessage('Horários de funcionamento devem ser um objeto JSON válido'),
    
  body('requires_booking')
    .optional()
    .isBoolean()
    .withMessage('Requer reserva deve ser verdadeiro ou falso'),
    
  body('advance_booking_days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Dias de antecedência deve ser entre 1 e 90'),
    
  body('max_booking_hours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Máximo de horas por reserva deve ser entre 1 e 24'),
    
  body('status')
    .optional()
    .isIn(['available', 'maintenance', 'unavailable'])
    .withMessage('Status deve ser: available, maintenance ou unavailable'),
    
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Máximo de 10 imagens permitidas')
    .custom((images) => {
      if (images && Array.isArray(images)) {
        for (const image of images) {
          if (typeof image !== 'string' || image.length > 500) {
            throw new Error('Cada imagem deve ser uma URL válida com no máximo 500 caracteres');
          }
        }
      }
      return true;
    }),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Localização deve ter no máximo 200 caracteres')
];

// Validação para obter área comum por ID
const validateGetCommonAreaById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido')
];

// Validação para excluir área comum
const validateDeleteCommonArea = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido')
];

// Validação para obter áreas comuns por condomínio
const validateGetCommonAreasByCondominium = [
  param('condominiumId')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('available_only')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('available_only deve ser true ou false'),
    
  query('type')
    .optional()
    .isIn(['pool', 'gym', 'party_room', 'playground', 'barbecue', 'garden', 'parking', 'laundry', 'meeting_room', 'other'])
    .withMessage('Tipo inválido'),
    
  query('requires_booking')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('requires_booking deve ser true ou false')
];

// Validação para listar áreas comuns com filtros
const validateGetCommonAreas = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número maior que 0'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Busca deve ter entre 2 e 100 caracteres'),
    
  query('type')
    .optional()
    .isIn(['pool', 'gym', 'party_room', 'playground', 'barbecue', 'garden', 'parking', 'laundry', 'meeting_room', 'other'])
    .withMessage('Tipo inválido'),
    
  query('status')
    .optional()
    .isIn(['available', 'maintenance', 'unavailable'])
    .withMessage('Status deve ser: available, maintenance ou unavailable'),
    
  query('condominium_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('requires_booking')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('requires_booking deve ser true ou false'),
    
  query('available_only')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('available_only deve ser true ou false')
];

// Validação para estatísticas de áreas comuns
const validateGetCommonAreaStats = [
  param('condominiumId')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('period')
    .optional()
    .isIn(['month', 'year'])
    .withMessage('Período deve ser month ou year'),
    
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Ano deve estar entre 2020 e 2030'),
    
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Mês deve estar entre 1 e 12')
];

// Validação personalizada para horários de funcionamento
const validateOperatingHours = (operatingHours) => {
  if (!operatingHours || typeof operatingHours !== 'object') {
    return true; // Opcional
  }
  
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  for (const [day, hours] of Object.entries(operatingHours)) {
    if (!validDays.includes(day)) {
      throw new Error(`Dia inválido: ${day}. Use: ${validDays.join(', ')}`);
    }
    
    if (hours && typeof hours === 'object') {
      if (hours.open && !timeRegex.test(hours.open)) {
        throw new Error(`Horário de abertura inválido para ${day}: ${hours.open}. Use formato HH:MM`);
      }
      
      if (hours.close && !timeRegex.test(hours.close)) {
        throw new Error(`Horário de fechamento inválido para ${day}: ${hours.close}. Use formato HH:MM`);
      }
      
      if (hours.open && hours.close && hours.open >= hours.close) {
        throw new Error(`Horário de fechamento deve ser posterior ao de abertura para ${day}`);
      }
    }
  }
  
  return true;
};

// Middleware customizado para validar horários de funcionamento
const validateOperatingHoursMiddleware = (req, res, next) => {
  if (req.body.operating_hours) {
    try {
      validateOperatingHours(req.body.operating_hours);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  next();
};

module.exports = {
  validateCreateCommonArea,
  validateUpdateCommonArea,
  validateGetCommonAreaById,
  validateDeleteCommonArea,
  validateGetCommonAreasByCondominium,
  validateGetCommonAreas,
  validateGetCommonAreaStats,
  validateOperatingHoursMiddleware
};