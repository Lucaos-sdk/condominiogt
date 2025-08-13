const { User, Condominium, UserCondominium } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// @desc    Obter todos os usuários
// @route   GET /api/users
// @access  Private (admin, manager)
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, status } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { cpf: { [Op.like]: `%${search}%` } }
    ];
  }

  if (role) {
    whereClause.role = role;
  }

  if (status) {
    whereClause.status = status;
  }

  const { count, rows: users } = await User.findAndCountAll({
    where: whereClause,
    attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: UserCondominium,
        as: 'condominiums',
        include: [
          {
            model: Condominium,
            as: 'condominium',
            attributes: ['id', 'name', 'address', 'city']
          }
        ]
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Usuários obtidos com sucesso',
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

// @desc    Obter usuários por condomínio
// @route   GET /api/users/condominium/:condominiumId
// @access  Private
const getUsersByCondominium = asyncHandler(async (req, res) => {
  const { condominiumId } = req.params;
  const { page = 1, limit = 50, search, role } = req.query;
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

  // Construir whereClause para UserCondominium
  const userCondominiumWhere = { condominium_id: condominiumId };
  if (role) {
    userCondominiumWhere.role = role;
  }

  // Construir whereClause para User
  const userWhere = {};
  if (search) {
    userWhere[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { cpf: { [Op.like]: `%${search}%` } }
    ];
  }

  const { count, rows: userCondominiums } = await UserCondominium.findAndCountAll({
    where: userCondominiumWhere,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'ASC']],
    include: [
      {
        model: User,
        as: 'user',
        where: userWhere,
        attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] }
      }
    ]
  });

  const totalPages = Math.ceil(count / limit);

  res.json({
    success: true,
    message: 'Usuários do condomínio obtidos com sucesso',
    data: {
      users: userCondominiums.map(uc => ({
        ...uc.user.toJSON(),
        condominium_role: uc.role,
        unit_id: uc.unit_id,
        joined_at: uc.created_at
      })),
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

// @desc    Obter usuário por ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar permissões - usuários podem ver apenas seu próprio perfil, exceto admins/managers
  if (req.user.role === 'resident' && parseInt(id) !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado'
    });
  }

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] },
    include: [
      {
        model: UserCondominium,
        as: 'condominiums',
        include: [
          {
            model: Condominium,
            as: 'condominium',
            attributes: ['id', 'name', 'address', 'city', 'state']
          }
        ]
      }
    ]
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  res.json({
    success: true,
    message: 'Usuário obtido com sucesso',
    data: { user }
  });
});

// @desc    Criar novo usuário
// @route   POST /api/users
// @access  Private (admin, manager)
const createUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    cpf,
    role,
    status,
    avatar
  } = req.body;

  // Verificar permissões de criação de role
  if (role && role !== 'resident') {
    // Apenas admin pode criar outros admins
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem criar outros administradores'
      });
    }
    
    // Manager só pode criar syndic e resident
    if (req.user.role === 'manager' && !['syndic', 'resident'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Gestores podem criar apenas síndicos e moradores'
      });
    }
  }

  // Verificar se email já existe
  const existingEmail = await User.findOne({
    where: { email: email.toLowerCase() }
  });

  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email já está em uso'
    });
  }

  // Verificar se CPF já existe (se fornecido)
  if (cpf) {
    const existingCPF = await User.findOne({
      where: { cpf }
    });

    if (existingCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF já está em uso'
      });
    }
  }

  // Hash da senha
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password: hashedPassword,
    phone,
    cpf,
    role: role || 'resident',
    status: status || 'active',
    avatar
  });

  // Remover senha da resposta
  const userResponse = user.toJSON();
  delete userResponse.password;
  delete userResponse.reset_password_token;
  delete userResponse.reset_password_expires;

  logger.info(`User created: ${email} (${role || 'resident'}) by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso',
    data: { user: userResponse }
  });
});

// @desc    Atualizar usuário
// @route   PUT /api/users/:id
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    phone,
    cpf,
    role,
    status,
    avatar
  } = req.body;

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  // Verificar permissões
  if (req.user.role === 'resident' && parseInt(id) !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para editar este usuário'
    });
  }

  // Verificar permissões de atualização de role
  if (role && role !== user.role) {
    // Apenas admin pode alterar role para admin
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem promover usuários a administrador'
      });
    }
    
    // Manager só pode alterar para syndic e resident
    if (req.user.role === 'manager' && !['syndic', 'resident'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Gestores podem alterar role apenas para síndico ou morador'
      });
    }

    // Não permitir que managers alterem admins
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem alterar outros administradores'
      });
    }
  }

  // Residentes não podem alterar role e status
  if (req.user.role === 'resident' && (role !== undefined || status !== undefined)) {
    return res.status(403).json({
      success: false,
      message: 'Usuários residentes não podem alterar role ou status'
    });
  }

  // Verificar email único (se mudou)
  if (email && email.toLowerCase() !== user.email) {
    const existingEmail = await User.findOne({
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

  // Verificar CPF único (se mudou)
  if (cpf && cpf !== user.cpf) {
    const existingCPF = await User.findOne({
      where: { 
        cpf,
        id: { [Op.ne]: id }
      }
    });

    if (existingCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF já está em uso'
      });
    }
  }

  // Construir objeto de atualização
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (email !== undefined) updateData.email = email.toLowerCase();
  if (phone !== undefined) updateData.phone = phone;
  if (cpf !== undefined) updateData.cpf = cpf;
  if (avatar !== undefined) updateData.avatar = avatar;
  
  // Apenas admins/managers podem alterar role e status
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
  }

  await user.update(updateData);

  // Buscar usuário atualizado
  const updatedUser = await User.findByPk(id, {
    attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] },
    include: [
      {
        model: UserCondominium,
        as: 'condominiums',
        include: [
          {
            model: Condominium,
            as: 'condominium',
            attributes: ['id', 'name', 'address', 'city']
          }
        ]
      }
    ]
  });

  logger.info(`User updated: ${user.email} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Usuário atualizado com sucesso',
    data: { user: updatedUser }
  });
});

// @desc    Alterar senha do usuário
// @route   PUT /api/users/:id/password
// @access  Private
const updateUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  // Verificar permissões
  if (req.user.role === 'resident' && parseInt(id) !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado para alterar senha deste usuário'
    });
  }

  // Verificar senha atual (apenas para o próprio usuário)
  if (parseInt(id) === req.user.id) {
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual é obrigatória'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }
  }

  // Hash da nova senha
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await user.update({ password: hashedPassword });

  logger.info(`Password updated for user: ${user.email} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Senha atualizada com sucesso'
  });
});

// @desc    Deletar usuário
// @route   DELETE /api/users/:id
// @access  Private (admin only)
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    include: [
      {
        model: UserCondominium,
        as: 'condominiums'
      }
    ]
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

  // Verificar se há associações com condomínios
  if (user.condominiums && user.condominiums.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Não é possível deletar usuário com associações a condomínios. Remova as associações primeiro.'
    });
  }

  // Não permitir deletar o próprio usuário
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'Não é possível deletar seu próprio usuário'
    });
  }

  await user.destroy();

  logger.info(`User deleted: ${user.email} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Usuário deletado com sucesso'
  });
});

// @desc    Associar usuário a condomínio
// @route   POST /api/users/:id/condominiums
// @access  Private (admin, manager, syndic)
const associateUserToCondominium = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { condominium_id, role, unit_id } = req.body;

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado'
    });
  }

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
        message: 'Acesso negado para associar usuários a este condomínio'
      });
    }
  }

  // Verificar se associação já existe
  const existingAssociation = await UserCondominium.findOne({
    where: {
      user_id: id,
      condominium_id
    }
  });

  if (existingAssociation) {
    return res.status(409).json({
      success: false,
      message: 'Usuário já está associado a este condomínio'
    });
  }

  const association = await UserCondominium.create({
    user_id: id,
    condominium_id,
    role: role || 'resident',
    unit_id
  });

  logger.info(`User ${user.email} associated to condominium ${condominium.name} as ${role || 'resident'} by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Usuário associado ao condomínio com sucesso',
    data: { association }
  });
});

// @desc    Remover associação usuário-condomínio
// @route   DELETE /api/users/:id/condominiums/:condominiumId
// @access  Private (admin, manager, syndic)
const removeUserFromCondominium = asyncHandler(async (req, res) => {
  const { id, condominiumId } = req.params;

  // Verificar permissão para síndicos
  if (req.user.role === 'syndic') {
    const userCondominium = await UserCondominium.findOne({
      where: {
        user_id: req.user.id,
        condominium_id: condominiumId,
        role: 'syndic'
      }
    });

    if (!userCondominium) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para remover usuários deste condomínio'
      });
    }
  }

  const association = await UserCondominium.findOne({
    where: {
      user_id: id,
      condominium_id: condominiumId
    }
  });

  if (!association) {
    return res.status(404).json({
      success: false,
      message: 'Associação não encontrada'
    });
  }

  await association.destroy();

  logger.info(`User association removed: user_id ${id} from condominium_id ${condominiumId} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Associação removida com sucesso'
  });
});

module.exports = {
  getUsers,
  getUsersByCondominium,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  associateUserToCondominium,
  removeUserFromCondominium
};