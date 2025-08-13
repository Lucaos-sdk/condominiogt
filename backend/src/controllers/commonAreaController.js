const { CommonArea, Condominium, CommonAreaBooking, User, sequelize } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Obter todas as áreas comuns
// @route   GET /api/common-areas
// @access  Private
const getCommonAreas = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    type, 
    status, 
    condominium_id,
    requires_booking,
    available_only = false 
  } = req.query;
  
  const offset = (page - 1) * limit;
  const whereClause = {};
  
  // Se não for admin, mostrar apenas áreas comuns dos condomínios do usuário
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
    
    // Se for resident, mostrar apenas as disponíveis por padrão
    if (req.user.role === 'resident') {
      whereClause.status = 'available';
    }
  } else if (condominium_id) {
    whereClause.condominium_id = condominium_id;
  }
  
  // Filtros de busca
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } }
    ];
  }
  
  if (type) {
    whereClause.type = type;
  }
  
  if (status) {
    whereClause.status = status;
  }
  
  if (requires_booking !== undefined) {
    whereClause.requires_booking = requires_booking === 'true';
  }
  
  if (available_only === 'true') {
    whereClause.status = 'available';
  }
  
  const { count, rows: commonAreas } = await CommonArea.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['name', 'ASC']]
  });
  
  logger.info(`User ${req.user.id} listed ${commonAreas.length} common areas`);
  
  res.status(200).json({
    success: true,
    data: {
      common_areas: commonAreas,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    }
  });
});

// @desc    Obter área comum por ID
// @route   GET /api/common-areas/:id
// @access  Private
const getCommonAreaById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const commonArea = await CommonArea.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      },
      {
        model: CommonAreaBooking,
        as: 'bookings',
        where: {
          status: {
            [Op.notIn]: ['cancelled', 'rejected']
          },
          booking_date: {
            [Op.gte]: new Date()
          }
        },
        required: false,
        limit: 10,
        order: [['booking_date', 'ASC'], ['start_time', 'ASC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      }
    ]
  });
  
  if (!commonArea) {
    return res.status(404).json({
      success: false,
      message: 'Área comum não encontrada'
    });
  }
  
  // Verificar permissão de acesso
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === commonArea.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta área comum'
      });
    }
  }
  
  logger.info(`User ${req.user.id} viewed common area ${id}`);
  
  res.status(200).json({
    success: true,
    data: commonArea
  });
});

// @desc    Criar nova área comum
// @route   POST /api/common-areas
// @access  Private (Admin, Manager, Syndic)
const createCommonArea = asyncHandler(async (req, res) => {
  const {
    condominium_id,
    name,
    description,
    type,
    capacity,
    booking_fee = 0,
    rules,
    operating_hours = {},
    requires_booking = true,
    advance_booking_days = 7,
    max_booking_hours = 4,
    status = 'available',
    images = [],
    location
  } = req.body;
  
  // Verificar se condomínio existe
  const condominium = await Condominium.findByPk(condominium_id);
  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }
  
  // Verificar permissão para o condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === parseInt(condominium_id));
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para criar área comum neste condomínio'
      });
    }
  }
  
  // Verificar se já existe área com mesmo nome no condomínio
  const existingArea = await CommonArea.findOne({
    where: {
      condominium_id,
      name: {
[Op.like]: name
      }
    }
  });
  
  if (existingArea) {
    return res.status(400).json({
      success: false,
      message: 'Já existe uma área comum com este nome neste condomínio'
    });
  }
  
  const commonArea = await CommonArea.create({
    condominium_id,
    name,
    description,
    type,
    capacity,
    booking_fee,
    rules,
    operating_hours,
    requires_booking,
    advance_booking_days,
    max_booking_hours,
    status,
    images,
    location
  });
  
  // Buscar área criada com relacionamentos
  const createdArea = await CommonArea.findByPk(commonArea.id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      }
    ]
  });
  
  logger.info(`User ${req.user.id} created common area ${commonArea.id} for condominium ${condominium_id}`);
  
  res.status(201).json({
    success: true,
    message: 'Área comum criada com sucesso',
    data: createdArea
  });
});

// @desc    Atualizar área comum
// @route   PUT /api/common-areas/:id
// @access  Private (Admin, Manager, Syndic)
const updateCommonArea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const commonArea = await CommonArea.findByPk(id);
  
  if (!commonArea) {
    return res.status(404).json({
      success: false,
      message: 'Área comum não encontrada'
    });
  }
  
  // Verificar permissão para o condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === commonArea.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para atualizar esta área comum'
      });
    }
  }
  
  // Se mudando nome, verificar duplicata
  if (updateData.name && updateData.name !== commonArea.name) {
    const existingArea = await CommonArea.findOne({
      where: {
        condominium_id: commonArea.condominium_id,
        name: {
[Op.like]: updateData.name
        },
        id: {
          [Op.ne]: id
        }
      }
    });
    
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma área comum com este nome neste condomínio'
      });
    }
  }
  
  // Se mudando condomínio, verificar permissão
  if (updateData.condominium_id && updateData.condominium_id !== commonArea.condominium_id) {
    if (req.user.role !== 'admin') {
      const userCondominiums = req.user.condominiums || [];
      const hasAccess = userCondominiums.some(c => c.id === parseInt(updateData.condominium_id));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado para mover área comum para este condomínio'
        });
      }
    }
    
    // Verificar se condomínio destino existe
    const targetCondominium = await Condominium.findByPk(updateData.condominium_id);
    if (!targetCondominium) {
      return res.status(404).json({
        success: false,
        message: 'Condomínio de destino não encontrado'
      });
    }
  }
  
  await commonArea.update(updateData);
  
  // Buscar área atualizada com relacionamentos
  const updatedArea = await CommonArea.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      }
    ]
  });
  
  logger.info(`User ${req.user.id} updated common area ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Área comum atualizada com sucesso',
    data: updatedArea
  });
});

// @desc    Excluir área comum
// @route   DELETE /api/common-areas/:id
// @access  Private (Admin only)
const deleteCommonArea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const commonArea = await CommonArea.findByPk(id);
  
  if (!commonArea) {
    return res.status(404).json({
      success: false,
      message: 'Área comum não encontrada'
    });
  }
  
  // Verificar se há reservas futuras
  const futureBookings = await CommonAreaBooking.count({
    where: {
      common_area_id: id,
      status: {
        [Op.in]: ['approved', 'pending']
      },
      booking_date: {
        [Op.gte]: new Date()
      }
    }
  });
  
  if (futureBookings > 0) {
    return res.status(400).json({
      success: false,
      message: `Não é possível excluir área comum com ${futureBookings} reserva(s) futura(s). Cancele as reservas primeiro.`
    });
  }
  
  await commonArea.destroy();
  
  logger.info(`User ${req.user.id} deleted common area ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Área comum excluída com sucesso'
  });
});

// @desc    Obter áreas comuns por condomínio
// @route   GET /api/common-areas/condominium/:condominiumId
// @access  Private
const getCommonAreasByCondominium = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { available_only = false, type, requires_booking } = req.query;
  
  // Verificar permissão para o condomínio
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
  
  if (available_only === 'true') {
    whereClause.status = 'available';
  }
  
  if (type) {
    whereClause.type = type;
  }
  
  if (requires_booking !== undefined) {
    whereClause.requires_booking = requires_booking === 'true';
  }
  
  const commonAreas = await CommonArea.findAll({
    where: whereClause,
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      }
    ],
    order: [['name', 'ASC']]
  });
  
  logger.info(`User ${req.user.id} listed ${commonAreas.length} common areas for condominium ${condominiumId}`);
  
  res.status(200).json({
    success: true,
    data: commonAreas
  });
});

// @desc    Obter estatísticas de áreas comuns
// @route   GET /api/common-areas/stats/:condominiumId
// @access  Private (Admin, Manager, Syndic)
const getCommonAreaStats = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { period = 'month', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
  
  // Verificar permissão para o condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === parseInt(condominiumId));
    
    if (!hasAccess || req.user.role === 'resident') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a estas estatísticas'
      });
    }
  }
  
  // Contadores básicos
  const totalAreas = await CommonArea.count({
    where: { condominium_id: condominiumId }
  });
  
  const availableAreas = await CommonArea.count({
    where: { 
      condominium_id: condominiumId,
      status: 'available'
    }
  });
  
  const areasInMaintenance = await CommonArea.count({
    where: { 
      condominium_id: condominiumId,
      status: 'maintenance'
    }
  });
  
  // Estatísticas por tipo
  const areasByType = await CommonArea.findAll({
    where: { condominium_id: condominiumId },
    attributes: [
      'type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['type'],
    raw: true
  });
  
  // Estatísticas de reservas (último período)
  let dateFilter = {};
  if (period === 'month') {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    dateFilter = {
      booking_date: {
        [Op.between]: [startDate, endDate]
      }
    };
  } else if (period === 'year') {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    dateFilter = {
      booking_date: {
        [Op.between]: [startDate, endDate]
      }
    };
  }
  
  const totalBookings = await CommonAreaBooking.count({
    include: [{
      model: CommonArea,
      as: 'common_area',
      where: { condominium_id: condominiumId }
    }],
    where: dateFilter
  });
  
  const approvedBookings = await CommonAreaBooking.count({
    include: [{
      model: CommonArea,
      as: 'common_area',
      where: { condominium_id: condominiumId }
    }],
    where: {
      ...dateFilter,
      status: 'approved'
    }
  });
  
  // Receita de reservas
  const bookingRevenue = await sequelize.query(`
    SELECT SUM(cab.booking_fee) as revenue
    FROM common_area_bookings cab
    INNER JOIN common_areas ca ON cab.common_area_id = ca.id
    WHERE ca.condominium_id = :condominiumId
    AND cab.payment_status = 'paid'
    ${dateFilter.booking_date ? `AND cab.booking_date BETWEEN '${dateFilter.booking_date[Op.between][0].toISOString().split('T')[0]}' AND '${dateFilter.booking_date[Op.between][1].toISOString().split('T')[0]}'` : ''}
  `, {
    replacements: { condominiumId },
    type: sequelize.QueryTypes.SELECT
  });
  
  // Áreas mais reservadas
  const mostBookedAreas = await CommonAreaBooking.findAll({
    include: [{
      model: CommonArea,
      as: 'common_area',
      where: { condominium_id: condominiumId },
      attributes: ['id', 'name', 'type']
    }],
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('CommonAreaBooking.id')), 'booking_count']
    ],
    where: dateFilter,
    group: ['common_area.id', 'common_area.name', 'common_area.type'],
    order: [[sequelize.literal('booking_count'), 'DESC']],
    limit: 5,
    raw: true
  });
  
  logger.info(`User ${req.user.id} viewed common area stats for condominium ${condominiumId}`);
  
  res.status(200).json({
    success: true,
    data: {
      overview: {
        total_areas: totalAreas,
        available_areas: availableAreas,
        areas_in_maintenance: areasInMaintenance,
        availability_percentage: totalAreas > 0 ? ((availableAreas / totalAreas) * 100).toFixed(1) : 0
      },
      by_type: areasByType,
      bookings: {
        total_bookings: totalBookings,
        approved_bookings: approvedBookings,
        approval_rate: totalBookings > 0 ? ((approvedBookings / totalBookings) * 100).toFixed(1) : 0,
        revenue: parseFloat(bookingRevenue[0]?.revenue || 0).toFixed(2)
      },
      most_booked: mostBookedAreas,
      period: {
        type: period,
        year: parseInt(year),
        month: period === 'month' ? parseInt(month) : null
      }
    }
  });
});

module.exports = {
  getCommonAreas,
  getCommonAreaById,
  createCommonArea,
  updateCommonArea,
  deleteCommonArea,
  getCommonAreasByCondominium,
  getCommonAreaStats
};