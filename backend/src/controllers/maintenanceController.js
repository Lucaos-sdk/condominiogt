const { MaintenanceRequest, Condominium, Unit, User, sequelize } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

// @desc    Obter todas as solicitações de manutenção
// @route   GET /api/maintenance/requests
// @access  Private
const getMaintenanceRequests = asyncHandler(async (req, res) => {
  
  const { 
    page = 1, 
    limit = 20, 
    search, 
    category, 
    priority, 
    status, 
    condominium_id,
    unit_id,
    user_id,
    date_from,
    date_to 
  } = req.query;
  
  const offset = (page - 1) * limit;
  const whereClause = {};
  
  // Se não for admin, mostrar apenas solicitações dos condomínios do usuário
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
    
    // Residentes só veem suas próprias solicitações
    if (req.user.role === 'resident') {
      whereClause.user_id = req.user.id;
    }
  } else if (condominium_id) {
    whereClause.condominium_id = condominium_id;
  }

  // Filtros adicionais
  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } },
      { assigned_to: { [Op.like]: `%${search}%` } }
    ];
  }

  if (category) whereClause.category = category;
  if (priority) whereClause.priority = priority;
  if (status) whereClause.status = status;
  if (unit_id) whereClause.unit_id = unit_id;
  if (user_id) whereClause.user_id = user_id;

  // Filtro por data
  if (date_from || date_to) {
    whereClause.created_at = {};
    if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
    if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
  }

  const { count, rows: requests } = await MaintenanceRequest.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
    attributes: { exclude: ['images'] }, // Excluir imagens para melhorar performance
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'type']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  logger.info(`Solicitações de manutenção consultadas por usuário ${req.user.id}: ${count} registros`);

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: parseInt(page),
        per_page: parseInt(limit)
      }
    }
  });
});

// @desc    Obter solicitação de manutenção por ID
// @route   GET /api/maintenance/requests/:id
// @access  Private
const getMaintenanceRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const request = await MaintenanceRequest.findByPk(id, {
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
      }
    ]
  });

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Verificar se usuário tem acesso
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === request.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta solicitação'
      });
    }
    
    // Residentes só veem suas próprias solicitações
    if (req.user.role === 'resident' && request.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta solicitação'
      });
    }
  }

  res.json({
    success: true,
    data: { request }
  });
});

// @desc    Criar nova solicitação de manutenção
// @route   POST /api/maintenance/requests
// @access  Private
const createMaintenanceRequest = asyncHandler(async (req, res) => {
  const {
    condominium_id,
    unit_id,
    title,
    description,
    category,
    priority = 'medium',
    location,
    estimated_cost,
    scheduled_date,
    images = []
  } = req.body;

  // Verificar se o usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para criar solicitação neste condomínio'
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

  // Verificar se a unidade existe (se fornecida)
  if (unit_id) {
    const unit = await Unit.findByPk(unit_id);
    if (!unit || unit.condominium_id !== condominium_id) {
      return res.status(404).json({
        success: false,
        message: 'Unidade não encontrada neste condomínio'
      });
    }
  }

  const request = await MaintenanceRequest.create({
    condominium_id,
    unit_id,
    user_id: req.user.id,
    title,
    description,
    category,
    priority,
    location,
    estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null,
    scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
    images
  });

  // Buscar a solicitação criada com relacionamentos
  const createdRequest = await MaintenanceRequest.findByPk(request.id, {
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
      }
    ]
  });

  logger.info(`Solicitação de manutenção criada: ${request.id} por usuário ${req.user.id}`);

  // Enviar notificação para administradores e gestores
  try {
    await notificationService.emitSystemNotification(
      condominium_id,
      `Nova solicitação de manutenção: ${title}`,
      priority === 'urgent' ? 'high' : 'medium',
      ['admin', 'manager', 'syndic']
    );
  } catch (error) {
    logger.warn('Erro ao enviar notificação de solicitação de manutenção:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Solicitação de manutenção criada com sucesso',
    data: { request: createdRequest }
  });
});

// @desc    Atualizar solicitação de manutenção
// @route   PUT /api/maintenance/requests/:id
// @access  Private
const updateMaintenanceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const request = await MaintenanceRequest.findByPk(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Verificar permissões
  if (req.user.role !== 'admin' && 
      req.user.role !== 'manager' && 
      req.user.role !== 'syndic') {
    // Residentes só podem editar suas próprias solicitações pendentes
    if (request.user_id !== req.user.id || request.status !== 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para editar esta solicitação'
      });
    }
    
    // Residentes têm limitações no que podem editar
    const allowedFields = ['title', 'description', 'location', 'images'];
    const restrictedUpdates = Object.keys(updates).filter(field => !allowedFields.includes(field));
    
    if (restrictedUpdates.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Residentes não podem alterar: ${restrictedUpdates.join(', ')}`
      });
    }
  }

  // Verificar se usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === request.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para editar solicitação deste condomínio'
      });
    }
  }

  // Controle de datas automáticas
  if (updates.status === 'completed' && !request.completed_date) {
    updates.completed_date = new Date();
  }

  await request.update(updates);

  // Buscar solicitação atualizada
  const updatedRequest = await MaintenanceRequest.findByPk(id, {
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
      }
    ]
  });

  logger.info(`Solicitação de manutenção atualizada: ${id} por usuário ${req.user.id}`);

  // Notificar mudanças de status importantes
  if (updates.status && updates.status !== request.status) {
    try {
      let message = `Solicitação ${request.title} - Status: ${updates.status}`;
      let targetRoles = [];
      
      if (updates.status === 'in_progress') {
        message = `Manutenção iniciada: ${request.title}`;
        targetRoles = ['admin', 'manager', 'syndic'];
      } else if (updates.status === 'completed') {
        message = `Manutenção concluída: ${request.title}`;
        targetRoles = null; // Notificar todos
      }
      
      await notificationService.emitSystemNotification(
        request.condominium_id,
        message,
        'medium',
        targetRoles
      );
    } catch (error) {
      logger.warn('Erro ao enviar notificação de atualização:', error);
    }
  }

  res.json({
    success: true,
    message: 'Solicitação de manutenção atualizada com sucesso',
    data: { request: updatedRequest }
  });
});

// @desc    Deletar solicitação de manutenção
// @route   DELETE /api/maintenance/requests/:id
// @access  Private (admin, creator se pending)
const deleteMaintenanceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const request = await MaintenanceRequest.findByPk(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Verificar permissões
  if (req.user.role !== 'admin') {
    // Apenas o criador pode deletar, e apenas se estiver pendente
    if (request.user_id !== req.user.id || request.status !== 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Apenas solicitações pendentes podem ser excluídas pelo criador'
      });
    }
  }

  const requestData = {
    id: request.id,
    title: request.title,
    condominium_id: request.condominium_id
  };

  await request.destroy();

  logger.info(`Solicitação de manutenção deletada: ${id} por usuário ${req.user.id}`);

  res.json({
    success: true,
    message: 'Solicitação de manutenção deletada com sucesso'
  });
});

// @desc    Aprovar solicitação de manutenção
// @route   POST /api/maintenance/requests/:id/approve
// @access  Private (admin, manager, syndic)
const approveMaintenanceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    estimated_cost, 
    assigned_to, 
    assigned_contact, 
    scheduled_date,
    completed_date, 
    admin_notes 
  } = req.body;

  const request = await MaintenanceRequest.findByPk(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para aprovar solicitações'
    });
  }

  // Verificar se já foi aprovada
  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Apenas solicitações pendentes podem ser aprovadas'
    });
  }

  await request.update({
    status: 'in_progress',
    estimated_cost,
    assigned_to,
    assigned_contact,
    scheduled_date,
    completed_date,
    admin_notes: admin_notes ? `${request.admin_notes || ''}\n[APROVAÇÃO] ${admin_notes}` : request.admin_notes
  });

  logger.info(`Solicitação de manutenção aprovada: ${id} por usuário ${req.user.id}`);

  // Notificar aprovação
  try {
    await notificationService.emitSystemNotification(
      request.condominium_id,
      `Solicitação aprovada: ${request.title}`,
      'medium',
      null
    );
  } catch (error) {
    logger.warn('Erro ao enviar notificação de aprovação:', error);
  }

  res.json({
    success: true,
    message: 'Solicitação de manutenção aprovada com sucesso'
  });
});

// @desc    Rejeitar solicitação de manutenção
// @route   POST /api/maintenance/requests/:id/reject
// @access  Private (admin, manager, syndic)
const rejectMaintenanceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { admin_notes } = req.body;

  const request = await MaintenanceRequest.findByPk(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para rejeitar solicitações'
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Apenas solicitações pendentes podem ser rejeitadas'
    });
  }

  await request.update({
    status: 'rejected',
    admin_notes: admin_notes ? `${request.admin_notes || ''}\n[REJEIÇÃO] ${admin_notes}` : request.admin_notes
  });

  logger.info(`Solicitação de manutenção rejeitada: ${id} por usuário ${req.user.id}`);

  res.json({
    success: true,
    message: 'Solicitação de manutenção rejeitada'
  });
});

// @desc    Avaliar solicitação de manutenção concluída
// @route   POST /api/maintenance/requests/:id/rate
// @access  Private (creator only)
const rateMaintenanceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resident_rating, resident_feedback } = req.body;

  const request = await MaintenanceRequest.findByPk(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Solicitação de manutenção não encontrada'
    });
  }

  // Apenas o criador da solicitação pode avaliar
  if (request.user_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Apenas o criador da solicitação pode avaliá-la'
    });
  }

  // Apenas solicitações concluídas podem ser avaliadas
  if (request.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Apenas solicitações concluídas podem ser avaliadas'
    });
  }

  await request.update({
    resident_rating,
    resident_feedback
  });

  logger.info(`Solicitação de manutenção avaliada: ${id} por usuário ${req.user.id} - Nota: ${resident_rating}`);

  res.json({
    success: true,
    message: 'Avaliação registrada com sucesso'
  });
});

// @desc    Obter estatísticas de manutenção
// @route   GET /api/maintenance/stats/:condominiumId
// @access  Private (admin, manager, syndic)
const getMaintenanceStats = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { period = 'month', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  // Verificar permissões
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para relatórios de manutenção'
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

  // Estatísticas gerais
  const totalStats = await MaintenanceRequest.findOne({
    where: { condominium_id: condominiumId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_requests'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "pending" THEN 1 END')), 'pending_count'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "in_progress" THEN 1 END')), 'in_progress_count'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "completed" THEN 1 END')), 'completed_count'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "rejected" THEN 1 END')), 'rejected_count'],
      [sequelize.fn('AVG', sequelize.col('resident_rating')), 'average_rating'],
      [sequelize.fn('SUM', sequelize.col('actual_cost')), 'total_cost'],
      [sequelize.fn('AVG', sequelize.col('actual_cost')), 'average_cost']
    ],
    raw: true
  });

  // Estatísticas por categoria (excluindo concluídas e rejeitadas)
  const categoryWhereClause = {
    ...whereClause,
    status: {
      [Op.notIn]: ['completed', 'rejected']
    }
  };
  
  const categoryStats = await MaintenanceRequest.findAll({
    where: categoryWhereClause,
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('resident_rating')), 'avg_rating'],
      [sequelize.fn('SUM', sequelize.col('actual_cost')), 'total_cost']
    ],
    group: ['category'],
    raw: true
  });

  // Estatísticas por prioridade (excluindo concluídas e rejeitadas)
  const priorityWhereClause = {
    ...whereClause,
    status: {
      [Op.notIn]: ['completed', 'rejected']
    }
  };
  
  const priorityStats = await MaintenanceRequest.findAll({
    where: priorityWhereClause,
    attributes: [
      'priority',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.literal('TIMESTAMPDIFF(DAY, created_at, COALESCE(completed_date, NOW()))')), 'avg_resolution_days']
    ],
    group: ['priority'],
    raw: true
  });

  // Solicitações recentes
  const recentRequests = await MaintenanceRequest.findAll({
    where: { condominium_id: condominiumId },
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: 10,
    attributes: ['id', 'title', 'category', 'priority', 'status', 'created_at'] // Já exclui imagens
  });

  logger.info(`Estatísticas de manutenção geradas para condomínio ${condominiumId} por usuário ${req.user.id}`);

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
      total_statistics: {
        total_requests: parseInt(totalStats.total_requests || 0),
        pending_count: parseInt(totalStats.pending_count || 0),
        in_progress_count: parseInt(totalStats.in_progress_count || 0),
        completed_count: parseInt(totalStats.completed_count || 0),
        rejected_count: parseInt(totalStats.rejected_count || 0),
        average_rating: parseFloat(totalStats.average_rating || 0).toFixed(1),
        total_cost: parseFloat(totalStats.total_cost || 0),
        average_cost: parseFloat(totalStats.average_cost || 0)
      },
      category_breakdown: categoryStats,
      priority_breakdown: priorityStats,
      recent_requests: recentRequests
    }
  });
});

// @desc    Obter solicitações por condomínio
// @route   GET /api/maintenance/condominium/:condominiumId
// @access  Private
const getMaintenanceByCondominium = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { page = 1, limit = 10, status, priority, category } = req.query;
  const offset = (page - 1) * limit;

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

  const whereClause = { condominium_id: condominiumId };
  
  // Residentes só veem suas próprias solicitações
  if (req.user.role === 'resident') {
    whereClause.user_id = req.user.id;
  }

  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (category) whereClause.category = category;

  const { count, rows: requests } = await MaintenanceRequest.findAndCountAll({
    where: whereClause,
    attributes: { exclude: ['images'] }, // Excluir imagens para melhorar performance
    include: [
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'floor', 'type']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        current_page: parseInt(page),
        per_page: parseInt(limit)
      }
    }
  });
});

module.exports = {
  getMaintenanceRequests,
  getMaintenanceRequestById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  approveMaintenanceRequest,
  rejectMaintenanceRequest,
  rateMaintenanceRequest,
  getMaintenanceStats,
  getMaintenanceByCondominium
};