const { FinancialTransaction, MaintenanceRequest, Unit, User, Condominium } = require('../models');
const { notificationService } = require('./notificationService');
const { Op } = require('sequelize');

class IntegrationService {
  
  /**
   * Cria despesa automática quando manutenção é aprovada
   * @param {Object} maintenanceRequest - Solicitação de manutenção
   * @param {Number} userId - ID do usuário que aprovou
   * @returns {Object} - Transação financeira criada
   */
  static async createMaintenanceExpense(maintenanceRequest, userId) {
    try {
      // Verificar se já não existe transação para esta manutenção
      const existingTransaction = await FinancialTransaction.findOne({
        where: { maintenance_request_id: maintenanceRequest.id }
      });

      if (existingTransaction) {
        throw new Error('Já existe uma transação financeira para esta manutenção');
      }

      // Calcular data de vencimento (30 dias a partir de hoje)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Criar transação financeira
      const transaction = await FinancialTransaction.create({
        condominium_id: maintenanceRequest.condominium_id,
        unit_id: maintenanceRequest.unit_id,
        user_id: maintenanceRequest.user_id,
        type: 'expense',
        category: 'maintenance',
        description: `Despesa de manutenção: ${maintenanceRequest.title}`,
        amount: maintenanceRequest.estimated_cost || 0,
        due_date: dueDate,
        status: 'pending',
        maintenance_request_id: maintenanceRequest.id,
        auto_generated: true,
        recurrence_type: 'one_time',
        created_by: userId,
        reference_month: dueDate.getMonth() + 1,
        reference_year: dueDate.getFullYear(),
        notes: `Despesa gerada automaticamente para manutenção #${maintenanceRequest.id}`
      });

      // Atualizar status de pagamento da manutenção
      await maintenanceRequest.update({
        financial_transaction_id: transaction.id,
        payment_status: 'pending'
      });

      // Enviar notificação
      await notificationService.createNotification({
        condominium_id: maintenanceRequest.condominium_id,
        user_id: maintenanceRequest.user_id,
        title: 'Despesa de manutenção criada',
        message: `Uma despesa de R$ ${maintenanceRequest.estimated_cost?.toFixed(2)} foi criada para a manutenção "${maintenanceRequest.title}". Vencimento: ${dueDate.toLocaleDateString('pt-BR')}.`,
        type: 'financial',
        priority: 'medium',
        data: {
          maintenance_request_id: maintenanceRequest.id,
          financial_transaction_id: transaction.id,
          amount: maintenanceRequest.estimated_cost
        }
      });

      return transaction;
    } catch (error) {
      console.error('Erro ao criar despesa de manutenção:', error);
      throw error;
    }
  }

  /**
   * Verifica transações em atraso e aplica multas
   * @param {Number} condominiumId - ID do condomínio (opcional)
   * @returns {Array} - Lista de multas aplicadas
   */
  static async checkAndApplyLateFees(condominiumId = null) {
    try {
      const whereClause = {
        status: 'pending',
        due_date: {
          [Op.lt]: new Date()
        }
      };

      if (condominiumId) {
        whereClause.condominium_id = condominiumId;
      }

      // Buscar transações em atraso
      const overdueTransactions = await FinancialTransaction.findAll({
        where: whereClause,
        include: [
          {
            model: MaintenanceRequest,
            as: 'maintenanceRequest',
            required: false
          },
          {
            model: Unit,
            as: 'unit',
            required: false
          }
        ]
      });

      const appliedFees = [];

      for (const transaction of overdueTransactions) {
        // Calcular dias de atraso
        const today = new Date();
        const dueDate = new Date(transaction.due_date);
        const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        // Aplicar multa progressiva: 2% + 0.1% por dia
        const lateFeePercentage = 2 + (daysLate * 0.1);
        const lateFee = (parseFloat(transaction.amount) * lateFeePercentage) / 100;

        // Atualizar status e multa
        await transaction.update({
          status: 'overdue',
          late_fee: lateFee,
          total_amount: parseFloat(transaction.amount) + lateFee
        });

        // Atualizar status da manutenção se existir
        if (transaction.maintenanceRequest) {
          await transaction.maintenanceRequest.update({
            payment_status: 'overdue'
          });
        }

        appliedFees.push({
          transaction_id: transaction.id,
          maintenance_request_id: transaction.maintenance_request_id,
          days_late: daysLate,
          late_fee: lateFee,
          original_amount: parseFloat(transaction.amount),
          total_amount: parseFloat(transaction.amount) + lateFee
        });

        // Notificar sobre atraso
        await notificationService.createNotification({
          condominium_id: transaction.condominium_id,
          user_id: transaction.user_id,
          title: 'Pagamento em atraso',
          message: `Sua transação de R$ ${transaction.amount} está ${daysLate} dias em atraso. Multa aplicada: R$ ${lateFee.toFixed(2)}`,
          type: 'financial',
          priority: 'high',
          data: {
            transaction_id: transaction.id,
            days_late: daysLate,
            late_fee: lateFee
          }
        });
      }

      return appliedFees;
    } catch (error) {
      console.error('Erro ao aplicar multas por atraso:', error);
      throw error;
    }
  }

  /**
   * Sincroniza status de pagamento entre transação e manutenção
   * @param {Number} transactionId - ID da transação financeira
   * @returns {Object} - Status atualizado
   */
  static async syncMaintenancePaymentStatus(transactionId) {
    try {
      const transaction = await FinancialTransaction.findByPk(transactionId, {
        include: [
          {
            model: MaintenanceRequest,
            as: 'maintenanceRequest',
            required: false
          }
        ]
      });

      if (!transaction) {
        throw new Error('Transação não encontrada');
      }

      if (!transaction.maintenanceRequest) {
        // Sem manutenção associada, nada a sincronizar
        return { status: 'no_maintenance_linked' };
      }

      let newPaymentStatus = 'pending';

      switch (transaction.status) {
        case 'paid':
          newPaymentStatus = 'paid';
          // Atualizar custo real da manutenção
          await transaction.maintenanceRequest.update({
            actual_cost: transaction.total_amount,
            payment_status: 'paid'
          });
          break;
        case 'overdue':
          newPaymentStatus = 'overdue';
          await transaction.maintenanceRequest.update({
            payment_status: 'overdue'
          });
          break;
        case 'cancelled':
          newPaymentStatus = 'not_required';
          await transaction.maintenanceRequest.update({
            payment_status: 'not_required',
            financial_transaction_id: null
          });
          break;
        default:
          await transaction.maintenanceRequest.update({
            payment_status: 'pending'
          });
      }

      // Notificar sobre mudança de status
      if (transaction.status === 'paid') {
        await notificationService.createNotification({
          condominium_id: transaction.condominium_id,
          user_id: transaction.user_id,
          title: 'Pagamento confirmado',
          message: `Pagamento de R$ ${transaction.total_amount} confirmado para manutenção "${transaction.maintenanceRequest.title}"`,
          type: 'financial',
          priority: 'low',
          data: {
            transaction_id: transaction.id,
            maintenance_request_id: transaction.maintenanceRequest.id
          }
        });
      }

      return {
        status: 'synced',
        transaction_status: transaction.status,
        payment_status: newPaymentStatus
      };
    } catch (error) {
      console.error('Erro ao sincronizar status de pagamento:', error);
      throw error;
    }
  }

  /**
   * Obtém métricas unificadas do dashboard
   * @param {Number} condominiumId - ID do condomínio
   * @param {Object} filters - Filtros opcionais (período, etc.)
   * @returns {Object} - Métricas consolidadas
   */
  static async getUnifiedDashboardMetrics(condominiumId, filters = {}) {
    try {
      const { startDate, endDate } = filters;
      const dateFilter = {};

      if (startDate && endDate) {
        dateFilter.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Métricas financeiras
      const { sequelize } = require('../models');
      const financialMetrics = await FinancialTransaction.findAll({
        where: {
          condominium_id: condominiumId,
          ...dateFilter
        },
        attributes: [
          'status',
          'type',
          'auto_generated',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
          [sequelize.fn('SUM', sequelize.col('late_fee')), 'total_late_fees']
        ],
        group: ['status', 'type', 'auto_generated'],
        raw: true
      });

      // Métricas de manutenção
      const maintenanceMetrics = await MaintenanceRequest.findAll({
        where: {
          condominium_id: condominiumId,
          ...dateFilter
        },
        attributes: [
          'status',
          'payment_status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('estimated_cost')), 'estimated_total'],
          [sequelize.fn('SUM', sequelize.col('actual_cost')), 'actual_total']
        ],
        group: ['status', 'payment_status'],
        raw: true
      });

      // Transações de manutenção (despesas automáticas)
      const maintenanceExpenses = await FinancialTransaction.findAll({
        where: {
          condominium_id: condominiumId,
          auto_generated: true,
          maintenance_request_id: { [Op.not]: null },
          ...dateFilter
        },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
        ],
        group: ['status'],
        raw: true
      });

      // Próximos vencimentos (próximos 7 dias)
      const upcomingDueDates = await FinancialTransaction.findAll({
        where: {
          condominium_id: condominiumId,
          status: 'pending',
          due_date: {
            [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
          }
        },
        include: [
          {
            model: MaintenanceRequest,
            as: 'maintenanceRequest',
            attributes: ['title', 'id']
          },
          {
            model: Unit,
            as: 'unit',
            attributes: ['number', 'block']
          }
        ],
        order: [['due_date', 'ASC']],
        limit: 10
      });

      // Manutenções pendentes de aprovação financeira
      const pendingFinancialApproval = await MaintenanceRequest.findAll({
        where: {
          condominium_id: condominiumId,
          status: 'approved',
          payment_status: 'not_required',
          estimated_cost: { [Op.gt]: 0 },
          financial_transaction_id: null
        },
        include: [
          {
            model: Unit,
            as: 'unit',
            attributes: ['number', 'block']
          }
        ],
        limit: 5
      });

      return {
        financial_summary: this.processFinancialMetrics(financialMetrics),
        maintenance_summary: this.processMaintenanceMetrics(maintenanceMetrics),
        maintenance_expenses: this.processMaintenanceExpenses(maintenanceExpenses),
        upcoming_due_dates: upcomingDueDates,
        pending_financial_approval: pendingFinancialApproval,
        integration_stats: {
          auto_generated_expenses: financialMetrics
            .filter(m => m.auto_generated && m.type === 'expense')
            .reduce((acc, curr) => acc + parseInt(curr.count), 0),
          synced_payments: maintenanceMetrics
            .filter(m => m.payment_status === 'paid')
            .reduce((acc, curr) => acc + parseInt(curr.count), 0)
        }
      };
    } catch (error) {
      console.error('Erro ao obter métricas unificadas:', error);
      throw error;
    }
  }

  /**
   * Verifica vencimentos próximos e envia notificações
   * @param {Number} condominiumId - ID do condomínio (opcional)
   * @param {Number} daysAhead - Quantos dias à frente verificar (padrão: 3)
   * @returns {Array} - Notificações enviadas
   */
  static async checkUpcomingDueDates(condominiumId = null, daysAhead = 3) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + daysAhead);

      const whereClause = {
        status: 'pending',
        due_date: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (condominiumId) {
        whereClause.condominium_id = condominiumId;
      }

      const upcomingTransactions = await FinancialTransaction.findAll({
        where: whereClause,
        include: [
          {
            model: MaintenanceRequest,
            as: 'maintenanceRequest',
            required: false
          }
        ]
      });

      const notifications = [];

      for (const transaction of upcomingTransactions) {
        const daysUntilDue = Math.ceil((new Date(transaction.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        let message = `Vencimento em ${daysUntilDue} dias: R$ ${transaction.amount}`;
        if (transaction.maintenanceRequest) {
          message += ` - Manutenção: ${transaction.maintenanceRequest.title}`;
        }

        await notificationService.createNotification({
          condominium_id: transaction.condominium_id,
          user_id: transaction.user_id,
          title: 'Vencimento próximo',
          message: message,
          type: 'financial',
          priority: daysUntilDue <= 1 ? 'high' : 'medium',
          data: {
            transaction_id: transaction.id,
            days_until_due: daysUntilDue,
            maintenance_request_id: transaction.maintenance_request_id
          }
        });

        notifications.push({
          transaction_id: transaction.id,
          due_date: transaction.due_date,
          days_until_due: daysUntilDue,
          amount: transaction.amount
        });
      }

      return notifications;
    } catch (error) {
      console.error('Erro ao verificar vencimentos próximos:', error);
      throw error;
    }
  }

  // Métodos auxiliares para processar métricas
  static processFinancialMetrics(metrics) {
    const processed = {
      total_income: 0,
      total_expenses: 0,
      total_pending: 0,
      total_overdue: 0,
      total_late_fees: 0,
      auto_generated_count: 0
    };

    metrics.forEach(metric => {
      const count = parseInt(metric.count) || 0;
      const amount = parseFloat(metric.total_amount) || 0;
      const lateFees = parseFloat(metric.total_late_fees) || 0;

      if (metric.type === 'income') {
        processed.total_income += amount;
      } else {
        processed.total_expenses += amount;
      }

      if (metric.status === 'pending') {
        processed.total_pending += amount;
      } else if (metric.status === 'overdue') {
        processed.total_overdue += amount;
      }

      processed.total_late_fees += lateFees;

      if (metric.auto_generated) {
        processed.auto_generated_count += count;
      }
    });

    return processed;
  }

  static processMaintenanceMetrics(metrics) {
    const processed = {
      total_requests: 0,
      pending_payment: 0,
      paid_requests: 0,
      overdue_payments: 0,
      estimated_total: 0,
      actual_total: 0
    };

    metrics.forEach(metric => {
      const count = parseInt(metric.count) || 0;
      const estimated = parseFloat(metric.estimated_total) || 0;
      const actual = parseFloat(metric.actual_total) || 0;

      processed.total_requests += count;
      processed.estimated_total += estimated;
      processed.actual_total += actual;

      switch (metric.payment_status) {
        case 'pending':
          processed.pending_payment += count;
          break;
        case 'paid':
          processed.paid_requests += count;
          break;
        case 'overdue':
          processed.overdue_payments += count;
          break;
      }
    });

    return processed;
  }

  static processMaintenanceExpenses(expenses) {
    const processed = {
      total_count: 0,
      total_amount: 0,
      pending_amount: 0,
      paid_amount: 0,
      overdue_amount: 0
    };

    expenses.forEach(expense => {
      const count = parseInt(expense.count) || 0;
      const amount = parseFloat(expense.total_amount) || 0;

      processed.total_count += count;
      processed.total_amount += amount;

      switch (expense.status) {
        case 'pending':
          processed.pending_amount += amount;
          break;
        case 'paid':
          processed.paid_amount += amount;
          break;
        case 'overdue':
          processed.overdue_amount += amount;
          break;
      }
    });

    return processed;
  }
}

module.exports = IntegrationService;