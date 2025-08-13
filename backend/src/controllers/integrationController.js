const { asyncHandler, logger } = require('../middleware/errorHandler');
const IntegrationService = require('../services/integrationService');
const IntegrationJobs = require('../jobs/integrationJobs');
const { FinancialTransaction, MaintenanceRequest } = require('../models');

// @desc    Dashboard unificado com métricas integradas
// @route   GET /api/integration/dashboard/:condominiumId
// @access  Private
const getUnifiedDashboard = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { startDate, endDate } = req.query;

  // Verificar permissões do condomínio
  if (req.user.role !== 'admin' && !req.user.condominiums?.includes(parseInt(condominiumId))) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para este condomínio'
    });
  }

  const filters = {};
  if (startDate && endDate) {
    filters.startDate = startDate;
    filters.endDate = endDate;
  }

  const metrics = await IntegrationService.getUnifiedDashboardMetrics(
    parseInt(condominiumId), 
    filters
  );

  res.json({
    success: true,
    data: metrics
  });
});

// @desc    Processar transações em atraso e aplicar multas
// @route   POST /api/integration/process-overdue
// @access  Private (admin, manager)
const processOverdueTransactions = asyncHandler(async (req, res) => {
  const { condominiumId } = req.body;

  // Verificar permissões
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores e gerentes podem processar atrasos.'
    });
  }

  const appliedFees = await IntegrationService.checkAndApplyLateFees(condominiumId);

  logger.info(`Multas por atraso processadas: ${appliedFees.length} transações afetadas`);

  res.json({
    success: true,
    message: `${appliedFees.length} multas por atraso foram aplicadas`,
    data: {
      processed_count: appliedFees.length,
      applied_fees: appliedFees
    }
  });
});

// @desc    Sincronizar status de pagamento entre transação e manutenção
// @route   POST /api/integration/sync-payment-status/:transactionId
// @access  Private (admin, manager, syndic)
const syncPaymentStatus = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para sincronizar status de pagamento'
    });
  }

  const result = await IntegrationService.syncMaintenancePaymentStatus(parseInt(transactionId));

  logger.info(`Status de pagamento sincronizado para transação ${transactionId}: ${result.status}`);

  res.json({
    success: true,
    message: 'Status de pagamento sincronizado com sucesso',
    data: result
  });
});

// @desc    Verificar e notificar vencimentos próximos
// @route   POST /api/integration/check-upcoming-dues
// @access  Private (admin, manager)
const checkUpcomingDues = asyncHandler(async (req, res) => {
  const { condominiumId, daysAhead = 3 } = req.body;

  // Verificar permissões
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para verificar vencimentos'
    });
  }

  const notifications = await IntegrationService.checkUpcomingDueDates(condominiumId, daysAhead);

  res.json({
    success: true,
    message: `${notifications.length} notificações de vencimento enviadas`,
    data: {
      notifications_sent: notifications.length,
      upcoming_dues: notifications
    }
  });
});

// @desc    Criar despesa manual para manutenção existente
// @route   POST /api/integration/create-maintenance-expense/:maintenanceId
// @access  Private (admin, manager, syndic)
const createMaintenanceExpenseManual = asyncHandler(async (req, res) => {
  const { maintenanceId } = req.params;
  const { amount } = req.body;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para criar despesas de manutenção'
    });
  }

  // Buscar manutenção
  const maintenanceRequest = await MaintenanceRequest.findByPk(maintenanceId);
  
  if (!maintenanceRequest) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Verificar se já existe despesa
  const existingExpense = await FinancialTransaction.findOne({
    where: { maintenance_request_id: maintenanceId }
  });

  if (existingExpense) {
    return res.status(400).json({
      success: false,
      message: 'Já existe uma despesa criada para esta manutenção'
    });
  }

  // Atualizar custo estimado se fornecido
  if (amount) {
    await maintenanceRequest.update({ estimated_cost: parseFloat(amount) });
  }

  const expense = await IntegrationService.createMaintenanceExpense(
    maintenanceRequest,
    req.user.id
  );

  logger.info(`Despesa manual criada: ${expense.id} para manutenção ${maintenanceId}`);

  res.status(201).json({
    success: true,
    message: 'Despesa de manutenção criada com sucesso',
    data: {
      transaction_id: expense.id,
      maintenance_request_id: maintenanceId,
      amount: expense.amount,
      due_date: expense.due_date,
      status: expense.status
    }
  });
});

// @desc    Obter relatório de integração financeira/manutenção
// @route   GET /api/integration/report/:condominiumId
// @access  Private
const getIntegrationReport = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { startDate, endDate, format = 'json' } = req.query;

  // Verificar permissões do condomínio
  if (req.user.role !== 'admin' && !req.user.condominiums?.includes(parseInt(condominiumId))) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para este condomínio'
    });
  }

  // Buscar dados do relatório
  const whereClause = { condominium_id: parseInt(condominiumId) };
  
  if (startDate && endDate) {
    whereClause.createdAt = {
      [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }

  // Despesas automáticas de manutenção
  const maintenanceExpenses = await FinancialTransaction.findAll({
    where: {
      ...whereClause,
      auto_generated: true,
      maintenance_request_id: { [require('sequelize').Op.not]: null }
    },
    include: [
      {
        model: MaintenanceRequest,
        as: 'maintenanceRequest',
        attributes: ['title', 'category', 'status', 'estimated_cost', 'actual_cost']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  // Manutenções com pagamento pendente
  const pendingPayments = await MaintenanceRequest.findAll({
    where: {
      ...whereClause,
      payment_status: ['pending', 'overdue']
    },
    include: [
      {
        model: FinancialTransaction,
        as: 'generatedExpense',
        required: false
      }
    ]
  });

  // Estatísticas de sincronização
  const syncStats = {
    total_maintenance_expenses: maintenanceExpenses.length,
    pending_payments: pendingPayments.length,
    total_amount_pending: pendingPayments.reduce((sum, req) => 
      sum + (req.generatedExpense?.amount || 0), 0
    ),
    avg_processing_time: null // Implementar se necessário
  };

  const reportData = {
    period: { startDate, endDate },
    condominium_id: parseInt(condominiumId),
    maintenance_expenses: maintenanceExpenses,
    pending_payments: pendingPayments,
    statistics: syncStats,
    generated_at: new Date()
  };

  if (format === 'csv') {
    // Implementar exportação CSV se necessário
    return res.status(501).json({
      success: false,
      message: 'Formato CSV não implementado ainda'
    });
  }

  res.json({
    success: true,
    data: reportData
  });
});

// @desc    Reprocessar integração para manutenção específica
// @route   POST /api/integration/reprocess/:maintenanceId
// @access  Private (admin, manager)
const reprocessMaintenanceIntegration = asyncHandler(async (req, res) => {
  const { maintenanceId } = req.params;
  const { action = 'sync' } = req.body; // 'sync', 'recreate', 'unlink'

  // Verificar permissões
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para reprocessar integrações'
    });
  }

  const maintenanceRequest = await MaintenanceRequest.findByPk(maintenanceId, {
    include: [
      {
        model: FinancialTransaction,
        as: 'generatedExpense',
        required: false
      }
    ]
  });

  if (!maintenanceRequest) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  let result = {};

  try {
    switch (action) {
      case 'sync':
        if (maintenanceRequest.generatedExpense) {
          result = await IntegrationService.syncMaintenancePaymentStatus(
            maintenanceRequest.generatedExpense.id
          );
        } else {
          result = { status: 'no_expense_to_sync' };
        }
        break;

      case 'recreate':
        // Remover despesa existente se houver
        if (maintenanceRequest.generatedExpense) {
          await maintenanceRequest.generatedExpense.destroy();
        }
        
        // Criar nova despesa
        if (maintenanceRequest.estimated_cost > 0) {
          const newExpense = await IntegrationService.createMaintenanceExpense(
            maintenanceRequest,
            req.user.id
          );
          result = { 
            status: 'recreated',
            new_transaction_id: newExpense.id 
          };
        } else {
          result = { status: 'no_cost_to_recreate' };
        }
        break;

      case 'unlink':
        await maintenanceRequest.update({
          financial_transaction_id: null,
          payment_status: 'not_required'
        });
        result = { status: 'unlinked' };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Ação inválida. Use: sync, recreate ou unlink'
        });
    }

    logger.info(`Integração reprocessada para manutenção ${maintenanceId}: ${action}`);

    res.json({
      success: true,
      message: `Reprocessamento '${action}' executado com sucesso`,
      data: result
    });

  } catch (error) {
    logger.error('Erro ao reprocessar integração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reprocessar integração',
      error: error.message
    });
  }
});

// @desc    Executar job manual de processamento de atrasos
// @route   POST /api/integration/run-overdue-job
// @access  Private (admin only)
const runOverdueJobManually = asyncHandler(async (req, res) => {
  // Verificar permissões
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem executar jobs manuais.'
    });
  }

  const appliedFees = await IntegrationJobs.runOverdueCheckNow();

  res.json({
    success: true,
    message: `Job de atrasos executado manualmente: ${appliedFees.length} multas aplicadas`,
    data: {
      processed_count: appliedFees.length,
      applied_fees: appliedFees
    }
  });
});

// @desc    Executar job manual de vencimentos próximos
// @route   POST /api/integration/run-upcoming-dues-job
// @access  Private (admin only)
const runUpcomingDuesJobManually = asyncHandler(async (req, res) => {
  const { daysAhead = 3 } = req.body;

  // Verificar permissões
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem executar jobs manuais.'
    });
  }

  const notifications = await IntegrationJobs.runUpcomingDuesNow(daysAhead);

  res.json({
    success: true,
    message: `Job de vencimentos executado manualmente: ${notifications.length} notificações enviadas`,
    data: {
      notifications_sent: notifications.length,
      upcoming_dues: notifications
    }
  });
});

// @desc    Obter status dos jobs automáticos
// @route   GET /api/integration/jobs-status
// @access  Private (admin only)
const getJobsStatus = asyncHandler(async (req, res) => {
  // Verificar permissões
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem ver status dos jobs.'
    });
  }

  const jobsStatus = IntegrationJobs.getJobsStatus();

  res.json({
    success: true,
    data: jobsStatus
  });
});

// @desc    Processamento de emergência para muitas transações em atraso
// @route   POST /api/integration/emergency-overdue-processing
// @access  Private (admin only)
const runEmergencyOverdueProcessing = asyncHandler(async (req, res) => {
  // Verificar permissões
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem executar processamento de emergência.'
    });
  }

  const result = await IntegrationJobs.runEmergencyOverdueProcessing();

  res.json({
    success: true,
    message: `Processamento de emergência concluído: ${result.processed}/${result.total} transações processadas`,
    data: result
  });
});

module.exports = {
  getUnifiedDashboard,
  processOverdueTransactions,
  syncPaymentStatus,
  checkUpcomingDues,
  createMaintenanceExpenseManual,
  getIntegrationReport,
  reprocessMaintenanceIntegration,
  runOverdueJobManually,
  runUpcomingDuesJobManually,
  getJobsStatus,
  runEmergencyOverdueProcessing
};