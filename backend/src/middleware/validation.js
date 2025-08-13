const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('=== VALIDATION ERRORS ===');
    console.log('Route:', req.method, req.path);
    console.log('Errors:', JSON.stringify(errors.array(), null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  console.log('=== VALIDATION PASSED ===');
  console.log('Route:', req.method, req.path);
  next();
};

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  handleValidationErrors
];

const registerValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone deve ser válido'),
  body('cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF deve ter 11 dígitos')
    .isNumeric()
    .withMessage('CPF deve conter apenas números'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'syndic', 'resident'])
    .withMessage('Role deve ser: admin, manager, syndic ou resident'),
  handleValidationErrors
];

const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('pt-BR')
    .withMessage('Telefone deve ser válido'),
  body('cpf')
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage('CPF deve ter 11 dígitos')
    .isNumeric()
    .withMessage('CPF deve conter apenas números'),
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  handleValidationErrors
];

const condominiumValidation = [
  body('name')
    .isLength({ min: 2, max: 150 })
    .withMessage('Nome deve ter entre 2 e 150 caracteres')
    .trim(),
  body('cnpj')
    .optional()
    .isLength({ min: 14, max: 14 })
    .withMessage('CNPJ deve ter 14 dígitos')
    .isNumeric()
    .withMessage('CNPJ deve conter apenas números'),
  body('address')
    .notEmpty()
    .withMessage('Endereço é obrigatório')
    .trim(),
  body('city')
    .notEmpty()
    .withMessage('Cidade é obrigatória')
    .trim(),
  body('state')
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .isAlpha()
    .withMessage('Estado deve conter apenas letras')
    .toUpperCase(),
  body('zip_code')
    .isLength({ min: 8, max: 8 })
    .withMessage('CEP deve ter 8 dígitos')
    .isNumeric()
    .withMessage('CEP deve conter apenas números'),
  body('total_units')
    .isInt({ min: 1 })
    .withMessage('Total de unidades deve ser maior que 0'),
  body('total_blocks')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total de blocos deve ser maior que 0'),
  handleValidationErrors
];

const unitValidation = [
  body('number')
    .notEmpty()
    .withMessage('Número da unidade é obrigatório')
    .trim(),
  body('type')
    .isIn(['apartment', 'house', 'commercial', 'parking'])
    .withMessage('Tipo deve ser: apartment, house, commercial ou parking'),
  body('status')
    .optional()
    .isIn(['occupied', 'vacant', 'rented', 'maintenance'])
    .withMessage('Status deve ser: occupied, vacant, rented ou maintenance'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Número de quartos deve ser maior ou igual a 0'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Número de banheiros deve ser maior ou igual a 0'),
  body('area')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Área deve ser maior que 0'),
  body('condominium_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Taxa de condomínio deve ser maior ou igual a 0'),
  handleValidationErrors
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo'),
  handleValidationErrors
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
  handleValidationErrors
];

const validateCommunication = [
  body('condominium_id')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número inteiro positivo'),
  body('type')
    .isIn(['announcement', 'notice', 'warning', 'event', 'assembly', 'maintenance'])
    .withMessage('Tipo deve ser: announcement, notice, warning, event, assembly ou maintenance'),
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres')
    .trim(),
  body('content')
    .notEmpty()
    .withMessage('Conteúdo é obrigatório')
    .trim(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser: low, medium, high ou urgent'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Status deve ser: draft, published, scheduled ou archived'),
  body('target_audience')
    .optional()
    .isIn(['all', 'owners', 'tenants', 'managers', 'specific_units'])
    .withMessage('Público-alvo deve ser: all, owners, tenants, managers ou specific_units'),
  body('target_units')
    .optional()
    .isArray()
    .withMessage('Unidades alvo deve ser um array'),
  body('publish_date')
    .optional()
    .isISO8601()
    .withMessage('Data de publicação deve ser uma data válida'),
  body('expire_date')
    .optional()
    .isISO8601()
    .withMessage('Data de expiração deve ser uma data válida'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Anexos deve ser um array'),
  body('send_email')
    .optional()
    .isBoolean()
    .withMessage('Enviar email deve ser verdadeiro ou falso'),
  body('send_whatsapp')
    .optional()
    .isBoolean()
    .withMessage('Enviar WhatsApp deve ser verdadeiro ou falso'),
  handleValidationErrors
];

const validateCommunicationUpdate = [
  body('type')
    .optional()
    .isIn(['announcement', 'notice', 'warning', 'event', 'assembly', 'maintenance'])
    .withMessage('Tipo deve ser: announcement, notice, warning, event, assembly ou maintenance'),
  body('title')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres')
    .trim(),
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Conteúdo não pode estar vazio se fornecido')
    .trim(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser: low, medium, high ou urgent'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Status deve ser: draft, published, scheduled ou archived'),
  body('target_audience')
    .optional()
    .isIn(['all', 'owners', 'tenants', 'managers', 'specific_units'])
    .withMessage('Público-alvo deve ser: all, owners, tenants, managers ou specific_units'),
  body('target_units')
    .optional()
    .isArray()
    .withMessage('Unidades alvo deve ser um array'),
  body('publish_date')
    .optional()
    .isISO8601()
    .withMessage('Data de publicação deve ser uma data válida'),
  body('expire_date')
    .optional()
    .isISO8601()
    .withMessage('Data de expiração deve ser uma data válida'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Anexos deve ser um array'),
  body('send_email')
    .optional()
    .isBoolean()
    .withMessage('Enviar email deve ser verdadeiro ou falso'),
  body('send_whatsapp')
    .optional()
    .isBoolean()
    .withMessage('Enviar WhatsApp deve ser verdadeiro ou falso'),
  handleValidationErrors
];

module.exports = {
  validateRequest: handleValidationErrors,
  handleValidationErrors,
  loginValidation,
  registerValidation,
  updateProfileValidation,
  changePasswordValidation,
  condominiumValidation,
  unitValidation,
  validateCommunication,
  validateCommunicationUpdate,
  idParamValidation,
  paginationValidation
};