const jwt = require('jsonwebtoken');
const { User, UserCondominium } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: UserCondominium,
        as: 'condominiums',
        include: ['condominium', 'unit']
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: UserCondominium,
        as: 'condominiums',
        include: ['condominium', 'unit']
      }]
    });

    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Admin sempre tem acesso total
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissão insuficiente.'
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  protect: authMiddleware,
  optionalAuth,
  requireRole
};