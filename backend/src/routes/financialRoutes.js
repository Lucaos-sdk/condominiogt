const express = require('express');
const router = express.Router();

// Importar controllers
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  confirmCashPayment,
  approveTransaction,
  cancelTransaction,
  softDeleteTransaction,
  getCondominiumBalance,
  getFinancialReport
} = require('../controllers/financialController');

const { fixInconsistentTransactions } = require('../utils/fixInconsistentTransactions');

// Importar middlewares
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const { financialAuditMiddleware } = require('../middleware/auditMiddleware');
const {
  validateCreateTransaction,
  validateUpdateTransaction,
  validateConfirmCash,
  validateApproveTransaction,
  validateCondominiumBalance,
  validateFinancialReport
} = require('../middleware/financialValidation');
const { handleValidationErrors } = require('../middleware/validation');

// Aplicar middleware de autenticação a todas as rotas
router.use(protect);

// @desc    Listar transações financeiras
// @route   GET /api/financial/transactions
// @access  Private
router.get('/transactions', getTransactions);

// @desc    Obter transação financeira por ID
// @route   GET /api/financial/transactions/:id
// @access  Private
router.get('/transactions/:id', getTransactionById);

// @desc    Criar nova transação financeira
// @route   POST /api/financial/transactions
// @access  Private (admin, manager, syndic)
router.post(
  '/transactions',
  requireRole(['admin', 'manager', 'syndic']),
  validateCreateTransaction,
  handleValidationErrors,
  financialAuditMiddleware('CREATE'),
  createTransaction
);

// @desc    Atualizar transação financeira
// @route   PUT /api/financial/transactions/:id
// @access  Private (admin, manager, creator)
router.put(
  '/transactions/:id',
  (req, res, next) => {
    console.log('=== ROTA UPDATE EXECUTADA ===');
    console.log('ID:', req.params.id);
    console.log('Body keys:', Object.keys(req.body));
    next();
  },
  validateUpdateTransaction,
  handleValidationErrors,
  financialAuditMiddleware('UPDATE'),
  updateTransaction
);

// @desc    Deletar transação financeira
// @route   DELETE /api/financial/transactions/:id
// @access  Private (admin, creator)
router.delete('/transactions/:id', financialAuditMiddleware('DELETE'), deleteTransaction);

// @desc    Confirmar pagamento em dinheiro
// @route   POST /api/financial/transactions/:id/confirm-cash
// @access  Private (admin, manager, syndic)
router.post(
  '/transactions/:id/confirm-cash',
  requireRole(['admin', 'manager', 'syndic']),
  validateConfirmCash,
  handleValidationErrors,
  financialAuditMiddleware('CONFIRM_PAYMENT'),
  confirmCashPayment
);

// @desc    Aprovar transação financeira
// @route   POST /api/financial/transactions/:id/approve
// @access  Private (admin, manager)
router.post(
  '/transactions/:id/approve',
  requireRole(['admin', 'manager']),
  validateApproveTransaction,
  handleValidationErrors,
  financialAuditMiddleware('APPROVE'),
  approveTransaction
);

// @desc    Cancelar transação financeira
// @route   POST /api/financial/transactions/:id/cancel
// @access  Private (admin, manager)
router.post(
  '/transactions/:id/cancel',
  requireRole(['admin', 'manager']),
  validateApproveTransaction,
  handleValidationErrors,
  financialAuditMiddleware('CANCEL'),
  cancelTransaction
);

// @desc    Excluir transação financeira (soft delete)
// @route   POST /api/financial/transactions/:id/soft-delete  
// @access  Private (admin, manager)
router.post(
  '/transactions/:id/soft-delete',
  requireRole(['admin', 'manager']),
  validateApproveTransaction,
  handleValidationErrors,
  financialAuditMiddleware('DELETE'),
  softDeleteTransaction
);

// @desc    Obter saldo do condomínio
// @route   GET /api/financial/balance/:condominiumId
// @access  Private
router.get(
  '/balance/:condominiumId',
  validateCondominiumBalance,
  handleValidationErrors,
  getCondominiumBalance
);

// @desc    Obter relatório financeiro
// @route   GET /api/financial/report/:condominiumId
// @access  Private (admin, manager, syndic)
router.get(
  '/report/:condominiumId',
  requireRole(['admin', 'manager', 'syndic']),
  validateFinancialReport,
  handleValidationErrors,
  getFinancialReport
);

// @desc    Corrigir transações inconsistentes
// @route   POST /api/financial/fix-inconsistent
// @access  Private (admin only)
router.post('/fix-inconsistent', requireRole(['admin']), async (req, res) => {
  try {
    const result = await fixInconsistentTransactions();
    res.json({
      success: true,
      message: 'Correção executada com sucesso',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao corrigir transações inconsistentes',
      error: error.message
    });
  }
});

module.exports = router;