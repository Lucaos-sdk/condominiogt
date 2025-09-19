import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { unitAPI, condominiumAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CreateUnit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [condominiums, setCondominiums] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    number: '',
    block: '',
    floor: '',
    type: 'apartment',
    status: 'vacant',
    condominium_id: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    parking_spots: '',
    description: '',
    monthly_fee: '',
    resident_user_id: '',
    payment_due_day: 10,
    auto_billing_enabled: false,
    pet_allowed: false,
    furnished: false,
    balcony: false
  });

  useEffect(() => {
    loadCondominiums();
    if (isEditing) {
      loadUnitData();
    }
  }, [id]);

  useEffect(() => {
    if (formData.condominium_id) {
      loadAvailableUsers();
    }
  }, [formData.condominium_id]);

  const loadCondominiums = async () => {
    try {
      const response = await condominiumAPI.getAll();
      if (response.data.success) {
        const condos = response.data.condominiums || response.data.data?.condominiums || [];
        setCondominiums(condos);
        
        // Se o usuário não é admin, filtra pelos condomínios que ele tem acesso
        if (user.role !== 'admin' && user.condominiums) {
          const userCondos = condos.filter(condo => 
            user.condominiums.some(uc => uc.id === condo.id)
          );
          setCondominiums(userCondos);
          
          // Se só tem acesso a um condomínio, seleciona automaticamente
          if (userCondos.length === 1) {
            setFormData(prev => ({
              ...prev,
              condominium_id: userCondos[0].id.toString()
            }));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await userAPI.getByCondominium(formData.condominium_id);
      if (response.data.success) {
        const users = response.data.data?.users || response.data.users || [];
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadUnitData = async () => {
    try {
      const response = await unitAPI.getById(id);
      console.log('🔍 CreateUnit - Response completa:', response.data);
      if (response.data.success) {
        const unitData = response.data.data?.unit || response.data.unit;
        console.log('🔍 CreateUnit - Unit data extraída:', unitData);
        console.log('🔍 CreateUnit - Floor:', unitData?.floor, 'Bedrooms:', unitData?.bedrooms, 'Bathrooms:', unitData?.bathrooms, 'Parking:', unitData?.parking_spots);
        setFormData({
          number: unitData.number || '',
          block: unitData.block || '',
          floor: unitData.floor !== null && unitData.floor !== undefined ? unitData.floor.toString() : '',
          type: unitData.type || 'apartment',
          status: unitData.status || 'vacant',
          condominium_id: unitData.condominium_id ? unitData.condominium_id.toString() : '',
          area: unitData.area !== null && unitData.area !== undefined ? unitData.area.toString() : '',
          bedrooms: unitData.bedrooms !== null && unitData.bedrooms !== undefined ? unitData.bedrooms.toString() : '',
          bathrooms: unitData.bathrooms !== null && unitData.bathrooms !== undefined ? unitData.bathrooms.toString() : '',
          parking_spots: unitData.parking_spots !== null && unitData.parking_spots !== undefined ? unitData.parking_spots.toString() : '',
          description: unitData.description || '',
          monthly_fee: unitData.condominium_fee || unitData.monthly_amount || '',
          resident_user_id: unitData.resident_user_id ? unitData.resident_user_id.toString() : '',
          payment_due_day: unitData.payment_due_day || 10,
          auto_billing_enabled: unitData.auto_billing_enabled || false,
          pet_allowed: unitData.pet_allowed || false,
          furnished: unitData.furnished || false,
          balcony: unitData.balcony || false
        });
      }
    } catch (error) {
      setError('Erro ao carregar dados da unidade');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.number || formData.number.trim().length === 0) {
      errors.push('Número da unidade é obrigatório');
    }

    if (!formData.condominium_id) {
      errors.push('Condomínio deve ser selecionado');
    }

    if (!formData.type) {
      errors.push('Tipo da unidade deve ser selecionado');
    }

    if (formData.area && isNaN(parseFloat(formData.area))) {
      errors.push('Área deve ser um número válido');
    }

    if (formData.bedrooms && isNaN(parseInt(formData.bedrooms))) {
      errors.push('Número de quartos deve ser um número válido');
    }

    if (formData.bathrooms && isNaN(parseInt(formData.bathrooms))) {
      errors.push('Número de banheiros deve ser um número válido');
    }

    if (formData.parking_spots && isNaN(parseInt(formData.parking_spots))) {
      errors.push('Número de vagas deve ser um número válido');
    }

    if (formData.monthly_fee && isNaN(parseFloat(formData.monthly_fee))) {
      errors.push('Taxa mensal deve ser um número válido');
    }

    if (formData.payment_due_day && (formData.payment_due_day < 1 || formData.payment_due_day > 31)) {
      errors.push('Dia de vencimento deve ser entre 1 e 31');
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
      const unitData = {
        ...formData,
        condominium_id: parseInt(formData.condominium_id),
        area: formData.area ? parseFloat(formData.area) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        parking_spots: formData.parking_spots ? parseInt(formData.parking_spots) : null,
        condominium_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
        monthly_amount: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        resident_user_id: formData.resident_user_id ? parseInt(formData.resident_user_id) : null,
        payment_due_day: formData.payment_due_day ? parseInt(formData.payment_due_day) : null,
        auto_billing_enabled: formData.auto_billing_enabled,
        pet_allowed: formData.pet_allowed,
        furnished: formData.furnished,
        balcony: formData.balcony
      };

      const response = isEditing 
        ? await unitAPI.update(id, unitData)
        : await unitAPI.create(unitData);
      
      if (response.data.success) {
        setSuccess(isEditing ? 'Unidade atualizada com sucesso!' : 'Unidade criada com sucesso!');
        setTimeout(() => {
          navigate('/unidades/lista');
        }, 2000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao salvar unidade');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      apartment: 'Apartamento',
      house: 'Casa',
      commercial: 'Comercial',
      parking: 'Garagem',
      storage: 'Depósito'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      occupied: 'Ocupada',
      vacant: 'Vaga',
      rented: 'Alugada',
      maintenance: 'Manutenção'
    };
    return labels[status] || status;
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
            onClick={() => navigate('/unidades/lista')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Unidade' : 'Nova Unidade'}
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
          {/* Informações Básicas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Unidade *
                </label>
                <input
                  type="text"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: 101, 1A, Casa 5"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condomínio *
                </label>
                <select
                  name="condominium_id"
                  value={formData.condominium_id}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  Bloco
                </label>
                <input
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleInputChange}
                  placeholder="Ex: A, B, C, Torre 1"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Andar
                </label>
                <input
                  type="number"
                  name="floor"
                  value={formData.floor}
                  onChange={handleInputChange}
                  placeholder="Ex: 1, 2, 3"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="apartment">Apartamento</option>
                  <option value="house">Casa</option>
                  <option value="commercial">Comercial</option>
                  <option value="parking">Garagem</option>
                  <option value="storage">Depósito</option>
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
                  <option value="vacant">Vaga</option>
                  <option value="occupied">Ocupada</option>
                  <option value="rented">Alugada</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="area"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="Ex: 65.5"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Detalhes da Unidade */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Detalhes da Unidade</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quartos
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="Ex: 2"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banheiros
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="Ex: 2"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vagas de Garagem
                </label>
                <input
                  type="number"
                  name="parking_spots"
                  value={formData.parking_spots}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="Ex: 1"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Características da Unidade */}
            <div className="border-t pt-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">Características</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobilado
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="furnished"
                      checked={formData.furnished}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        furnished: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Unidade é mobilada
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pets Permitidos
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="pet_allowed"
                      checked={formData.pet_allowed}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pet_allowed: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Permite animais de estimação
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varanda
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="balcony"
                      checked={formData.balcony}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        balcony: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Possui varanda
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Morador da Unidade */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Morador da Unidade</h2>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Morador (Opcional)
                </label>
                <select
                  name="resident_user_id"
                  value={formData.resident_user_id}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um morador</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Selecione um usuário como morador principal da unidade (opcional)
                </p>
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Financeiras</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa Mensal de Condomínio (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="monthly_fee"
                  value={formData.monthly_fee}
                  onChange={handleInputChange}
                  placeholder="Ex: 250.00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia do Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name="payment_due_day"
                  value={formData.payment_due_day}
                  onChange={handleInputChange}
                  placeholder="Ex: 10"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Dia do mês para vencimento da taxa mensal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cobrança Automática
                </label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name="auto_billing_enabled"
                      checked={formData.auto_billing_enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auto_billing_enabled: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Ativar cobrança automática
                    </span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    Gera automaticamente as cobranças 10 dias antes do vencimento
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Observações</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Adicional
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Informações adicionais sobre a unidade..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/unidades/lista')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar Unidade' : 'Criar Unidade')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUnit;