const express = require('express');
const {
  getCommonAreas,
  getCommonAreaById,
  createCommonArea,
  updateCommonArea,
  deleteCommonArea,
  getCommonAreasByCondominium,
  getCommonAreaStats
} = require('../controllers/commonAreaController');

const { protect, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
  validateCreateCommonArea,
  validateUpdateCommonArea,
  validateGetCommonAreaById,
  validateDeleteCommonArea,
  validateGetCommonAreasByCondominium,
  validateGetCommonAreas,
  validateGetCommonAreaStats,
  validateOperatingHoursMiddleware
} = require('../middleware/commonAreaValidation');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(protect);

// Rotas CRUD de áreas comuns
router.route('/')
  .get(validateGetCommonAreas, handleValidationErrors, getCommonAreas)
  .post(
    requireRole(['admin', 'manager', 'syndic']),
    validateCreateCommonArea,
    validateOperatingHoursMiddleware,
    handleValidationErrors,
    createCommonArea
  );

router.route('/:id')
  .get(validateGetCommonAreaById, handleValidationErrors, getCommonAreaById)
  .put(
    requireRole(['admin', 'manager', 'syndic']),
    validateUpdateCommonArea,
    validateOperatingHoursMiddleware,
    handleValidationErrors,
    updateCommonArea
  )
  .delete(
    requireRole(['admin']),
    validateDeleteCommonArea,
    handleValidationErrors,
    deleteCommonArea
  );

// Rotas de consulta por condomínio
router.get('/condominium/:condominiumId',
  validateGetCommonAreasByCondominium,
  handleValidationErrors,
  getCommonAreasByCondominium
);

// Rotas de estatísticas (admin, manager, syndic)
router.get('/stats/:condominiumId',
  requireRole(['admin', 'manager', 'syndic']),
  validateGetCommonAreaStats,
  handleValidationErrors,
  getCommonAreaStats
);

module.exports = router;