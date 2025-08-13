const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const {
  getUsers,
  getUsersByCondominium,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  associateUserToCondominium,
  removeUserFromCondominium
} = require('../controllers/userController');

// Validações
const userValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6, max: 255 })
    .withMessage('Senha deve ter entre 6 e 255 caracteres'),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone inválido'),
  body('cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF deve ter 11 caracteres'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'syndic', 'resident'])
    .withMessage('Role deve ser: admin, manager, syndic ou resident'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'pending'])
    .withMessage('Status deve ser: active, inactive ou pending')
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone inválido'),
  body('cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF deve ter 11 caracteres'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'syndic', 'resident'])
    .withMessage('Role deve ser: admin, manager, syndic ou resident'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'pending'])
    .withMessage('Status deve ser: active, inactive ou pending')
];

const passwordValidation = [
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  body('newPassword')
    .isLength({ min: 6, max: 255 })
    .withMessage('Nova senha deve ter entre 6 e 255 caracteres')
];

const associationValidation = [
  body('condominium_id')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio é obrigatório'),
  body('role')
    .optional()
    .isIn(['syndic', 'resident'])
    .withMessage('Role deve ser: syndic ou resident'),
  body('unit_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da unidade deve ser um número válido')
];

// @route   GET /api/users
// @desc    Listar todos os usuários
// @access  Private (admin, manager)
router.get('/', 
  protect, 
  requireRole('admin', 'manager'), 
  getUsers
);

// @route   GET /api/users/condominium/:condominiumId
// @desc    Obter usuários por condomínio
// @access  Private
router.get('/condominium/:condominiumId', 
  protect, 
  getUsersByCondominium
);

// @route   GET /api/users/:id
// @desc    Obter usuário por ID
// @access  Private
router.get('/:id', 
  protect, 
  getUserById
);

// @route   POST /api/users
// @desc    Criar novo usuário
// @access  Private (admin, manager)
router.post('/', 
  protect, 
  requireRole('admin', 'manager'), 
  userValidation,
  validateRequest,
  createUser
);

// @route   PUT /api/users/:id
// @desc    Atualizar usuário
// @access  Private (próprio usuário, admin, manager)
router.put('/:id', 
  protect, 
  updateUserValidation,
  validateRequest,
  updateUser
);

// @route   PUT /api/users/:id/password
// @desc    Alterar senha do usuário
// @access  Private (próprio usuário, admin, manager)
router.put('/:id/password', 
  protect, 
  passwordValidation,
  validateRequest,
  updateUserPassword
);

// @route   DELETE /api/users/:id
// @desc    Deletar usuário
// @access  Private (admin only)
router.delete('/:id', 
  protect, 
  requireRole('admin'), 
  deleteUser
);

// @route   POST /api/users/:id/condominiums
// @desc    Associar usuário a condomínio
// @access  Private (admin, manager, syndic)
router.post('/:id/condominiums', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  associationValidation,
  validateRequest,
  associateUserToCondominium
);

// @route   DELETE /api/users/:id/condominiums/:condominiumId
// @desc    Remover associação usuário-condomínio
// @access  Private (admin, manager, syndic)
router.delete('/:id/condominiums/:condominiumId', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  removeUserFromCondominium
);

module.exports = router;