const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const {
  getCondominiums,
  getCondominiumById,
  createCondominium,
  updateCondominium,
  deleteCondominium,
  getCondominiumStats
} = require('../controllers/condominiumController');

// Validações
const condominiumValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Nome deve ter entre 2 e 150 caracteres'),
  body('cnpj')
    .optional()
    .isLength({ min: 14, max: 14 })
    .withMessage('CNPJ deve ter 14 caracteres'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Endereço é obrigatório'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('Cidade é obrigatória'),
  body('state')
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres'),
  body('zip_code')
    .isLength({ min: 8, max: 8 })
    .withMessage('CEP deve ter 8 caracteres'),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('total_units')
    .isInt({ min: 1 })
    .withMessage('Total de unidades deve ser maior que 0'),
  body('total_blocks')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total de blocos deve ser maior que 0'),
  body('parking_spots')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Vagas de garagem deve ser maior ou igual a 0'),
  body('elevators')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Elevadores deve ser maior ou igual a 0'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'construction'])
    .withMessage('Status deve ser: active, inactive ou construction')
];

// @route   GET /api/condominiums
// @desc    Listar todos os condomínios
// @access  Private (admin, manager)
router.get('/', 
  protect, 
  requireRole('admin', 'manager'), 
  getCondominiums
);

// @route   GET /api/condominiums/:id
// @desc    Obter condomínio por ID
// @access  Private
router.get('/:id', 
  protect, 
  getCondominiumById
);

// @route   GET /api/condominiums/:id/stats
// @desc    Obter estatísticas do condomínio
// @access  Private
router.get('/:id/stats', 
  protect, 
  getCondominiumStats
);

// @route   POST /api/condominiums
// @desc    Criar novo condomínio
// @access  Private (admin, manager)
router.post('/', 
  protect, 
  requireRole('admin', 'manager'), 
  condominiumValidation,
  validateRequest,
  createCondominium
);

// @route   PUT /api/condominiums/:id
// @desc    Atualizar condomínio
// @access  Private (admin, manager, syndic)
router.put('/:id', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  condominiumValidation,
  validateRequest,
  updateCondominium
);

// @route   DELETE /api/condominiums/:id
// @desc    Deletar condomínio
// @access  Private (admin only)
router.delete('/:id', 
  protect, 
  requireRole('admin'), 
  deleteCondominium
);

module.exports = router;