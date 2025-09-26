const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const {
  normalizeCNPJ,
  normalizeCEP,
  normalizePhone,
} = require('../utils/validators');
const {
  getCondominiums,
  getCondominiumById,
  createCondominium,
  updateCondominium,
  deleteCondominium,
  getCondominiumStats
} = require('../controllers/condominiumController');

// Validações
const createCondominiumValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Nome deve ter entre 2 e 150 caracteres'),
  body('cnpj')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizeCNPJ(value))
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
    .customSanitizer((value) => normalizeCEP(value))
    .isLength({ min: 8, max: 8 })
    .withMessage('CEP deve ter 8 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizePhone(value))
    .isLength({ min: 10, max: 11 })
    .withMessage('Telefone inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('total_units')
    .isInt({ min: 0 })
    .withMessage('Total de unidades deve ser maior ou igual a 0'),
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
    .withMessage('Status deve ser: active, inactive ou construction'),
  // Validações dos novos campos
  body('administrator_cnpj')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizeCNPJ(value))
    .isLength({ min: 14, max: 14 })
    .withMessage('CNPJ da administradora deve ter 14 caracteres'),
  body('administrator_contact')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizePhone(value))
    .isLength({ min: 10, max: 11 })
    .withMessage('Telefone da administradora inválido'),
  body('administrator_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email da administradora inválido'),
  body('syndic_user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do síndico deve ser um número inteiro positivo'),
  body('reserve_fund')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Fundo de reserva deve ser um número decimal válido'),
  body('monthly_admin_fee')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Taxa administrativa mensal deve ser um número decimal válido'),
  body('insurance_expiry')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento do seguro deve ser uma data válida'),
  body('fire_certificate_expiry')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento do certificado de bombeiros deve ser uma data válida'),
  body('environmental_license_expiry')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento da licença ambiental deve ser uma data válida'),
  // Validações das comodidades (booleanos)
  body('security_24h')
    .optional()
    .isBoolean()
    .withMessage('Campo segurança 24h deve ser verdadeiro ou falso'),
  body('security_cameras')
    .optional()
    .isBoolean()
    .withMessage('Campo câmeras de segurança deve ser verdadeiro ou falso'),
  body('gym')
    .optional()
    .isBoolean()
    .withMessage('Campo academia deve ser verdadeiro ou falso'),
  body('pool')
    .optional()
    .isBoolean()
    .withMessage('Campo piscina deve ser verdadeiro ou falso'),
  body('party_hall')
    .optional()
    .isBoolean()
    .withMessage('Campo salão de festas deve ser verdadeiro ou falso'),
  body('playground')
    .optional()
    .isBoolean()
    .withMessage('Campo playground deve ser verdadeiro ou falso'),
  body('barbecue_area')
    .optional()
    .isBoolean()
    .withMessage('Campo área de churrasco deve ser verdadeiro ou falso'),
  body('garden')
    .optional()
    .isBoolean()
    .withMessage('Campo jardim deve ser verdadeiro ou falso')
];

const updateCondominiumValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Nome deve ter entre 2 e 150 caracteres'),
  body('cnpj')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizeCNPJ(value))
    .isLength({ min: 14, max: 14 })
    .withMessage('CNPJ deve ter 14 caracteres'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Endereço é obrigatório'),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Cidade é obrigatória'),
  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres'),
  body('zip_code')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizeCEP(value))
    .isLength({ min: 8, max: 8 })
    .withMessage('CEP deve ter 8 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizePhone(value))
    .isLength({ min: 10, max: 11 })
    .withMessage('Telefone inválido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('total_units')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total de unidades deve ser maior ou igual a 0'),
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
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'construction'])
    .withMessage('Status deve ser: active, inactive ou construction'),
  body('administrator_cnpj')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizeCNPJ(value))
    .isLength({ min: 14, max: 14 })
    .withMessage('CNPJ da administradora deve ter 14 caracteres'),
  body('administrator_contact')
    .optional({ checkFalsy: true })
    .customSanitizer((value) => normalizePhone(value))
    .isLength({ min: 10, max: 11 })
    .withMessage('Telefone da administradora inválido'),
  body('administrator_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Email da administradora inválido'),
  body('syndic_user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do síndico deve ser um número inteiro positivo'),
  body('reserve_fund')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Fundo de reserva deve ser um número decimal válido'),
  body('monthly_admin_fee')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Taxa administrativa mensal deve ser um número decimal válido'),
  body('insurance_expiry')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de vencimento do seguro deve ser uma data válida'),
  body('fire_certificate_expiry')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de vencimento do certificado de bombeiros deve ser uma data válida'),
  body('environmental_license_expiry')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Data de vencimento da licença ambiental deve ser uma data válida'),
  body('security_24h')
    .optional()
    .isBoolean()
    .withMessage('Campo segurança 24h deve ser verdadeiro ou falso'),
  body('security_cameras')
    .optional()
    .isBoolean()
    .withMessage('Campo câmeras de segurança deve ser verdadeiro ou falso'),
  body('gym')
    .optional()
    .isBoolean()
    .withMessage('Campo academia deve ser verdadeiro ou falso'),
  body('pool')
    .optional()
    .isBoolean()
    .withMessage('Campo piscina deve ser verdadeiro ou falso'),
  body('party_hall')
    .optional()
    .isBoolean()
    .withMessage('Campo salão de festas deve ser verdadeiro ou falso'),
  body('playground')
    .optional()
    .isBoolean()
    .withMessage('Campo playground deve ser verdadeiro ou falso'),
  body('barbecue_area')
    .optional()
    .isBoolean()
    .withMessage('Campo área de churrasco deve ser verdadeiro ou falso'),
  body('garden')
    .optional()
    .isBoolean()
    .withMessage('Campo jardim deve ser verdadeiro ou falso')
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
  createCondominiumValidation,
  validateRequest,
  createCondominium
);

// @route   PUT /api/condominiums/:id
// @desc    Atualizar condomínio
// @access  Private (admin, manager, syndic)
router.put('/:id',
  protect,
  requireRole('admin', 'manager', 'syndic'),
  updateCondominiumValidation,
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