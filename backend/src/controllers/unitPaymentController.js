const { UnitPayment, Unit, Condominium, FinancialTransaction, User, sequelize } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Obter pagamentos de uma unidade específica
// @route   GET /api/units/:unitId/payments
// @access  Private
const getUnitPayments = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const { page = 1, limit = 12, year, status } = req.query;
  const offset = (page - 1) * limit;

  // Verificar se a unidade existe e o usuário tem acesso
  const unit = await Unit.findByPk(unitId, {
    include: [{ model: Condominium, as: 'condominium' }]
  });

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  // Verificar permissões
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === unit.condominium_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta unidade'
      });
    }
  }

  const whereClause = { unit_id: unitId };

  if (year) {
    whereClause.reference_year = year;
  }

  if (status) {
    whereClause.status = status;
  }

  const { count, rows: payments } = await UnitPayment.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor', 'type']
      },
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: FinancialTransaction,
        as: 'financial_transaction',
        attributes: ['id', 'payment_method', 'paid_date', 'receipt_url']
      }
    ],
    order: [['reference_year', 'DESC'], ['reference_month', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  // Adicionar status detalhado para cada pagamento
  const paymentsWithStatus = payments.map(payment => {
    const paymentData = payment.toJSON();
    paymentData.detailed_status = payment.getDetailedStatus();
    paymentData.days_overdue = payment.getDaysOverdue();
    return paymentData;
  });

  res.json({
    success: true,
    data: {
      payments: paymentsWithStatus,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: parseInt(page),
        per_page: parseInt(limit)
      }
    }
  });
});

// @desc    Obter resumo de pagamentos de uma unidade
// @route   GET /api/units/:unitId/payments/summary
// @access  Private
const getUnitPaymentSummary = asyncHandler(async (req, res) => {
  const { unitId } = req.params;

  // Verificar se a unidade existe e o usuário tem acesso
  const unit = await Unit.findByPk(unitId, {
    include: [{ model: Condominium, as: 'condominium' }]
  });

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  // Verificar permissões
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === unit.condominium_id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta unidade'
      });
    }
  }

  // Estatísticas gerais
  const stats = await UnitPayment.findOne({
    where: { unit_id: unitId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_payments'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "paid" THEN 1 END')), 'paid_count'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "overdue" THEN 1 END')), 'overdue_count'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "pending" THEN 1 END')), 'pending_count'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "paid" THEN total_amount ELSE 0 END')), 'total_paid'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "overdue" THEN total_amount ELSE 0 END')), 'total_overdue'],
      [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = "pending" THEN total_amount ELSE 0 END')), 'total_pending'],
    ],
    raw: true
  });

  // Último pagamento
  const lastPayment = await UnitPayment.findOne({
    where: {
      unit_id: unitId,
      status: 'paid'
    },
    order: [['payment_date', 'DESC']],
    include: [
      {
        model: FinancialTransaction,
        as: 'financial_transaction',
        attributes: ['payment_method', 'paid_date']
      }
    ]
  });

  // Próximo vencimento
  const nextDue = await UnitPayment.findOne({
    where: {
      unit_id: unitId,
      status: ['pending', 'overdue']
    },
    order: [['due_date', 'ASC']]
  });

  const summary = {
    total_payments: parseInt(stats.total_payments || 0),
    paid_count: parseInt(stats.paid_count || 0),
    overdue_count: parseInt(stats.overdue_count || 0),
    pending_count: parseInt(stats.pending_count || 0),
    total_paid: parseFloat(stats.total_paid || 0),
    total_overdue: parseFloat(stats.total_overdue || 0),
    total_pending: parseFloat(stats.total_pending || 0),
    last_payment: lastPayment ? {
      ...lastPayment.toJSON(),
      detailed_status: lastPayment.getDetailedStatus()
    } : null,
    next_due: nextDue ? {
      ...nextDue.toJSON(),
      detailed_status: nextDue.getDetailedStatus(),
      days_overdue: nextDue.getDaysOverdue()
    } : null
  };

  res.json({
    success: true,
    data: { summary }
  });
});

// @desc    Criar pagamento para unidade
// @route   POST /api/units/:unitId/payments
// @access  Private (admin, manager, syndic)
const createUnitPayment = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const {
    reference_month,
    reference_year,
    due_date,
    amount,
    notes
  } = req.body;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para criar pagamentos'
    });
  }

  // Verificar se a unidade existe
  const unit = await Unit.findByPk(unitId, {
    include: [{ model: Condominium, as: 'condominium' }]
  });

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  // Verificar se já existe pagamento para este mês/ano
  const existingPayment = await UnitPayment.findOne({
    where: {
      unit_id: unitId,
      reference_month,
      reference_year
    }
  });

  if (existingPayment) {
    return res.status(400).json({
      success: false,
      message: 'Já existe um pagamento para este mês/ano'
    });
  }

  const payment = await UnitPayment.create({
    unit_id: unitId,
    condominium_id: unit.condominium_id,
    reference_month,
    reference_year,
    due_date,
    amount,
    notes
  });

  const createdPayment = await UnitPayment.findByPk(payment.id, {
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor', 'type']
      },
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      }
    ]
  });

  logger.info(`Pagamento criado para unidade ${unitId}: ${payment.id} por usuário ${req.user.id}`);

  res.status(201).json({
    success: true,
    message: 'Pagamento criado com sucesso',
    data: {
      payment: {
        ...createdPayment.toJSON(),
        detailed_status: createdPayment.getDetailedStatus()
      }
    }
  });
});

// @desc    Marcar pagamento como pago
// @route   POST /api/unit-payments/:id/pay
// @access  Private (admin, manager, syndic)
const markPaymentAsPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    payment_date = new Date(),
    payment_method,
    amount_paid,
    late_fee = 0,
    discount = 0,
    notes
  } = req.body;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para confirmar pagamentos'
    });
  }

  const payment = await UnitPayment.findByPk(id, {
    include: [
      {
        model: Unit,
        as: 'unit',
        include: [{ model: Condominium, as: 'condominium' }]
      }
    ]
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Pagamento não encontrado'
    });
  }

  if (payment.status === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Pagamento já foi confirmado'
    });
  }

  // Calcular valores
  const finalAmountPaid = amount_paid || payment.amount;
  const finalLateFee = late_fee || 0;
  const finalDiscount = discount || 0;
  const totalAmount = parseFloat(finalAmountPaid) + parseFloat(finalLateFee) - parseFloat(finalDiscount);

  // Determinar status baseado no valor pago
  let status = 'paid';
  if (finalAmountPaid < payment.amount) {
    status = 'partial';
  }

  // Atualizar pagamento
  await payment.update({
    status,
    payment_date,
    payment_method,
    late_fee: finalLateFee,
    discount: finalDiscount,
    total_amount: totalAmount,
    notes: notes ? `${payment.notes || ''}\n[PAGAMENTO] ${notes}` : payment.notes
  });

  // Criar transação financeira correspondente
  const financialTransaction = await FinancialTransaction.create({
    condominium_id: payment.condominium_id,
    unit_id: payment.unit_id,
    user_id: req.user.id,
    type: 'income',
    category: 'condominium_fee',
    description: `Pagamento condomínio - ${payment.unit.number} - ${payment.reference_month}/${payment.reference_year}`,
    amount: totalAmount,
    due_date: payment.due_date,
    paid_date: payment_date,
    status: 'paid',
    payment_method,
    reference_month: payment.reference_month,
    reference_year: payment.reference_year,
    late_fee: finalLateFee,
    discount: finalDiscount,
    total_amount: totalAmount,
    created_by: req.user.id
  });

  // Vincular transação ao pagamento
  await payment.update({
    financial_transaction_id: financialTransaction.id
  });

  logger.info(`Pagamento confirmado: ${id} por usuário ${req.user.id} - Valor: R$ ${totalAmount}`);

  // Buscar pagamento atualizado
  const updatedPayment = await UnitPayment.findByPk(id, {
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor', 'type']
      },
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: FinancialTransaction,
        as: 'financial_transaction',
        attributes: ['id', 'payment_method', 'paid_date', 'receipt_url']
      }
    ]
  });

  res.json({
    success: true,
    message: 'Pagamento confirmado com sucesso',
    data: {
      payment: {
        ...updatedPayment.toJSON(),
        detailed_status: updatedPayment.getDetailedStatus()
      }
    }
  });
});

// @desc    Gerar pagamentos mensais para todas as unidades de um condomínio
// @route   POST /api/condominiums/:condominiumId/generate-payments
// @access  Private (admin, manager, syndic)
const generateMonthlyPayments = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const {
    reference_month,
    reference_year,
    due_date,
    amount,
    exclude_units = []
  } = req.body;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para gerar pagamentos'
    });
  }

  // Verificar se o condomínio existe
  const condominium = await Condominium.findByPk(condominiumId);
  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  // Buscar todas as unidades do condomínio
  const units = await Unit.findAll({
    where: {
      condominium_id: condominiumId,
      id: { [Op.notIn]: exclude_units }
    }
  });

  if (units.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Nenhuma unidade encontrada para gerar pagamentos'
    });
  }

  const createdPayments = [];
  const errors = [];

  // Usar transação do banco para garantir consistência
  const transaction = await sequelize.transaction();

  try {
    for (const unit of units) {
      // Verificar se já existe pagamento para este mês/ano
      const existingPayment = await UnitPayment.findOne({
        where: {
          unit_id: unit.id,
          reference_month,
          reference_year
        },
        transaction
      });

      if (!existingPayment) {
        const payment = await UnitPayment.create({
          unit_id: unit.id,
          condominium_id: condominiumId,
          reference_month,
          reference_year,
          due_date,
          amount: unit.monthly_fee || amount, // Usar taxa da unidade ou valor padrão
        }, { transaction });

        createdPayments.push({
          unit_id: unit.id,
          unit_number: unit.number,
          payment_id: payment.id,
          amount: payment.amount
        });
      } else {
        errors.push({
          unit_id: unit.id,
          unit_number: unit.number,
          error: 'Pagamento já existe para este período'
        });
      }
    }

    await transaction.commit();

    logger.info(`Pagamentos mensais gerados para condomínio ${condominiumId}: ${createdPayments.length} pagamentos criados`);

    res.status(201).json({
      success: true,
      message: `${createdPayments.length} pagamentos gerados com sucesso`,
      data: {
        created_payments: createdPayments,
        errors: errors,
        summary: {
          total_units: units.length,
          payments_created: createdPayments.length,
          errors_count: errors.length
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = {
  getUnitPayments,
  getUnitPaymentSummary,
  createUnitPayment,
  markPaymentAsPaid,
  generateMonthlyPayments
};