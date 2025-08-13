import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { userAPI, condominiumAPI, unitAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CreateUser = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [condominiums, setCondominiums] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    role: 'resident',
    status: 'pending',
    password: '',
    confirmPassword: ''
  });

  const [associations, setAssociations] = useState([{
    condominium_id: '',
    unit_id: '',
    role: 'resident',
    status: 'active',
    access_permissions: {
      can_manage_users: false,
      can_view_reports: false,
      can_manage_finances: false,
      can_manage_maintenance: false
    }
  }]);

  useEffect(() => {
    loadCondominiums();
    if (isEditing) {
      loadUserData();
    }
  }, [id]);

  const loadCondominiums = async () => {
    try {
      const response = await condominiumAPI.getAll();
      if (response.data.success) {
        const condos = response.data.condominiums || response.data.data?.condominiums || [];
        setCondominiums(condos);
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const response = await userAPI.getById(id);
      if (response.data.success) {
        const userData = response.data.data || response.data.user;
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          cpf: userData.cpf || '',
          role: userData.role || 'resident',
          status: userData.status || 'pending',
          password: '',
          confirmPassword: ''
        });

        // Carregar associações existentes
        if (userData.condominiums && userData.condominiums.length > 0) {
          const userAssociations = userData.condominiums.map(assoc => ({
            condominium_id: assoc.condominium_id || '',
            unit_id: assoc.unit_id || '',
            role: assoc.role || 'resident',
            status: assoc.status || 'active',
            access_permissions: assoc.access_permissions || {
              can_manage_users: false,
              can_view_reports: false,
              can_manage_finances: false,
              can_manage_maintenance: false
            }
          }));
          setAssociations(userAssociations);
        }
      }
    } catch (error) {
      setError('Erro ao carregar dados do usuário');
    } finally {
      setLoadingData(false);
    }
  };

  const loadUnitsForCondominium = async (condominiumId, associationIndex) => {
    try {
      const response = await unitAPI.getByCondominium(condominiumId);
      if (response.data.success) {
        const data = response.data.data || response.data;
        const units = data.units || [];
        setAvailableUnits(prev => ({
          ...prev,
          [associationIndex]: units
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssociationChange = (index, field, value) => {
    setAssociations(prev => {
      const newAssociations = [...prev];
      
      if (field === 'condominium_id') {
        // Reset unit when condominium changes
        newAssociations[index] = {
          ...newAssociations[index],
          [field]: value,
          unit_id: ''
        };
        
        // Load units for the selected condominium
        if (value) {
          loadUnitsForCondominium(value, index);
        }
      } else {
        newAssociations[index] = {
          ...newAssociations[index],
          [field]: value
        };
      }
      
      return newAssociations;
    });
  };

  const handlePermissionChange = (index, permission, value) => {
    setAssociations(prev => {
      const newAssociations = [...prev];
      newAssociations[index] = {
        ...newAssociations[index],
        access_permissions: {
          ...newAssociations[index].access_permissions,
          [permission]: value
        }
      };
      return newAssociations;
    });
  };

  const addAssociation = () => {
    setAssociations(prev => [...prev, {
      condominium_id: '',
      unit_id: '',
      role: 'resident',
      status: 'active',
      access_permissions: {
        can_manage_users: false,
        can_view_reports: false,
        can_manage_finances: false,
        can_manage_maintenance: false
      }
    }]);
  };

  const removeAssociation = (index) => {
    if (associations.length > 1) {
      setAssociations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name || formData.name.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('Email inválido');
    }

    if (!formData.phone || formData.phone.length < 10) {
      errors.push('Telefone deve ter pelo menos 10 dígitos');
    }

    if (!isEditing) {
      if (!formData.password || formData.password.length < 6) {
        errors.push('Senha deve ter pelo menos 6 caracteres');
      }

      if (formData.password !== formData.confirmPassword) {
        errors.push('Senhas não coincidem');
      }
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      errors.push('Senhas não coincidem');
    }

    // Validar pelo menos uma associação válida
    const validAssociations = associations.filter(assoc => assoc.condominium_id);
    if (validAssociations.length === 0) {
      errors.push('Pelo menos um condomínio deve ser selecionado');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userData = {
        ...formData,
        associations: associations.filter(assoc => assoc.condominium_id)
      };

      // Remove campos de senha vazios em edição
      if (isEditing && !userData.password) {
        delete userData.password;
        delete userData.confirmPassword;
      }

      const response = isEditing 
        ? await userAPI.update(id, userData)
        : await userAPI.create(userData);
      
      if (response.data.success) {
        setSuccess(isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        setTimeout(() => {
          navigate('/usuarios');
        }, 2000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      manager: 'Gestor',
      syndic: 'Síndico',
      resident: 'Morador'
    };
    return labels[role] || role;
  };

  const canAssignRole = (role) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'manager' && ['syndic', 'resident'].includes(role)) return true;
    return false;
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/usuarios')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dados Pessoais */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Dados Pessoais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="(11) 99999-9999"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função Principal *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {['admin', 'manager', 'syndic', 'resident'].map(role => (
                    canAssignRole(role) && (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    )
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pendente</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Senha */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {isEditing ? 'Alterar Senha (Opcional)' : 'Senha *'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isEditing ? 'Nova Senha' : 'Senha *'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!isEditing}
                  minLength="6"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha {!isEditing && '*'}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isEditing || formData.password}
                  minLength="6"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Associações com Condomínios */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Associações com Condomínios</h2>
              <button
                type="button"
                onClick={addAssociation}
                className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
              >
                + Adicionar Condomínio
              </button>
            </div>
            
            {associations.map((association, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Condomínio {index + 1}
                  </h3>
                  {associations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAssociation(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condomínio *
                    </label>
                    <select
                      value={association.condominium_id}
                      onChange={(e) => handleAssociationChange(index, 'condominium_id', e.target.value)}
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">Selecione um condomínio</option>
                      {condominiums.map(condo => (
                        <option key={condo.id} value={condo.id}>
                          {condo.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade
                    </label>
                    <select
                      value={association.unit_id}
                      onChange={(e) => handleAssociationChange(index, 'unit_id', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={!association.condominium_id}
                    >
                      <option value="">Sem unidade específica</option>
                      {(availableUnits[index] || []).map(unit => (
                        <option key={unit.id} value={unit.id}>
                          Unidade {unit.number} - {unit.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Função no Condomínio
                    </label>
                    <select
                      value={association.role}
                      onChange={(e) => handleAssociationChange(index, 'role', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="resident">Morador</option>
                      <option value="syndic">Síndico</option>
                      <option value="manager">Gestor</option>
                    </select>
                  </div>
                </div>

                {/* Permissões */}
                {['manager', 'syndic'].includes(association.role) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissões Específicas
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries({
                        can_manage_users: 'Gerenciar Usuários',
                        can_view_reports: 'Ver Relatórios',
                        can_manage_finances: 'Gerenciar Finanças',
                        can_manage_maintenance: 'Gerenciar Manutenção'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={association.access_permissions[key]}
                            onChange={(e) => handlePermissionChange(index, key, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar Usuário' : 'Criar Usuário')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUser;