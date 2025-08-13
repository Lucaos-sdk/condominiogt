const AutoBillingService = require('../services/autoBillingService');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Processar cobrança automática manualmente
// @route   POST /api/auto-billing/process
// @access  Private (admin, manager)
const processAutoBilling = asyncHandler(async (req, res) => {
  const result = await AutoBillingService.processAutoBilling();
  
  res.json({
    success: true,
    message: 'Processamento de cobrança automática concluído',
    data: result
  });
});

// @desc    Obter próximas cobranças
// @route   GET /api/auto-billing/upcoming
// @access  Private (admin, manager, syndic)
const getUpcomingBillings = asyncHandler(async (req, res) => {
  const upcomingBillings = await AutoBillingService.getUpcomingBillings();
  
  res.json({
    success: true,
    message: 'Próximas cobranças obtidas com sucesso',
    data: {
      upcomingBillings,
      count: upcomingBillings.length
    }
  });
});

// @desc    Habilitar cobrança automática para uma unidade
// @route   POST /api/auto-billing/enable/:unitId
// @access  Private (admin, manager, syndic)
const enableAutoBilling = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const { monthlyAmount, paymentDueDay } = req.body;
  
  if (!monthlyAmount || !paymentDueDay) {
    return res.status(400).json({
      success: false,
      message: 'Valor mensal e dia de vencimento são obrigatórios'
    });
  }
  
  if (paymentDueDay < 1 || paymentDueDay > 31) {
    return res.status(400).json({
      success: false,
      message: 'Dia de vencimento deve estar entre 1 e 31'
    });
  }
  
  const unit = await AutoBillingService.enableAutoBillingForUnit(
    unitId, 
    parseFloat(monthlyAmount), 
    parseInt(paymentDueDay)
  );
  
  res.json({
    success: true,
    message: 'Cobrança automática habilitada com sucesso',
    data: { unit }
  });
});

// @desc    Desabilitar cobrança automática para uma unidade
// @route   POST /api/auto-billing/disable/:unitId
// @access  Private (admin, manager, syndic)
const disableAutoBilling = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  
  const unit = await AutoBillingService.disableAutoBillingForUnit(unitId);
  
  res.json({
    success: true,
    message: 'Cobrança automática desabilitada com sucesso',
    data: { unit }
  });
});

module.exports = {
  processAutoBilling,
  getUpcomingBillings,
  enableAutoBilling,
  disableAutoBilling
};