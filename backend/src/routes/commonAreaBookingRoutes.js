const express = require('express');
const {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  approveBooking,
  rejectBooking,
  cancelBooking,
  markBookingAsPaid,
  getBookingsByCommonArea,
  getBookingStats
} = require('../controllers/commonAreaBookingController');

const { protect, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
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
} = require('../middleware/commonAreaBookingValidation');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(protect);

// Rotas CRUD de reservas
router.route('/')
  .get(validateGetBookings, handleValidationErrors, getBookings)
  .post(
    validateCreateBooking,
    validateBookingDuration,
    validateBookingDay,
    validateBusinessHours,
    handleValidationErrors,
    createBooking
  );

router.route('/:id')
  .get(validateGetBookingById, handleValidationErrors, getBookingById)
  .put(
    validateUpdateBooking,
    validateBookingDuration,
    validateBookingDay,
    validateBusinessHours,
    handleValidationErrors,
    updateBooking
  )
  .delete(validateDeleteBooking, handleValidationErrors, deleteBooking);

// Rotas de ações específicas para administração
router.post('/:id/approve',
  requireRole(['admin', 'manager', 'syndic']),
  validateApproveBooking,
  handleValidationErrors,
  approveBooking
);

router.post('/:id/reject',
  requireRole(['admin', 'manager', 'syndic']),
  validateRejectBooking,
  handleValidationErrors,
  rejectBooking
);

router.post('/:id/cancel',
  validateCancelBooking,
  handleValidationErrors,
  cancelBooking
);

router.post('/:id/pay',
  requireRole(['admin', 'manager', 'syndic']),
  validateMarkBookingAsPaid,
  handleValidationErrors,
  markBookingAsPaid
);

// Rotas de consulta específicas
router.get('/common-area/:commonAreaId',
  validateGetBookingsByCommonArea,
  handleValidationErrors,
  getBookingsByCommonArea
);

// Rotas de estatísticas (admin, manager, syndic)
router.get('/stats/:condominiumId',
  requireRole(['admin', 'manager', 'syndic']),
  validateGetBookingStats,
  handleValidationErrors,
  getBookingStats
);

module.exports = router;