const { Communication, Condominium, User, sequelize } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

// @desc    Obter todas as comunicações
// @route   GET /api/communications
// @access  Private
const getCommunications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, type, priority, status, condominium_id } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  // Se não for admin, mostrar apenas comunicações dos condomínios do usuário
  if (req.user.role !== 'admin') {
    if (condominium_id) {
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

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { content: { [Op.like]: `%${search}%` } }
    ];
  }

  if (type) {
    whereClause.type = type;
  }

  if (priority) {
    whereClause.priority = priority;
  }

  if (status) {
    whereClause.status = status;
  }

  const { count, rows: communications } = await Communication.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Comunicações obtidas com sucesso',
    data: {
      communications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

// @desc    Obter comunicação por ID
// @route   GET /api/communications/:id
// @access  Private
const getCommunicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const communication = await Communication.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'code', 'address']
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  if (!communication) {
    return res.status(404).json({
      success: false,
      message: 'Comunicação não encontrada'
    });
  }

  // Verificar permissão de acesso
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === communication.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta comunicação'
      });
    }
  }

  // Incrementar contador de visualizações
  await communication.increment('views_count');

  res.json({
    success: true,
    message: 'Comunicação obtida com sucesso',
    data: { communication }
  });
});

// @desc    Criar nova comunicação
// @route   POST /api/communications
// @access  Private (admin, manager, syndic)
const createCommunication = asyncHandler(async (req, res) => {
  const {
    condominium_id,
    type,
    title,
    content,
    priority = 'medium',
    status = 'draft',
    target_audience = 'all',
    target_units = [],
    publish_date,
    expire_date,
    attachments = [],
    send_email = false,
    send_whatsapp = false
  } = req.body;

  // Verificar se o usuário tem permissão para criar comunicação neste condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para criar comunicação neste condomínio'
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

  const communication = await Communication.create({
    condominium_id,
    author_id: req.user.id,
    type,
    title,
    content,
    priority,
    status,
    target_audience,
    target_units,
    publish_date,
    expire_date,
    attachments,
    send_email,
    send_whatsapp
  });

  // Buscar a comunicação criada com relacionamentos
  const createdCommunication = await Communication.findByPk(communication.id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  logger.info(`Comunicação criada: ${communication.id} por usuário ${req.user.id}`);

  // Emitir notificação em tempo real
  try {
    await notificationService.emitNewCommunication(createdCommunication, req.user.id);
  } catch (error) {
    logger.warn('Erro ao emitir notificação de nova comunicação:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Comunicação criada com sucesso',
    data: { communication: createdCommunication }
  });
});

// @desc    Atualizar comunicação
// @route   PUT /api/communications/:id
// @access  Private (admin, manager, syndic, author)
const updateCommunication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    type,
    title,
    content,
    priority,
    status,
    target_audience,
    target_units,
    publish_date,
    expire_date,
    attachments,
    send_email,
    send_whatsapp
  } = req.body;

  const communication = await Communication.findByPk(id);

  if (!communication) {
    return res.status(404).json({
      success: false,
      message: 'Comunicação não encontrada'
    });
  }

  // Verificar permissão de edição
  const canEdit = req.user.role === 'admin' || 
                 communication.author_id === req.user.id ||
                 (req.user.role === 'manager' || req.user.role === 'syndic');

  if (!canEdit) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para editar esta comunicação'
    });
  }

  // Se não for admin, verificar se tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === communication.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para editar comunicação deste condomínio'
      });
    }
  }

  const updateData = {};
  if (type !== undefined) updateData.type = type;
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;
  if (target_audience !== undefined) updateData.target_audience = target_audience;
  if (target_units !== undefined) updateData.target_units = target_units;
  if (publish_date !== undefined) updateData.publish_date = publish_date;
  if (expire_date !== undefined) updateData.expire_date = expire_date;
  if (attachments !== undefined) updateData.attachments = attachments;
  if (send_email !== undefined) updateData.send_email = send_email;
  if (send_whatsapp !== undefined) updateData.send_whatsapp = send_whatsapp;

  await communication.update(updateData);

  // Buscar a comunicação atualizada com relacionamentos
  const updatedCommunication = await Communication.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  logger.info(`Comunicação atualizada: ${id} por usuário ${req.user.id}`);

  // Emitir notificação em tempo real
  try {
    await notificationService.emitUpdatedCommunication(updatedCommunication, req.user.id);
  } catch (error) {
    logger.warn('Erro ao emitir notificação de comunicação atualizada:', error);
  }

  res.json({
    success: true,
    message: 'Comunicação atualizada com sucesso',
    data: { communication: updatedCommunication }
  });
});

// @desc    Deletar comunicação
// @route   DELETE /api/communications/:id
// @access  Private (admin, author)
const deleteCommunication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const communication = await Communication.findByPk(id);

  if (!communication) {
    return res.status(404).json({
      success: false,
      message: 'Comunicação não encontrada'
    });
  }

  // Verificar permissão de exclusão (apenas admin ou autor)
  const canDelete = req.user.role === 'admin' || communication.author_id === req.user.id;

  if (!canDelete) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para deletar esta comunicação'
    });
  }

  // Salvar dados da comunicação antes de deletar (para notificação)
  const communicationData = {
    id: communication.id,
    title: communication.title,
    condominium_id: communication.condominium_id
  };

  await communication.destroy();

  logger.info(`Comunicação deletada: ${id} por usuário ${req.user.id}`);

  // Emitir notificação em tempo real
  try {
    await notificationService.emitDeletedCommunication(
      communicationData, 
      communicationData.condominium_id, 
      req.user.id
    );
  } catch (error) {
    logger.warn('Erro ao emitir notificação de comunicação deletada:', error);
  }

  res.json({
    success: true,
    message: 'Comunicação deletada com sucesso'
  });
});

// @desc    Obter comunicações por condomínio
// @route   GET /api/communications/condominium/:condominiumId
// @access  Private
const getCommunicationsByCondominium = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { page = 1, limit = 10, type, priority, status } = req.query;
  const offset = (page - 1) * limit;

  // Verificar se o usuário tem acesso a este condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === parseInt(condominiumId));
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a comunicações deste condomínio'
      });
    }
  }

  const whereClause = { condominium_id: condominiumId };

  if (type) whereClause.type = type;
  if (priority) whereClause.priority = priority;
  if (status) whereClause.status = status;

  const { count, rows: communications } = await Communication.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'role']
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Comunicações do condomínio obtidas com sucesso',
    data: {
      communications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

// @desc    Curtir/Descurtir comunicação
// @route   POST /api/communications/:id/like
// @access  Private
const toggleLikeCommunication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const communication = await Communication.findByPk(id);

  if (!communication) {
    return res.status(404).json({
      success: false,
      message: 'Comunicação não encontrada'
    });
  }

  // Verificar se o usuário tem acesso a esta comunicação
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === communication.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta comunicação'
      });
    }
  }

  // Por simplicidade, vamos apenas incrementar o contador
  // Em uma implementação completa, seria necessário controlar quem já curtiu
  await communication.increment('likes_count');

  // Buscar comunicação atualizada para notificação
  const updatedCommunication = await Communication.findByPk(id, {
    include: [{
      model: User,
      as: 'author',
      attributes: ['id', 'name', 'email']
    }]
  });

  // Emitir notificação em tempo real
  try {
    await notificationService.emitCommunicationLiked(updatedCommunication, req.user, req.user.id);
  } catch (error) {
    logger.warn('Erro ao emitir notificação de curtida:', error);
  }

  res.json({
    success: true,
    message: 'Comunicação curtida com sucesso',
    data: { likes_count: communication.likes_count + 1 }
  });
});

// @desc    Obter estatísticas de comunicações
// @route   GET /api/communications/stats/:condominiumId
// @access  Private (admin, manager, syndic)
const getCommunicationStats = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;

  // Verificar permissão
  if (!['admin', 'manager', 'syndic'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado'
    });
  }

  // Verificar acesso ao condomínio
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

  const [
    totalCommunications,
    publishedCommunications,
    draftCommunications,
    scheduledCommunications,
    communicationsByType,
    communicationsByPriority
  ] = await Promise.all([
    Communication.count({ where: whereClause }),
    Communication.count({ where: { ...whereClause, status: 'published' } }),
    Communication.count({ where: { ...whereClause, status: 'draft' } }),
    Communication.count({ where: { ...whereClause, status: 'scheduled' } }),
    Communication.findAll({
      where: whereClause,
      attributes: ['type', [sequelize.fn('COUNT', sequelize.col('type')), 'count']],
      group: ['type'],
      raw: true
    }),
    Communication.findAll({
      where: whereClause,
      attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('priority')), 'count']],
      group: ['priority'],
      raw: true
    })
  ]);

  res.json({
    success: true,
    message: 'Estatísticas obtidas com sucesso',
    data: {
      total: totalCommunications,
      published: publishedCommunications,
      draft: draftCommunications,
      scheduled: scheduledCommunications,
      byType: communicationsByType,
      byPriority: communicationsByPriority
    }
  });
});

module.exports = {
  getCommunications,
  getCommunicationById,
  createCommunication,
  updateCommunication,
  deleteCommunication,
  getCommunicationsByCondominium,
  toggleLikeCommunication,
  getCommunicationStats
};