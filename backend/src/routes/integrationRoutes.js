const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const {
  getUnifiedDashboard,
  processOverdueTransactions,
  syncPaymentStatus,
  checkUpcomingDues,
  createMaintenanceExpenseManual,
  getIntegrationReport,
  reprocessMaintenanceIntegration,
  runOverdueJobManually,
  runUpcomingDuesJobManually,
  getJobsStatus,
  runEmergencyOverdueProcessing
} = require('../controllers/integrationController');

// Validações
const overdueValidation = [
  body('condominiumId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
];

const upcomingDuesValidation = [
  body('condominiumId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
  body('daysAhead')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Dias à frente deve ser entre 1 e 30'),
];

const createExpenseValidation = [
  body('amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Valor deve ser um número decimal válido'),
];

const reprocessValidation = [
  body('action')
    .optional()
    .isIn(['sync', 'recreate', 'unlink'])
    .withMessage('Ação deve ser: sync, recreate ou unlink'),
];

// @route   GET /api/integration/dashboard/:condominiumId
// @desc    Dashboard unificado com métricas integradas
// @access  Private
router.get('/dashboard/:condominiumId', 
  protect, 
  getUnifiedDashboard
);

// @route   POST /api/integration/process-overdue
// @desc    Processar transações em atraso e aplicar multas
// @access  Private (admin, manager)
router.post('/process-overdue', 
  protect, 
  requireRole('admin', 'manager'),
  overdueValidation,
  validateRequest,
  processOverdueTransactions
);

// @route   POST /api/integration/sync-payment-status/:transactionId
// @desc    Sincronizar status de pagamento entre transação e manutenção
// @access  Private (admin, manager, syndic)
router.post('/sync-payment-status/:transactionId', 
  protect, 
  requireRole('admin', 'manager', 'syndic'),
  syncPaymentStatus
);

// @route   POST /api/integration/check-upcoming-dues
// @desc    Verificar e notificar vencimentos próximos
// @access  Private (admin, manager)
router.post('/check-upcoming-dues', 
  protect, 
  requireRole('admin', 'manager'),
  upcomingDuesValidation,
  validateRequest,
  checkUpcomingDues
);

// @route   POST /api/integration/create-maintenance-expense/:maintenanceId
// @desc    Criar despesa manual para manutenção existente
// @access  Private (admin, manager, syndic)
router.post('/create-maintenance-expense/:maintenanceId', 
  protect, 
  requireRole('admin', 'manager', 'syndic'),
  createExpenseValidation,
  validateRequest,
  createMaintenanceExpenseManual
);

// @route   GET /api/integration/report/:condominiumId
// @desc    Obter relatório de integração financeira/manutenção
// @access  Private
router.get('/report/:condominiumId', 
  protect, 
  getIntegrationReport
);

// @route   POST /api/integration/reprocess/:maintenanceId
// @desc    Reprocessar integração para manutenção específica
// @access  Private (admin, manager)
router.post('/reprocess/:maintenanceId', 
  protect, 
  requireRole('admin', 'manager'),
  reprocessValidation,
  validateRequest,
  reprocessMaintenanceIntegration
);

// Rotas para gerenciar jobs automáticos

// @route   POST /api/integration/run-overdue-job
// @desc    Executar job manual de processamento de atrasos
// @access  Private (admin only)
router.post('/run-overdue-job', 
  protect, 
  requireRole('admin'),
  runOverdueJobManually
);

// @route   POST /api/integration/run-upcoming-dues-job
// @desc    Executar job manual de vencimentos próximos
// @access  Private (admin only)
router.post('/run-upcoming-dues-job', 
  protect, 
  requireRole('admin'),
  runUpcomingDuesJobManually
);

// @route   GET /api/integration/jobs-status
// @desc    Obter status dos jobs automáticos
// @access  Private (admin only)
router.get('/jobs-status', 
  protect, 
  requireRole('admin'),
  getJobsStatus
);

// @route   POST /api/integration/emergency-overdue-processing
// @desc    Processamento de emergência para muitas transações em atraso
// @access  Private (admin only)
router.post('/emergency-overdue-processing', 
  protect, 
  requireRole('admin'),
  runEmergencyOverdueProcessing
);

module.exports = router;