import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceAPI, condominiumAPI, unitAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CreateMaintenanceRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [condominiums, setCondominiums] = useState([]);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    condominium_id: '',
    unit_id: '',
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    location: '',
    estimated_cost: '',
    scheduled_date: '',
    images: []
  });

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    if (formData.condominium_id) {
      loadUnits();
    }
  }, [formData.condominium_id]);

  const loadCondominiums = async () => {
    try {
      const response = await condominiumAPI.getAll();
      if (response.data.success) {
        const condos = response.data.condominiums || response.data.data?.condominiums || [];
        setCondominiums(condos);
        if (condos.length === 1) {
          setFormData(prev => ({ ...prev, condominium_id: condos[0].id }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
      setError('Erro ao carregar condomínios');
    }
  };

  const loadUnits = async () => {
    try {
      const response = await unitAPI.getByCondominium(formData.condominium_id);
      if (response.data.success) {
        const data = response.data.data || response.data;
        setUnits(data.units || []);
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      setError('Máximo de 10 imagens permitidas');
      return;
    }
    
    // Verificar tamanho dos arquivos
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError('Algumas imagens excedem o tamanho máximo de 5MB');
      return;
    }

    // Redimensionar e comprimir imagens
    Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          img.onload = () => {
            // Redimensionar para máximo 800x600 mantendo proporção
            let { width, height } = img;
            const maxWidth = 800;
            const maxHeight = 600;
            
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Desenhar imagem redimensionada
            ctx.drawImage(img, 0, 0, width, height);
            
            // Converter para base64 com qualidade reduzida
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            resolve({
              name: file.name,
              size: file.size,
              url: compressedUrl
            });
          };
          
          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      })
    ).then(images => {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...images]
      }));
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.condominium_id) errors.push('Condomínio é obrigatório');
    if (!formData.title || formData.title.length < 5) errors.push('Título deve ter pelo menos 5 caracteres');
    if (!formData.description || formData.description.length < 10) errors.push('Descrição deve ter pelo menos 10 caracteres');

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

    // Em uma implementação real, você faria upload das imagens primeiro
    const requestData = {
      condominium_id: parseInt(formData.condominium_id),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      location: formData.location || '',
      images: formData.images.length > 0 ? formData.images.map(img => img.url) : []
    };

    // Adicionar unit_id apenas se tiver valor
    if (formData.unit_id) {
      requestData.unit_id = parseInt(formData.unit_id);
    }

    // Adicionar campos opcionais apenas se preenchidos
    if (formData.estimated_cost) {
      requestData.estimated_cost = parseFloat(formData.estimated_cost);
    }
    if (formData.scheduled_date) {
      requestData.scheduled_date = formData.scheduled_date;
    }

    try {
      const response = await maintenanceAPI.createRequest(requestData);
      
      if (response.data.success) {
        setSuccess('Solicitação criada com sucesso!');
        setTimeout(() => {
          navigate('/manutencao/solicitacoes');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      console.log('Response data:', error.response?.data);
      console.log('Request data:', requestData);
      console.log('Full response:', error.response);
      console.log('Errors array:', error.response?.data?.errors);
      
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => `${err.field || err.param}: ${err.message || err.msg}`).join(', ');
        setError(`Erros de validação: ${errorMessages}`);
      } else {
        setError(error.response?.data?.message || 'Erro ao criar solicitação');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      plumbing: 'Hidráulica',
      electrical: 'Elétrica',
      hvac: 'Ar Condicionado',
      elevator: 'Elevador',
      security: 'Segurança',
      cleaning: 'Limpeza',
      landscaping: 'Jardinagem',
      structural: 'Estrutural',
      appliances: 'Equipamentos',
      other: 'Outros'
    };
    return labels[category] || category;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/manutencao/solicitacoes')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Nova Solicitação de Manutenção</h1>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Unidade
                </label>
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.condominium_id}
                >
                  <option value="">Área comum (selecione se aplicável)</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      Unidade {unit.number} - {unit.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título da Solicitação *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Vazamento na torneira da cozinha"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo de 5 caracteres</p>
              </div>
            </div>
          </div>

          {/* Detalhes da Manutenção */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Detalhes da Manutenção</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="plumbing">Hidráulica</option>
                  <option value="electrical">Elétrica</option>
                  <option value="hvac">Ar Condicionado</option>
                  <option value="elevator">Elevador</option>
                  <option value="security">Segurança</option>
                  <option value="cleaning">Limpeza</option>
                  <option value="landscaping">Jardinagem</option>
                  <option value="structural">Estrutural</option>
                  <option value="appliances">Equipamentos</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade *
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Previsto (R$)
                </label>
                <input
                  type="number"
                  name="estimated_cost"
                  value={formData.estimated_cost}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Custo estimado para o reparo (opcional)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Prevista para Reparo
                </label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Data esperada para conclusão (opcional)</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização Específica
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Ex: Banheiro social, Cozinha, Área de serviço..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Detalhada *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Descreva o problema em detalhes, incluindo quando começou, frequência, possíveis causas, etc."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo de 10 caracteres</p>
            </div>
          </div>

          {/* Upload de Imagens */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Imagens (Opcional)</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adicionar Fotos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo de 10 imagens, 5MB cada. Formatos: JPG, PNG, GIF
              </p>
            </div>

            {/* Preview das Imagens */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {image.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Resumo da Solicitação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Categoria:</span>
                <span className="ml-2 text-gray-600">{getCategoryLabel(formData.category)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Prioridade:</span>
                <span className="ml-2 text-gray-600">{getPriorityLabel(formData.priority)}</span>
              </div>
              {formData.location && (
                <div>
                  <span className="font-medium text-gray-700">Local:</span>
                  <span className="ml-2 text-gray-600">{formData.location}</span>
                </div>
              )}
              {formData.estimated_cost && (
                <div>
                  <span className="font-medium text-gray-700">Valor Previsto:</span>
                  <span className="ml-2 text-gray-600">R$ {parseFloat(formData.estimated_cost || 0).toFixed(2)}</span>
                </div>
              )}
              {formData.scheduled_date && (
                <div>
                  <span className="font-medium text-gray-700">Data Prevista:</span>
                  <span className="ml-2 text-gray-600">{new Date(formData.scheduled_date).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Imagens:</span>
                <span className="ml-2 text-gray-600">{formData.images.length} arquivo(s)</span>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/manutencao/solicitacoes')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Criar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMaintenanceRequest;