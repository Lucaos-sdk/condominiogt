const { Unit, Condominium, User, UserCondominium } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Obter todas as unidades
// @route   GET /api/units
// @access  Private (admin, manager)
const getUnits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, type, condominium_id } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { number: { [Op.like]: `%${search}%` } },
      { block: { [Op.like]: `%${search}%` } },
      { owner_name: { [Op.like]: `%${search}%` } },
      { tenant_name: { [Op.like]: `%${search}%` } }
    ];
  }

  if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.type = type;
  }

  if (condominium_id) {
    whereClause.condominium_id = condominium_id;
  }

  const { count, rows: units } = await Unit.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['condominium_id', 'ASC'], ['number', 'ASC']],
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address', 'city']
      },
      {
        model: UserCondominium,
        as: 'residents',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Unidades obtidas com sucesso',
    data: {
      units,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

// @desc    Obter unidades por condomínio
// @route   GET /api/units/condominium/:condominiumId
// @access  Private
const getUnitsByCondominium = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { page = 1, limit = 50, search, status, type } = req.query;
  const offset = (page - 1) * limit;

  // Verificar se condomínio existe
  const condominium = await Condominium.findByPk(condominiumId);
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
        condominium_id: condominiumId
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado ao condomínio'
      });
    }
  }

  const whereClause = { condominium_id: condominiumId };
  
  if (search) {
    whereClause[Op.or] = [
      { number: { [Op.like]: `%${search}%` } },
      { block: { [Op.like]: `%${search}%` } },
      { owner_name: { [Op.like]: `%${search}%` } },
      { tenant_name: { [Op.like]: `%${search}%` } }
    ];
  }

  if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.type = type;
  }

  const { count, rows: units } = await Unit.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['number', 'ASC']],
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
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Unidades do condomínio obtidas com sucesso',
    data: {
      units,
      condominium: {
        id: condominium.id,
        name: condominium.name,
        address: condominium.address
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

// @desc    Obter unidade por ID
// @route   GET /api/units/:id
// @access  Private
const getUnitById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const unit = await Unit.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address', 'city', 'state']
      },
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
  });

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  // Verificar permissão do usuário
  if (req.user.role === 'resident' || req.user.role === 'syndic') {
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        condominium_id: unit.condominium_id
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta unidade'
      });
    }
  }

  res.json({
    success: true,
    message: 'Unidade obtida com sucesso',
    data: { unit }
  });
});

// @desc    Criar nova unidade
// @route   POST /api/units
// @access  Private (admin, manager, syndic)
const createUnit = asyncHandler(async (req, res) => {
  const {
    condominium_id,
    number,
    block,
    floor,
    type,
    bedrooms,
    bathrooms,
    area,
    owner_name,
    owner_email,
    owner_phone,
    owner_cpf,
    tenant_name,
    tenant_email,
    tenant_phone,
    tenant_cpf,
    rent_amount,
    condominium_fee,
    notes,
    resident_user_id,
    monthly_amount,
    payment_due_day,
    auto_billing_enabled,
    pet_allowed,
    furnished,
    balcony
  } = req.body;

  // Verificar se condomínio existe
  const condominium = await Condominium.findByPk(condominium_id);
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
        condominium_id,
        role: 'syndic'
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para criar unidade neste condomínio'
      });
    }
  }

  // Verificar se unidade já existe (mesmo número e bloco no condomínio)
  const existingUnit = await Unit.findOne({
    where: {
      condominium_id,
      number,
      block: block || null
    }
  });

  if (existingUnit) {
    return res.status(409).json({
      success: false,
      message: 'Unidade já existe neste condomínio'
    });
  }

  // Verificar CPF único (se fornecido)
  if (owner_cpf) {
    const existingOwnerCPF = await Unit.findOne({
      where: { owner_cpf }
    });

    if (existingOwnerCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF do proprietário já está em uso'
      });
    }
  }

  if (tenant_cpf) {
    const existingTenantCPF = await Unit.findOne({
      where: { tenant_cpf }
    });

    if (existingTenantCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF do inquilino já está em uso'
      });
    }
  }

  // Verificar se o morador selecionado existe e tem acesso ao condomínio
  if (resident_user_id) {
    const residentUser = await User.findByPk(resident_user_id);
    if (!residentUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário selecionado como morador não encontrado'
      });
    }

    // Verificar se o usuário tem acesso ao condomínio
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: resident_user_id,
        condominium_id
      }
    });

    if (!userCondominium) {
      return res.status(400).json({
        success: false,
        message: 'O usuário selecionado não tem acesso a este condomínio'
      });
    }
  }

  const unit = await Unit.create({
    condominium_id,
    number,
    block,
    floor,
    type: type || 'apartment',
    bedrooms,
    bathrooms,
    area,
    status: tenant_name ? 'rented' : 'vacant',
    owner_name,
    owner_email: owner_email ? owner_email.toLowerCase() : null,
    owner_phone,
    owner_cpf,
    tenant_name,
    tenant_email: tenant_email ? tenant_email.toLowerCase() : null,
    tenant_phone,
    tenant_cpf,
    rent_amount,
    condominium_fee: condominium_fee || 0,
    notes,
    resident_user_id,
    monthly_amount,
    payment_due_day,
    auto_billing_enabled: auto_billing_enabled || false,
    pet_allowed: pet_allowed || false,
    furnished: furnished || false,
    balcony: balcony || false
  });

  // Buscar unidade criada com relacionamentos
  const createdUnit = await Unit.findByPk(unit.id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      },
      {
        model: User,
        as: 'resident_user',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ]
  });

  logger.info(`Unit created: ${number}${block ? ` - ${block}` : ''} in ${condominium.name} by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Unidade criada com sucesso',
    data: { unit: createdUnit }
  });
});

// @desc    Atualizar unidade
// @route   PUT /api/units/:id
// @access  Private (admin, manager, syndic)
const updateUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    number,
    block,
    floor,
    type,
    bedrooms,
    bathrooms,
    area,
    status,
    owner_name,
    owner_email,
    owner_phone,
    owner_cpf,
    tenant_name,
    tenant_email,
    tenant_phone,
    tenant_cpf,
    rent_amount,
    condominium_fee,
    notes,
    resident_user_id,
    monthly_amount,
    payment_due_day,
    auto_billing_enabled,
    pet_allowed,
    furnished,
    balcony
  } = req.body;

  const unit = await Unit.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium'
      }
    ]
  });

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  // Verificar permissão para síndicos
  if (req.user.role === 'syndic') {
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        condominium_id: unit.condominium_id,
        role: 'syndic'
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para editar esta unidade'
      });
    }
  }

  // Verificar unidade única no condomínio (se número ou bloco mudaram)
  if ((number && number !== unit.number) || (block !== undefined && block !== unit.block)) {
    const existingUnit = await Unit.findOne({
      where: {
        condominium_id: unit.condominium_id,
        number: number || unit.number,
        block: block !== undefined ? block : unit.block,
        id: { [Op.ne]: id }
      }
    });

    if (existingUnit) {
      return res.status(409).json({
        success: false,
        message: 'Unidade com este número já existe no condomínio'
      });
    }
  }

  // Verificar CPF único (se mudou)
  if (owner_cpf && owner_cpf !== unit.owner_cpf) {
    const existingOwnerCPF = await Unit.findOne({
      where: { 
        owner_cpf,
        id: { [Op.ne]: id }
      }
    });

    if (existingOwnerCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF do proprietário já está em uso'
      });
    }
  }

  if (tenant_cpf && tenant_cpf !== unit.tenant_cpf) {
    const existingTenantCPF = await Unit.findOne({
      where: { 
        tenant_cpf,
        id: { [Op.ne]: id }
      }
    });

    if (existingTenantCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF do inquilino já está em uso'
      });
    }
  }

  // Verificar se o morador selecionado existe e tem acesso ao condomínio
  if (resident_user_id !== undefined && resident_user_id !== null) {
    const residentUser = await User.findByPk(resident_user_id);
    if (!residentUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário selecionado como morador não encontrado'
      });
    }

    // Verificar se o usuário tem acesso ao condomínio
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: resident_user_id,
        condominium_id: unit.condominium_id
      }
    });

    if (!userCondominium) {
      return res.status(400).json({
        success: false,
        message: 'O usuário selecionado não tem acesso a este condomínio'
      });
    }
  }

  // Construir objeto de atualização
  const updateData = {};
  if (number !== undefined) updateData.number = number;
  if (block !== undefined) updateData.block = block;
  if (floor !== undefined) updateData.floor = floor;
  if (type !== undefined) updateData.type = type;
  if (bedrooms !== undefined) updateData.bedrooms = bedrooms;
  if (bathrooms !== undefined) updateData.bathrooms = bathrooms;
  if (area !== undefined) updateData.area = area;
  if (status !== undefined) updateData.status = status;
  if (owner_name !== undefined) updateData.owner_name = owner_name;
  if (owner_email !== undefined) updateData.owner_email = owner_email ? owner_email.toLowerCase() : null;
  if (owner_phone !== undefined) updateData.owner_phone = owner_phone;
  if (owner_cpf !== undefined) updateData.owner_cpf = owner_cpf;
  if (tenant_name !== undefined) updateData.tenant_name = tenant_name;
  if (tenant_email !== undefined) updateData.tenant_email = tenant_email ? tenant_email.toLowerCase() : null;
  if (tenant_phone !== undefined) updateData.tenant_phone = tenant_phone;
  if (tenant_cpf !== undefined) updateData.tenant_cpf = tenant_cpf;
  if (rent_amount !== undefined) updateData.rent_amount = rent_amount;
  if (condominium_fee !== undefined) updateData.condominium_fee = condominium_fee;
  if (notes !== undefined) updateData.notes = notes;
  if (resident_user_id !== undefined) updateData.resident_user_id = resident_user_id;
  if (monthly_amount !== undefined) updateData.monthly_amount = monthly_amount;
  if (payment_due_day !== undefined) updateData.payment_due_day = payment_due_day;
  if (auto_billing_enabled !== undefined) updateData.auto_billing_enabled = auto_billing_enabled;
  if (pet_allowed !== undefined) updateData.pet_allowed = pet_allowed;
  if (furnished !== undefined) updateData.furnished = furnished;
  if (balcony !== undefined) updateData.balcony = balcony;

  await unit.update(updateData);

  // Buscar unidade atualizada
  const updatedUnit = await Unit.findByPk(id, {
    include: [
      {
        model: Condominium,
        as: 'condominium',
        attributes: ['id', 'name', 'address']
      },
      {
        model: User,
        as: 'resident_user',
        attributes: ['id', 'name', 'email', 'phone']
      },
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
  });

  logger.info(`Unit updated: ${unit.number}${unit.block ? ` - ${unit.block}` : ''} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Unidade atualizada com sucesso',
    data: { unit: updatedUnit }
  });
});

// @desc    Deletar unidade
// @route   DELETE /api/units/:id
// @access  Private (admin, manager)
const deleteUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ [BACKEND DEBUG] DELETE request received for unit ID: ${id}`);
  console.log(`🗑️ [BACKEND DEBUG] Request timestamp: ${new Date().toISOString()}`);

  // Get total units before deletion
  const totalBefore = await Unit.count();
  console.log(`📊 [BACKEND DEBUG] Total units BEFORE deletion: ${totalBefore}`);

  const unit = await Unit.findByPk(id, {
    include: [
      {
        model: UserCondominium,
        as: 'residents'
      }
    ]
  });

  if (!unit) {
    console.log(`❌ [BACKEND DEBUG] Unit ${id} not found`);
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  console.log(`🏠 [BACKEND DEBUG] Unit found: ${JSON.stringify({
    id: unit.id,
    number: unit.number,
    condominium_id: unit.condominium_id,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt
  }, null, 2)}`);

  // Verificar se há moradores associados
  if (unit.residents && unit.residents.length > 0) {
    console.log(`👥 [BACKEND DEBUG] Unit has ${unit.residents.length} residents - cannot delete`);
    return res.status(400).json({
      success: false,
      message: 'Não é possível deletar unidade com moradores cadastrados'
    });
  }

  console.log(`🗑️ [BACKEND DEBUG] Calling unit.destroy() for unit ${id}`);
  
  try {
    await unit.destroy();
    console.log(`✅ [BACKEND DEBUG] Unit.destroy() completed successfully`);
  } catch (error) {
    console.error(`💥 [BACKEND DEBUG] Error in unit.destroy():`, error);
    throw error;
  }

  // Get total units after deletion
  const totalAfter = await Unit.count();
  console.log(`📊 [BACKEND DEBUG] Total units AFTER deletion: ${totalAfter}`);
  console.log(`📈 [BACKEND DEBUG] Unit count difference: ${totalAfter - totalBefore}`);

  // Check if a new unit was created with a higher ID
  const maxId = await Unit.max('id');
  console.log(`🔢 [BACKEND DEBUG] Highest unit ID after deletion: ${maxId}`);

  // Get the last 5 units to check for unexpected creations
  const recentUnits = await Unit.findAll({
    order: [['id', 'DESC']],
    limit: 5,
    attributes: ['id', 'number', 'condominium_id', 'createdAt']
  });
  console.log(`📋 [BACKEND DEBUG] Last 5 units after deletion:`, JSON.stringify(recentUnits.map(u => ({
    id: u.id,
    number: u.number,
    condominium_id: u.condominium_id,
    createdAt: u.createdAt
  })), null, 2));

  logger.info(`Unit deleted: ${unit.number}${unit.block ? ` - ${unit.block}` : ''} by user: ${req.user.email}`);

  console.log(`✅ [BACKEND DEBUG] Sending success response for deletion of unit ${id}`);

  res.json({
    success: true,
    message: 'Unidade deletada com sucesso'
  });
});

// @desc    Debug endpoint - verificar o que acontece durante a deleção
// @route   POST /api/units/debug-delete
// @access  Private (admin only)
const debugDelete = asyncHandler(async (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID da unidade é obrigatório'
    });
  }

  console.log(`🔍 [DEBUG] Starting debug delete for unit ${id}`);
  
  // Log current state
  const beforeCount = await Unit.count();
  const beforeUnits = await Unit.findAll({
    order: [['id', 'DESC']],
    limit: 10,
    attributes: ['id', 'number', 'condominium_id', 'createdAt']
  });
  
  console.log(`📊 Before deletion: ${beforeCount} units total`);
  console.log(`📋 Last 10 units before:`, beforeUnits.map(u => ({
    id: u.id,
    number: u.number,
    createdAt: u.createdAt
  })));

  // Find and delete the unit
  const unit = await Unit.findByPk(id);
  if (!unit) {
    return res.status(404).json({
      success: false,
      message: 'Unidade não encontrada'
    });
  }

  console.log(`🗑️ [DEBUG] Deleting unit:`, {
    id: unit.id,
    number: unit.number,
    condominium_id: unit.condominium_id
  });

  await unit.destroy();
  console.log(`✅ [DEBUG] Unit destroyed`);

  // Check state immediately after
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const afterCount = await Unit.count();
  const afterUnits = await Unit.findAll({
    order: [['id', 'DESC']],
    limit: 10,
    attributes: ['id', 'number', 'condominium_id', 'createdAt']
  });

  console.log(`📊 After deletion: ${afterCount} units total`);
  console.log(`📋 Last 10 units after:`, afterUnits.map(u => ({
    id: u.id,
    number: u.number,
    createdAt: u.createdAt
  })));

  // Check for new units created after the timestamp
  const deletionTime = new Date();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const finalCount = await Unit.count();
  const newUnits = await Unit.findAll({
    where: {
      createdAt: {
        [Op.gte]: deletionTime
      }
    }
  });

  console.log(`🔍 [DEBUG] Final count after 1 second: ${finalCount}`);
  if (newUnits.length > 0) {
    console.log(`🚨 [DEBUG] NEW UNITS CREATED!`, newUnits.map(u => ({
      id: u.id,
      number: u.number,
      createdAt: u.createdAt
    })));
  }

  res.json({
    success: true,
    message: 'Debug delete completed',
    data: {
      beforeCount,
      afterCount,
      finalCount,
      difference: afterCount - beforeCount,
      finalDifference: finalCount - beforeCount,
      newUnitsCreated: newUnits.length,
      deletedUnit: {
        id: unit.id,
        number: unit.number
      }
    }
  });
});

module.exports = {
  getUnits,
  getUnitsByCondominium,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  debugDelete
};