const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const { normalizePhone } = require('../utils/validators');
const {
  getUnits,
  getUnitsByCondominium,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  debugDelete
} = require('../controllers/unitController');

const {
  getResidentsByUnit,
  getResidentById,
  createResident,
  updateResident,
  removeResident,
  reactivateResident,
} = require('../controllers/residentController');

const {
  getUnitHistory,
  getHistoryEntry,
  createHistoryEntry,
  getHistoryStats,
} = require('../controllers/unitHistoryController');

// Validações
const unitValidation = [
  body('condominium_id')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio é obrigatório'),
  body('number')
    .trim()
    .notEmpty()
    .withMessage('Número da unidade é obrigatório'),
  body('block')
    .optional()
    .trim(),
  body('floor')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Andar deve ser maior ou igual a 0'),
  body('type')
    .optional()
    .isIn(['apartment', 'house', 'commercial', 'parking'])
    .withMessage('Tipo deve ser: apartment, house, commercial ou parking'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quartos deve ser maior ou igual a 0'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Banheiros deve ser maior ou igual a 0'),
  body('area')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Área deve ser um número decimal válido'),
  body('status')
    .optional()
    .isIn(['occupied', 'vacant', 'rented', 'maintenance'])
    .withMessage('Status deve ser: occupied, vacant, rented ou maintenance'),
  body('owner_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email do proprietário inválido'),
  body('owner_phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone do proprietário inválido'),
  body('owner_cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF do proprietário deve ter 11 caracteres'),
  body('tenant_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email do inquilino inválido'),
  body('tenant_phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone do inquilino inválido'),
  body('tenant_cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF do inquilino deve ter 11 caracteres'),
  body('rent_amount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Valor do aluguel deve ser um número decimal válido'),
  body('condominium_fee')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Taxa condominial deve ser um número decimal válido'),
  // Validações dos novos campos
  body('contract_start_date')
    .optional()
    .isISO8601()
    .withMessage('Data de início do contrato deve ser uma data válida'),
  body('contract_end_date')
    .optional()
    .isISO8601()
    .withMessage('Data de fim do contrato deve ser uma data válida'),
  body('contract_type')
    .optional()
    .isIn(['residential', 'commercial', 'temporary', 'indefinite'])
    .withMessage('Tipo de contrato deve ser: residential, commercial, temporary ou indefinite'),
  body('deposit_amount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Valor do depósito deve ser um número decimal válido'),
  body('guarantor_cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF do fiador deve ter 11 caracteres'),
  body('guarantor_phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone do fiador inválido'),
  body('parking_spots')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Número de vagas deve ser maior ou igual a 0'),
  body('furnished')
    .optional()
    .isBoolean()
    .withMessage('Campo mobiliado deve ser verdadeiro ou falso'),
  body('pet_allowed')
    .optional()
    .isBoolean()
    .withMessage('Campo pets permitidos deve ser verdadeiro ou falso'),
  body('balcony')
    .optional()
    .isBoolean()
    .withMessage('Campo varanda deve ser verdadeiro ou falso'),
  body('auto_renewal')
    .optional()
    .isBoolean()
    .withMessage('Campo renovação automática deve ser verdadeiro ou falso'),
  body('last_renovation_date')
    .optional()
    .isISO8601()
    .withMessage('Data da última renovação deve ser uma data válida')
];

const updateUnitValidation = [
  body('number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Número da unidade não pode estar vazio'),
  body('block')
    .optional()
    .trim(),
  body('floor')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Andar deve ser maior ou igual a 0'),
  body('type')
    .optional()
    .isIn(['apartment', 'house', 'commercial', 'parking'])
    .withMessage('Tipo deve ser: apartment, house, commercial ou parking'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quartos deve ser maior ou igual a 0'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Banheiros deve ser maior ou igual a 0'),
  body('area')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Área deve ser um número decimal válido'),
  body('status')
    .optional()
    .isIn(['occupied', 'vacant', 'rented', 'maintenance'])
    .withMessage('Status deve ser: occupied, vacant, rented ou maintenance'),
  body('owner_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email do proprietário inválido'),
  body('owner_phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone do proprietário inválido'),
  body('owner_cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF do proprietário deve ter 11 caracteres'),
  body('tenant_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email do inquilino inválido'),
  body('tenant_phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone do inquilino inválido'),
  body('tenant_cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF do inquilino deve ter 11 caracteres'),
  body('rent_amount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Valor do aluguel deve ser um número decimal válido'),
  body('condominium_fee')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Taxa condominial deve ser um número decimal válido'),
  // Validações dos novos campos para update
  body('contract_start_date')
    .optional()
    .isISO8601()
    .withMessage('Data de início do contrato deve ser uma data válida'),
  body('contract_end_date')
    .optional()
    .isISO8601()
    .withMessage('Data de fim do contrato deve ser uma data válida'),
  body('contract_type')
    .optional()
    .isIn(['residential', 'commercial', 'temporary', 'indefinite'])
    .withMessage('Tipo de contrato deve ser: residential, commercial, temporary ou indefinite'),
  body('deposit_amount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Valor do depósito deve ser um número decimal válido'),
  body('guarantor_cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF do fiador deve ter 11 caracteres'),
  body('guarantor_phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone do fiador inválido'),
  body('parking_spots')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Número de vagas deve ser maior ou igual a 0'),
  body('furnished')
    .optional()
    .isBoolean()
    .withMessage('Campo mobiliado deve ser verdadeiro ou falso'),
  body('pet_allowed')
    .optional()
    .isBoolean()
    .withMessage('Campo pets permitidos deve ser verdadeiro ou falso'),
  body('balcony')
    .optional()
    .isBoolean()
    .withMessage('Campo varanda deve ser verdadeiro ou falso'),
  body('auto_renewal')
    .optional()
    .isBoolean()
    .withMessage('Campo renovação automática deve ser verdadeiro ou falso'),
  body('last_renovation_date')
    .optional()
    .isISO8601()
    .withMessage('Data da última renovação deve ser uma data válida')
];

// @route   GET /api/units
// @desc    Listar todas as unidades
// @access  Private (admin, manager)
router.get('/', 
  protect, 
  requireRole('admin', 'manager'), 
  getUnits
);

// @route   GET /api/units/condominium/:condominiumId
// @desc    Obter unidades por condomínio
// @access  Private
router.get('/condominium/:condominiumId', 
  protect, 
  getUnitsByCondominium
);

// @route   GET /api/units/:id
// @desc    Obter unidade por ID
// @access  Private
router.get('/:id', 
  protect, 
  getUnitById
);

// @route   POST /api/units
// @desc    Criar nova unidade
// @access  Private (admin, manager, syndic)
router.post('/', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  unitValidation,
  validateRequest,
  createUnit
);

// @route   PUT /api/units/:id
// @desc    Atualizar unidade
// @access  Private (admin, manager, syndic)
router.put('/:id', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  updateUnitValidation,
  validateRequest,
  updateUnit
);

// @route   DELETE /api/units/:id
// @desc    Deletar unidade
// @access  Private (admin, manager)
router.delete('/:id', 
  protect, 
  requireRole('admin', 'manager'), 
  deleteUnit
);

// @route   POST /api/units/debug-delete
// @desc    Debug endpoint para investigar problema de deleção
// @access  Private (admin only)
router.post('/debug-delete', 
  protect, 
  requireRole('admin'), 
  debugDelete
);

// Validações para moradores
const residentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório'),
  body('cpf')
    .trim()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF deve ter 11 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer(value => normalizePhone(value))
    .custom((value) => {
      if (!value) {
        return true;
      }
      if (value.length < 10 || value.length > 11) {
        throw new Error('Telefone inválido');
      }
      return true;
    }),
  body('relationship')
    .optional()
    .isIn(['owner', 'tenant', 'family', 'dependent', 'guest'])
    .withMessage('Relacionamento deve ser: owner, tenant, family, dependent ou guest'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
  body('is_main_resident')
    .optional()
    .isBoolean()
    .withMessage('Campo principal deve ser verdadeiro ou falso'),
];

const updateResidentValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nome não pode estar vazio'),
  body('cpf')
    .optional()
    .trim()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF deve ter 11 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer(value => normalizePhone(value))
    .custom((value) => {
      if (!value) {
        return true;
      }
      if (value.length < 10 || value.length > 11) {
        throw new Error('Telefone inválido');
      }
      return true;
    }),
  body('relationship')
    .optional()
    .isIn(['owner', 'tenant', 'family', 'dependent', 'guest'])
    .withMessage('Relacionamento deve ser: owner, tenant, family, dependent ou guest'),
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
  body('is_main_resident')
    .optional()
    .isBoolean()
    .withMessage('Campo principal deve ser verdadeiro ou falso'),
];

// Rotas para moradores
// @route   GET /api/units/:unitId/residents
// @desc    Obter moradores de uma unidade
// @access  Private
router.get('/:unitId/residents', 
  protect, 
  getResidentsByUnit
);

// @route   POST /api/units/:unitId/residents
// @desc    Adicionar morador à unidade
// @access  Private (admin, manager, syndic)
router.post('/:unitId/residents', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  residentValidation,
  validateRequest,
  createResident
);

// @route   GET /api/units/residents/:id
// @desc    Obter morador por ID
// @access  Private
router.get('/residents/:id', 
  protect, 
  getResidentById
);

// @route   PUT /api/units/residents/:id
// @desc    Atualizar morador
// @access  Private (admin, manager, syndic)
router.put('/residents/:id', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  updateResidentValidation,
  validateRequest,
  updateResident
);

// @route   DELETE /api/units/residents/:id
// @desc    Remover morador (soft delete ou permanente)
// @access  Private (admin, manager)
router.delete('/residents/:id', 
  protect, 
  requireRole('admin', 'manager'), 
  removeResident
);

// @route   POST /api/units/residents/:id/reactivate
// @desc    Reativar morador
// @access  Private (admin, manager, syndic)
router.post('/residents/:id/reactivate', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  reactivateResident
);

// Rotas para histórico
// @route   GET /api/units/:unitId/history
// @desc    Obter histórico de uma unidade
// @access  Private
router.get('/:unitId/history', 
  protect, 
  getUnitHistory
);

// @route   POST /api/units/:unitId/history
// @desc    Criar entrada no histórico
// @access  Private (admin, manager, syndic)
router.post('/:unitId/history', 
  protect, 
  requireRole('admin', 'manager', 'syndic'), 
  createHistoryEntry
);

// @route   GET /api/units/:unitId/history/stats
// @desc    Obter estatísticas do histórico
// @access  Private
router.get('/:unitId/history/stats', 
  protect, 
  getHistoryStats
);

// @route   GET /api/units/history/:id
// @desc    Obter entrada específica do histórico
// @access  Private
router.get('/history/:id', 
  protect, 
  getHistoryEntry
);

module.exports = router;