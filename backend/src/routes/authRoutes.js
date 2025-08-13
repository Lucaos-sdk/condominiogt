const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authAuditMiddleware } = require('../middleware/auditMiddleware');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Validações simplificadas
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  validateRequest
];

const registerValidation = [
  body('name').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  validateRequest
];

// Rotas públicas
router.post('/login', loginValidation, authAuditMiddleware('LOGIN'), authController.login);
router.post('/register', registerValidation, authAuditMiddleware('REGISTER'), authController.register);
router.post('/refresh', authAuditMiddleware('REFRESH_TOKEN'), authController.refreshToken);

// Rotas protegidas
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authAuditMiddleware('UPDATE_PROFILE'), authController.updateProfile);
router.put('/password', protect, authAuditMiddleware('CHANGE_PASSWORD'), authController.changePassword);
router.post('/logout', protect, authAuditMiddleware('LOGOUT'), authController.logout);

module.exports = router;