const { body, param, query } = require('express-validator');

// Validação para criar solicitação de manutenção
const validateCreateMaintenanceRequest = [
  body('condominium_id')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  body('unit_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da unidade deve ser um número válido'),
    
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres'),
    
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),
    
  body('category')
    .isIn(['plumbing', 'electrical', 'hvac', 'elevator', 'security', 'cleaning', 'landscaping', 'structural', 'appliances', 'other'])
    .withMessage('Categoria inválida'),
    
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser: low, medium, high ou urgent'),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Localização deve ter no máximo 200 caracteres'),
    
  body('estimated_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custo estimado deve ser um valor positivo')
    .custom((value) => {
      if (value && parseFloat(value) > 1000000) {
        throw new Error('Custo estimado não pode exceder R$ 1.000.000,00');
      }
      return true;
    }),
    
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Data agendada deve ser uma data válida')
    .custom((value) => {
      if (!value) return true; // Se não há valor, tudo bem pois é opcional
      
      const scheduledDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (scheduledDate < today) {
        throw new Error('Data agendada não pode ser anterior a hoje');
      }
      
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 2);
      
      if (scheduledDate > maxDate) {
        throw new Error('Data agendada não pode ser superior a 2 anos');
      }
      return true;
    }),
    
  body('images')
    .optional()
    .isArray()
    .withMessage('Imagens devem ser um array')
    .custom((value) => {
      if (value && value.length > 10) {
        throw new Error('Máximo de 10 imagens permitidas');
      }
      // Verificar tamanho máximo de cada imagem (base64)
      if (value) {
        const maxImageSize = 500 * 1024; // 500KB por imagem em base64
        for (let i = 0; i < value.length; i++) {
          if (value[i] && value[i].length > maxImageSize) {
            throw new Error(`Imagem ${i + 1} é muito grande. Reduza a qualidade/tamanho.`);
          }
        }
      }
      return true;
    })
];

// Validação para atualizar solicitação de manutenção
const validateUpdateMaintenanceRequest = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da solicitação deve ser um número válido'),
    
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),
    
  body('category')
    .optional()
    .isIn(['plumbing', 'electrical', 'hvac', 'elevator', 'security', 'cleaning', 'landscaping', 'structural', 'appliances', 'other'])
    .withMessage('Categoria inválida'),
    
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser: low, medium, high ou urgent'),
    
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled', 'rejected'])
    .withMessage('Status inválido'),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Localização deve ter no máximo 200 caracteres'),
    
  body('estimated_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custo estimado deve ser um valor positivo')
    .custom((value) => {
      if (value && parseFloat(value) > 1000000) {
        throw new Error('Custo estimado não pode exceder R$ 1.000.000,00');
      }
      return true;
    }),
    
  body('actual_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custo real deve ser um valor positivo')
    .custom((value) => {
      if (parseFloat(value) > 1000000) {
        throw new Error('Custo real não pode exceder R$ 1.000.000,00');
      }
      return true;
    }),
    
  body('assigned_to')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Responsável deve ter no máximo 200 caracteres'),
    
  body('assigned_contact')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Contato do responsável deve ter no máximo 200 caracteres'),
    
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Data agendada deve ser uma data válida')
    .custom((value) => {
      if (!value) return true; // Se não há valor, tudo bem pois é opcional
      
      const scheduledDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (scheduledDate < today) {
        throw new Error('Data agendada não pode ser anterior a hoje');
      }
      
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 2);
      
      if (scheduledDate > maxDate) {
        throw new Error('Data agendada não pode ser superior a 2 anos');
      }
      return true;
    }),
    
  body('admin_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações do administrador devem ter no máximo 1000 caracteres'),
    
  body('images')
    .optional()
    .isArray()
    .withMessage('Imagens devem ser um array')
    .custom((value) => {
      if (value && value.length > 10) {
        throw new Error('Máximo de 10 imagens permitidas');
      }
      // Verificar tamanho máximo de cada imagem (base64)
      if (value) {
        const maxImageSize = 500 * 1024; // 500KB por imagem em base64
        for (let i = 0; i < value.length; i++) {
          if (value[i] && value[i].length > maxImageSize) {
            throw new Error(`Imagem ${i + 1} é muito grande. Reduza a qualidade/tamanho.`);
          }
        }
      }
      return true;
    })
];

// Validação para aprovação de solicitação
const validateApproveMaintenanceRequest = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da solicitação deve ser um número válido'),
    
  body('estimated_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Custo estimado deve ser um valor positivo')
    .custom((value) => {
      if (value && parseFloat(value) > 1000000) {
        throw new Error('Custo estimado não pode exceder R$ 1.000.000,00');
      }
      return true;
    }),
    
  body('assigned_to')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Responsável deve ter entre 2 e 200 caracteres'),
    
  body('assigned_contact')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Contato do responsável deve ter no máximo 200 caracteres'),
    
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Data agendada deve ser uma data válida')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (scheduledDate < today) {
        throw new Error('Data agendada não pode ser anterior a hoje');
      }
      return true;
    }),
    
  body('completed_date')
    .optional()
    .isISO8601()
    .withMessage('Data de conclusão deve ser uma data válida'),
    
  body('admin_notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
];

// Validação para rejeição de solicitação
const validateRejectMaintenanceRequest = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da solicitação deve ser um número válido'),
    
  body('admin_notes')
    .trim()
    .notEmpty()
    .withMessage('Motivo da rejeição é obrigatório')
    .isLength({ min: 10, max: 500 })
    .withMessage('Motivo da rejeição deve ter entre 10 e 500 caracteres')
];

// Validação para avaliação de solicitação
const validateRateMaintenanceRequest = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID da solicitação deve ser um número válido'),
    
  body('resident_rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Avaliação deve ser um número entre 1 e 5'),
    
  body('resident_feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comentário deve ter no máximo 1000 caracteres')
];

// Validação para estatísticas
const validateMaintenanceStats = [
  param('condominiumId')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('period')
    .optional()
    .isIn(['month', 'quarter', 'year'])
    .withMessage('Período deve ser month, quarter ou year'),
    
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2050 })
    .withMessage('Ano deve estar entre 2020 e 2050'),
    
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Mês deve estar entre 1 e 12')
];

// Validação para consulta por condomínio
const validateMaintenanceByCondominium = [
  param('condominiumId')
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve estar entre 1 e 100'),
    
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled', 'rejected'])
    .withMessage('Status inválido'),
    
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade inválida'),
    
  query('category')
    .optional()
    .isIn(['plumbing', 'electrical', 'hvac', 'elevator', 'security', 'cleaning', 'landscaping', 'structural', 'appliances', 'other'])
    .withMessage('Categoria inválida')
];

// Validação para consulta geral
const validateGetMaintenanceRequests = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve estar entre 1 e 100'),
    
  query('condominium_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do condomínio deve ser um número válido'),
    
  query('unit_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da unidade deve ser um número válido'),
    
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID do usuário deve ser um número válido'),
    
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled', 'rejected'])
    .withMessage('Status inválido'),
    
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade inválida'),
    
  query('category')
    .optional()
    .isIn(['plumbing', 'electrical', 'hvac', 'elevator', 'security', 'cleaning', 'landscaping', 'structural', 'appliances', 'other'])
    .withMessage('Categoria inválida'),
    
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Data inicial deve ser uma data válida'),
    
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Data final deve ser uma data válida')
    .custom((value, { req }) => {
      if (value && req.query.date_from) {
        const dateFrom = new Date(req.query.date_from);
        const dateTo = new Date(value);
        
        if (dateTo < dateFrom) {
          throw new Error('Data final deve ser posterior à data inicial');
        }
      }
      return true;
    })
];

module.exports = {
  validateCreateMaintenanceRequest,
  validateUpdateMaintenanceRequest,
  validateApproveMaintenanceRequest,
  validateRejectMaintenanceRequest,
  validateRateMaintenanceRequest,
  validateMaintenanceStats,
  validateMaintenanceByCondominium,
  validateGetMaintenanceRequests
};