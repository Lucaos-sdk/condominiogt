const { body, param } = require('express-validator');

// Validação para criar transação financeira
const validateCreateTransaction = [
  body('condominium_id')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  body('unit_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('ID da unidade deve ser um número válido'),
    
  body('user_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('ID do usuário deve ser um número válido'),
    
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Tipo deve ser income ou expense'),
    
  body('category')
    .isIn([
      'condominium_fee',
      'water',
      'electricity',
      'gas',
      'maintenance',
      'security',
      'cleaning',
      'insurance',
      'reserve_fund',
      'utilities',
      'other'
    ])
    .withMessage('Categoria inválida'),

  body('title')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Título deve ter no máximo 255 caracteres'),
    
  body('description')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Descrição deve ter entre 3 e 255 caracteres'),
    
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que R$ 0,01')
    .custom((value, { req }) => {
      // Validar que amount não excede limites razoáveis
      if (parseFloat(value) > 1000000) {
        throw new Error('Valor não pode exceder R$ 1.000.000,00');
      }
      return true;
    }),
    
  body('due_date')
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida')
    .custom((value) => {
      const dueDate = new Date(value);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 5);
      
      if (dueDate < new Date(today.getFullYear() - 1, 0, 1)) {
        throw new Error('Data de vencimento não pode ser anterior a 1 ano');
      }
      if (dueDate > maxDate) {
        throw new Error('Data de vencimento não pode ser superior a 5 anos');
      }
      return true;
    }),
    
  body('payment_method')
    .optional()
    .isIn(['cash', 'bank_transfer', 'pix', 'pix_a', 'pix_b', 'pix_c', 'credit_card', 'debit_card', 'bank_slip', 'mixed'])
    .withMessage('Método de pagamento inválido'),

  body('reference_month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Mês de referência deve estar entre 1 e 12'),
    
  body('reference_year')
    .optional()
    .isInt({ min: 2020, max: 2050 })
    .withMessage('Ano de referência deve estar entre 2020 e 2050'),
    
  body('late_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Taxa de atraso deve ser um valor positivo')
    .custom((value) => {
      if (parseFloat(value) > 100000) {
        throw new Error('Taxa de atraso não pode exceder R$ 100.000,00');
      }
      return true;
    }),
    
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Desconto deve ser um valor positivo')
    .custom((value, { req }) => {
      const amount = parseFloat(req.body.amount || 0);
      const discount = parseFloat(value);

      if (discount > amount) {
        throw new Error('Desconto não pode ser maior que o valor principal');
      }
      return true;
    }),

  body('title')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Título deve ter no máximo 255 caracteres'),

  // Validações PIX (opcionais em ambiente de testes)
  body('pix_key')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Chave PIX deve ter no máximo 255 caracteres'),

  body('pix_recipient_name')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Nome do destinatário PIX deve ter no máximo 255 caracteres'),
    
  // Validações pagamento misto
  body('pix_amount')
    .if(body('mixed_payment').equals(true))
    .isFloat({ min: 0.01 })
    .withMessage('Valor PIX deve ser maior que R$ 0,01 em pagamentos mistos'),
    
  body('cash_amount')
    .if(body('mixed_payment').equals(true))
    .isFloat({ min: 0.01 })
    .withMessage('Valor em dinheiro deve ser maior que R$ 0,01 em pagamentos mistos'),
    
  // Validação personalizada para pagamentos mistos
  body('mixed_payment')
    .optional()
    .isBoolean()
    .withMessage('Campo mixed_payment deve ser true ou false')
    .custom((value, { req }) => {
      if (value === true) {
        const amount = parseFloat(req.body.amount || 0);
        const late_fee = parseFloat(req.body.late_fee || 0);
        const discount = parseFloat(req.body.discount || 0);
        const pix_amount = parseFloat(req.body.pix_amount || 0);
        const cash_amount = parseFloat(req.body.cash_amount || 0);
        
        const totalExpected = amount + late_fee - discount;
        const totalMixed = pix_amount + cash_amount;
        
        if (Math.abs(totalExpected - totalMixed) > 0.01) {
          throw new Error('A soma dos valores PIX e dinheiro deve ser igual ao valor total da transação');
        }
      }
      return true;
    }),
    
  body('private_expense')
    .optional()
    .isBoolean()
    .withMessage('Campo private_expense deve ser true ou false'),
    
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observações devem ter no máximo 1000 caracteres')
];

// Validação para atualizar transação financeira
const validateUpdateTransaction = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da transação deve ser um número válido'),
    
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser maior que R$ 0,01')
    .custom((value) => {
      if (parseFloat(value) > 1000000) {
        throw new Error('Valor não pode exceder R$ 1.000.000,00');
      }
      return true;
    }),
    
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida')
    .custom((value) => {
      const dueDate = new Date(value);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 5);
      
      if (dueDate < new Date(today.getFullYear() - 1, 0, 1)) {
        throw new Error('Data de vencimento não pode ser anterior a 1 ano');
      }
      if (dueDate > maxDate) {
        throw new Error('Data de vencimento não pode ser superior a 5 anos');
      }
      return true;
    }),
    
  body('late_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Taxa de atraso deve ser um valor positivo')
    .custom((value) => {
      if (parseFloat(value) > 100000) {
        throw new Error('Taxa de atraso não pode exceder R$ 100.000,00');
      }
      return true;
    }),
    
  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Desconto deve ser um valor positivo'),

  body('title')
    .optional({ checkFalsy: true })
    .isLength({ max: 255 })
    .withMessage('Título deve ter no máximo 255 caracteres'),

  body('status')
    .optional()
    .isIn(['pending', 'paid', 'overdue', 'cancelled'])
    .withMessage('Status inválido'),
    
  body('payment_method')
    .optional()
    .isIn(['cash', 'bank_transfer', 'pix', 'pix_a', 'pix_b', 'pix_c', 'credit_card', 'debit_card', 'bank_slip', 'mixed'])
    .withMessage('Método de pagamento inválido'),
    
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observações devem ter no máximo 1000 caracteres')
];

// Validação para confirmação de pagamento em dinheiro
const validateConfirmCash = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da transação deve ser um número válido'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
];

// Validação para aprovação de transação
const validateApproveTransaction = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da transação deve ser um número válido'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
];

// Validação para consulta de saldo
const validateCondominiumBalance = [
  param('condominiumId')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido')
];

// Validação para relatório financeiro
const validateFinancialReport = [
  param('condominiumId')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  body('period')
    .optional()
    .isIn(['month', 'quarter', 'year'])
    .withMessage('Período deve ser month, quarter ou year'),
    
  body('year')
    .optional()
    .isInt({ min: 2020, max: 2050 })
    .withMessage('Ano deve estar entre 2020 e 2050'),
    
  body('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Mês deve estar entre 1 e 12')
];

module.exports = {
  validateCreateTransaction,
  validateUpdateTransaction,
  validateConfirmCash,
  validateApproveTransaction,
  validateCondominiumBalance,
  validateFinancialReport
};