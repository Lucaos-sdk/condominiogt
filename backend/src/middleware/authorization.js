const { UserCondominium } = require('../models');

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Admin sempre tem acesso total
    if (req.user.role === 'admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissão insuficiente'
      });
    }

    next();
  };
};

const requireCondominiumRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const condominiumId = req.params.condominiumId || req.body.condominiumId;
      
      if (!condominiumId) {
        return res.status(400).json({
          success: false,
          message: 'ID do condomínio requerido'
        });
      }

      const userCondominium = await UserCondominium.findOne({
        where: {
          user_id: req.user.id,
          condominium_id: condominiumId,
          status: 'active'
        }
      });

      if (!userCondominium) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao condomínio'
        });
      }

      if (!roles.includes(userCondominium.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permissão insuficiente para esta ação'
        });
      }

      req.userCondominium = userCondominium;
      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

const requireUnitAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const unitId = req.params.unitId || req.body.unitId;
    
    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: 'ID da unidade requerido'
      });
    }

    // Admin e manager têm acesso a todas as unidades
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    // Verificar se o usuário tem acesso à unidade
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        unit_id: unitId,
        status: 'active'
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado à unidade'
      });
    }

    req.userCondominium = userCondominium;
    next();
  } catch (error) {
    console.error('Unit access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Admin sempre tem todas as permissões
    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.userCondominium || !req.userCondominium.access_permissions) {
      return res.status(403).json({
        success: false,
        message: 'Permissões não configuradas'
      });
    }

    const permissions = req.userCondominium.access_permissions;
    
    if (!permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permissão '${permission}' negada`
      });
    }

    next();
  };
};

const isOwner = (resourceIdField = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Admin e manager têm acesso total
    if (['admin', 'manager'].includes(req.user.role)) {
      return next();
    }

    const resourceUserId = req.params[resourceIdField] || req.body[resourceIdField];
    
    if (parseInt(resourceUserId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso permitido apenas aos próprios recursos'
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireCondominiumRole,
  requireUnitAccess,
  requirePermission,
  isOwner
};