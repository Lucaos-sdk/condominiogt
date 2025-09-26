const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, UserCondominium, Condominium, Unit } = require('../models');
const { asyncHandler, logger } = require('../middleware/errorHandler');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Buscar usuário incluindo senha
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{
      model: UserCondominium,
      as: 'condominiums',
      include: [
        {
          model: Condominium,
          as: 'condominium',
          attributes: ['id', 'name', 'logo']
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'number', 'block', 'type']
        }
      ]
    }]
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    });
  }

  // Verificar senha
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas'
    });
  }

  // Verificar se usuário está ativo
  if (user.status === 'inactive') {
    return res.status(401).json({
      success: false,
      message: 'Usuário inativo'
    });
  }

  // Atualizar último login
  await user.update({ last_login: new Date() });

  // Gerar tokens
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Remover senha da resposta
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    last_login: user.last_login,
    condominiums: user.condominiums,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  logger.info(`Login successful for user: ${email}`);

  res.json({
    success: true,
    message: 'Login realizado com sucesso',
    data: {
      user: userResponse,
      token,
      refreshToken
    }
  });
});

// @desc    Registro de usuário
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, cpf, role = 'resident' } = req.body;

  // Verificar se email já existe
  const existingUser = await User.findOne({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
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

  // Criar usuário
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password: hashedPassword,
    phone,
    cpf,
    role,
    status: 'pending' // Usuários registrados ficam pendentes por padrão
  });

  // Gerar tokens
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Remover senha da resposta
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  logger.info(`User registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso',
    data: {
      user: userResponse,
      token,
      refreshToken
    }
  });
});

// @desc    Obter perfil do usuário logado
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
    include: [{
      model: UserCondominium,
      as: 'condominiums',
      include: [
        {
          model: Condominium,
          as: 'condominium',
          attributes: ['id', 'name', 'logo', 'address', 'city', 'state']
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'number', 'block', 'type', 'area']
        }
      ]
    }]
  });

  res.json({
    success: true,
    message: 'Perfil obtido com sucesso',
    data: { user }
  });
});

// @desc    Atualizar perfil do usuário
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, cpf } = req.body;

  const user = req.user;

  // Verificar se CPF já está em uso por outro usuário
  if (cpf && cpf !== user.cpf) {
    const existingCPF = await User.findOne({
      where: { 
        cpf,
        id: { [require('sequelize').Op.ne]: user.id }
      }
    });

    if (existingCPF) {
      return res.status(409).json({
        success: false,
        message: 'CPF já está em uso'
      });
    }
  }

  // Atualizar campos
  const updateData = {};
  if (name) updateData.name = name.trim();
  if (phone) updateData.phone = phone;
  if (cpf) updateData.cpf = cpf;

  await user.update(updateData);

  // Buscar usuário atualizado sem senha
  const updatedUser = await User.findByPk(user.id, {
    attributes: { exclude: ['password'] },
    include: [{
      model: UserCondominium,
      as: 'condominiums',
      include: ['condominium', 'unit']
    }]
  });

  logger.info(`Profile updated for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Perfil atualizado com sucesso',
    data: { user: updatedUser }
  });
});

// @desc    Alterar senha
// @route   PUT /api/auth/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(req.user.id);

  // Verificar senha atual
  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Senha atual incorreta'
    });
  }

  // Hash da nova senha
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Atualizar senha
  await user.update({ password: hashedPassword });

  logger.info(`Password changed for user: ${user.email}`);

  res.json({
    success: true,
    message: 'Senha alterada com sucesso'
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token requerido'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    const user = await User.findByPk(decoded.id);
    
    if (!user || user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Usuário inválido'
      });
    }

    // Gerar novos tokens
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // Em uma implementação real, você poderia adicionar o token a uma blacklist
  // Por enquanto, apenas retornamos sucesso
  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout
};