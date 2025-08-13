const { body, param, query } = require('express-validator');

// Validação para criar reserva
const validateCreateBooking = [
  body('common_area_id')
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido'),
    
  body('unit_id')
    .isInt({ min: 1 })
    .withMessage('ID da unidade deve ser um número válido'),
    
  body('booking_date')
    .isISO8601()
    .withMessage('Data da reserva deve estar no formato YYYY-MM-DD')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Data da reserva não pode ser no passado');
      }
      
      // Verificar se não é mais de 1 ano no futuro
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (bookingDate > oneYearFromNow) {
        throw new Error('Data da reserva não pode ser mais de 1 ano no futuro');
      }
      
      return true;
    }),
    
  body('start_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Horário de início deve estar no formato HH:MM'),
    
  body('end_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Horário de término deve estar no formato HH:MM')
    .custom((value, { req }) => {
      if (req.body.start_time && value <= req.body.start_time) {
        throw new Error('Horário de término deve ser posterior ao horário de início');
      }
      return true;
    }),
    
  body('guests_count')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Número de convidados deve ser entre 0 e 1000'),
    
  body('event_type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tipo de evento deve ter no máximo 100 caracteres'),
    
  body('special_requests')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Solicitações especiais devem ter no máximo 1000 caracteres')
];

// Validação para atualizar reserva
const validateUpdateBooking = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido'),
    
  body('common_area_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido'),
    
  body('unit_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da unidade deve ser um número válido'),
    
  body('booking_date')
    .optional()
    .isISO8601()
    .withMessage('Data da reserva deve estar no formato YYYY-MM-DD')
    .custom((value) => {
      if (value) {
        const bookingDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (bookingDate < today) {
          throw new Error('Data da reserva não pode ser no passado');
        }
      }
      return true;
    }),
    
  body('start_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Horário de início deve estar no formato HH:MM'),
    
  body('end_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Horário de término deve estar no formato HH:MM')
    .custom((value, { req }) => {
      if (value && req.body.start_time && value <= req.body.start_time) {
        throw new Error('Horário de término deve ser posterior ao horário de início');
      }
      return true;
    }),
    
  body('guests_count')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Número de convidados deve ser entre 0 e 1000'),
    
  body('event_type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tipo de evento deve ter no máximo 100 caracteres'),
    
  body('special_requests')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Solicitações especiais devem ter no máximo 1000 caracteres'),
    
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled', 'completed'])
    .withMessage('Status deve ser: pending, approved, rejected, cancelled ou completed'),
    
  body('payment_status')
    .optional()
    .isIn(['pending', 'paid', 'refunded'])
    .withMessage('Status de pagamento deve ser: pending, paid ou refunded'),
    
  body('paid_date')
    .optional()
    .isISO8601()
    .withMessage('Data de pagamento deve estar no formato ISO 8601'),
    
  body('cancellation_reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Motivo do cancelamento deve ter no máximo 500 caracteres'),
    
  body('admin_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notas administrativas devem ter no máximo 1000 caracteres')
];

// Validação para obter reserva por ID
const validateGetBookingById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido')
];

// Validação para excluir reserva
const validateDeleteBooking = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido')
];

// Validação para aprovar reserva
const validateApproveBooking = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido'),
    
  body('admin_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notas administrativas devem ter no máximo 1000 caracteres')
];

// Validação para rejeitar reserva
const validateRejectBooking = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido'),
    
  body('cancellation_reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Motivo da rejeição deve ter entre 10 e 500 caracteres'),
    
  body('admin_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notas administrativas devem ter no máximo 1000 caracteres')
];

// Validação para cancelar reserva
const validateCancelBooking = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido'),
    
  body('cancellation_reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Motivo do cancelamento deve ter entre 5 e 500 caracteres')
];

// Validação para marcar como pago
const validateMarkBookingAsPaid = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da reserva deve ser um número válido')
];

// Validação para listar reservas
const validateGetBookings = [
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
    
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled', 'completed'])
    .withMessage('Status deve ser: pending, approved, rejected, cancelled ou completed'),
    
  query('payment_status')
    .optional()
    .isIn(['pending', 'paid', 'refunded'])
    .withMessage('Status de pagamento deve ser: pending, paid ou refunded'),
    
  query('common_area_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido'),
    
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do usuário deve ser um número válido'),
    
  query('condominium_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Data inicial deve estar no formato YYYY-MM-DD'),
    
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Data final deve estar no formato YYYY-MM-DD')
    .custom((value, { req }) => {
      if (value && req.query.date_from && new Date(value) < new Date(req.query.date_from)) {
        throw new Error('Data final deve ser posterior à data inicial');
      }
      return true;
    })
];

// Validação para obter reservas por área comum
const validateGetBookingsByCommonArea = [
  param('commonAreaId')
    .isInt({ min: 1 })
    .withMessage('ID da área comum deve ser um número válido'),
    
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Data inicial deve estar no formato YYYY-MM-DD'),
    
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Data final deve estar no formato YYYY-MM-DD'),
    
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled', 'completed', 'all'])
    .withMessage('Status deve ser: pending, approved, rejected, cancelled, completed ou all')
];

// Validação para estatísticas de reservas
const validateGetBookingStats = [
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

// Validação personalizada para verificar duração da reserva
const validateBookingDuration = (req, res, next) => {
  const { start_time, end_time } = req.body;
  
  if (start_time && end_time) {
    const startDateTime = new Date(`1970-01-01T${start_time}`);
    const endDateTime = new Date(`1970-01-01T${end_time}`);
    const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);
    
    // Mínimo 30 minutos
    if (durationMinutes < 30) {
      return res.status(400).json({
        success: false,
        message: 'Duração mínima da reserva é 30 minutos'
      });
    }
    
    // Máximo 24 horas
    if (durationMinutes > 24 * 60) {
      return res.status(400).json({
        success: false,
        message: 'Duração máxima da reserva é 24 horas'
      });
    }
  }
  
  next();
};

// Validação personalizada para verificar dia da semana
const validateBookingDay = (req, res, next) => {
  const { booking_date } = req.body;
  
  if (booking_date) {
    const date = new Date(booking_date);
    const dayOfWeek = date.getDay();
    
    // Se for domingo (0), verificar se é permitido
    // Esta validação pode ser expandida conforme regras específicas
    if (dayOfWeek === 0) {
      // Por enquanto permitir domingos, mas isso pode ser configurável
    }
  }
  
  next();
};

// Validação personalizada para horário comercial
const validateBusinessHours = (req, res, next) => {
  const { start_time, end_time } = req.body;
  
  if (start_time && end_time) {
    const startHour = parseInt(start_time.split(':')[0]);
    const endHour = parseInt(end_time.split(':')[0]);
    
    // Verificar se está dentro de horário razoável (6h às 23h)
    if (startHour < 6 || endHour > 23) {
      return res.status(400).json({
        success: false,
        message: 'Reservas devem ser entre 06:00 e 23:00'
      });
    }
  }
  
  next();
};

module.exports = {
  validateCreateBooking,
  validateUpdateBooking,
  validateGetBookingById,
  validateDeleteBooking,
  validateApproveBooking,
  validateRejectBooking,
  validateCancelBooking,
  validateMarkBookingAsPaid,
  validateGetBookings,
  validateGetBookingsByCommonArea,
  validateGetBookingStats,
  validateBookingDuration,
  validateBookingDay,
  validateBusinessHours
};