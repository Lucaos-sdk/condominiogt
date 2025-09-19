const express = require('express');
const router = express.Router();

const {
  getUnitPayments,
  getUnitPaymentSummary,
  createUnitPayment,
  markPaymentAsPaid,
  generateMonthlyPayments
} = require('../controllers/unitPaymentController');

const { protect, requireRole } = require('../middleware/auth');
const { validateUnitPayment, validatePaymentConfirmation, validateMonthlyGeneration } = require('../utils/validators');

// Rotas para pagamentos de unidades específicas
router.get('/units/:unitId/payments', protect, getUnitPayments);
router.get('/units/:unitId/payments/summary', protect, getUnitPaymentSummary);
router.post('/units/:unitId/payments', protect, requireRole(['admin', 'manager', 'syndic']), validateUnitPayment, createUnitPayment);

// Rotas para gerenciar pagamentos individuais
router.post('/unit-payments/:id/pay', protect, requireRole(['admin', 'manager', 'syndic']), validatePaymentConfirmation, markPaymentAsPaid);

// Rotas para geração em lote
router.post('/condominiums/:condominiumId/generate-payments', protect, requireRole(['admin', 'manager', 'syndic']), validateMonthlyGeneration, generateMonthlyPayments);

module.exports = router;