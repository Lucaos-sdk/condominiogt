const { Unit, Resident, UnitHistory, User } = require('../models');
const { validationResult } = require('express-validator');

const getResidentsByUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { include_inactive = false } = req.query;

    const unit = await Unit.findByPk(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    const whereClause = { unit_id: unitId };
    if (!include_inactive) {
      whereClause.is_active = true;
    }

    const residents = await Resident.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [
        ['is_main_resident', 'DESC'],
        ['relationship', 'ASC'],
        ['name', 'ASC']
      ],
    });

    res.json(residents);
  } catch (error) {
    console.error('Erro ao buscar moradores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getResidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await Resident.findByPk(id, {
      include: [
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'number', 'block', 'floor'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!resident) {
      return res.status(404).json({ error: 'Morador não encontrado' });
    }

    res.json(resident);
  } catch (error) {
    console.error('Erro ao buscar morador:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createResident = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { unitId } = req.params;
    const residentData = { ...req.body, unit_id: unitId };

    const unit = await Unit.findByPk(unitId);
    if (!unit) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    const existingResident = await Resident.findOne({
      where: { cpf: residentData.cpf }
    });

    if (existingResident) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um morador cadastrado com este CPF'
      });
    }

    if (residentData.is_main_resident) {
      await Resident.update(
        { is_main_resident: false },
        { where: { unit_id: unitId, is_main_resident: true } }
      );
    }

    const resident = await Resident.create(residentData);

    await UnitHistory.create({
      unit_id: unitId,
      resident_id: resident.id,
      action_type: 'resident_added',
      description: `Morador ${resident.name} adicionado à unidade`,
      new_values: residentData,
      changed_by_user_id: req.user.id,
      metadata: { ip: req.ip, user_agent: req.get('User-Agent') },
    });

    const newResident = await Resident.findByPk(resident.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Morador adicionado com sucesso',
      data: newResident
    });
  } catch (error) {
    console.error('Erro ao criar morador:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        details: error.errors.map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const updateResident = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    const resident = await Resident.findByPk(id);
    if (!resident) {
      return res.status(404).json({ error: 'Morador não encontrado' });
    }

    if (updateData.cpf && updateData.cpf !== resident.cpf) {
      const existingResident = await Resident.findOne({
        where: { cpf: updateData.cpf }
      });

      if (existingResident) {
        return res.status(400).json({ 
          error: 'Já existe um morador cadastrado com este CPF' 
        });
      }
    }

    const oldValues = resident.toJSON();

    if (updateData.is_main_resident && !resident.is_main_resident) {
      await Resident.update(
        { is_main_resident: false },
        { 
          where: { 
            unit_id: resident.unit_id, 
            is_main_resident: true,
            id: { [require('sequelize').Op.ne]: id }
          } 
        }
      );
    }

    await resident.update(updateData);

    await UnitHistory.create({
      unit_id: resident.unit_id,
      resident_id: resident.id,
      action_type: 'resident_updated',
      description: `Informações do morador ${resident.name} foram atualizadas`,
      old_values: oldValues,
      new_values: updateData,
      changed_by_user_id: req.user.id,
      metadata: { ip: req.ip, user_agent: req.get('User-Agent') },
    });

    const updatedResident = await Resident.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json(updatedResident);
  } catch (error) {
    console.error('Erro ao atualizar morador:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors.map(e => e.message) 
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const removeResident = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const resident = await Resident.findByPk(id);
    if (!resident) {
      return res.status(404).json({ error: 'Morador não encontrado' });
    }

    const oldValues = resident.toJSON();

    if (permanent === 'true') {
      await UnitHistory.create({
        unit_id: resident.unit_id,
        resident_id: resident.id,
        action_type: 'resident_removed',
        description: `Morador ${resident.name} removido permanentemente da unidade`,
        old_values: oldValues,
        changed_by_user_id: req.user.id,
        metadata: { ip: req.ip, user_agent: req.get('User-Agent') },
      });

      await resident.destroy();
      res.json({
        success: true,
        message: 'Morador removido permanentemente'
      });
    } else {
      await resident.update({
        is_active: false,
        move_out_date: new Date().toISOString().split('T')[0],
      });

      await UnitHistory.create({
        unit_id: resident.unit_id,
        resident_id: resident.id,
        action_type: 'resident_removed',
        description: `Morador ${resident.name} marcado como inativo (mudança)`,
        old_values: oldValues,
        new_values: { is_active: false, move_out_date: new Date().toISOString().split('T')[0] },
        changed_by_user_id: req.user.id,
        metadata: { ip: req.ip, user_agent: req.get('User-Agent') },
      });

      res.json({
        success: true,
        message: 'Morador marcado como inativo'
      });
    }
  } catch (error) {
    console.error('Erro ao remover morador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const reactivateResident = async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await Resident.findByPk(id);
    if (!resident) {
      return res.status(404).json({ error: 'Morador não encontrado' });
    }

    const oldValues = resident.toJSON();

    await resident.update({
      is_active: true,
      move_out_date: null,
    });

    await UnitHistory.create({
      unit_id: resident.unit_id,
      resident_id: resident.id,
      action_type: 'resident_updated',
      description: `Morador ${resident.name} reativado na unidade`,
      old_values: oldValues,
      new_values: { is_active: true, move_out_date: null },
      changed_by_user_id: req.user.id,
      metadata: { ip: req.ip, user_agent: req.get('User-Agent') },
    });

    const reactivatedResident = await Resident.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json(reactivatedResident);
  } catch (error) {
    console.error('Erro ao reativar morador:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getResidentsByUnit,
  getResidentById,
  createResident,
  updateResident,
  removeResident,
  reactivateResident,
};