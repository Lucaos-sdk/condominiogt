const express = require('express');
const {
  processAutoBilling,
  getUpcomingBillings,
  enableAutoBilling,
  disableAutoBilling
} = require('../controllers/autoBillingController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(protect);

// Processar cobrança automática - apenas admin e manager
router.post('/process', requireRole('admin', 'manager'), processAutoBilling);

// Ver próximas cobranças
router.get('/upcoming', requireRole('admin', 'manager', 'syndic'), getUpcomingBillings);

// Habilitar cobrança automática para uma unidade
router.post('/enable/:unitId', requireRole('admin', 'manager', 'syndic'), enableAutoBilling);

// Desabilitar cobrança automática para uma unidade
router.post('/disable/:unitId', requireRole('admin', 'manager', 'syndic'), disableAutoBilling);

module.exports = router;