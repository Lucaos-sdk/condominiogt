const { CommonAreaBooking, CommonArea, Condominium, Unit, User, sequelize } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

// @desc    Obter todas as reservas
// @route   GET /api/bookings
// @access  Private
const getBookings = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    status, 
    payment_status,
    common_area_id,
    user_id,
    date_from,
    date_to,
    condominium_id 
  } = req.query;
  
  const offset = (page - 1) * limit;
  const whereClause = {};
  const includeClause = [
    {
      model: CommonArea,
      as: 'common_area',
      attributes: ['id', 'name', 'type', 'condominium_id'],
      include: [{
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name']
      }]
    },
    {
      model: User,
      as: 'user',
      attributes: ['id', 'name', 'email']
    },
    {
      model: Unit,
      as: 'unit',
      attributes: ['id', 'number', 'block']
    }
  ];
  
  // Se não for admin, mostrar apenas reservas dos condomínios do usuário
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
    } else {
      // Filtrar por condomínios do usuário através de include
      includeClause[0].where = {
        condominium_id: {
          [Op.in]: (req.user.condominiums || []).map(c => c.id)
        }
      };
    }
    
    // Se for resident, mostrar apenas suas próprias reservas
    if (req.user.role === 'resident') {
      whereClause.user_id = req.user.id;
    }
  } else if (condominium_id) {
    includeClause[0].where = { condominium_id };
  }
  
  // Filtros adicionais
  if (search) {
    whereClause[Op.or] = [
      { event_type: { [Op.like]: `%${search}%` } },
      { special_requests: { [Op.like]: `%${search}%` } },
      { '$common_area.name$': { [Op.like]: `%${search}%` } },
      { '$user.name$': { [Op.like]: `%${search}%` } }
    ];
  }
  
  if (status) {
    whereClause.status = status;
  }
  
  if (payment_status) {
    whereClause.payment_status = payment_status;
  }
  
  if (common_area_id) {
    whereClause.common_area_id = common_area_id;
  }
  
  if (user_id) {
    whereClause.user_id = user_id;
  }
  
  if (date_from && date_to) {
    whereClause.booking_date = {
      [Op.between]: [new Date(date_from), new Date(date_to)]
    };
  } else if (date_from) {
    whereClause.booking_date = {
      [Op.gte]: new Date(date_from)
    };
  } else if (date_to) {
    whereClause.booking_date = {
      [Op.lte]: new Date(date_to)
    };
  }
  
  const { count, rows: bookings } = await CommonAreaBooking.findAndCountAll({
    where: whereClause,
    include: includeClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['booking_date', 'DESC'], ['start_time', 'ASC']]
  });
  
  logger.info(`User ${req.user.id} listed ${bookings.length} bookings`);
  
  res.status(200).json({
    success: true,
    data: {
      bookings,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    }
  });
});

// @desc    Obter reserva por ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const booking = await CommonAreaBooking.findByPk(id, {
    include: [
      {
        model: CommonArea,
        as: 'common_area',
        include: [{
          model: Condominium,
          as: 'condominium',
          attributes: ['id', 'name', 'address']
        }]
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'block', 'floor']
      }
    ]
  });
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  // Verificar permissão de acesso
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === booking.common_area.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta reserva'
      });
    }
    
    // Se for resident, só pode ver suas próprias reservas
    if (req.user.role === 'resident' && booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta reserva'
      });
    }
  }
  
  logger.info(`User ${req.user.id} viewed booking ${id}`);
  
  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Criar nova reserva
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  const {
    common_area_id,
    unit_id,
    booking_date,
    start_time,
    end_time,
    guests_count = 0,
    event_type,
    special_requests
  } = req.body;
  
  // Verificar se área comum existe
  const commonArea = await CommonArea.findByPk(common_area_id, {
    include: [{
      model: Condominium,
      as: 'condominium'
    }]
  });
  
  if (!commonArea) {
    return res.status(404).json({
      success: false,
      message: 'Área comum não encontrada'
    });
  }
  
  // Verificar se usuário tem acesso ao condomínio
  if (req.user.role !== 'admin') {
    const userCondominiums = req.user.condominiums || [];
    const hasAccess = userCondominiums.some(c => c.id === commonArea.condominium_id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para reservar esta área comum'
      });
    }
  }
  
  // Verificar se unidade existe e pertence ao condomínio
  const unit = await Unit.findByPk(unit_id);
  if (!unit || unit.condominium_id !== commonArea.condominium_id) {
    return res.status(400).json({
      success: false,
      message: 'Unidade inválida para este condomínio'
    });
  }
  
  // Verificar capacidade
  if (guests_count > commonArea.capacity) {
    return res.status(400).json({
      success: false,
      message: `Número de convidados excede a capacidade da área (${commonArea.capacity})`
    });
  }
  
  // Verificar conflitos de horário
  const conflictBooking = await CommonAreaBooking.findOne({
    where: {
      common_area_id,
      booking_date: new Date(booking_date),
      status: {
        [Op.notIn]: ['cancelled', 'rejected']
      },
      [Op.or]: [
        // Nova reserva começa durante uma existente
        {
          start_time: { [Op.lte]: start_time },
          end_time: { [Op.gt]: start_time }
        },
        // Nova reserva termina durante uma existente
        {
          start_time: { [Op.lt]: end_time },
          end_time: { [Op.gte]: end_time }
        },
        // Nova reserva envolve uma existente
        {
          start_time: { [Op.gte]: start_time },
          end_time: { [Op.lte]: end_time }
        }
      ]
    }
  });
  
  if (conflictBooking) {
    return res.status(409).json({
      success: false,
      message: 'Já existe uma reserva para este horário',
      conflict: {
        booking_id: conflictBooking.id,
        start_time: conflictBooking.start_time,
        end_time: conflictBooking.end_time
      }
    });
  }
  
  // Verificar antecedência mínima
  const bookingDateTime = new Date(`${booking_date}T${start_time}`);
  const minAdvanceTime = new Date();
  minAdvanceTime.setDate(minAdvanceTime.getDate() + commonArea.advance_booking_days);
  
  if (bookingDateTime < minAdvanceTime) {
    return res.status(400).json({
      success: false,
      message: `Reserva deve ser feita com pelo menos ${commonArea.advance_booking_days} dia(s) de antecedência`
    });
  }
  
  // Verificar duração máxima
  const startDateTime = new Date(`1970-01-01T${start_time}`);
  const endDateTime = new Date(`1970-01-01T${end_time}`);
  const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
  
  if (durationHours > commonArea.max_booking_hours) {
    return res.status(400).json({
      success: false,
      message: `Duração máxima da reserva é ${commonArea.max_booking_hours} hora(s)`
    });
  }
  
  // Verificar horário de funcionamento
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(booking_date).getDay()];
  const operatingHours = commonArea.operating_hours || {};
  const dayHours = operatingHours[dayOfWeek];
  
  if (dayHours && dayHours.open && dayHours.close) {
    if (start_time < dayHours.open || end_time > dayHours.close) {
      return res.status(400).json({
        success: false,
        message: `Área comum funciona das ${dayHours.open} às ${dayHours.close} às ${dayOfWeek}s`
      });
    }
  }
  
  const booking = await CommonAreaBooking.create({
    common_area_id,
    user_id: req.user.id,
    unit_id,
    booking_date: new Date(booking_date),
    start_time,
    end_time,
    guests_count,
    event_type,
    special_requests,
    booking_fee: commonArea.booking_fee,
    status: 'pending'
  });
  
  // Buscar reserva criada com relacionamentos
  const createdBooking = await CommonAreaBooking.findByPk(booking.id, {
    include: [
      {
        model: CommonArea,
        as: 'common_area',
        include: [{
          model: Condominium,
          as: 'condominium',
          attributes: ['id', 'name']
        }]
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'block']
      }
    ]
  });
  
  // Enviar notificação para admins/managers/syndics
  try {
    await notificationService.notifyBookingCreated(createdBooking);
  } catch (error) {
    console.warn('Failed to send booking notification:', error.message);
  }
  
  logger.info(`User ${req.user.id} created booking ${booking.id} for common area ${common_area_id}`);
  
  res.status(201).json({
    success: true,
    message: 'Reserva criada com sucesso',
    data: createdBooking
  });
});

// @desc    Atualizar reserva
// @route   PUT /api/bookings/:id
// @access  Private
const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const booking = await CommonAreaBooking.findByPk(id, {
    include: [{
      model: CommonArea,
      as: 'common_area'
    }]
  });
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  // Verificar permissão
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'syndic') {
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Apenas o criador da reserva pode editá-la'
      });
    }
    
    // Resident só pode editar reservas pendentes
    if (booking.status !== 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Apenas reservas pendentes podem ser editadas'
      });
    }
    
    // Resident não pode alterar status, payment_status ou admin_notes
    delete updateData.status;
    delete updateData.payment_status;
    delete updateData.paid_date;
    delete updateData.admin_notes;
  }
  
  // Se alterando horário, verificar conflitos
  if (updateData.booking_date || updateData.start_time || updateData.end_time) {
    const newDate = updateData.booking_date || booking.booking_date;
    const newStartTime = updateData.start_time || booking.start_time;
    const newEndTime = updateData.end_time || booking.end_time;
    
    const conflictBooking = await CommonAreaBooking.findOne({
      where: {
        common_area_id: booking.common_area_id,
        booking_date: new Date(newDate),
        id: { [Op.ne]: id },
        status: {
          [Op.notIn]: ['cancelled', 'rejected']
        },
        [Op.or]: [
          {
            start_time: { [Op.lte]: newStartTime },
            end_time: { [Op.gt]: newStartTime }
          },
          {
            start_time: { [Op.lt]: newEndTime },
            end_time: { [Op.gte]: newEndTime }
          },
          {
            start_time: { [Op.gte]: newStartTime },
            end_time: { [Op.lte]: newEndTime }
          }
        ]
      }
    });
    
    if (conflictBooking) {
      return res.status(409).json({
        success: false,
        message: 'Já existe uma reserva para este horário',
        conflict: {
          booking_id: conflictBooking.id,
          start_time: conflictBooking.start_time,
          end_time: conflictBooking.end_time
        }
      });
    }
  }
  
  await booking.update(updateData);
  
  // Buscar reserva atualizada
  const updatedBooking = await CommonAreaBooking.findByPk(id, {
    include: [
      {
        model: CommonArea,
        as: 'common_area',
        include: [{
          model: Condominium,
          as: 'condominium',
          attributes: ['id', 'name']
        }]
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'block']
      }
    ]
  });
  
  logger.info(`User ${req.user.id} updated booking ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Reserva atualizada com sucesso',
    data: updatedBooking
  });
});

// @desc    Excluir reserva
// @route   DELETE /api/bookings/:id
// @access  Private
const deleteBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const booking = await CommonAreaBooking.findByPk(id);
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  // Verificar permissão
  if (req.user.role !== 'admin') {
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Apenas o criador da reserva ou admin pode excluí-la'
      });
    }
  }
  
  // Não permitir exclusão de reservas já aprovadas/pagas
  if (booking.status === 'approved' && booking.payment_status === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Reservas aprovadas e pagas não podem ser excluídas. Use cancelamento.'
    });
  }
  
  await booking.destroy();
  
  logger.info(`User ${req.user.id} deleted booking ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Reserva excluída com sucesso'
  });
});

// @desc    Aprovar reserva
// @route   POST /api/bookings/:id/approve
// @access  Private (Admin, Manager, Syndic)
const approveBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { admin_notes } = req.body;
  
  const booking = await CommonAreaBooking.findByPk(id, {
    include: [
      {
        model: CommonArea,
        as: 'common_area',
        include: [{
          model: Condominium,
          as: 'condominium'
        }]
      },
      {
        model: User,
        as: 'user'
      }
    ]
  });
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Apenas reservas pendentes podem ser aprovadas'
    });
  }
  
  await booking.update({
    status: 'approved',
    admin_notes: admin_notes || null
  });
  
  // Notificar usuário sobre aprovação
  try {
    await notificationService.notifyBookingApproved(booking);
  } catch (error) {
    console.warn('Failed to send approval notification:', error.message);
  }
  
  logger.info(`User ${req.user.id} approved booking ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Reserva aprovada com sucesso',
    data: booking
  });
});

// @desc    Rejeitar reserva
// @route   POST /api/bookings/:id/reject
// @access  Private (Admin, Manager, Syndic)
const rejectBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellation_reason, admin_notes } = req.body;
  
  if (!cancellation_reason) {
    return res.status(400).json({
      success: false,
      message: 'Motivo da rejeição é obrigatório'
    });
  }
  
  const booking = await CommonAreaBooking.findByPk(id, {
    include: [
      {
        model: CommonArea,
        as: 'common_area',
        include: [{
          model: Condominium,
          as: 'condominium'
        }]
      },
      {
        model: User,
        as: 'user'
      }
    ]
  });
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Apenas reservas pendentes podem ser rejeitadas'
    });
  }
  
  await booking.update({
    status: 'rejected',
    cancellation_reason,
    admin_notes: admin_notes || null
  });
  
  // Notificar usuário sobre rejeição
  try {
    await notificationService.notifyBookingRejected(booking);
  } catch (error) {
    console.warn('Failed to send rejection notification:', error.message);
  }
  
  logger.info(`User ${req.user.id} rejected booking ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Reserva rejeitada com sucesso',
    data: booking
  });
});

// @desc    Cancelar reserva
// @route   POST /api/bookings/:id/cancel
// @access  Private
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellation_reason } = req.body;
  
  const booking = await CommonAreaBooking.findByPk(id, {
    include: [{
      model: CommonArea,
      as: 'common_area',
      include: [{
        model: Condominium,
        as: 'condominium'
      }]
    }]
  });
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  // Verificar permissão
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'syndic') {
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Apenas o criador da reserva pode cancelá-la'
      });
    }
  }
  
  if (booking.status === 'cancelled' || booking.status === 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Reserva já foi cancelada ou rejeitada'
    });
  }
  
  const updateData = {
    status: 'cancelled',
    cancellation_reason: cancellation_reason || 'Cancelado pelo usuário'
  };
  
  // Se já foi pago, marcar para reembolso
  if (booking.payment_status === 'paid') {
    updateData.payment_status = 'refunded';
  }
  
  await booking.update(updateData);
  
  // Notificar sobre o cancelamento
  try {
    await notificationService.notifyBookingCancelled(booking);
  } catch (error) {
    console.warn('Failed to send cancellation notification:', error.message);
  }
  
  logger.info(`User ${req.user.id} cancelled booking ${id}`);
  
  res.status(200).json({
    success: true,
    message: 'Reserva cancelada com sucesso',
    data: booking
  });
});

// @desc    Marcar pagamento como pago
// @route   POST /api/bookings/:id/pay
// @access  Private (Admin, Manager, Syndic)
const markBookingAsPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const booking = await CommonAreaBooking.findByPk(id);
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Reserva não encontrada'
    });
  }
  
  if (booking.payment_status === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Reserva já foi marcada como paga'
    });
  }
  
  await booking.update({
    payment_status: 'paid',
    paid_date: new Date()
  });
  
  logger.info(`User ${req.user.id} marked booking ${id} as paid`);
  
  res.status(200).json({
    success: true,
    message: 'Reserva marcada como paga com sucesso',
    data: booking
  });
});

// @desc    Obter reservas por área comum
// @route   GET /api/bookings/common-area/:commonAreaId
// @access  Private
const getBookingsByCommonArea = asyncHandler(async (req, res) => {
  const { commonAreaId } = req.params;
  const { date_from, date_to, status = 'approved' } = req.query;
  
  const whereClause = { 
    common_area_id: commonAreaId,
    status: status === 'all' ? { [Op.ne]: null } : status
  };
  
  if (date_from && date_to) {
    whereClause.booking_date = {
      [Op.between]: [new Date(date_from), new Date(date_to)]
    };
  }
  
  const bookings = await CommonAreaBooking.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      },
      {
        model: Unit,
        as: 'unit',
        attributes: ['id', 'number', 'block']
      }
    ],
    order: [['booking_date', 'ASC'], ['start_time', 'ASC']]
  });
  
  logger.info(`User ${req.user.id} listed ${bookings.length} bookings for common area ${commonAreaId}`);
  
  res.status(200).json({
    success: true,
    data: bookings
  });
});

// @desc    Obter estatísticas de reservas
// @route   GET /api/bookings/stats/:condominiumId
// @access  Private (Admin, Manager, Syndic)
const getBookingStats = asyncHandler(async (req, res) => {
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
  
  // Definir filtro de data
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
  
  // Contadores básicos
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
  
  const cancelledBookings = await CommonAreaBooking.count({
    include: [{
      model: CommonArea,
      as: 'common_area',
      where: { condominium_id: condominiumId }
    }],
    where: {
      ...dateFilter,
      status: 'cancelled'
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
    where: {
      ...dateFilter,
      status: 'approved'
    },
    group: ['common_area.id', 'common_area.name', 'common_area.type'],
    order: [[sequelize.literal('booking_count'), 'DESC']],
    limit: 5,
    raw: true
  });
  
  logger.info(`User ${req.user.id} viewed booking stats for condominium ${condominiumId}`);
  
  res.status(200).json({
    success: true,
    data: {
      overview: {
        total_bookings: totalBookings,
        approved_bookings: approvedBookings,
        cancelled_bookings: cancelledBookings,
        approval_rate: totalBookings > 0 ? ((approvedBookings / totalBookings) * 100).toFixed(1) : 0,
        cancellation_rate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0
      },
      revenue: {
        total_revenue: parseFloat(bookingRevenue[0]?.revenue || 0).toFixed(2)
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
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  approveBooking,
  rejectBooking,
  cancelBooking,
  markBookingAsPaid,
  getBookingsByCommonArea,
  getBookingStats
};