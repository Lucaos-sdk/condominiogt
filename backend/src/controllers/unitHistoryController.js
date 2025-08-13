const { UnitHistory, Unit, Resident, User } = require('../models');

const getUnitHistory = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      action_type, 
      start_date, 
      end_date 
    } = req.query;

    const unit = await Unit.findByPk(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    const whereClause = { unit_id: unitId };

    if (action_type) {
      whereClause.action_type = action_type;
    }

    if (start_date || end_date) {
      whereClause.createdAt = {};
      if (start_date) {
        whereClause.createdAt[require('sequelize').Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.createdAt[require('sequelize').Op.lte] = new Date(end_date + ' 23:59:59');
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows: history } = await UnitHistory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'cpf'],
        },
        {
          model: User,
          as: 'changed_by_user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      history,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: count,
        items_per_page: parseInt(limit),
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar histórico da unidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getHistoryEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const historyEntry = await UnitHistory.findByPk(id, {
      include: [
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'number', 'block', 'floor'],
        },
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'cpf'],
        },
        {
          model: User,
          as: 'changed_by_user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!historyEntry) {
      return res.status(404).json({ error: 'Entrada de histórico não encontrada' });
    }

    res.json(historyEntry);
  } catch (error) {
    console.error('Erro ao buscar entrada de histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createHistoryEntry = async (req, res) => {
  try {
    const { unitId } = req.params;
    const {
      resident_id,
      action_type,
      description,
      old_values,
      new_values,
      metadata
    } = req.body;

    const unit = await Unit.findByPk(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    if (resident_id) {
      const resident = await Resident.findByPk(resident_id);
      if (!resident) {
        return res.status(404).json({ error: 'Morador não encontrado' });
      }
    }

    const historyEntry = await UnitHistory.create({
      unit_id: unitId,
      resident_id,
      action_type,
      description,
      old_values,
      new_values,
      changed_by_user_id: req.user.id,
      metadata: {
        ...metadata,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
    });

    const newEntry = await UnitHistory.findByPk(historyEntry.id, {
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name', 'cpf'],
        },
        {
          model: User,
          as: 'changed_by_user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Erro ao criar entrada de histórico:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors.map(e => e.message) 
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getHistoryStats = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { start_date, end_date } = req.query;

    const unit = await Unit.findByPk(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    const whereClause = { unit_id: unitId };

    if (start_date || end_date) {
      whereClause.createdAt = {};
      if (start_date) {
        whereClause.createdAt[require('sequelize').Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.createdAt[require('sequelize').Op.lte] = new Date(end_date + ' 23:59:59');
      }
    }

    const stats = await UnitHistory.findAll({
      where: whereClause,
      attributes: [
        'action_type',
        [require('sequelize').fn('COUNT', require('sequelize').col('action_type')), 'count']
      ],
      group: ['action_type'],
    });

    const totalEntries = await UnitHistory.count({ where: whereClause });

    const recentActivity = await UnitHistory.findAll({
      where: whereClause,
      include: [
        {
          model: Resident,
          as: 'resident',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    res.json({
      total_entries: totalEntries,
      action_stats: stats,
      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getUnitHistory,
  getHistoryEntry,
  createHistoryEntry,
  getHistoryStats,
};