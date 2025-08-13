const { FinancialTransaction, Condominium, Unit, User, sequelize } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');
const cacheService = require('../services/cacheService');
const { 
  getTransactionTag, 
  calculateTagStatistics, 
  isActiveTransaction, 
  isOverdueTransaction 
} = require('../utils/transactionTags');

// @desc    Obter todas as transações financeiras
// @route   GET /api/financial/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    type, 
    category, 
    status, 
    payment_method,
    condominium_id,
    unit_id,
    date_from,
    date_to,
    private_only = false 
  } = req.query;
  
  const offset = (page - 1) * limit;
  const whereClause = {};
  
  // Controle de privacidade: síndicos não veem gastos privados do proprietário
  if (req.user.role === 'syndic') {
    whereClause.private_expense = false;
  } else if (private_only === 'true' && ['admin', 'manager'].includes(req.user.role)) {
    whereClause.private_expense = true;
  }
  
  // Se não for admin, mostrar apenas transações dos condomínios do usuário
  if (req.user.role !== 'admin') {
    if (condominium_id) {
      // Verificar se usuário tem acesso ao condomínio
      const userCondominiums = req.user.condominiums || [];
      const hasAccess = userCondominiums.some(c => c.id === parseInt(condominium_id));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado a este condomínio'
        });
      }
      whereClause.condominium_id = condominium_id;
    } else {
      // Buscar condomínios do usuário
      const userCondominiums = req.user.condominiums || [];
      if (userCondominiums.length > 0) {
        whereClause.condominium_id = {
          [Op.in]: userCondominiums.map(c => c.id)
        };
      }
    }
  } else if (condominium_id) {
    whereClause.condominium_id = condominium_id;
  }

  // Filtros adicionais
  if (search) {
    whereClause[Op.or] = [
      { description: { [Op.like]: `%${search}%` } },
      { invoice_number: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } }
    ];
  }

  if (type) whereClause.type = type;
  if (category) whereClause.category = category;
  if (status) whereClause.status = status;
  if (payment_method) whereClause.payment_method = payment_method;
  if (unit_id) whereClause.unit_id = unit_id;

  // Filtro por data
  if (date_from || date_to) {
    whereClause.due_date = {};
    if (date_from) whereClause.due_date[Op.gte] = new Date(date_from);
    if (date_to) whereClause.due_date[Op.lte] = new Date(date_to);
  }

  const { count, rows: transactions } = await FinancialTransaction.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor', 'type']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'name', 'role']
      },
      {
        model: User,
        as: 'cash_confirmer',
        attributes: ['id', 'name', 'role']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  logger.info(`Transações financeiras consultadas por usuário ${req.user.id}: ${count} registros`);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: parseInt(page),
        per_page: parseInt(limit)
      }
    }
  });
});

// @desc    Obter transação financeira por ID
// @route   GET /api/financial/transactions/:id
// @access  Private
const getTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transaction = await FinancialTransaction.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor', 'type', 'area']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'name', 'role']
      },
      {
        model: User,
        as: 'cash_confirmer',
        attributes: ['id', 'name', 'role']
      }
    ]
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Controle de privacidade
  if (transaction.private_expense && req.user.role === 'syndic') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado a esta transação'
    });
  }

  // Verificar se usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === transaction.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta transação'
      });
    }
  }

  res.json({
    success: true,
    data: { transaction }
  });
});

// @desc    Criar nova transação financeira
// @route   POST /api/financial/transactions
// @access  Private (admin, manager, syndic)
const createTransaction = asyncHandler(async (req, res) => {
  const {
    condominium_id,
    unit_id,
    user_id,
    type,
    category,
    description,
    amount,
    due_date,
    payment_method,
    reference_month,
    reference_year,
    invoice_number,
    receipt_url,
    notes,
    late_fee = 0,
    discount = 0,
    // Campos avançados
    pix_type,
    pix_key,
    pix_recipient_name,
    mixed_payment = false,
    pix_amount = 0,
    cash_amount = 0,
    private_expense = false
  } = req.body;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para criar transações financeiras'
    });
  }

  // Verificar se o usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para criar transação neste condomínio'
      });
    }
  }

  // Verificar se o condomínio existe
  const condominium = await Condominium.findByPk(condominium_id);
  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  // Validações de pagamento misto
  if (mixed_payment) {
    if (!pix_amount || !cash_amount) {
      return res.status(400).json({
        success: false,
        message: 'Para pagamentos mistos, é necessário informar os valores PIX e dinheiro'
      });
    }
    
    const totalMixed = parseFloat(pix_amount) + parseFloat(cash_amount);
    const expectedTotal = parseFloat(amount) + parseFloat(late_fee) - parseFloat(discount);
    
    if (Math.abs(totalMixed - expectedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'A soma dos valores PIX e dinheiro deve ser igual ao valor total da transação'
      });
    }
  }

  // Validações PIX
  if (['pix', 'pix_a', 'pix_b', 'pix_c'].includes(payment_method)) {
    if (!pix_key) {
      return res.status(400).json({
        success: false,
        message: 'Chave PIX é obrigatória para pagamentos PIX'
      });
    }
    
    // Definir pix_type baseado no payment_method
    if (payment_method === 'pix_a') pix_type = 'A';
    if (payment_method === 'pix_b') pix_type = 'B';
    if (payment_method === 'pix_c') pix_type = 'C';
  }

  // Calcular saldo antes da transação (para auditoria)
  let currentBalance = 0;
  try {
    currentBalance = await calculateCondominiumBalance(condominium_id);
  } catch (error) {
    logger.warn('Erro ao calcular saldo do condomínio, usando 0:', error.message);
  }
  const transaction = await FinancialTransaction.create({
    condominium_id,
    unit_id: unit_id || null,
    user_id: user_id || null,
    type,
    category,
    description,
    amount,
    due_date,
    payment_method,
    reference_month,
    reference_year,
    invoice_number,
    receipt_url,
    notes: notes ? `${notes}\n\n--- Criado por: ${req.user.name} (${req.user.role}) ---` : `--- Criado por: ${req.user.name} (${req.user.role}) ---`,
    late_fee,
    discount,
    pix_type: pix_type || null,
    pix_key: pix_key || null,
    pix_recipient_name: pix_recipient_name || null,
    mixed_payment,
    pix_amount,
    cash_amount,
    private_expense,
    created_by: req.user.id,
    balance_before: currentBalance,
    balance_after: type === 'income' ? 
      currentBalance + parseFloat(amount) + parseFloat(late_fee) - parseFloat(discount) :
      currentBalance - (parseFloat(amount) + parseFloat(late_fee) - parseFloat(discount))
  });

  // Buscar a transação criada com relacionamentos
  const createdTransaction = await FinancialTransaction.findByPk(transaction.id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role']
      }
    ]
  });

  logger.info(`Transação financeira criada: ${transaction.id} por usuário ${req.user.id}`);

  // Enviar notificação se for uma transação importante
  try {
    await notificationService.emitSystemNotification(
      condominium_id,
      `Nova transação financeira: ${description} - R$ ${amount}`,
      'medium',
      ['admin', 'manager']
    );
  } catch (error) {
    logger.warn('Erro ao enviar notificação de transação financeira:', error);
  }

  // Invalidar cache financeiro do condomínio
  await cacheService.invalidateFinancialCache(condominium_id);

  res.status(201).json({
    success: true,
    message: 'Transação financeira criada com sucesso',
    data: { transaction: createdTransaction }
  });
});

// Função auxiliar para calcular saldo do condomínio
async function calculateCondominiumBalance(condominiumId) {
  const result = await FinancialTransaction.findOne({
    where: {
      condominium_id: condominiumId,
      status: 'paid'
    },
    attributes: [
      [
        sequelize.literal(`
          SUM(CASE 
            WHEN type = 'income' THEN (amount + late_fee - discount)
            ELSE -(amount + late_fee - discount)
          END)
        `),
        'balance'
      ]
    ],
    raw: true
  });

  return parseFloat(result?.balance || 0);
}

// @desc    Atualizar transação financeira
// @route   PUT /api/financial/transactions/:id
// @access  Private (admin, manager, creator)
const updateTransaction = asyncHandler(async (req, res) => {
  console.log('=== UPDATE TRANSACTION CALLED ===');
  console.log('ID:', req.params.id);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user.email);
  
  const { id } = req.params;
  const updates = req.body;

  const transaction = await FinancialTransaction.findByPk(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Verificar permissões
  if (req.user.role !== 'admin' && 
      req.user.role !== 'manager' && 
      transaction.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para editar esta transação'
    });
  }

  // Verificar se usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === transaction.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para editar transação deste condomínio'
      });
    }
  }

  // Não permitir edição de transações já pagas (apenas admin)
  if (transaction.status === 'paid' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Transações pagas só podem ser editadas por administradores'
    });
  }

  // Validações especiais para pagamentos mistos
  if (updates.mixed_payment && (updates.pix_amount || updates.cash_amount)) {
    const pix_amount = updates.pix_amount || transaction.pix_amount;
    const cash_amount = updates.cash_amount || transaction.cash_amount;
    const amount = updates.amount || transaction.amount;
    const late_fee = updates.late_fee || transaction.late_fee;
    const discount = updates.discount || transaction.discount;
    
    const totalMixed = parseFloat(pix_amount) + parseFloat(cash_amount);
    const expectedTotal = parseFloat(amount) + parseFloat(late_fee) - parseFloat(discount);
    
    if (Math.abs(totalMixed - expectedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'A soma dos valores PIX e dinheiro deve ser igual ao valor total'
      });
    }
  }

  // Comparar valores antigos com novos para registrar mudanças específicas
  const changes = [];
  const fieldLabels = {
    type: 'Tipo',
    category: 'Categoria',
    description: 'Descrição',
    amount: 'Valor',
    due_date: 'Data de vencimento',
    payment_method: 'Método de pagamento',
    reference_month: 'Mês de referência',
    reference_year: 'Ano de referência',
    invoice_number: 'Número da fatura',
    receipt_url: 'URL do comprovante',
    late_fee: 'Multa',
    discount: 'Desconto',
    pix_key: 'Chave PIX',
    pix_recipient_name: 'Nome do destinatário PIX',
    mixed_payment: 'Pagamento misto',
    pix_amount: 'Valor PIX',
    cash_amount: 'Valor dinheiro',
    private_expense: 'Despesa privada',
    unit_id: 'Unidade',
    user_id: 'Usuário'
  };

  const formatValue = (field, value) => {
    if (value === null || value === undefined) return 'Não informado';
    
    switch (field) {
      case 'amount':
      case 'late_fee':
      case 'discount':
      case 'pix_amount':
      case 'cash_amount':
        return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
      case 'due_date':
        return new Date(value).toLocaleDateString('pt-BR');
      case 'type':
        return value === 'income' ? 'Receita' : 'Despesa';
      case 'payment_method':
        const methods = {
          cash: 'Dinheiro',
          pix: 'PIX',
          pix_a: 'PIX A',
          pix_b: 'PIX B',
          pix_c: 'PIX C',
          bank_transfer: 'Transferência Bancária',
          credit_card: 'Cartão de Crédito',
          debit_card: 'Cartão de Débito',
          check: 'Cheque',
          boleto: 'Boleto',
          mixed: 'Pagamento Misto'
        };
        return methods[value] || value;
      case 'category':
        const categories = {
          condominium_fee: 'Taxa Condominial',
          water: 'Água',
          electricity: 'Energia',
          gas: 'Gás',
          maintenance: 'Manutenção',
          security: 'Segurança',
          cleaning: 'Limpeza',
          insurance: 'Seguro',
          reserve_fund: 'Fundo de Reserva',
          other: 'Outros'
        };
        return categories[value] || value;
      case 'mixed_payment':
      case 'private_expense':
        return value ? 'Sim' : 'Não';
      default:
        return value.toString();
    }
  };

  // Função para normalizar valores para comparação
  const normalizeValue = (field, value) => {
    if (value === null || value === undefined || value === '') return null;
    
    // Tratamento especial para datas
    if (field === 'due_date') {
      if (!value) return null;
      // Se já é uma string no formato YYYY-MM-DD, manter
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // Converter para formato YYYY-MM-DD para comparação
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    }
    
    // Tratamento especial para números
    if (['amount', 'late_fee', 'discount', 'pix_amount', 'cash_amount', 'reference_month', 'reference_year'].includes(field)) {
      return parseFloat(value) || 0;
    }
    
    // Tratamento para booleans
    if (['mixed_payment', 'private_expense'].includes(field)) {
      return Boolean(value);
    }
    
    return value;
  };

  // Debug: registrar campos sendo atualizados
  console.log('=== DEBUG UPDATE TRANSACTION ===');
  console.log('Updates recebidos:', updates);
  console.log('Transaction ID:', transaction.id);

  // Verificar mudanças em cada campo (exceto notes)
  Object.keys(updates).forEach(field => {
    if (field === 'notes') return; // Pular o campo notes
    
    const oldValue = transaction[field];
    const newValue = updates[field];
    
    // Normalizar valores para comparação
    const oldNormalized = normalizeValue(field, oldValue);
    const newNormalized = normalizeValue(field, newValue);
    
    // Debug específico para due_date
    if (field === 'due_date') {
      console.log(`Campo ${field}:`);
      console.log('  - Valor antigo:', oldValue);
      console.log('  - Valor novo:', newValue);
      console.log('  - Antigo normalizado:', oldNormalized);
      console.log('  - Novo normalizado:', newNormalized);
    }
    
    // Comparação mais robusta
    let valuesAreDifferent = false;
    
    if (oldNormalized === null && newNormalized === null) {
      valuesAreDifferent = false;
    } else if (oldNormalized === null || newNormalized === null) {
      valuesAreDifferent = true;
    } else {
      // Para datas e números, usar comparação mais específica
      if (field === 'due_date') {
        valuesAreDifferent = oldNormalized !== newNormalized;
      } else if (typeof oldNormalized === 'number' && typeof newNormalized === 'number') {
        valuesAreDifferent = Math.abs(oldNormalized - newNormalized) > 0.001;
      } else {
        valuesAreDifferent = String(oldNormalized) !== String(newNormalized);
      }
    }
    
    if (valuesAreDifferent) {
      const fieldLabel = fieldLabels[field] || field;
      const oldFormatted = formatValue(field, oldValue);
      const newFormatted = formatValue(field, newValue);
      
      console.log(`MUDANÇA DETECTADA - ${fieldLabel}: "${oldFormatted}" → "${newFormatted}"`);
      changes.push(`${fieldLabel}: "${oldFormatted}" → "${newFormatted}"`);
    }
  });
  
  console.log('Mudanças detectadas:', changes);
  console.log('=== FIM DEBUG ===');

  // Só registrar modificação se houve mudanças reais nos dados
  let modificationLog = null;
  if (changes.length > 0) {
    const changeDetails = changes.join('; ');
    modificationLog = `[MODIFICAÇÃO - ${new Date().toLocaleString('pt-BR')}] Alterado por ${req.user.name} (${req.user.role}): ${changeDetails}`;
  }
  
  // Separar observações originais dos logs de histórico
  let originalNotes = transaction.notes || '';
  let historyLogs = '';
  
  // Separar seções
  const historyIndex = originalNotes.indexOf('--- HISTÓRICO ---');
  if (historyIndex !== -1) {
    // Extrair observações originais (tudo antes do histórico)
    const notesBeforeHistory = originalNotes.substring(0, historyIndex).trim();
    // Extrair histórico existente
    const existingHistory = originalNotes.substring(historyIndex + '--- HISTÓRICO ---'.length).trim();
    
    originalNotes = notesBeforeHistory;
    if (existingHistory) {
      historyLogs = existingHistory;
    }
  }
  
  // Remover marcador "--- Criado por: ---" das observações originais para limpeza
  originalNotes = originalNotes.replace(/--- Criado por:.*?---/g, '').trim();
  
  // Determinar novas observações
  let newNotes = '';
  if (updates.notes !== undefined) {
    // Se notes foi fornecido no update, usar esse valor (tratar null como string vazia)
    newNotes = (updates.notes || '').trim();
  } else {
    // Senão manter as observações originais
    newNotes = originalNotes;
  }
  
  // Adicionar identificação de quem modificou se há observações novas
  if (newNotes) {
    newNotes = `${newNotes}\n\n--- Modificado por: ${req.user.name} (${req.user.role}) ---`;
  }
  
  // Adicionar novo log ao histórico apenas se houve modificações nos dados
  let newHistoryLogs = historyLogs;
  if (modificationLog) {
    newHistoryLogs = historyLogs ? `${historyLogs}\n${modificationLog}` : modificationLog;
  }
  
  // Separar updates dos outros campos do campo notes
  const fieldsToUpdate = { ...updates };
  delete fieldsToUpdate.notes; // Remover notes dos updates normais
  
  // Montar notes final
  let finalNotes = newNotes || '';
  
  // Se há histórico para adicionar
  if (newHistoryLogs) {
    finalNotes = finalNotes ? 
      `${finalNotes}\n\n--- HISTÓRICO ---\n${newHistoryLogs}` : 
      `--- HISTÓRICO ---\n${newHistoryLogs}`;
  }
  
  // Se não há notes novas nem histórico, preservar notes existentes
  if (!finalNotes && !newNotes && !modificationLog) {
    finalNotes = originalNotes;
    if (historyLogs) {
      finalNotes = finalNotes ? 
        `${finalNotes}\n\n--- HISTÓRICO ---\n${historyLogs}` : 
        `--- HISTÓRICO ---\n${historyLogs}`;
    }
  }
  
  // Preparar update final
  const updateData = { ...fieldsToUpdate };
  if (finalNotes || updates.notes !== undefined) {
    updateData.notes = finalNotes;
  }
  
  await transaction.update(updateData);

  // Buscar transação atualizada
  const updatedTransaction = await FinancialTransaction.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'role']
      }
    ]
  });

  // Invalidar cache financeiro do condomínio
  await cacheService.invalidateFinancialCache(updatedTransaction.condominium_id);

  logger.info(`Transação financeira atualizada: ${id} por usuário ${req.user.id}`);

  res.json({
    success: true,
    message: 'Transação financeira atualizada com sucesso',
    data: { transaction: updatedTransaction }
  });
});

// @desc    Deletar transação financeira
// @route   DELETE /api/financial/transactions/:id
// @access  Private (admin, creator)
const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transaction = await FinancialTransaction.findByPk(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Verificar permissões (apenas admin ou criador)
  if (req.user.role !== 'admin' && transaction.created_by !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para deletar esta transação'
    });
  }

  // Não permitir exclusão de transações pagas
  if (transaction.status === 'paid') {
    return res.status(403).json({
      success: false,
      message: 'Transações pagas não podem ser excluídas'
    });
  }

  const transactionData = {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount,
    condominium_id: transaction.condominium_id
  };

  await transaction.destroy();

  logger.info(`Transação financeira deletada: ${id} por usuário ${req.user.id}`);

  // Notificar administradores
  try {
    await notificationService.emitSystemNotification(
      transactionData.condominium_id,
      `Transação financeira removida: ${transactionData.description}`,
      'high',
      ['admin', 'manager']
    );
  } catch (error) {
    logger.warn('Erro ao enviar notificação de exclusão de transação:', error);
  }

  // Invalidar cache financeiro do condomínio
  await cacheService.invalidateFinancialCache(transactionData.condominium_id);

  res.json({
    success: true,
    message: 'Transação financeira deletada com sucesso'
  });
});

// @desc    Confirmar pagamento em dinheiro
// @route   POST /api/financial/transactions/:id/confirm-cash
// @access  Private (admin, manager, syndic)
const confirmCashPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const transaction = await FinancialTransaction.findByPk(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para confirmar pagamentos'
    });
  }

  // Verificar se é pagamento em dinheiro
  if (!['cash', 'mixed'].includes(transaction.payment_method)) {
    return res.status(400).json({
      success: false,
      message: 'Esta transação não é um pagamento em dinheiro'
    });
  }

  // Verificar se já foi confirmado
  if (transaction.cash_confirmed) {
    return res.status(400).json({
      success: false,
      message: 'Este pagamento em dinheiro já foi confirmado'
    });
  }

  const confirmationDetails = notes || 'Recebimento em dinheiro confirmado';
  const confirmationLog = `[CONFIRMAÇÃO - ${new Date().toLocaleString('pt-BR')}] Confirmado por ${req.user.name} (${req.user.role}): ${confirmationDetails}`;
  
  // Separar observações originais dos logs de histórico
  let originalNotes = transaction.notes || '';
  let historyLogs = '';
  
  const logPattern = /\[(MODIFICAÇÃO|APROVAÇÃO|CANCELAMENTO|CONFIRMAÇÃO|EXCLUSÃO) - [^\]]+\].*/g;
  const logs = originalNotes.match(logPattern) || [];
  if (logs.length > 0) {
    originalNotes = originalNotes.replace(logPattern, '').replace(/--- HISTÓRICO ---.*$/s, '').trim();
    historyLogs = logs.join('\n');
  }
  
  const newHistoryLogs = historyLogs ? `${historyLogs}\n${confirmationLog}` : confirmationLog;
  
  await transaction.update({
    cash_confirmed: true,
    cash_confirmed_by: req.user.id,
    cash_confirmed_at: new Date(),
    status: 'paid',
    paid_date: new Date(),
    notes: originalNotes ? `${originalNotes}\n\n--- HISTÓRICO ---\n${newHistoryLogs}` : `--- HISTÓRICO ---\n${newHistoryLogs}`
  });

  // Buscar transação atualizada
  const updatedTransaction = await FinancialTransaction.findByPk(id, {
    include: [
      {
        model: User,
        as: 'cash_confirmer',
        attributes: ['id', 'name', 'role']
      }
    ]
  });

  logger.info(`Pagamento em dinheiro confirmado: ${id} por usuário ${req.user.id}`);

  // Notificar criador da transação
  try {
    if (transaction.created_by && transaction.created_by !== req.user.id) {
      await notificationService.emitSystemNotification(
        transaction.condominium_id,
        `Pagamento em dinheiro confirmado: ${transaction.description}`,
        'medium',
        null
      );
    }
  } catch (error) {
    logger.warn('Erro ao enviar notificação de confirmação:', error);
  }

  res.json({
    success: true,
    message: 'Pagamento em dinheiro confirmado com sucesso',
    data: { transaction: updatedTransaction }
  });
});

// @desc    Aprovar transação financeira
// @route   POST /api/financial/transactions/:id/approve
// @access  Private (admin, manager)
const approveTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const transaction = await FinancialTransaction.findByPk(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Verificar permissões
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para aprovar transações'
    });
  }

  // Verificar se já foi aprovado
  if (transaction.approved_by) {
    return res.status(400).json({
      success: false,
      message: 'Esta transação já foi aprovada'
    });
  }

  const approvalDetails = notes || 'Pagamento autorizado e processado';
  const approvalLog = `[APROVAÇÃO - ${new Date().toLocaleString('pt-BR')}] Autorizado por ${req.user.name} (${req.user.role}): ${approvalDetails}`;
  
  // Separar observações originais dos logs de histórico
  let originalNotes = transaction.notes || '';
  let historyLogs = '';
  
  const logPattern = /\[(MODIFICAÇÃO|APROVAÇÃO|CANCELAMENTO|CONFIRMAÇÃO|EXCLUSÃO) - [^\]]+\].*/g;
  const logs = originalNotes.match(logPattern) || [];
  if (logs.length > 0) {
    originalNotes = originalNotes.replace(logPattern, '').replace(/--- HISTÓRICO ---.*$/s, '').trim();
    historyLogs = logs.join('\n');
  }
  
  const newHistoryLogs = historyLogs ? `${historyLogs}\n${approvalLog}` : approvalLog;
  
  await transaction.update({
    approved_by: req.user.id,
    approved_at: new Date(),
    status: 'paid',
    paid_date: new Date(),
    notes: originalNotes ? `${originalNotes}\n\n--- HISTÓRICO ---\n${newHistoryLogs}` : `--- HISTÓRICO ---\n${newHistoryLogs}`
  });

  logger.info(`Transação financeira aprovada: ${id} por usuário ${req.user.id}`);

  // Invalidar cache financeiro do condomínio
  await cacheService.invalidateFinancialCache(transaction.condominium_id);

  res.json({
    success: true,
    message: 'Transação financeira aprovada com sucesso'
  });
});

// @desc    Cancelar transação financeira
// @route   POST /api/financial/transactions/:id/cancel
// @access  Private (admin, manager)
const cancelTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const transaction = await FinancialTransaction.findByPk(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Verificar permissões
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para cancelar transações'
    });
  }

  // Verificar se pode ser cancelada
  if (!['pending', 'approved'].includes(transaction.status)) {
    return res.status(400).json({
      success: false,
      message: 'Esta transação não pode ser cancelada'
    });
  }

  const cancellationDetails = notes || 'Transação cancelada';
  const cancellationLog = `[CANCELAMENTO - ${new Date().toLocaleString('pt-BR')}] Cancelado por ${req.user.name} (${req.user.role}): ${cancellationDetails}`;
  
  // Separar observações originais dos logs de histórico
  let originalNotes = transaction.notes || '';
  let historyLogs = '';
  
  const logPattern = /\[(MODIFICAÇÃO|APROVAÇÃO|CANCELAMENTO|CONFIRMAÇÃO|EXCLUSÃO) - [^\]]+\].*/g;
  const logs = originalNotes.match(logPattern) || [];
  if (logs.length > 0) {
    originalNotes = originalNotes.replace(logPattern, '').replace(/--- HISTÓRICO ---.*$/s, '').trim();
    historyLogs = logs.join('\n');
  }
  
  const newHistoryLogs = historyLogs ? `${historyLogs}\n${cancellationLog}` : cancellationLog;
  
  await transaction.update({
    status: 'cancelled',
    cancelled_by: req.user.id,
    cancelled_at: new Date(),
    notes: originalNotes ? `${originalNotes}\n\n--- HISTÓRICO ---\n${newHistoryLogs}` : `--- HISTÓRICO ---\n${newHistoryLogs}`
  });

  logger.info(`Transação financeira cancelada: ${id} por usuário ${req.user.id}`);

  res.json({
    success: true,
    message: 'Transação financeira cancelada com sucesso'
  });
});

// @desc    Excluir transação financeira (soft delete)
// @route   POST /api/financial/transactions/:id/soft-delete
// @access  Private (admin, manager)
const softDeleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const transaction = await FinancialTransaction.findByPk(id);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transação financeira não encontrada'
    });
  }

  // Verificar permissões
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para excluir transações'
    });
  }

  // Verificar se pode ser excluída
  if (!['pending', 'cancelled'].includes(transaction.status)) {
    return res.status(400).json({
      success: false,
      message: 'Esta transação não pode ser excluída'
    });
  }

  await transaction.update({
    status: 'deleted',
    deleted_by: req.user.id,
    deleted_at: new Date(),
    notes: notes ? `${transaction.notes || ''}\n[EXCLUSÃO] ${notes}` : transaction.notes
  });

  logger.info(`Transação financeira excluída: ${id} por usuário ${req.user.id}`);

  res.json({
    success: true,
    message: 'Transação financeira excluída com sucesso'
  });
});

// @desc    Obter saldo do condomínio
// @route   GET /api/financial/balance/:condominiumId
// @access  Private
const getCondominiumBalance = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;

  // Verificar se usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === parseInt(condominiumId));
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este condomínio'
      });
    }
  }

  // Verificar cache primeiro
  const cachedBalance = await cacheService.getCachedFinancialBalance(condominiumId);
  if (cachedBalance) {
    logger.debug(`Cache HIT para saldo do condomínio ${condominiumId}`);
    res.header('X-Cache', 'HIT');
    return res.json({
      success: true,
      message: 'Saldo obtido com sucesso',
      data: cachedBalance
    });
  }

  const condominium = await Condominium.findByPk(condominiumId);
  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  const balance = await calculateCondominiumBalance(condominiumId);

  // Obter todas as transações para usar o sistema de tags
  const allTransactions = await FinancialTransaction.findAll({
    where: { condominium_id: condominiumId },
    attributes: [
      'id', 'status', 'due_date', 'amount', 'late_fee', 'discount', 
      'type', 'paid_date', 'approved_at'
    ],
    raw: true
  });

  // Usar sistema de tags para calcular estatísticas robustas
  const tagStats = calculateTagStatistics(allTransactions);
  
  // Calcular receitas e despesas pagas separadamente
  const paidTransactions = allTransactions.filter(t => getTransactionTag(t).tag === 'paid');
  const totalIncome = paidTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0) + parseFloat(t.late_fee || 0) - parseFloat(t.discount || 0), 0);
  
  const totalExpenses = paidTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0) + parseFloat(t.late_fee || 0) - parseFloat(t.discount || 0), 0);

  // Debug do sistema de tags
  console.log('Sistema de Tags - Estatísticas calculadas:');
  console.log('- Transações pendentes:', tagStats.pending_count, 'Valor:', tagStats.pending_amount);
  console.log('- Transações aprovadas:', tagStats.approved_count, 'Valor:', tagStats.approved_amount);
  console.log('- Transações em atraso:', tagStats.overdue_count, 'Valor:', tagStats.overdue_amount);
  console.log('- Transações pagas:', tagStats.paid_count, 'Valor:', tagStats.paid_amount);
  console.log('- Transações canceladas:', tagStats.cancelled_count, 'Valor:', tagStats.cancelled_amount);
  
  const stats = {
    total_income: totalIncome,
    total_expenses: totalExpenses,
    pending_amount: tagStats.pending_amount, // Apenas pendentes (aprovados não existem mais no modelo)
    overdue_amount: tagStats.overdue_amount,
    pending_count: tagStats.pending_count, // Apenas pendentes
    overdue_count: tagStats.overdue_count
  };

  // Obter transações recentes
  const recentTransactions = await FinancialTransaction.findAll({
    where: { condominium_id: condominiumId },
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: 5,
    attributes: ['id', 'type', 'description', 'amount', 'status', 'created_at']
  });

  const responseData = {
    condominium: {
      id: condominium.id,
      name: condominium.name
    },
    current_balance: parseFloat(balance.toFixed(2)),
    statistics: {
      total_income: parseFloat(stats.total_income || 0),
      total_expenses: parseFloat(stats.total_expenses || 0),
      pending_amount: parseFloat(stats.pending_amount || 0),
      overdue_amount: parseFloat(stats.overdue_amount || 0),
      pending_count: parseInt(stats.pending_count || 0),
      overdue_count: parseInt(stats.overdue_count || 0)
    },
    recent_transactions: recentTransactions
  };

  // Cache dos dados (TTL: 1 minuto para saldos)
  await cacheService.setCachedFinancialBalance(condominiumId, responseData, 60);

  logger.info(`Saldo consultado para condomínio ${condominiumId} por usuário ${req.user.id}`);
  res.header('X-Cache', 'MISS');

  res.json({
    success: true,
    message: 'Saldo obtido com sucesso',
    data: responseData
  });
});

// @desc    Obter relatório financeiro
// @route   GET /api/financial/report/:condominiumId
// @access  Private (admin, manager, syndic)
const getFinancialReport = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { 
    period = 'month', // month, quarter, year
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1 
  } = req.query;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para relatórios financeiros'
    });
  }

  // Definir período de consulta
  let startDate, endDate;
  
  if (period === 'month') {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0);
  } else if (period === 'quarter') {
    const quarterMonth = Math.floor((month - 1) / 3) * 3;
    startDate = new Date(year, quarterMonth, 1);
    endDate = new Date(year, quarterMonth + 3, 0);
  } else if (period === 'year') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
  }

  const whereClause = {
    condominium_id: condominiumId,
    created_at: {
      [Op.between]: [startDate, endDate]
    }
  };

  // Controle de privacidade para síndicos
  if (req.user.role === 'syndic') {
    whereClause.private_expense = false;
  }

  // Relatório por categoria
  const categoryReport = await FinancialTransaction.findAll({
    where: whereClause,
    attributes: [
      'category',
      'type',
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['category', 'type'],
    raw: true
  });

  // Relatório por status
  const statusReport = await FinancialTransaction.findAll({
    where: whereClause,
    attributes: [
      'status',
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  // Relatório por método de pagamento
  const paymentMethodReport = await FinancialTransaction.findAll({
    where: {
      ...whereClause,
      status: 'paid'
    },
    attributes: [
      'payment_method',
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['payment_method'],
    raw: true
  });

  logger.info(`Relatório financeiro gerado para condomínio ${condominiumId} por usuário ${req.user.id}`);

  res.json({
    success: true,
    data: {
      period: {
        type: period,
        start_date: startDate,
        end_date: endDate,
        year: parseInt(year),
        month: period === 'month' ? parseInt(month) : null
      },
      reports: {
        by_category: categoryReport,
        by_status: statusReport,
        by_payment_method: paymentMethodReport
      }
    }
  });
});

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  confirmCashPayment,
  approveTransaction,
  cancelTransaction,
  softDeleteTransaction,
  getCondominiumBalance,
  getFinancialReport,
  calculateCondominiumBalance
};