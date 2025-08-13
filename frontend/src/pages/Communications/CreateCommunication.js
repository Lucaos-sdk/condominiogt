import React, { useState, useEffect } from 'react';
import { communicationAPI, condominiumAPI, unitAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CreateCommunication = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [condominiums, setCondominiums] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [formData, setFormData] = useState({
    condominium_id: '',
    title: '',
    content: '',
    type: 'announcement',
    priority: 'medium',
    status: 'draft',
    target_audience: 'all',
    target_units: [],
    publish_date: '',
    expire_date: '',
    send_email: false,
    send_whatsapp: false,
    attachments: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const response = await condominiumAPI.getAll();
        setCondominiums(response.data);
        
        // Auto-selecionar primeiro condomínio se houver apenas um
        if (response.data.length === 1) {
          setFormData(prev => ({
            ...prev,
            condominium_id: response.data[0].id.toString()
          }));
        }
      } catch (err) {
        console.error('Erro ao carregar condomínios:', err);
        setError('Erro ao carregar condomínios');
      }
    };

    loadCondominiums();
  }, []);

  useEffect(() => {
    const loadUnits = async () => {
      if (!formData.condominium_id) {
        setUnits([]);
        return;
      }

      try {
        setLoadingUnits(true);
        const response = await unitAPI.getByCondominium(formData.condominium_id);
        setUnits(response.data);
      } catch (err) {
        console.error('Erro ao carregar unidades:', err);
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };

    loadUnits();
  }, [formData.condominium_id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleTargetUnitsChange = (unitId) => {
    setFormData(prev => {
      const currentUnits = prev.target_units;
      const isSelected = currentUnits.includes(unitId);
      
      if (isSelected) {
        return {
          ...prev,
          target_units: currentUnits.filter(id => id !== unitId)
        };
      } else {
        return {
          ...prev,
          target_units: [...currentUnits, unitId]
        };
      }
    });
  };

  const handleSelectAllUnits = () => {
    const allUnitIds = units.map(unit => unit.id);
    setFormData(prev => ({
      ...prev,
      target_units: prev.target_units.length === units.length ? [] : allUnitIds
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.condominium_id) {
      newErrors.condominium_id = 'Condomínio é obrigatório';
    }

    if (!formData.title || formData.title.trim().length < 5) {
      newErrors.title = 'Título deve ter pelo menos 5 caracteres';
    }

    if (!formData.content || formData.content.trim().length < 10) {
      newErrors.content = 'Conteúdo deve ter pelo menos 10 caracteres';
    }

    if (formData.target_audience === 'specific_units' && formData.target_units.length === 0) {
      newErrors.target_units = 'Selecione pelo menos uma unidade';
    }

    if (formData.expire_date && formData.publish_date && 
        new Date(formData.expire_date) <= new Date(formData.publish_date)) {
      newErrors.expire_date = 'Data de expiração deve ser posterior à data de publicação';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Preparar dados para envio
      const submitData = {
        ...formData,
        condominium_id: parseInt(formData.condominium_id),
        target_units: formData.target_audience === 'specific_units' ? formData.target_units : null,
        publish_date: formData.publish_date || null,
        expire_date: formData.expire_date || null
      };

      await communicationAPI.create(submitData);
      
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/comunicados';
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao criar comunicação:', err);
      setError(err.response?.data?.message || 'Erro ao criar comunicação');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/comunicados';
  };

  if (success) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Sucesso!</h3>
              <div className="mt-2 text-sm text-green-700">
                Comunicação criada com sucesso. Redirecionando...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Comunicação</h1>
            <p className="mt-1 text-sm text-gray-500">
              Crie um novo comunicado ou aviso para os moradores
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Informações Básicas */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Condomínio */}
              <div>
                <label htmlFor="condominium_id" className="block text-sm font-medium text-gray-700">
                  Condomínio *
                </label>
                <select
                  id="condominium_id"
                  name="condominium_id"
                  value={formData.condominium_id}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${errors.condominium_id ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                >
                  <option value="">Selecione um condomínio</option>
                  {condominiums.map(cond => (
                    <option key={cond.id} value={cond.id}>
                      {cond.name}
                    </option>
                  ))}
                </select>
                {errors.condominium_id && (
                  <p className="mt-2 text-sm text-red-600">{errors.condominium_id}</p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="announcement">Comunicado</option>
                  <option value="notice">Aviso</option>
                  <option value="warning">Alerta</option>
                  <option value="event">Evento</option>
                  <option value="assembly">Assembleia</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Prioridade
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="scheduled">Agendado</option>
                </select>
              </div>
            </div>

            {/* Título */}
            <div className="mt-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Título *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`mt-1 block w-full border ${errors.title ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Ex: Aviso importante sobre limpeza da piscina"
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Conteúdo */}
            <div className="mt-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                Conteúdo *
              </label>
              <textarea
                id="content"
                name="content"
                rows={6}
                value={formData.content}
                onChange={handleInputChange}
                className={`mt-1 block w-full border ${errors.content ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Descreva o comunicado de forma clara e objetiva..."
              />
              {errors.content && (
                <p className="mt-2 text-sm text-red-600">{errors.content}</p>
              )}
            </div>
          </div>

          {/* Público-Alvo */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Público-Alvo</h3>
            
            <div>
              <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700">
                Destinatários
              </label>
              <select
                id="target_audience"
                name="target_audience"
                value={formData.target_audience}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">Todos os moradores</option>
                <option value="owners">Apenas proprietários</option>
                <option value="tenants">Apenas inquilinos</option>
                <option value="managers">Apenas síndicos/administradores</option>
                <option value="specific_units">Unidades específicas</option>
              </select>
            </div>

            {/* Seleção de Unidades Específicas */}
            {formData.target_audience === 'specific_units' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Selecionar Unidades
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllUnits}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    {formData.target_units.length === units.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                </div>
                
                {loadingUnits ? (
                  <div className="text-sm text-gray-500">Carregando unidades...</div>
                ) : units.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhuma unidade encontrada</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {units.map(unit => (
                        <label key={unit.id} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.target_units.includes(unit.id)}
                            onChange={() => handleTargetUnitsChange(unit.id)}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {unit.unit_number}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {errors.target_units && (
                  <p className="mt-2 text-sm text-red-600">{errors.target_units}</p>
                )}
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data de Publicação */}
              <div>
                <label htmlFor="publish_date" className="block text-sm font-medium text-gray-700">
                  Data de Publicação
                </label>
                <input
                  type="datetime-local"
                  id="publish_date"
                  name="publish_date"
                  value={formData.publish_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Deixe em branco para publicar imediatamente
                </p>
              </div>

              {/* Data de Expiração */}
              <div>
                <label htmlFor="expire_date" className="block text-sm font-medium text-gray-700">
                  Data de Expiração
                </label>
                <input
                  type="datetime-local"
                  id="expire_date"
                  name="expire_date"
                  value={formData.expire_date}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${errors.expire_date ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
                {errors.expire_date && (
                  <p className="mt-2 text-sm text-red-600">{errors.expire_date}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Opcional - deixe em branco para não expirar
                </p>
              </div>
            </div>
          </div>

          {/* Opções de Notificação */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notificações</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="send_email"
                  name="send_email"
                  type="checkbox"
                  checked={formData.send_email}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="send_email" className="ml-2 block text-sm text-gray-900">
                  Enviar por email
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="send_whatsapp"
                  name="send_whatsapp"
                  type="checkbox"
                  checked={formData.send_whatsapp}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="send_whatsapp" className="ml-2 block text-sm text-gray-900">
                  Enviar por WhatsApp
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando...
              </>
            ) : (
              'Criar Comunicação'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCommunication;