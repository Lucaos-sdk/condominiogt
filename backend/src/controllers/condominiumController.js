const { Condominium, Unit, User, UserCondominium } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const cacheService = require('../services/cacheService');

// @desc    Obter todos os condomínios
// @route   GET /api/condominiums
// @access  Private (admin, manager)
const getCondominiums = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { address: { [Op.like]: `%${search}%` } },
      { city: { [Op.like]: `%${search}%` } }
    ];
  }

  if (status) {
    whereClause.status = status;
  }

  const { count, rows: condominiums } = await Condominium.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Unit,
        as: 'units',
        attributes: ['id', 'number', 'block', 'type', 'status']
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Condomínios obtidos com sucesso',
    data: {
      condominiums,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

// @desc    Obter condomínio por ID
// @route   GET /api/condominiums/:id
// @access  Private
const getCondominiumById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const condominium = await Condominium.findByPk(id, {
    include: [
      {
        model: Unit,
        as: 'units',
        include: [
          {
            model: UserCondominium,
            as: 'residents',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone', 'role']
              }
            ]
          }
        ]
      }
    ]
  });

  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  // Verificar permissão do usuário
  if (req.user.role === 'resident' || req.user.role === 'syndic') {
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        condominium_id: id
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado ao condomínio'
      });
    }
  }

  res.json({
    success: true,
    message: 'Condomínio obtido com sucesso',
    data: { condominium }
  });
});

// @desc    Criar novo condomínio
// @route   POST /api/condominiums
// @access  Private (admin, manager)
const createCondominium = asyncHandler(async (req, res) => {
  const {
    name,
    cnpj,
    address,
    city,
    state,
    zip_code,
    phone,
    email,
    total_units,
    total_blocks,
    construction_date,
    common_area_size,
    parking_spots,
    elevators,
    logo,
    settings
  } = req.body;

  // Verificar se CNPJ já existe
  if (cnpj) {
    const existingCNPJ = await Condominium.findOne({
      where: { cnpj }
    });

    if (existingCNPJ) {
      return res.status(409).json({
        success: false,
        message: 'CNPJ já está em uso'
      });
    }
  }

  // Verificar se email já existe
  if (email) {
    const existingEmail = await Condominium.findOne({
      where: { email }
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email já está em uso'
      });
    }
  }

  const condominium = await Condominium.create({
    name: name.trim(),
    cnpj,
    address: address.trim(),
    city: city.trim(),
    state: state.trim(),
    zip_code,
    phone,
    email: email ? email.toLowerCase() : null,
    total_units,
    total_blocks: total_blocks || 1,
    construction_date,
    common_area_size,
    parking_spots: parking_spots || 0,
    elevators: elevators || 0,
    logo,
    settings: settings || {},
    status: 'active'
  });

  logger.info(`Condominium created: ${name} by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Condomínio criado com sucesso',
    data: { condominium }
  });
});

// @desc    Atualizar condomínio
// @route   PUT /api/condominiums/:id
// @access  Private (admin, manager, syndic)
const updateCondominium = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    cnpj,
    address,
    city,
    state,
    zip_code,
    phone,
    email,
    total_units,
    total_blocks,
    construction_date,
    common_area_size,
    parking_spots,
    elevators,
    logo,
    settings,
    status
  } = req.body;

  const condominium = await Condominium.findByPk(id);

  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  // Verificar permissão para síndicos
  if (req.user.role === 'syndic') {
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        condominium_id: id,
        role: 'syndic'
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para editar este condomínio'
      });
    }
  }

  // Verificar CNPJ único
  if (cnpj && cnpj !== condominium.cnpj) {
    const existingCNPJ = await Condominium.findOne({
      where: { 
        cnpj,
        id: { [Op.ne]: id }
      }
    });

    if (existingCNPJ) {
      return res.status(409).json({
        success: false,
        message: 'CNPJ já está em uso'
      });
    }
  }

  // Verificar email único
  if (email && email !== condominium.email) {
    const existingEmail = await Condominium.findOne({
      where: { 
        email: email.toLowerCase(),
        id: { [Op.ne]: id }
      }
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email já está em uso'
      });
    }
  }

  // Construir objeto de atualização
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (cnpj !== undefined) updateData.cnpj = cnpj;
  if (address !== undefined) updateData.address = address.trim();
  if (city !== undefined) updateData.city = city.trim();
  if (state !== undefined) updateData.state = state.trim();
  if (zip_code !== undefined) updateData.zip_code = zip_code;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email ? email.toLowerCase() : null;
  if (total_units !== undefined) updateData.total_units = total_units;
  if (total_blocks !== undefined) updateData.total_blocks = total_blocks;
  if (construction_date !== undefined) updateData.construction_date = construction_date;
  if (common_area_size !== undefined) updateData.common_area_size = common_area_size;
  if (parking_spots !== undefined) updateData.parking_spots = parking_spots;
  if (elevators !== undefined) updateData.elevators = elevators;
  if (logo !== undefined) updateData.logo = logo;
  if (settings !== undefined) updateData.settings = settings;
  if (status !== undefined && req.user.role !== 'syndic') updateData.status = status;

  await condominium.update(updateData);

  // Buscar condomínio atualizado
  const updatedCondominium = await Condominium.findByPk(id, {
    include: [
      {
        model: Unit,
        as: 'units',
        attributes: ['id', 'number', 'block', 'type', 'status']
      }
    ]
  });

  logger.info(`Condominium updated: ${condominium.name} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Condomínio atualizado com sucesso',
    data: { condominium: updatedCondominium }
  });
});

// @desc    Deletar condomínio
// @route   DELETE /api/condominiums/:id
// @access  Private (admin only)
const deleteCondominium = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const condominium = await Condominium.findByPk(id, {
    include: [
      {
        model: Unit,
        as: 'units'
      }
    ]
  });

  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  // Verificar se há unidades associadas
  if (condominium.units && condominium.units.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Não é possível deletar condomínio com unidades cadastradas'
    });
  }

  await condominium.destroy();

  logger.info(`Condominium deleted: ${condominium.name} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Condomínio deletado com sucesso'
  });
});

// @desc    Obter estatísticas do condomínio
// @route   GET /api/condominiums/:id/stats
// @access  Private
const getCondominiumStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const condominium = await Condominium.findByPk(id);

  if (!condominium) {
    return res.status(404).json({
      success: false,
      message: 'Condomínio não encontrado'
    });
  }

  // Verificar permissão
  if (req.user.role === 'resident' || req.user.role === 'syndic') {
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        condominium_id: id
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado ao condomínio'
      });
    }
  }

  // Verificar cache primeiro
  const cachedStats = await cacheService.getCachedCondominiumStats(id);
  if (cachedStats) {
    logger.debug(`Cache HIT para estatísticas do condomínio ${id}`);
    res.header('X-Cache', 'HIT');
    return res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: cachedStats
    });
  }

  // Buscar estatísticas
  const totalUnits = await Unit.count({
    where: { condominium_id: id }
  });

  const occupiedUnits = await Unit.count({
    where: { 
      condominium_id: id,
      status: 'occupied'
    }
  });

  const availableUnits = await Unit.count({
    where: { 
      condominium_id: id,
      status: 'available'
    }
  });

  const totalResidents = await UserCondominium.count({
    where: { 
      condominium_id: id,
      role: 'resident'
    }
  });

  const stats = {
    total_units: totalUnits,
    occupied_units: occupiedUnits,
    available_units: availableUnits,
    total_residents: totalResidents,
    occupancy_rate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(2) : 0
  };

  // Cache das estatísticas (TTL: 10 minutos)
  await cacheService.setCachedCondominiumStats(id, { stats }, 600);

  logger.info(`Estatísticas consultadas para condomínio ${id} por usuário ${req.user.id}`);
  res.header('X-Cache', 'MISS');

  res.json({
    success: true,
    message: 'Estatísticas obtidas com sucesso',
    data: { stats }
  });
});

module.exports = {
  getCondominiums,
  getCondominiumById,
  createCondominium,
  updateCondominium,
  deleteCondominium,
  getCondominiumStats
};