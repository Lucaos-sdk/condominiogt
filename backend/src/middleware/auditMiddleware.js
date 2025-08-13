const { auditLogger, securityLogger } = require('./errorHandler');

/**
 * Middleware para auditoria de operações críticas
 * Registra todas as operações importantes do sistema
 */
const auditMiddleware = (action, resource) => {
  return (req, res, next) => {
    // Capturar dados da requisição original
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override res.send to capture response
    res.send = function(data) {
      res.locals.responseData = data;
      originalSend.call(this, data);
    };
    
    // Override res.json to capture response
    res.json = function(data) {
      res.locals.responseData = data;
      originalJson.call(this, data);
    };

    // Continue with the request
    next();

    // Log after response is sent
    res.on('finish', () => {
      const auditData = {
        timestamp: new Date().toISOString(),
        action,
        resource,
        user: {
          id: req.user?.id || null,
          email: req.user?.email || null,
          role: req.user?.role || null
        },
        request: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          body: sanitizeRequestBody(req.body, resource),
          params: req.params,
          query: req.query
        },
        response: {
          statusCode: res.statusCode,
          success: res.locals.responseData?.success || false
        },
        metadata: {
          condominium_id: extractCondominiumId(req),
          entity_id: extractEntityId(req, res),
          session_id: req.sessionID,
          correlation_id: req.headers['x-correlation-id'] || generateCorrelationId()
        }
      };

      // Log audit trail
      auditLogger.info('AUDIT_TRAIL', auditData);

      // Log sensitive operations with higher severity
      if (isSensitiveOperation(action, resource)) {
        securityLogger.warn('SENSITIVE_OPERATION', auditData);
      }
    });
  };
};

/**
 * Middleware específico para auditoria financeira
 */
const financialAuditMiddleware = (action) => {
  return (req, res, next) => {
    console.log('=== FINANCIAL AUDIT MIDDLEWARE ===');
    console.log('Action:', action);
    console.log('Route:', req.method, req.path);
    
    const middleware = auditMiddleware(action, 'financial_transaction');
    return middleware(req, res, next);
  };
};

/**
 * Middleware para auditoria de autenticação
 */
const authAuditMiddleware = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
      res.locals.responseData = data;
      originalSend.call(this, data);
    };
    
    res.json = function(data) {
      res.locals.responseData = data;
      originalJson.call(this, data);
    };

    next();

    res.on('finish', () => {
      const authData = {
        timestamp: new Date().toISOString(),
        action,
        resource: 'authentication',
        request: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          email: req.body?.email || null
        },
        response: {
          statusCode: res.statusCode,
          success: res.locals.responseData?.success || false
        },
        metadata: {
          attempt_result: res.statusCode === 200 ? 'SUCCESS' : 'FAILED',
          failure_reason: res.statusCode !== 200 ? res.locals.responseData?.message : null,
          session_id: req.sessionID,
          correlation_id: req.headers['x-correlation-id'] || generateCorrelationId()
        }
      };

      // Log authentication attempts
      if (res.statusCode === 200) {
        auditLogger.info('AUTH_SUCCESS', authData);
      } else {
        securityLogger.warn('AUTH_FAILURE', authData);
      }

      // Log suspicious activity
      if (res.statusCode === 429) {
        securityLogger.error('RATE_LIMIT_EXCEEDED', authData);
      }
    });
  };
};

/**
 * Middleware para logging de acesso geral
 */
const accessLogMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const accessData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null,
      responseSize: res.get('Content-Length') || 0
    };

    // Log access with appropriate level
    if (res.statusCode >= 400) {
      auditLogger.warn('HTTP_ERROR', accessData);
    } else {
      auditLogger.info('HTTP_ACCESS', accessData);
    }

    // Log slow requests
    if (duration > 5000) {
      auditLogger.warn('SLOW_REQUEST', accessData);
    }
  });

  next();
};

// Helper functions
function sanitizeRequestBody(body, resource) {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Limit size for large payloads
  const bodyString = JSON.stringify(sanitized);
  if (bodyString.length > 1000) {
    return { ...sanitized, _note: 'Large payload truncated' };
  }

  return sanitized;
}

function extractCondominiumId(req) {
  return req.params?.condominiumId || 
         req.body?.condominium_id || 
         req.query?.condominium || 
         null;
}

function extractEntityId(req, res) {
  // Try to extract entity ID from various sources
  return req.params?.id || 
         res.locals?.responseData?.data?.id ||
         res.locals?.responseData?.data?.transaction?.id ||
         res.locals?.responseData?.data?.condominium?.id ||
         null;
}

function isSensitiveOperation(action, resource) {
  const sensitiveActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'REGISTER', 'CHANGE_PASSWORD'];
  const sensitiveResources = ['financial_transaction', 'user', 'authentication'];
  
  return sensitiveActions.includes(action) || sensitiveResources.includes(resource);
}

function generateCorrelationId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
  auditMiddleware,
  financialAuditMiddleware,
  authAuditMiddleware,
  accessLogMiddleware
};