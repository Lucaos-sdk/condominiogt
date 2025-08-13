const express = require('express');
const {
  getMaintenanceRequests,
  getMaintenanceRequestById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  approveMaintenanceRequest,
  rejectMaintenanceRequest,
  rateMaintenanceRequest,
  getMaintenanceStats,
  getMaintenanceByCondominium
} = require('../controllers/maintenanceController');

const { protect, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
  validateCreateMaintenanceRequest,
  validateUpdateMaintenanceRequest,
  validateApproveMaintenanceRequest,  
  validateRejectMaintenanceRequest,
  validateRateMaintenanceRequest,
  validateMaintenanceStats,
  validateMaintenanceByCondominium,
  validateGetMaintenanceRequests
} = require('../middleware/maintenanceValidation');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(protect);

// Rotas CRUD de solicitações de manutenção
router.route('/requests')
  .get(validateGetMaintenanceRequests, handleValidationErrors, getMaintenanceRequests)
  .post(validateCreateMaintenanceRequest, handleValidationErrors, createMaintenanceRequest);

router.route('/requests/:id')
  .get(getMaintenanceRequestById)
  .put(validateUpdateMaintenanceRequest, handleValidationErrors, updateMaintenanceRequest)
  .delete(deleteMaintenanceRequest);

// Rotas de ações específicas (admin, manager, syndic)
router.post('/requests/:id/approve', 
  requireRole(['admin', 'manager', 'syndic']),
  validateApproveMaintenanceRequest,
  handleValidationErrors,
  approveMaintenanceRequest
);

router.post('/requests/:id/reject',
  requireRole(['admin', 'manager', 'syndic']), 
  validateRejectMaintenanceRequest,
  handleValidationErrors,
  rejectMaintenanceRequest
);

// Rota de avaliação (apenas criador da solicitação)
router.post('/requests/:id/rate',
  validateRateMaintenanceRequest,
  handleValidationErrors,
  rateMaintenanceRequest
);

// Rotas de consulta e relatórios
router.get('/stats/:condominiumId',
  requireRole(['admin', 'manager', 'syndic']),
  validateMaintenanceStats,
  handleValidationErrors,
  getMaintenanceStats
);

router.get('/condominium/:condominiumId',
  validateMaintenanceByCondominium,
  handleValidationErrors,
  getMaintenanceByCondominium
);

module.exports = router;