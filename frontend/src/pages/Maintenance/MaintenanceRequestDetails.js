import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { maintenanceAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MaintenanceRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionData, setActionData] = useState({
    notes: '',
    estimated_cost: '',
    actual_cost: '',
    assigned_to: '',
    assigned_contact: '',
    scheduled_date: '',
    completed_date: '',
    rating: '',
    feedback: ''
  });
  const [processingAction, setProcessingAction] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const response = await maintenanceAPI.getRequestById(id);
      if (response.data.success) {
        const requestData = response.data.data?.request || response.data.request;
        setRequest(requestData);
        setEditData({ ...requestData });
        setError('');
      } else {
        setError('Solicitação não encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar solicitação:', error);
      setError('Erro ao carregar solicitação. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    setActionType(action);
    setActionData({
      notes: '',
      estimated_cost: '',
      actual_cost: '',
      assigned_to: '',
      assigned_contact: '',
      scheduled_date: '',
      completed_date: '',
      rating: '',
      feedback: ''
    });
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    setProcessingAction(true);
    try {
      let response;

      switch (actionType) {
        case 'approve':
          const approvePayload = {};
          
          if (actionData.estimated_cost && actionData.estimated_cost !== '') {
            const cost = parseFloat(actionData.estimated_cost);
            if (!isNaN(cost) && cost >= 0) {
              approvePayload.estimated_cost = cost;
            }
          }
          
          if (actionData.assigned_to && actionData.assigned_to.trim() !== '') {
            approvePayload.assigned_to = actionData.assigned_to.trim();
          }
          
          if (actionData.assigned_contact && actionData.assigned_contact.trim() !== '') {
            approvePayload.assigned_contact = actionData.assigned_contact.trim();
          }
          
          if (actionData.scheduled_date && actionData.scheduled_date !== '') {
            const date = new Date(actionData.scheduled_date);
            if (!isNaN(date.getTime()) && date >= new Date()) {
              approvePayload.scheduled_date = actionData.scheduled_date;
            }
          }
          
          if (actionData.completed_date && actionData.completed_date !== '') {
            approvePayload.completed_date = actionData.completed_date;
          }
          
          if (actionData.notes && actionData.notes.trim() !== '') {
            approvePayload.admin_notes = actionData.notes.trim();
          }
          
          console.log('Approve payload:', approvePayload);
          response = await maintenanceAPI.approve(id, approvePayload);
          break;
        case 'reject':
          // Validar se o motivo foi fornecido e tem pelo menos 10 caracteres
          const rejectNotes = actionData.notes?.trim();
          if (!rejectNotes || rejectNotes.length < 10) {
            alert('O motivo da rejeição deve ter pelo menos 10 caracteres.');
            return;
          }
          if (rejectNotes.length > 500) {
            alert('O motivo da rejeição deve ter no máximo 500 caracteres.');
            return;
          }
          
          console.log('Reject payload:', { admin_notes: rejectNotes });
          response = await maintenanceAPI.reject(id, {
            admin_notes: rejectNotes
          });
          break;
        case 'rate':
          response = await maintenanceAPI.rate(id, {
            resident_rating: parseInt(actionData.rating),
            resident_feedback: actionData.feedback
          });
          break;
        case 'update':
          // Filtrar campos vazios para evitar erros de validação
          const updatePayload = {};
          Object.keys(actionData).forEach(key => {
            const value = actionData[key];
            if (value !== '' && value !== null && value !== undefined) {
              if (key === 'estimated_cost' || key === 'actual_cost') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  updatePayload[key] = numValue;
                }
              } else if (key === 'scheduled_date') {
                // Validar se é uma data válida
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  updatePayload[key] = value;
                }
              } else {
                updatePayload[key] = value;
              }
            }
          });
          
          console.log('Update payload:', updatePayload);
          response = await maintenanceAPI.updateRequest(id, updatePayload);
          break;
        default:
          throw new Error('Ação não reconhecida');
      }

      if (response.data.success) {
        alert(getActionSuccessMessage(actionType));
        setShowActionModal(false);
        loadRequest();
      } else {
        // Mostrar erros de validação específicos
        if (response.data.errors && response.data.errors.length > 0) {
          const errorMessages = response.data.errors.map(error => 
            `${error.field}: ${error.message}`
          ).join('\n');
          alert(`Erros de validação:\n\n${errorMessages}`);
        } else {
          alert(response.data.message || `Erro ao ${getActionLabel(actionType).toLowerCase()}`);
        }
      }
    } catch (error) {
      console.error(`Erro ao ${actionType}:`, error);
      
      // Verificar se é um erro 400 com detalhes de validação
      if (error.response && error.response.status === 400) {
        const errorData = error.response.data;
        if (errorData.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors.map(err => 
            `${err.field}: ${err.message}`
          ).join('\n');
          alert(`Erros de validação:\n\n${errorMessages}`);
        } else {
          alert(errorData.message || 'Dados inválidos. Verifique os campos preenchidos.');
        }
      } else {
        alert(`Erro ao ${getActionLabel(actionType).toLowerCase()}. Verifique sua conexão.`);
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const saveEdit = async () => {
    try {
      const response = await maintenanceAPI.updateRequest(id, editData);
      if (response.data.success) {
        alert('Solicitação atualizada com sucesso!');
        setEditMode(false);
        loadRequest();
      } else {
        // Mostrar erros de validação específicos
        if (response.data.errors && response.data.errors.length > 0) {
          const errorMessages = response.data.errors.map(error => 
            `${error.field}: ${error.message}`
          ).join('\n');
          alert(`Erros de validação:\n\n${errorMessages}`);
        } else {
          alert(response.data.message || 'Erro ao atualizar solicitação');
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      
      // Verificar se é um erro 400 com detalhes de validação
      if (error.response && error.response.status === 400) {
        const errorData = error.response.data;
        if (errorData.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors.map(err => 
            `${err.field}: ${err.message}`
          ).join('\n');
          alert(`Erros de validação:\n\n${errorMessages}`);
        } else {
          alert(errorData.message || 'Dados inválidos. Verifique os campos preenchidos.');
        }
      } else {
        alert('Erro ao atualizar solicitação. Verifique sua conexão.');
      }
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      approve: 'Aprovar',
      reject: 'Rejeitar',
      rate: 'Avaliar',
      update: 'Atualizar'
    };
    return labels[action] || action;
  };

  const getActionSuccessMessage = (action) => {
    const messages = {
      approve: 'Solicitação aprovada com sucesso!',
      reject: 'Solicitação rejeitada com sucesso!',
      rate: 'Avaliação registrada com sucesso!',
      update: 'Solicitação atualizada com sucesso!'
    };
    return messages[action] || 'Ação executada com sucesso!';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      rejected: 'Rejeitada'
    };
    return labels[status] || status;
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

  const canManageRequest = () => {
    return ['admin', 'manager', 'syndic'].includes(user.role) || request?.user_id === user.id;
  };

  const canApproveReject = () => {
    return ['admin', 'manager', 'syndic'].includes(user.role) && request?.status === 'pending';
  };

  const canRate = () => {
    return request?.user_id === user.id && request?.status === 'completed' && !request?.resident_rating;
  };

  const canEdit = () => {
    if (['admin', 'manager', 'syndic'].includes(user.role)) return true;
    return request?.user_id === user.id && request?.status === 'pending';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Solicitação não encontrada'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/manutencao/solicitacoes')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solicitação #{request.id}</h1>
            <p className="text-gray-500 mt-1">
              Criada em {request.created_at ? new Date(request.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(request.priority)}`}>
            {getPriorityLabel(request.priority)}
          </span>
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(request.status)}`}>
            {getStatusLabel(request.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes da Solicitação */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Detalhes da Solicitação</h2>
              {canEdit() && (
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {editMode ? 'Cancelar' : 'Editar'}
                </button>
              )}
            </div>
            
            <div className="px-6 py-4">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <input
                      type="text"
                      value={editData.title || ''}
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      <select
                        value={editData.category || ''}
                        onChange={(e) => setEditData({...editData, category: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                      <select
                        value={editData.priority || ''}
                        onChange={(e) => setEditData({...editData, priority: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                    <input
                      type="text"
                      value={editData.location || ''}
                      onChange={(e) => setEditData({...editData, location: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{request.title}</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{request.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Categoria</dt>
                      <dd className="mt-1 text-sm text-gray-900">{getCategoryLabel(request.category)}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Localização</dt>
                      <dd className="mt-1 text-sm text-gray-900">{request.location || 'Não especificado'}</dd>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Imagens */}
          {request.images && request.images.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Imagens</h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {request.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Observações Administrativas */}
          {request.admin_notes && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Observações Administrativas</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-600 whitespace-pre-wrap">{request.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Avaliação */}
          {request.resident_rating && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Avaliação do Residente</h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center mb-2">
                  <span className="text-lg font-medium mr-2">Nota:</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < request.resident_rating ? 'text-yellow-400' : 'text-gray-300'}>
                        ⭐
                      </span>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">({request.resident_rating}/5)</span>
                </div>
                {request.resident_feedback && (
                  <p className="text-gray-600">{request.resident_feedback}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Painel Lateral */}
        <div className="space-y-6">
          {/* Informações do Sistema */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Informações</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Condomínio</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.condominium?.name || 'N/A'}</dd>
              </div>
              
              {request.unit && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Unidade</dt>
                  <dd className="mt-1 text-sm text-gray-900">Unidade {request.unit.number} - {request.unit.type}</dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Solicitante</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.user?.name || 'N/A'}</dd>
              </div>

              {request.assigned_to && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Responsável</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.assigned_to}</dd>
                </div>
              )}

              {request.assigned_contact && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contato</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.assigned_contact}</dd>
                </div>
              )}

              {request.scheduled_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Data Agendada</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(request.scheduled_date).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              )}

              {request.completed_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Data de Conclusão</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(request.completed_date).toLocaleDateString('pt-BR')}
                    {request.scheduled_date && (
                      <span className="ml-2 text-xs">
                        {(() => {
                          const scheduled = new Date(request.scheduled_date);
                          const completed = new Date(request.completed_date);
                          const diffTime = completed - scheduled;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays > 0) {
                            return <span className="text-red-600">({diffDays} dias de atraso)</span>;
                          } else if (diffDays < 0) {
                            return <span className="text-green-600">({Math.abs(diffDays)} dias de antecedência)</span>;
                          } else {
                            return <span className="text-blue-600">(no prazo)</span>;
                          }
                        })()}
                      </span>
                    )}
                  </dd>
                </div>
              )}

              {(request.estimated_cost || request.actual_cost) && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Custos</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {request.estimated_cost && (
                      <div>Estimado: R$ {parseFloat(request.estimated_cost).toFixed(2)}</div>
                    )}
                    {request.actual_cost && (
                      <div>Real: R$ {parseFloat(request.actual_cost).toFixed(2)}</div>
                    )}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">Criada em</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {request.created_at ? new Date(request.created_at).toLocaleString('pt-BR') : 'N/A'}
                </dd>
              </div>

              {request.completed_date && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Concluída em</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(request.completed_date).toLocaleString('pt-BR')}
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Ações</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              {canApproveReject() && (
                <>
                  <button
                    onClick={() => handleAction('approve')}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Aprovar Solicitação
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    Rejeitar Solicitação
                  </button>
                </>
              )}

              {canRate() && (
                <button
                  onClick={() => handleAction('rate')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Avaliar Serviço
                </button>
              )}

              {canManageRequest() && (
                <button
                  onClick={() => handleAction('update')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Atualizar Status
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Ação */}
      {showActionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {getActionLabel(actionType)} Solicitação
              </h3>

              <div className="space-y-4">
                {actionType === 'approve' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custo Estimado (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={actionData.estimated_cost}
                        onChange={(e) => setActionData({...actionData, estimated_cost: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsável
                      </label>
                      <input
                        type="text"
                        value={actionData.assigned_to}
                        onChange={(e) => setActionData({...actionData, assigned_to: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contato
                      </label>
                      <input
                        type="text"
                        value={actionData.assigned_contact}
                        onChange={(e) => setActionData({...actionData, assigned_contact: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Agendada
                      </label>
                      <input
                        type="date"
                        value={actionData.scheduled_date}
                        onChange={(e) => setActionData({...actionData, scheduled_date: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Conclusão
                      </label>
                      <input
                        type="date"
                        value={actionData.completed_date}
                        onChange={(e) => setActionData({...actionData, completed_date: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Data em que o trabalho foi finalizado</p>
                    </div>
                  </>
                )}

                {actionType === 'rate' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nota (1-5)
                      </label>
                      <select
                        value={actionData.rating}
                        onChange={(e) => setActionData({...actionData, rating: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Selecione uma nota</option>
                        <option value="1">1 - Muito Ruim</option>
                        <option value="2">2 - Ruim</option>
                        <option value="3">3 - Regular</option>
                        <option value="4">4 - Bom</option>
                        <option value="5">5 - Excelente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comentários (opcional)
                      </label>
                      <textarea
                        value={actionData.feedback}
                        onChange={(e) => setActionData({...actionData, feedback: e.target.value})}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </>
                )}

                {actionType === 'update' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={actionData.status || request.status}
                        onChange={(e) => setActionData({...actionData, status: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="pending">Pendente</option>
                        <option value="in_progress">Em Andamento</option>
                        <option value="completed">Concluída</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custo Real (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={actionData.actual_cost}
                        onChange={(e) => setActionData({...actionData, actual_cost: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {actionType === 'reject' ? 'Motivo da rejeição' : 'Observações'}
                    {actionType === 'reject' && ' *'}
                  </label>
                  {actionType === 'reject' && (
                    <p className="text-xs text-gray-500 mb-2">
                      Mínimo de 10 caracteres obrigatório
                    </p>
                  )}
                  <textarea
                    value={actionData.notes}
                    onChange={(e) => setActionData({...actionData, notes: e.target.value})}
                    rows={3}
                    required={actionType === 'reject'}
                    placeholder={actionType === 'reject' ? 'Descreva o motivo da rejeição com pelo menos 10 caracteres...' : 'Observações adicionais...'}
                    className={`w-full border rounded-md px-3 py-2 ${
                      actionType === 'reject' && actionData.notes && actionData.notes.trim().length < 10
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  />
                  {actionType === 'reject' && actionData.notes && actionData.notes.trim().length < 10 && (
                    <p className="text-xs text-red-500 mt-1">
                      Faltam {10 - actionData.notes.trim().length} caracteres
                    </p>
                  )}
                  {actionType === 'reject' && actionData.notes && actionData.notes.trim().length > 500 && (
                    <p className="text-xs text-red-500 mt-1">
                      Excede em {actionData.notes.trim().length - 500} caracteres o limite máximo
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={processingAction}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={processingAction}
                >
                  {processingAction ? 'Processando...' : getActionLabel(actionType)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceRequestDetails;